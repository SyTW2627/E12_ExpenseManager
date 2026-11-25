import type { Response } from 'express';
import { randomInt } from 'node:crypto';
import { isValidObjectId } from 'mongoose';
import { Expense } from '../models/expense.js';
import { Group } from '../models/group.js';
import { Payment } from '../models/payment.js';
import { User } from '../models/user.js';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { calculateBalances, simplifyDebts } from '../utils/simplifyDebts.js';
import { playAllOrNothing, type AllOrNothingResult } from '../utils/allOrNothing.js';

/**
 * Devuelve los gastos simplificados de un grupo: el saldo neto de cada miembro
 * y el mínimo número de transferencias necesarias para saldar todas las deudas.
 * Se tienen en cuenta los pagos ya completados entre miembros.
 */
export const getSimplifiedExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const groupId = String(req.params.groupId);

    if (!isValidObjectId(groupId)) {
      return res.status(400).send({ message: 'groupId inválido' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).send({ message: 'Grupo no encontrado' });
    }

    const isMember =
      group.members.some((m) => m.toString() === userId) || group.createdBy.toString() === userId;
    if (!isMember) {
      return res.status(403).send({ message: 'No tienes permiso para ver los gastos de este grupo' });
    }

    const expenses = await Expense.find({ groupId });
    const payments = await Payment.find({ groupId, status: 'completed' });

    const memberIds = [...new Set([...group.members.map((m) => m.toString()), group.createdBy.toString()])];
    const balances = calculateBalances(expenses, payments, memberIds);
    const transactions = simplifyDebts(balances);

    // Datos básicos de los usuarios implicados para que el cliente pueda mostrarlos
    const users = await User.find({ _id: { $in: [...balances.keys()] } }, 'name email');
    const userInfo = (id: string) => {
      const user = users.find((u) => u._id.toString() === id);
      return { _id: id, name: user?.name, email: user?.email };
    };

    res.status(200).send({
      groupId,
      balances: [...balances.entries()].map(([id, cents]) => ({
        user: userInfo(id),
        balance: cents / 100,
      })),
      transactions: transactions.map((t) => ({
        from: userInfo(t.from),
        to: userInfo(t.to),
        amount: t.amount,
      })),
    });
  } catch (error) {
    res.status(500).send(error);
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { groupId, concept, amount, splitMode = 'equal', payerId, participants } = req.body;

    if (!isValidObjectId(groupId)) {
      return res.status(400).send({ message: 'El groupId no es válido' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).send({ message: 'Grupo no encontrado' });
    }

    const isGroupMember = (id: string) =>
      group.members.some((m) => m.toString() === id) || group.createdBy.toString() === id;

    if (!isGroupMember(userId!)) {
      return res.status(403).send({ message: 'No perteneces a este grupo' });
    }

    // Si no se especifica un pagador por defecto es el usuario autenticado
    const finalPayerId = payerId || userId;
    if (!isValidObjectId(finalPayerId) || !isGroupMember(finalPayerId.toString())) {
      return res.status(400).send({ message: 'El pagador debe ser miembro del grupo' });
    }

    let finalParticipants = participants;
    let allOrNothingResult: AllOrNothingResult | undefined;

    if (splitMode === 'allOrNothing') {
      if (finalPayerId.toString() !== userId) {
        return res.status(403).send({ message: 'Solo quien paga el gasto puede jugar a Todo o nada' });
      }
      const memberIds = [...new Set([...group.members.map((m) => m.toString()), group.createdBy.toString()])];
      const playerIds = participants === undefined
        ? memberIds
        : [...new Set([userId!, ...(Array.isArray(participants) ? participants : []).map((p: { userId: unknown }) => String(p.userId))])];
      if (playerIds.some((id) => !memberIds.includes(id))) {
        return res.status(400).send({ message: 'Todos los participantes deben pertenecer al grupo' });
      }
      if (playerIds.length < 2) {
        return res.status(400).send({ message: 'Todo o nada necesita al menos dos miembros en el grupo' });
      }

      const outcome = playAllOrNothing(userId!, playerIds);
      finalParticipants = outcome.participants;
      allOrNothingResult = outcome.result;
    } else if (!Array.isArray(finalParticipants) || finalParticipants.length === 0) {
      // Si no se envían participantes, por defecto participan todos los miembros del grupo a partes iguales
      const share = Math.round((100 / group.members.length) * 100) / 100;
      finalParticipants = group.members.map((memberId) => ({
        userId: memberId,
        share,
      }));
    } else {
      // Comprobar que todos los participantes enviados pertenezcan al grupo
      for (const p of finalParticipants) {
        if (!isValidObjectId(p.userId) || !isGroupMember(p.userId.toString())) {
          return res.status(400).send({ message: 'Todos los participantes deben pertenecer al grupo' });
        }
      }

      // Si es por porcentaje, verificar que sumen ~100%
      if (splitMode === 'percentage') {
        const totalShare = finalParticipants.reduce((acc, p) => acc + Number(p.share), 0);
        if (Math.abs(totalShare - 100) > 0.1) {
          return res.status(400).send({ message: 'La suma de los porcentajes debe ser 100%' });
        }
      }
    }

    if (splitMode === 'roulette') {
      const candidates: string[] = [...new Set<string>(finalParticipants.map((p: { userId: unknown }) => String(p.userId)))];
      if (candidates.length < 2) {
        return res.status(400).send({ message: 'La ruleta necesita al menos dos participantes' });
      }
      finalParticipants = [{ userId: candidates[randomInt(candidates.length)], share: 100 }];
    }

    const expense = new Expense({
      groupId,
      payerId: finalPayerId,
      concept,
      amount,
      splitMode,
      participants: finalParticipants,
      ...(allOrNothingResult ? { allOrNothingResult } : {}),
    });

    await expense.save();
    await expense.populate('payerId', 'name email');
    await expense.populate('participants.userId', 'name email');

    res.status(201).send(expense);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const filter: Record<string, unknown> = {};

    if (req.query.groupId) {
      const groupId = req.query.groupId.toString();
      if (!isValidObjectId(groupId)) {
        return res.status(400).send({ message: 'groupId inválido' });
      }

      // Verificar que el usuario pertenezca al grupo que consulta
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).send({ message: 'Grupo no encontrado' });
      }

      const isMember =
        group.members.some((m) => m.toString() === userId) || group.createdBy.toString() === userId;
      if (!isMember) {
        return res.status(403).send({ message: 'No tienes permiso para ver los gastos de este grupo' });
      }

      filter.groupId = groupId;
    } else {
      // Si no especifica grupo, devolver solo gastos donde el usuario es pagador o participante
      filter.$or = [{ payerId: userId }, { 'participants.userId': userId }];
    }

    if (req.query.payerId) {
      filter.payerId = req.query.payerId.toString();
    }

    const expenses = await Expense.find(filter)
      .sort({ createdAt: -1 }) // Más recientes primero
      .populate('payerId', 'name email')
      .populate('participants.userId', 'name email');

    res.status(200).send(expenses);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const getExpenseById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const expense = await Expense.findById(req.params.id)
      .populate('payerId', 'name email')
      .populate('participants.userId', 'name email');

    if (!expense) {
      return res.status(404).send({ message: 'Gasto no encontrado' });
    }

    // Verificar pertenencia al grupo del gasto
    const group = await Group.findById(expense.groupId);
    const isGroupMember =
      group && (group.members.some((m) => m.toString() === userId) || group.createdBy.toString() === userId);
    if (!isGroupMember) {
      return res.status(403).send({ message: 'No tienes permiso para ver este gasto' });
    }

    res.status(200).send(expense);
  } catch (error) {
    res.status(500).send(error);
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  const allowedUpdates = ['concept', 'amount', 'payerId', 'splitMode', 'participants'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ message: 'Actualización no permitida' });
  }

  try {
    const userId = req.user?.id;

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).send({ message: 'Gasto no encontrado' });
    }

    const group = await Group.findById(expense.groupId);
    if (!group) {
      return res.status(404).send({ message: 'Grupo asociado no encontrado' });
    }

    const isGroupMember = (id: string) =>
      group.members.some((m) => m.toString() === id) || group.createdBy.toString() === id;

    const isPayer = expense.payerId.toString() === userId;
    const isGroupCreator = group.createdBy.toString() === userId;

    if (!isPayer && !isGroupCreator) {
      return res.status(403).send({ message: 'Solo quien registró el gasto o el creador del grupo puede modificarlo' });
    }

    // El resultado de Todo o nada no se puede cambiar: solo se editan el concepto y el importe
    if (expense.splitMode === 'allOrNothing') {
      if (updates.some((update) => !['concept', 'amount'].includes(update))) {
        return res.status(400).send({ message: 'En un gasto de Todo o nada solo se puede editar el concepto y el importe' });
      }
    } else if (req.body.splitMode === 'allOrNothing') {
      return res.status(400).send({ message: 'Todo o nada solo se puede elegir al crear el gasto' });
    }

    if (expense.splitMode === 'roulette' ? updates.some((u) => !['concept', 'amount'].includes(u)) : req.body.splitMode === 'roulette') {
      return res.status(400).send({ message: 'El reparto de la ruleta no se puede modificar' });
    }

    // Si se actualiza el pagador, validar que pertenezca al grupo
    if (req.body.payerId) {
      if (!isValidObjectId(req.body.payerId) || !isGroupMember(req.body.payerId.toString())) {
        return res.status(400).send({ message: 'El nuevo pagador debe pertenecer al grupo' });
      }
    }

    // Se eligen las configuraciones anteriores si no se han definido nuevas
    const targetSplitMode = req.body.splitMode ?? expense.splitMode;
    const targetParticipants = req.body.participants ?? expense.participants;

    if (!Array.isArray(targetParticipants) || targetParticipants.length === 0) {
      return res.status(400).send({ message: 'El gasto debe tener al menos un participante' });
    }

    // Validar que todos los participantes pertenezcan al grupo
    for (const p of targetParticipants) {
      if (!isValidObjectId(p.userId) || !isGroupMember(p.userId.toString())) {
        return res.status(400).send({ message: 'Todos los participantes deben pertenecer al grupo' });
      }
    }

    // Recalcular o validar el share según el splitMode resultante
    if (targetSplitMode === 'equal') {
      // Recalculamos equitativamente el share de cada participante
      const equalShare = Math.round((100 / targetParticipants.length) * 100) / 100;
      req.body.participants = targetParticipants.map((p: { userId: unknown }) => ({
        userId: p.userId,
        share: equalShare,
      }));
    } else if (targetSplitMode === 'percentage') {
      // Si se cambia a percentage sin enviar los nuevos porcentajes, avisar
      if (req.body.splitMode === 'percentage' && !req.body.participants) {
        return res.status(400).send({
          message: 'Al cambiar a modo porcentaje debes especificar los porcentajes de los participantes'
        });
      }

      const totalShare = targetParticipants.reduce((acc: number, p: { share: number }) => acc + Number(p.share), 0);
      if (Math.abs(totalShare - 100) > 0.1) {
        return res.status(400).send({ message: 'La suma de los porcentajes debe ser 100%' });
      }
    }

    expense.set(req.body);
    await expense.save();

    await expense.populate('payerId', 'name email');
    await expense.populate('participants.userId', 'name email');

    res.status(200).send(expense);
  } catch (error) {
    res.status(400).send(error);
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).send({ message: 'Gasto no encontrado' });
    }

    const group = await Group.findById(expense.groupId);
    const isPayer = expense.payerId.toString() === userId;
    const isGroupCreator = group?.createdBy.toString() === userId;

    if (!isPayer && !isGroupCreator) {
      return res.status(403).send({ message: 'Solo quien registró el gasto o el creador del grupo puede eliminarlo' });
    }

    await expense.deleteOne();
    res.status(200).send(expense);
  } catch (error) {
    res.status(500).send(error);
  }
};