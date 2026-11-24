import express from 'express';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../controllers/notificationController.js';

export const notificationRouter = express.Router();

notificationRouter.get('/notifications', getNotifications);
notificationRouter.patch('/notifications/read-all', markAllNotificationsAsRead);
notificationRouter.patch('/notifications/:id/read', markNotificationAsRead);