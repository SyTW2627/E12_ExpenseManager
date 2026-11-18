import express from 'express';
import {
  getUsers,
  getMe,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';

export const userRouter = express.Router();

userRouter.get('/users', getUsers);
userRouter.get('/users/me', getMe);
userRouter.get('/users/:id', getUserById);
userRouter.patch('/users/:id', updateUser);
userRouter.delete('/users/:id', deleteUser);