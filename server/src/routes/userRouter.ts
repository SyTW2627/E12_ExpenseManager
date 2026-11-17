import express from 'express';
import { User } from '../models/user.js'; 
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const userRouter = express.Router();

userRouter.get('/users', async (req: AuthRequest, res) => {
  try {
    const { name, email } = req.query;

    if (!name && !email) {
      return res.status(400).send({
        message: "Se debe proporcionar al menos un parámetro de búsqueda: ?name=... o ?email=..."
      });
    }

    const userId = req.user?.id;

    const filter: Record<string, unknown> = {
      _id: { $ne: userId }
    };

    if (name) { filter.name = { $regex: name.toString(), $options: 'i' }; }
    if (email) { filter.email = { $regex: email.toString(), $options: 'i' }; } 

    const users = await User.find(filter).select('name email trustScore');

    res.status(200).send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

userRouter.get('/users/me', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).send({ message: 'Usuario no encontrado' });
    }
    res.status(200).send(user);
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