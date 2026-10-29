import { Router } from 'express';
import { registerUser } from '../controllers/authController.js';

const router = Router();

// Ruta pública para registrar un nuevo usuario
router.post('/register', registerUser);

export default router;