import type { Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { Notification } from '../models/notification.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).send({ message: 'Usuario no autenticado' });
    }

    const filter: Record<string, unknown> = { userId };
    if (req.query.unreadOnly === 'true') {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .populate('groupId', 'name');

    res.status(200).send(notifications);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).send({ message: 'Usuario no autenticado' });
    }

    const filter: Record<string, unknown> = { userId, read: false };
    const result = await Notification.updateMany(filter, { $set: { read: true } });

    res.status(200).send({
      message: 'Todas las notificaciones marcadas como leídas',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).send(error);
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const id = String(req.params.id);

    if (!isValidObjectId(id)) {
      return res.status(400).send({ message: 'Identificador de notificación inválido' });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).send({ message: 'Notificación no encontrada' });
    }

    if (notification.userId.toString() !== userId) {
      return res.status(403).send({ message: 'No tienes permiso para modificar esta notificación' });
    }

    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }

    await notification.populate('groupId', 'name');

    res.status(200).send(notification);
  } catch (error) {
    res.status(500).send(error);
  }
};