import Team from '../models/Team.js';
import Issue from '../models/Issue.js';

/**
 * GET /api/teams
 */
export const getTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate('members', 'name email avatar')
      .sort({ createdAt: 1 });
    res.json({ teams });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/teams/:key
 */
export const getTeamByKey = async (req, res) => {
  try {
    const team = await Team.findOne({ key: req.params.key.toUpperCase() }).populate(
      'members',
      'name email avatar'
    );

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json({ team });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/teams
 */
export const createTeam = async (req, res) => {
  try {
    const { name, key, icon, description, color } = req.body;

    if (!name || !key) {
      return res.status(400).json({ message: 'Name and key are required' });
    }

    const existing = await Team.findOne({ key: key.toUpperCase() });
    if (existing) {
      return res.status(409).json({ message: 'A team with that key already exists' });
    }

    const team = await Team.create({
      name,
      key: key.toUpperCase(),
      icon: icon || 'ffffe0',
      color: color || '#5e6ad2',
      description: description || '',
      members: [req.user._id],
      issueCounter: 0,
    });

    res.status(201).json({ team });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/teams/:key/stats - counts per status, used by the board header.
 */
export const getTeamStats = async (req, res) => {
  try {
    const team = await Team.findOne({ key: req.params.key.toUpperCase() });
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const counts = await Issue.aggregate([
      { $match: { team: team._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = counts.reduce((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    res.json({ stats });
  } catch (error) {
    console.error('Team stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
