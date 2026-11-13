import express from 'express';
import { getComments, createComment } from '../controllers/commentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/:identifier', getComments);
router.post('/:identifier', createComment);

export default router;
