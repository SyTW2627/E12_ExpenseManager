import express from 'express';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController.js';

export const expenseRouter = express.Router();

expenseRouter.post('/expenses', createExpense);
expenseRouter.get('/expenses', getExpenses);
expenseRouter.get('/expenses/:id', getExpenseById);
expenseRouter.patch('/expenses/:id', updateExpense);
expenseRouter.delete('/expenses/:id', deleteExpense);