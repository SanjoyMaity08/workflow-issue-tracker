import express from 'express';
import {
  getAllIssues,
  getIssuesByTeam,
  getIssueByIdentifier,
  createIssue,
  updateIssue,
  deleteIssue,
  getSubIssues,
} from '../controllers/issueController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Every issue route requires a valid Bearer token.
router.use(protect);

router.get('/', getAllIssues);
router.post('/', createIssue);
router.get('/team/:teamId', getIssuesByTeam);
router.get('/:identifier/sub-issues', getSubIssues);
router.get('/:identifier', getIssueByIdentifier);
router.patch('/:identifier', updateIssue);
router.put('/:identifier', updateIssue);
router.delete('/:identifier', deleteIssue);

export default router;
