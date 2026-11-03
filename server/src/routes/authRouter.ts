import express from 'express';
import { loginUser, registerUser } from '../controllers/authController.js';

export const authRouter = express.Router();

// Ruta pública para registrar un nuevo usuario
authRouter.post('/register', registerUser);

// Ruta pública para iniciar sesión
authRouter.post('/login', loginUser);