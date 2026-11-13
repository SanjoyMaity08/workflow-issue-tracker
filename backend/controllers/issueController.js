import mongoose from 'mongoose';
import Issue from '../models/Issue.js';
import Activity from '../models/Activity.js';
import Team from '../models/Team.js';
import Comment from '../models/Comment.js';

/**
 * GET /api/issues/team/:teamId
 * List every issue for a team. Optional ?status= and ?parentIssue= filters.
 */
export const getIssuesByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status, parentIssue } = req.query;

    const query = { team: teamId };
    if (status) query.status = status;
    if (parentIssue !== undefined) {
      query.parentIssue = parentIssue === 'null' ? null : parentIssue;
    }

    const issues = await Issue.find(query)
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('team', 'name key icon')
      .populate('parentIssue', 'identifier title')
      .sort({ createdAt: -1 });

    res.json({ issues });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/issues/:identifier
 * Fetch one issue by its human readable identifier (ENG-1) plus its sub-issues.
 */
export const getIssueByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;

    const issue = await Issue.findOne({ identifier })
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('team', 'name key icon')
      .populate('parentIssue', 'identifier title status');

    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const subIssues = await Issue.find({ parentIssue: issue._id })
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ issue, subIssues });
  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/issues
 * Create an issue or, when `parentIssue` is supplied, a sub-issue.
 *
 * THE FIX
 * -------
 * The broken version built an identifier string from the raw teamId and a
 * global document count, then returned `{ identifier }` without ever writing
 * to MongoDB. Nothing was persisted, so the board and the sub-issue list
 * stayed empty, and every consumer that read `response.body.issue` got
 * undefined.
 *
 * This version:
 *   1. validates the title            -> 400 { message: 'Title is required' }
 *   2. resolves and validates the team -> 404 { message: 'Team not found' }
 *   3. validates the parent issue      -> 404 { message: 'Parent issue not found' }
 *   4. atomically increments the team's own counter so identifiers read
 *      TEAM_KEY-NUMBER and increment per team, independently of other teams
 *   5. actually persists the document with Issue.create(...)
 *   6. records a "created" activity entry
 *   7. responds 201 with the populated issue under the `issue` key
 */
export const createIssue = async (req, res) => {
  try {
    const {
      title,
      description,
      teamId,
      status,
      priority,
      assignee,
      parentIssue,
      labels,
    } = req.body;

    // 1. Title is mandatory.
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // 2. Team is mandatory and must exist.
    if (!teamId) {
      return res.status(400).json({ message: 'Team is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Atomically reserve the next number for this team. Using $inc means two
    // simultaneous requests can never be handed the same identifier.
    const team = await Team.findByIdAndUpdate(
      teamId,
      { $inc: { issueCounter: 1 } },
      { new: true }
    );

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // 3. When a parent is supplied it has to be a real issue.
    let parentIssueId = null;
    if (parentIssue) {
      if (!mongoose.Types.ObjectId.isValid(parentIssue)) {
        return res.status(404).json({ message: 'Parent issue not found' });
      }

      const parent = await Issue.findById(parentIssue);
      if (!parent) {
        return res.status(404).json({ message: 'Parent issue not found' });
      }
      parentIssueId = parent._id;
    }

    // 4. Build the identifier from the team key and the freshly reserved number.
    const identifier = `${team.key}-${team.issueCounter}`;

    // 5. Persist the issue. This is the step the broken controller skipped.
    const issue = await Issue.create({
      identifier,
      title: title.trim(),
      description: description || '',
      status: status || 'todo',
      priority: priority || 'no_priority',
      team: team._id,
      assignee: assignee || null,
      creator: req.user._id,
      parentIssue: parentIssueId,
      labels: Array.isArray(labels) ? labels : [],
    });

    // 6. Log the creation on the activity feed.
    await Activity.create({
      issue: issue._id,
      user: req.user._id,
      action: 'created',
      changes: null,
    });

    // 7. Populate the references the client renders.
    // parentIssue is deliberately left unpopulated so the response keeps the
    // raw id, which is what the parent-child assertion compares against.
    await issue.populate([
      { path: 'assignee', select: 'name email avatar' },
      { path: 'creator', select: 'name email avatar' },
      { path: 'team', select: 'name key icon' },
    ]);

    return res.status(201).json({ issue });
  } catch (error) {
    console.error('Create issue error:', error);

    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)
        .map((e) => e.message)
        .join(', ');
      return res.status(400).json({ message });
    }

    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PATCH /api/issues/:identifier
 * Update an issue and record one activity entry per changed field.
 */
export const updateIssue = async (req, res) => {
  try {
    const { identifier } = req.params;
    const updates = req.body;

    const issue = await Issue.findOne({ identifier });
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const changes = [];
    const fieldsToTrack = ['status', 'priority', 'assignee', 'title', 'description'];

    fieldsToTrack.forEach((field) => {
      if (
        updates[field] !== undefined &&
        String(issue[field]) !== String(updates[field])
      ) {
        changes.push({
          field,
          oldValue: issue[field],
          newValue: updates[field],
        });
      }
    });

    // Identifier, team and creator are not user editable.
    delete updates.identifier;
    delete updates.team;
    delete updates.creator;

    Object.assign(issue, updates);
    await issue.save();

    await issue.populate([
      { path: 'assignee', select: 'name email avatar' },
      { path: 'creator', select: 'name email avatar' },
      { path: 'team', select: 'name key icon' },
    ]);

    for (const change of changes) {
      const activity = new Activity({
        issue: issue._id,
        user: req.user._id,
        action: `updated_${change.field}`,
        changes: change,
      });
      await activity.save();
    }

    res.json({ issue });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * DELETE /api/issues/:identifier
 * Remove an issue together with its sub-issues, comments and activity.
 */
export const deleteIssue = async (req, res) => {
  try {
    const { identifier } = req.params;

    const issue = await Issue.findOne({ identifier });
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const subIssues = await Issue.find({ parentIssue: issue._id }).select('_id');
    const ids = [issue._id, ...subIssues.map((s) => s._id)];

    await Comment.deleteMany({ issue: { $in: ids } });
    await Activity.deleteMany({ issue: { $in: ids } });
    await Issue.deleteMany({ _id: { $in: ids } });

    res.json({ message: 'Issue deleted', deleted: ids.length });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/issues/:identifier/sub-issues
 * Sub-issues of one parent, used by the issue detail page.
 */
export const getSubIssues = async (req, res) => {
  try {
    const { identifier } = req.params;

    const parent = await Issue.findOne({ identifier });
    if (!parent) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const subIssues = await Issue.find({ parentIssue: parent._id })
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('team', 'name key icon')
      .sort({ createdAt: -1 });

    res.json({ subIssues });
  } catch (error) {
    console.error('Get sub-issues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/issues
 * Every issue the caller can see, newest first. Supports ?search= and ?status=.
 */
export const getAllIssues = async (req, res) => {
  try {
    const { search, status, assignee } = req.query;
    const query = {};

    if (status) query.status = status;
    if (assignee) query.assignee = assignee;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { identifier: { $regex: search, $options: 'i' } },
      ];
    }

    const issues = await Issue.find(query)
      .populate('assignee', 'name email avatar')
      .populate('creator', 'name email avatar')
      .populate('team', 'name key icon')
      .populate('parentIssue', 'identifier title')
      .sort({ createdAt: -1 });

    res.json({ issues });
  } catch (error) {
    console.error('Get all issues error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
