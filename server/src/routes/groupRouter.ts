import express from 'express';
import { Group } from '../models/group.js';

export const groupRouter = express.Router();

groupRouter.post('/groups', async (req, res) => {
  const group = new Group(req.body);

  try {
    await group.save();
    res.status(201).send(group);
  } catch (error) {
    res.status(400).send(error);
  }
});

groupRouter.get('/groups', async (req, res) => {
  const filter = req.query.name 
    ? { name: req.query.name.toString() } 
    : req.query.createdBy
    ? { createdBy: req.query.createdBy.toString() }
    : {};
  
  try {
    const groups = await Group.find(filter);
    res.status(200).send(groups);
  } catch (error) {
    res.status(500).send(error);
  }
});

groupRouter.get('/groups/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).send({ message: 'Grupo no encontrado' });
    }
    res.status(200).send(group);
  } catch (error) {
    res.status(500).send(error);
  }
});

groupRouter.patch('/groups/:id', async (req, res) => {
  const allowedUpdates = ['name', 'description', 'members'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ message: 'Actualización no permitida' });
  }

  try {
    const group = await Group.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, 
      runValidators: true 
    });
    
    if (!group) {
      return res.status(404).send({ message: 'Grupo no encontrado' });
    }
    res.status(200).send(group);
  } catch (error) {
    res.status(400).send(error);
  }
});

groupRouter.delete('/groups/:id', async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) {
      return res.status(404).send({ message: 'Grupo no encontrado' });
    }
    res.status(200).send(group);
  } catch (error) {
    res.status(500).send(error);
  }
});