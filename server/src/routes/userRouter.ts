import express from 'express';
import { User } from '../models/user.js'; 

export const userRouter = express.Router();

userRouter.post('/users', async (req, res) => {
  const user = new User(req.body);

  try {
    await user.save();
    res.status(201).send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

userRouter.get('/users', async (req, res) => {
  const filter = req.query.name
    ? { name: req.query.name.toString() }
    : req.query.email
    ? { email: req.query.email.toString() }
    : {};

  try {
    const users = await User.find(filter);
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send(error);
  }
});

userRouter.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send({ message: 'Usuario no encontrado' });
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send(error);
  }
});

userRouter.patch('/users/:id', async (req, res) => {
  const allowedUpdates = ['name', 'email', 'trustScore']; // Para no permitir que se actualicen campos no deseados, como la contraseña o el ID del usuario.
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ message: 'Actualización no permitida' });
  }

  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, 
      runValidators: true 
    });
    
    if (!user) {
      return res.status(404).send({ message: 'Usuario no encontrado' });
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(400).send(error);
  }
});

userRouter.delete('/users/:id', async (req, res) => {
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