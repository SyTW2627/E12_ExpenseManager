import express from 'express';
import { Payment } from '../models/payment.js';

export const paymentRouter = express.Router();

paymentRouter.post('/payments', async (req, res) => {
  const payment = new Payment(req.body);

  try {
    await payment.save();
    res.status(201).send(payment);
  } catch (error) {
    res.status(400).send(error);
  }
});

paymentRouter.get('/payments', async (req, res) => {
  const filter: Record<string, string> = {};
  if (req.query.groupId) filter.groupId = req.query.groupId.toString();
  if (req.query.payerId) filter.payerId = req.query.payerId.toString();
  if (req.query.receiverId) filter.receiverId = req.query.receiverId.toString();

  try {
    const payments = await Payment.find(filter)
      .populate('payerId', 'name email')
      .populate('receiverId', 'name email');

    res.status(200).send(payments);
  } catch (error) {
    res.status(500).send(error);
  }
});

paymentRouter.get('/payments/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('payerId', 'name email')
      .populate('receiverId', 'name email');

    if (!payment) {
      return res.status(404).send({ message: 'Pago no encontrado' });
    }
    res.status(200).send(payment);
  } catch (error) {
    res.status(500).send(error);
  }
});

paymentRouter.patch('/payments/:id', async (req, res) => {
  const allowedUpdates = ['amount', 'status'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ message: 'Actualización no permitida' });
  }

  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, 
      runValidators: true 
    });
    
    if (!payment) {
      return res.status(404).send({ message: 'Pago no encontrado' });
    }
    res.status(200).send(payment);
  } catch (error) {
    res.status(400).send(error);
  }
});

paymentRouter.delete('/payments/:id', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment) {
      return res.status(404).send({ message: 'Pago no encontrado' });
    }
    res.status(200).send(payment);
  } catch (error) {
    res.status(500).send(error);
  }
});