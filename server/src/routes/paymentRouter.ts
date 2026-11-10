import express from 'express';
import { Payment } from '../models/payment.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const paymentRouter = express.Router();

paymentRouter.post('/payments', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    // Asignar al usuario autenticado como payerId
    const payment = new Payment({
      ...req.body,
      payerId: userId,
    });

    await payment.save();
    await payment.populate('payerId', 'name email');
    await payment.populate('receiverId', 'name email');

    res.status(201).send(payment);
  } catch (error) {
    res.status(400).send(error);
  }
});

paymentRouter.get('/payments', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    // Solo devolver pagos donde el usuario sea pagador o receptor
    const filter: Record<string, unknown> = {
      $or: [{ payerId: userId }, { receiverId: userId }],
    };

    if (req.query.groupId) filter.groupId = req.query.groupId.toString();
    if (req.query.payerId) filter.payerId = req.query.payerId.toString();
    if (req.query.receiverId) filter.receiverId = req.query.receiverId.toString();

    const payments = await Payment.find(filter)
      .populate('payerId', 'name email')
      .populate('receiverId', 'name email');

    res.status(200).send(payments);
  } catch (error) {
    res.status(500).send(error);
  }
});

paymentRouter.get('/payments/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    const payment = await Payment.findById(req.params.id)
      .populate('payerId', 'name email')
      .populate('receiverId', 'name email');

    if (!payment) {
      return res.status(404).send({ message: 'Pago no encontrado' });
    }

    // Solo permitir ver el pago si el usuario participa en él (emisor o receptor)
    const isPayer =  payment.payerId.toString() === userId;
    const isReceiver = payment.receiverId.toString() === userId;

    if (!isPayer && !isReceiver) {
      return res.status(403).send({ message: 'No tienes permiso para ver este pago' });
    }

    res.status(200).send(payment);
  } catch (error) {
    res.status(500).send(error);
  }
});

paymentRouter.patch('/payments/:id', async (req: AuthRequest, res) => {
  // Solo se permite actualizar el estado del pago (por ejemplo, para confirmarlo como completado)
  const allowedUpdates = ['status'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ message: 'Actualización no permitida' });
  }

  try {
    const userId = req.user?.id;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).send({ message: 'Pago no encontrado' });
    }

    // Solo el receptor o el pagador pueden actualizar el estado del pago
    const isPayer = payment.payerId.toString() === userId;
    const isReceiver = payment.receiverId.toString() === userId;

    if (!isPayer && !isReceiver) {
      return res.status(403).send({ message: 'No tienes permiso para modificar este pago' });
    }

    payment.set(req.body);
    await payment.save();

    await payment.populate('payerId', 'name email');
    await payment.populate('receiverId', 'name email');

    res.status(200).send(payment);
  } catch (error) {
    res.status(400).send(error);
  }
});

paymentRouter.delete('/payments/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).send({ message: 'Pago no encontrado' });
    }

    // Solo el pagador que emitió el pago puede cancelarlo/eliminarlo
    if (payment.payerId.toString() !== userId) {
      return res.status(403).send({ message: 'Solo quien emitió el pago puede eliminarlo' });
    }

    await payment.deleteOne();
    res.status(200).send(payment);
  } catch (error) {
    res.status(500).send(error);
  }
});