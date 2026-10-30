import express from 'express';
import { registerUser } from '../controllers/authController.js';

export const AuthRouter = express.Router();

// Ruta pública para registrar un nuevo usuario
AuthRouter.post('/register', registerUser);