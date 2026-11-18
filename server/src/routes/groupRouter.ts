import express from 'express';
import {
  createGroup,
  joinGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
} from '../controllers/groupController.js';

export const groupRouter = express.Router();

groupRouter.post('/groups', createGroup);
groupRouter.post('/groups/join', joinGroup);
groupRouter.get('/groups', getGroups);
groupRouter.get('/groups/:id', getGroupById);
groupRouter.patch('/groups/:id', updateGroup);
groupRouter.delete('/groups/:id', deleteGroup);