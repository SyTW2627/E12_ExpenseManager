import express from 'express';
import { registerUser } from '../controllers/authController.js';

export const authRouter = express.Router();

// Ruta pública para registrar un nuevo usuario
authRouter.post('/register', registerUser);