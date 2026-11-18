import type { Response } from 'express';
import { isValidObjectId } from 'mongoose';
import { Payment } from '../models/payment.js';
import { Group } from '../models/group.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Solo se aceptan estos campos del body; payerId y status los decide el servidor
    const { groupId, receiverId, amount } = req.body;

    if (!isValidObjectId(groupId) || !isValidObjectId(receiverId)) {
      return res.status(400).send({ message: 'groupId y receiverId deben ser identificadores válidos' });
    }

    if (receiverId === userId) {
      return res.status(400).send({ message: 'No puedes hacerte un pago a ti mismo' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).send({ message: 'Grupo no encontrado' });
    }

    // Tanto el pagador como el receptor deben pertenecer al grupo
    const isGroupMember = (id: string) =>
      group.members.some((m) => m.toString() === id) || group.createdBy.toString() === id;

    if (!isGroupMember(userId!)) {
      return res.status(403).send({ message: 'No perteneces a este grupo' });
    }
    if (!isGroupMember(receiverId)) {
      return res.status(400).send({ message: 'El receptor no pertenece a este grupo' });
    }

    // Asignar al usuario autenticado como payerId
    const payment = new Payment({
      groupId,
      receiverId,
      amount,
      payerId: userId,
    });

    await payment.save();
    await payment.populate('payerId', 'name email');
    await payment.populate('receiverId', 'name email');

    res.status(201).send(payment);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const getPayments = async (req: AuthRequest, res: Response) => {
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
};

export const getPaymentById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const payment = await Payment.findById(req.params.id)
      .populate('payerId', 'name email')
      .populate('receiverId', 'name email');

    if (!payment) {
      return res.status(404).send({ message: 'Pago no encontrado' });
    }

    // Solo permitir ver el pago si el usuario participa en él (emisor o receptor).
    // Tras el populate, payerId y receiverId son documentos, por eso se compara su _id.
    const isPayer = payment.payerId._id.toString() === userId;
    const isReceiver = payment.receiverId._id.toString() === userId;

    if (!isPayer && !isReceiver) {
      return res.status(403).send({ message: 'No tienes permiso para ver este pago' });
    }

    res.status(200).send(payment);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const updatePayment = async (req: AuthRequest, res: Response) => {
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

    // Solo el receptor puede confirmar que ha recibido el pago
    if (payment.receiverId.toString() !== userId) {
      return res.status(403).send({ message: 'Solo el receptor puede confirmar este pago' });
    }

    // El único cambio de estado permitido es de pending a completed
    if (req.body.status !== 'completed') {
      return res.status(400).send({ message: 'Solo se puede marcar el pago como completado' });
    }
    if (payment.status === 'completed') {
      return res.status(400).send({ message: 'El pago ya está completado' });
    }

    payment.status = 'completed';
    await payment.save();

    await payment.populate('payerId', 'name email');
    await payment.populate('receiverId', 'name email');

    res.status(200).send(payment);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const deletePayment = async (req: AuthRequest, res: Response) => {
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

    // Un pago ya confirmado por el receptor no se puede eliminar
    if (payment.status === 'completed') {
      return res.status(400).send({ message: 'No se puede eliminar un pago ya completado' });
    }

    await payment.deleteOne();
    res.status(200).send(payment);
  } catch (error) {
    res.status(500).send(error);
  }
};