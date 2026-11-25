import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { Expense } from '../src/models/expense.js';
import { Group } from '../src/models/group.js';
import { Notification } from '../src/models/notification.js';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from '../src/controllers/expenseController.js';
import { createMockReq, createMockRes } from './helpers/mockExpress.js';

describe('Controlador expenseController', () => {
  beforeEach(() => {
    vi.spyOn(Notification, 'insertMany').mockResolvedValue([] as any);
  });

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
    it('debe devolver 400 si groupId no es un ObjectId válido', async () => {
      const req = createMockReq({
        user: { id: userA },
        body: { groupId: 'no-valido', concept: 'Cena', amount: 60 },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'El groupId no es válido' });
    });

    it('debe devolver 404 si el grupo no existe', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => null) as any);

      const req = createMockReq({
        user: { id: userA },
        body: { groupId, concept: 'Cena', amount: 60 },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Grupo no encontrado' });
    });

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

    it('debe devolver 400 si payerId no pertenece al grupo o es inválido', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        body: { groupId, payerId: outsider, concept: 'Cena', amount: 60 },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'El pagador debe ser miembro del grupo' });
    });

    it('en modo allOrNothing, debe devolver 403 si payerId es distinto al usuario autenticado', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        body: { groupId, payerId: userB, concept: 'Ronda', amount: 30, splitMode: 'allOrNothing' },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { message: 'Solo quien paga el gasto puede jugar a Todo o nada' });
    });

    it('en modo allOrNothing, debe devolver 400 si solo participa quien paga', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        body: {
          groupId,
          concept: 'Ronda',
          amount: 30,
          splitMode: 'allOrNothing',
          participants: [{ userId: userA, share: 100 }],
        },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Todo o nada necesita al menos dos miembros en el grupo' });
    });

    it('en modo allOrNothing, debe devolver 400 si un participante no pertenece al grupo', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        body: { groupId, concept: 'Ronda', amount: 30, splitMode: 'allOrNothing', participants: [{ userId: outsider, share: 0 }] },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Todos los participantes deben pertenecer al grupo' });
    });

    it('en modo allOrNothing, solo juegan quien paga y los participantes elegidos', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);
      vi.spyOn(Expense.prototype, 'save').mockImplementation((async function (this: any) { return this; }) as any);
      vi.spyOn(Expense.prototype, 'populate').mockImplementation((async function (this: any) { return this; }) as any);

      for (let i = 0; i < 20; i++) {
        const req = createMockReq({
          user: { id: userA },
          body: { groupId, concept: 'Ronda', amount: 30, splitMode: 'allOrNothing', participants: [{ userId: userB, share: 0 }] },
        });
        const res = createMockRes();

        await createExpense(req, res);

        assert.equal(res.statusCode, 201);
        const ids = res.body.participants.map((p: any) => p.userId.toString());
        assert.deepEqual(ids, res.body.allOrNothingResult === 'payerPaysAll' ? [userA] : [userB]);
      }
    });

    it('en modo allOrNothing, debe devolver 400 si el grupo tiene menos de 2 miembros', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => ({
        _id: new Types.ObjectId(groupId),
        createdBy: new Types.ObjectId(userA),
        members: [new Types.ObjectId(userA)],
      })) as any);

      const req = createMockReq({
        user: { id: userA },
        body: { groupId, concept: 'Ronda', amount: 30, splitMode: 'allOrNothing' },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, {
        message: 'Todo o nada necesita al menos dos miembros en el grupo',
      });
    });

    it('debe crear un gasto válido en modo allOrNothing asignando allOrNothingResult y participantes', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);
      vi.spyOn(Expense.prototype, 'save').mockImplementation((async function (this: any) {
        return this;
      }) as any);
      vi.spyOn(Expense.prototype, 'populate').mockImplementation((async function (this: any) {
        return this;
      }) as any);

      const req = createMockReq({
        user: { id: userA },
        body: { groupId, concept: 'Ronda', amount: 30, splitMode: 'allOrNothing' },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.splitMode, 'allOrNothing');
      assert.ok(['payerPaysAll', 'othersPayAll'].includes(res.body.allOrNothingResult));
      assert.ok(res.body.participants.length >= 1);
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

    it('debe devolver 400 si alguno de los participantes enviados no pertenece al grupo', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        body: {
          groupId,
          concept: 'Cena',
          amount: 40,
          participants: [
            { userId: userA, share: 50 },
            { userId: outsider, share: 50 },
          ],
        },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Todos los participantes deben pertenecer al grupo' });
    });

    it('debe crear el gasto en modo equal cuando se envían participantes explícitos válidos', async () => {
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
          concept: 'Taxi',
          amount: 20,
          splitMode: 'equal',
          participants: [
            { userId: userA, share: 50 },
            { userId: userB, share: 50 },
          ],
        },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.splitMode, 'equal');
      assert.equal(res.body.participants.length, 2);
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

    it('debe devolver 400 si falla al guardar el gasto', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);
      vi.spyOn(Expense.prototype, 'save').mockImplementation((async () => {
        throw new Error('Validation error');
      }) as any);

      const req = createMockReq({
        user: { id: userA },
        body: { groupId, concept: 'Supermercado', amount: -10 },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 400);
    });
  });

  describe('getExpenses y getExpenseById', () => {
    it('getExpenses debe devolver 400 si groupId no es válido', async () => {
      const req = createMockReq({ user: { id: userA }, query: { groupId: 'invalido' } });
      const res = createMockRes();

      await getExpenses(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'groupId inválido' });
    });

    it('getExpenses debe devolver 404 si el grupo consultado no existe', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => null) as any);

      const req = createMockReq({ user: { id: userA }, query: { groupId } });
      const res = createMockRes();

      await getExpenses(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Grupo no encontrado' });
    });

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

    it('getExpenses sin groupId filtra por usuario autenticado y payerId si se indica', async () => {
      let capturedFilter: Record<string, unknown> | undefined;
      vi.spyOn(Expense, 'find').mockImplementation(((filter: Record<string, unknown>) => {
        capturedFilter = filter;
        return {
          sort: () => ({
            populate: () => ({
              populate: async () => [],
            }),
          }),
        };
      }) as any);

      const req = createMockReq({ user: { id: userA }, query: { payerId: userB } });
      const res = createMockRes();

      await getExpenses(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(capturedFilter?.$or, [{ payerId: userA }, { 'participants.userId': userA }]);
      assert.equal(capturedFilter?.payerId, userB);
    });

    it('getExpenses debe devolver 500 si Expense.find falla', async () => {
      vi.spyOn(Expense, 'find').mockImplementation((() => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({ user: { id: userA }, query: {} });
      const res = createMockRes();

      await getExpenses(req, res);

      assert.equal(res.statusCode, 500);
    });

    it('getExpenseById debe devolver 404 si el gasto no existe', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((() => ({
        populate: () => ({
          populate: async () => null,
        }),
      })) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getExpenseById(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Gasto no encontrado' });
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

    it('getExpenseById debe devolver 200 si el usuario pertenece al grupo del gasto', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((() => ({
        populate: () => ({
          populate: async () => ({
            _id: new Types.ObjectId(),
            groupId: new Types.ObjectId(groupId),
            concept: 'Vuelos',
          }),
        }),
      })) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userB },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getExpenseById(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.concept, 'Vuelos');
    });

    it('getExpenseById debe devolver 500 si Expense.findById falla', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((() => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getExpenseById(req, res);

      assert.equal(res.statusCode, 500);
    });
  });

  describe('updateExpense', () => {
    it('debe devolver 400 si se intenta actualizar un campo no permitido', async () => {
      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { groupId },
      });
      const res = createMockRes();

      await updateExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Actualización no permitida' });
    });

    it('debe devolver 404 si el gasto no existe', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((async () => null) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { concept: 'Nuevo' },
      });
      const res = createMockRes();

      await updateExpense(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Gasto no encontrado' });
    });

    it('debe devolver 404 si el grupo asociado al gasto no existe', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((async () => ({
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userA),
      })) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => null) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { concept: 'Nuevo' },
      });
      const res = createMockRes();

      await updateExpense(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Grupo asociado no encontrado' });
    });

    it('debe devolver 403 si quien intenta editar no es el pagador ni el creador del grupo', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((async () => ({
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userB),
      })) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userC },
        params: { id: new Types.ObjectId().toString() },
        body: { concept: 'Nuevo' },
      });
      const res = createMockRes();

      await updateExpense(req, res);

      assert.equal(res.statusCode, 403);
    });

    it('en un gasto allOrNothing, rechaza editar campos distintos a concept y amount y permite editar solo estos', async () => {
      const mockAllOrNothing: any = {
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userA),
        concept: 'Ronda',
        amount: 20,
        splitMode: 'allOrNothing',
        participants: [{ userId: new Types.ObjectId(userA), share: 100 }],
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
      vi.spyOn(Expense, 'findById').mockImplementation((async () => mockAllOrNothing) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const badReq = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { splitMode: 'equal' },
      });
      const badRes = createMockRes();
      await updateExpense(badReq, badRes);
      assert.equal(badRes.statusCode, 400);

      const goodReq = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { concept: 'Ronda editada', amount: 25 },
      });
      const goodRes = createMockRes();
      await updateExpense(goodReq, goodRes);
      assert.equal(goodRes.statusCode, 200);
      assert.equal(mockAllOrNothing.concept, 'Ronda editada');
      assert.equal(mockAllOrNothing.amount, 25);
    });

    it('debe devolver 400 si se intenta cambiar un gasto existente a modo allOrNothing', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((async () => ({
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userA),
        splitMode: 'equal',
        participants: [{ userId: new Types.ObjectId(userA), share: 100 }],
      })) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { splitMode: 'allOrNothing' },
      });
      const res = createMockRes();

      await updateExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Todo o nada solo se puede elegir al crear el gasto' });
    });

    it('debe devolver 400 si el nuevo payerId no pertenece al grupo', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((async () => ({
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userA),
        splitMode: 'equal',
        participants: [{ userId: new Types.ObjectId(userA), share: 100 }],
      })) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { payerId: outsider },
      });
      const res = createMockRes();

      await updateExpense(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'El nuevo pagador debe pertenecer al grupo' });
    });

    it('debe devolver 400 si participants queda vacío o contiene usuarios fuera del grupo', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((async () => ({
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userA),
        splitMode: 'equal',
        participants: [{ userId: new Types.ObjectId(userA), share: 100 }],
      })) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const emptyReq = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { participants: [] },
      });
      const emptyRes = createMockRes();
      await updateExpense(emptyReq, emptyRes);
      assert.equal(emptyRes.statusCode, 400);
      assert.deepEqual(emptyRes.body, { message: 'El gasto debe tener al menos un participante' });

      const outsiderReq = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { participants: [{ userId: outsider, share: 100 }] },
      });
      const outsiderRes = createMockRes();
      await updateExpense(outsiderReq, outsiderRes);
      assert.equal(outsiderRes.statusCode, 400);
      assert.deepEqual(outsiderRes.body, { message: 'Todos los participantes deben pertenecer al grupo' });
    });

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
        body: { splitMode: 'equal', payerId: userB },
      });
      const res = createMockRes();

      await updateExpense(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockExpense.splitMode, 'equal');
      assert.equal(mockExpense.participants[0].share, 50);
      assert.equal(mockExpense.participants[1].share, 50);
    });

    it('debe devolver 400 si se cambia a percentage sin especificar los nuevos porcentajes o si no suman 100%', async () => {
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

      const reqNoParts = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { splitMode: 'percentage' },
      });
      const resNoParts = createMockRes();

      await updateExpense(reqNoParts, resNoParts);

      assert.equal(resNoParts.statusCode, 400);
      assert.match(resNoParts.body.message, /debes especificar los porcentajes/);

      const reqBadSum = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: {
          splitMode: 'percentage',
          participants: [
            { userId: userA, share: 60 },
            { userId: userB, share: 20 },
          ],
        },
      });
      const resBadSum = createMockRes();

      await updateExpense(reqBadSum, resBadSum);

      assert.equal(resBadSum.statusCode, 400);
      assert.deepEqual(resBadSum.body, { message: 'La suma de los porcentajes debe ser 100%' });

      const validMockExpense: any = {
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userA),
        splitMode: 'equal',
        participants: [
          { userId: new Types.ObjectId(userA), share: 50 },
          { userId: new Types.ObjectId(userB), share: 50 },
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
      vi.spyOn(Expense, 'findById').mockImplementation((async () => validMockExpense) as any);

      const reqGoodPct = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: {
          splitMode: 'percentage',
          participants: [
            { userId: userA, share: 75 },
            { userId: userB, share: 25 },
          ],
        },
      });
      const resGoodPct = createMockRes();

      await updateExpense(reqGoodPct, resGoodPct);

      assert.equal(resGoodPct.statusCode, 200);
      assert.equal(validMockExpense.splitMode, 'percentage');
      assert.equal(validMockExpense.participants[0].share, 75);
    });

    it('debe devolver 400 si save falla al actualizar el gasto', async () => {
      const mockExpense: any = {
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(userA),
        splitMode: 'equal',
        participants: [{ userId: new Types.ObjectId(userA), share: 100 }],
        set() {},
        save: async () => {
          throw new Error('Save failed');
        },
      };
      vi.spyOn(Expense, 'findById').mockImplementation((async () => mockExpense) as any);
      vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
        body: { amount: -1 },
      });
      const res = createMockRes();

      await updateExpense(req, res);

      assert.equal(res.statusCode, 400);
    });
  });

  describe('deleteExpense', () => {
    it('debe devolver 404 si el gasto a eliminar no existe', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((async () => null) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deleteExpense(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Gasto no encontrado' });
    });

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

    it('debe devolver 500 si Expense.findById falla al eliminar', async () => {
      vi.spyOn(Expense, 'findById').mockImplementation((async () => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({
        user: { id: userA },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deleteExpense(req, res);

      assert.equal(res.statusCode, 500);
    });
  });

  describe('notificaciones automáticas en createExpense', () => {
    it('debe crear notificaciones expense_created para el resto de miembros del grupo (excluyendo al creador)', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => ({
        ...mockGroup,
        name: 'Viaje a Lisboa',
      })) as any);
      vi.spyOn(Expense.prototype, 'save').mockImplementation((async function (this: any) {
        return this;
      }) as any);
      vi.spyOn(Expense.prototype, 'populate').mockImplementation((async function (this: any) {
        Object.defineProperty(this, 'payerId', {
          value: { _id: new Types.ObjectId(userA), name: 'Ana García', email: 'ana@gmail.com' },
          configurable: true,
        });
        return this;
      }) as any);

      const insertSpy = vi.spyOn(Notification, 'insertMany').mockResolvedValue([] as any);

      const req = createMockReq({
        user: { id: userA },
        body: { groupId, concept: 'Vuelos', amount: 120 },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(insertSpy.mock.calls.length, 1);
      const insertedDocs = insertSpy.mock.calls[0]?.[0] as any[];
      assert.equal(insertedDocs.length, 2);
      assert.deepEqual(
        insertedDocs.map((d) => d.userId),
        [userB, userC]
      );
      assert.equal(insertedDocs[0].type, 'expense_created');
      assert.equal(insertedDocs[0].groupId, groupId);
      assert.match(insertedDocs[0].message, /Ana García ha añadido "Vuelos"/);
    });

    it('debe crear notificaciones all_or_nothing al jugar a Todo o nada', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => ({
        ...mockGroup,
        name: 'Piso compartido',
      })) as any);
      vi.spyOn(Expense.prototype, 'save').mockImplementation((async function (this: any) {
        return this;
      }) as any);
      vi.spyOn(Expense.prototype, 'populate').mockImplementation((async function (this: any) {
        Object.defineProperty(this, 'payerId', {
          value: { _id: new Types.ObjectId(userA), name: 'Ana García', email: 'ana@gmail.com' },
          configurable: true,
        });
        return this;
      }) as any);

      const insertSpy = vi.spyOn(Notification, 'insertMany').mockResolvedValue([] as any);

      const req = createMockReq({
        user: { id: userA },
        body: { groupId, concept: 'Pizza', amount: 25, splitMode: 'allOrNothing' },
      });
      const res = createMockRes();

      await createExpense(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(insertSpy.mock.calls.length, 1);
      const insertedDocs = insertSpy.mock.calls[0]?.[0] as any[];
      assert.equal(insertedDocs.length, 2);
      assert.equal(insertedDocs[0].type, 'all_or_nothing');
      assert.match(insertedDocs[0].message, /Todo o nada con "Pizza"/);
    });
  });
});
