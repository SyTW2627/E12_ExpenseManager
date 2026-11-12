import express from 'express';
import { Group } from '../models/group.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';

export const groupRouter = express.Router();

groupRouter.post('/groups', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    // Se guardan los miembros que vienen en el body de la petición
    const members: string[] = Array.isArray(req.body.members) ? req.body.members : [];

    if (userId && !members.includes(userId)) {
      members.push(userId);
    }

    // Se le añaden los campos
    const group = new Group({
      ...req.body,
      createdBy: userId,
      members: members
    });

    await group.save();
    await group.populate('members', 'name email');
    await group.populate('createdBy', 'name email');

    res.status(201).send(group);
  } catch (error) {
    res.status(400).send(error);
  }
});

/**
 * Funcion para unirse a un grupo mediante un código de invitación.
 */
groupRouter.post('/groups/join', async (req: AuthRequest, res) => {
  try {
    const { inviteCode } = req.body;
    
    // Extraemos el ID del usuario  del middleware
    const userId = req.user?.id;
    if (!inviteCode) {
      return res.status(400).send({ message: 'El código de invitación es obligatorio' });
    }

    // Buscamos el grupo utilizando el código de invitación 
    const group = await Group.findOne({ 
      inviteCode: inviteCode.trim().toUpperCase() 
    });
    if (!group) {
      return res.status(404).send({ message: 'Código de invitación inválido o grupo no encontrado' });
    }

    // Comprobar si el usuario ya está en el array de miembros
    const isAlreadyMember = group.members.some(memberId => memberId.toString() === userId);
    if (isAlreadyMember) {
      return res.status(400).send({ message: 'Ya eres miembro de este grupo' });
    }

    // Añadir el ID del usuario y guardar 
    group.members.push(userId as any);
    await group.save();

    res.status(200).send({ 
      message: 'Te has unido al grupo correctamente', 
      group 
    });

  } catch (error) {
    res.status(500).send(error);
  }
});

groupRouter.get('/groups', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id; 
    if (!userId) {
      return res.status(401).send({ message: 'Usuario no autenticado' });
    }

    // Se buscan los grupos en los que el usuario esté en la lista de miembros o sea el creador
    const groups = await Group.find({
      $or: [{ members: userId as any }, { createdBy: userId as any }]
    }).populate('members', 'name email')
    .populate('createdBy', 'name email');

    res.status(200).send(groups);
  } catch (error) {
    res.status(500).send(error);
  }
});

groupRouter.get('/groups/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const group = await Group.findById(req.params.id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).send({ message: 'Grupo no encontrado' });
    }

    // Verificar si el usuario es miembro o creador del grupo
    const isMember = group.members.some((m: any) => m._id?.toString() === userId || m.toString() === userId);
    const isCreator = group.createdBy.toString() === userId;

    if (!isMember && !isCreator) {
      return res.status(403).send({ message: 'No tienes permiso para ver este grupo' });
    }

    res.status(200).send(group);
  } catch (error) {
    res.status(500).send(error);
  }
});

groupRouter.patch('/groups/:id', async (req: AuthRequest, res) => {
  const allowedUpdates = ['name', 'description', 'members'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ message: 'Actualización no permitida' });
  }

  try {
    const userId = req.user?.id;

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).send({ message: 'Grupo no encontrado' });
    }

    // Solo el creador del grupo tiene permisos para editarlo
    if (group.createdBy.toString() !== userId) {
      return res.status(403).send({ message: 'No tienes permiso para modificar este grupo' });
    }

    group.set(req.body);
    await group.save();

    await group.populate('members', 'name email');
    await group.populate('createdBy', 'name email');

    res.status(200).send(group);
  } catch (error) {
    res.status(400).send(error);
  }
});

groupRouter.delete('/groups/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).send({ message: 'Grupo no encontrado' });
    }

    // Solo el creador del grupo puede eliminarlo
    if (group.createdBy.toString() !== userId) {
      return res.status(403).send({ message: 'Solo el creador puede eliminar este grupo' });
    }

    await group.deleteOne();
    res.status(200).send(group);
  } catch (error) {
    res.status(500).send(error);
  }
});