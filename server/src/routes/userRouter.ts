import express from 'express';
import { User } from '../models/user.js'; 
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const userRouter = express.Router();

userRouter.get('/users', async (req, res) => {
  const filter = req.query.name
    ? { name: req.query.name.toString() }
    : req.query.email
    ? { email: req.query.email.toString() }
    : {};

  try {
    const users = await User.find(filter).select('-password');
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

userRouter.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).send({ message: 'Usuario no encontrado' });
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

userRouter.patch('/users/:id', async (req: AuthRequest, res) => {
  const userId = req.user?.id;

  // Un usuario solo puede modificar su propio perfil
  if (req.params.id !== userId) {
    return res.status(403).send({ message: 'No tienes permiso para modificar el perfil de otro usuario' });
  }

  // trustScore se elimina de las actualizaciones permitidas para que solo el sistema pueda modificarlo
  const allowedUpdates = ['name', 'email'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ message: 'Actualización no permitida' });
  }

  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, 
      runValidators: true 
    }).select('-password');
    
    if (!user) {
      return res.status(404).send({ message: 'Usuario no encontrado' });
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

userRouter.delete('/users/:id', async (req: AuthRequest, res) => {
  const userId = req.user?.id;

  // Un usuario solo puede eliminar su propia cuenta
  if (req.params.id !== userId) {
    return res.status(403).send({ message: 'Solo puedes eliminar tu propia cuenta' });
  }

  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).send({ message: 'Usuario no encontrado' });
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});