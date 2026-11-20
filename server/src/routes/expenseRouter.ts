import express from 'express';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getSimplifiedExpenses,
} from '../controllers/expenseController.js';

export const expenseRouter = express.Router();

expenseRouter.post('/expenses', createExpense);
expenseRouter.get('/expenses', getExpenses);
// Debe declararse antes de /expenses/:id para que 'simplified' no se tome como un id
expenseRouter.get('/expenses/simplified/:groupId', getSimplifiedExpenses);
expenseRouter.get('/expenses/:id', getExpenseById);
expenseRouter.patch('/expenses/:id', updateExpense);
expenseRouter.delete('/expenses/:id', deleteExpense);