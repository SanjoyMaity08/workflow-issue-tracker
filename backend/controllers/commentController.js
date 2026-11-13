import Comment from '../models/Comment.js';
import Issue from '../models/Issue.js';
import Activity from '../models/Activity.js';

/**
 * GET /api/comments/:identifier
 */
export const getComments = async (req, res) => {
  try {
    const issue = await Issue.findOne({ identifier: req.params.identifier });
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const comments = await Comment.find({ issue: issue._id })
      .populate('user', 'name email avatar')
      .sort({ createdAt: 1 });

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/comments/:identifier
 */
export const createComment = async (req, res) => {
  try {
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ message: 'Comment body is required' });
    }

    const issue = await Issue.findOne({ identifier: req.params.identifier });
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found' });
    }

    const comment = await Comment.create({
      issue: issue._id,
      user: req.user._id,
      body: body.trim(),
    });

    await Activity.create({
      issue: issue._id,
      user: req.user._id,
      action: 'commented',
      changes: null,
    });

    await comment.populate('user', 'name email avatar');

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
