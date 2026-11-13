import express from 'express';
import {
  getTeams,
  getTeamByKey,
  createTeam,
  getTeamStats,
} from '../controllers/teamController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getTeams);
router.post('/', createTeam);
router.get('/:key/stats', getTeamStats);
router.get('/:key', getTeamByKey);

export default router;
