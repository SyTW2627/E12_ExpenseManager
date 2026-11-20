import { describe, it, afterEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { Expense } from '../src/models/expense.js';
import { Group } from '../src/models/group.js';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from '../src/controllers/expenseController.js';
import { createMockReq, createMockRes } from './helpers/mockExpress.js';

describe('Controlador expenseController', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const groupId = new Types.ObjectId().toString();
  const userA = new Types.ObjectId().toString();
  const userB = new Types.ObjectId().toString();
  const userC = new Types.ObjectId().toString();
  const outsider = new Types.ObjectId().toString();

  const mockGroup = {
    _id: new Types.ObjectId(groupId),
    createdBy: new Types.ObjectId(userA),
    members: [new Types.ObjectId(userA), new Types.ObjectId(userB), new Types.ObjectId(userC)],
  };

  describe('createExpense', () => {
    it('debe devolver 403 si el usuario que intenta crear el gasto no pertenece al grupo', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: outsider },
        body: { groupId, concept: 'Cena', amount: 60 },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { message: 'No perteneces a este grupo' });
    });

    it('debe calcular automáticamente el reparto equitativo (33.33%) entre los miembros si no se envían participants', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);
      vi.spyOn(Expense.prototype, 'save').mockImplementation((async function (this: any) {
        return this;
      }) as any);
      vi.spyOn(Expense.prototype, 'populate').mockImplementation((async function (this: any) {
        return this;
      }) as any);

      const req = createMockReq({
        user: { id: userA },
        body: { groupId, concept: 'Supermercado', amount: 90 },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.concept, 'Supermercado');
      assert.equal(res.body.splitMode, 'equal');
      assert.equal(res.body.participants.length, 3);
      assert.equal(res.body.participants[0].share, 33.33);
    });

    it('debe devolver 400 en modo percentage si la suma de shares no es 100%', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        body: {
          groupId,
          concept: 'Internet',
          amount: 40,
          splitMode: 'percentage',
          participants: [
            { userId: userA, share: 50 },
            { userId: userB, share: 20 }, // Suma 70% != 100%
          ],
        },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'La suma de los porcentajes debe ser 100%' });
    });

    it('debe crear el gasto en modo percentage cuando los porcentajes suman 100%', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);
      vi.spyOn(Expense.prototype, 'save').mockImplementation((async function (this: any) {
        return this;
      }) as any);
      vi.spyOn(Expense.prototype, 'populate').mockImplementation((async function (this: any) {
        return this;
      }) as any);

      const req = createMockReq({
        user: { id: userA },
        body: {
          groupId,
          concept: 'Internet',
          amount: 40,
          splitMode: 'percentage',
          participants: [
            { userId: userA, share: 50 },
            { userId: userB, share: 25 },
            { userId: userC, share: 25 },
          ],
        },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.splitMode, 'percentage');
      assert.equal(res.body.participants[0].share, 50);
    });
  });

  describe('getExpenses y getExpenseById', () => {
    it('getExpenses debe devolver 403 si el usuario consulta un grupo al que no pertenece', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({ user: { id: outsider }, query: { groupId } });
      const res = createMockRes();

      await getExpenses(req, res);

      assert.equal(res.statusCode, 403);
    });

    it('getExpenses debe devolver 200 con los gastos del grupo para un miembro válido', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);
      vi.spyOn(Expense, 'find').mockImplementation((() => ({
        sort: () => ({
          populate: () => ({
            populate: async () => [{ concept: 'Vuelos', amount: 320 }],
          }),
        }),
      })) as any);

      const req = createMockReq({ user: { id: userB }, query: { groupId } });
      const res = createMockRes();

      await getExpenses(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.length, 1);
    });

    it('getExpenseById debe devolver 403 si el usuario no pertenece al grupo del gasto', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((() => ({
        populate: () => ({
          populate: async () => ({
            _id: new Types.ObjectId(),
            groupId: new Types.ObjectId(groupId),
            concept: 'Secreto',
          }),
        }),
      })) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: outsider },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getExpenseById(req, res);

      assert.equal(res.statusCode, 403);
    });
  });

  describe('updateExpense', () => {
    it('debe recalcular automáticamente el share equitativo al cambiar splitMode de percentage a equal', async () => {
      const mockExpense: any = {
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userA),
        concept: 'Cena',
        amount: 100,
        splitMode: 'percentage',
        participants: [
          { userId: new Types.ObjectId(userA), share: 70 },
          { userId: new Types.ObjectId(userB), share: 30 },
        ],
        set(updates: any) {
          Object.assign(this, updates);
        },
        save: async function () {
          return this;
        },
        populate: async function () {
          return this;
        },
      };

      vi.spyOn(Expense, 'findById').mockImplementation((async () => mockExpense) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { splitMode: 'equal' },
      });
      const res = createMockRes();

      await updateExpense(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockExpense.splitMode, 'equal');
      assert.equal(mockExpense.participants[0].share, 50);
      assert.equal(mockExpense.participants[1].share, 50);
    });

    it('debe devolver 400 si se cambia a percentage sin especificar los nuevos porcentajes', async () => {
      const mockExpense: any = {
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userA),
        splitMode: 'equal',
        participants: [
          { userId: new Types.ObjectId(userA), share: 50 },
          { userId: new Types.ObjectId(userB), share: 50 },
        ],
      };

      vi.spyOn(Expense, 'findById').mockImplementation((async () => mockExpense) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { splitMode: 'percentage' },
      });
      const res = createMockRes();

      await updateExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /debes especificar los porcentajes/);
    });
  });

  describe('deleteExpense', () => {
    it('debe devolver 403 si quien intenta borrar no es el pagador ni el creador del grupo', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((async () => ({
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userB),
      })) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any); // userA es el creador

      const req = createMockReq({
        user: { id: userC }, // userC no es ni pagador (userB) ni creador del grupo (userA)
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deleteExpense(req, res);

      assert.equal(res.statusCode, 403);
    });

    it('debe eliminar el gasto y devolver 200 si lo solicita el pagador o el creador del grupo', async () => {
      let deleted = false;
      vi.spyOn(Expense, 'findById').mockImplementation((async () => ({
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userB),
        deleteOne: async () => {
          deleted = true;
        },
      })) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any); // userA es creador del grupo

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deleteExpense(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(deleted, true);
    });
  });
});
