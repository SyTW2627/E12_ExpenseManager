import express from 'express';
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} from '../controllers/paymentController.js';

export const paymentRouter = express.Router();

paymentRouter.post('/payments', createPayment);
paymentRouter.get('/payments', getPayments);
paymentRouter.get('/payments/:id', getPaymentById);
paymentRouter.patch('/payments/:id', updatePayment);
paymentRouter.delete('/payments/:id', deletePayment);