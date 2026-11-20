import { describe, it, afterEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { Expense } from '../src/models/expense.js';
import { Group } from '../src/models/group.js';
import { Payment } from '../src/models/payment.js';
import { User } from '../src/models/user.js';
import { calculateBalances, simplifyDebts } from '../src/utils/simplifyDebts.js';
import { getSimplifiedExpenses } from '../src/controllers/expenseController.js';
import { createMockReq, createMockRes } from './helpers/mockExpress.js';

const sumBalances = (balances: Map<string, number>) => [...balances.values()].reduce((a, b) => a + b, 0);

describe('Utilidad simplifyDebts', () => {
  const A = 'a', B = 'b', C = 'c';

  it('calcula saldos en reparto equitativo y la suma total es 0 aunque los shares sean 33.33', () => {
    const balances = calculateBalances([
      { payerId: A, amount: 100, participants: [{ userId: A, share: 33.33 }, { userId: B, share: 33.33 }, { userId: C, share: 33.33 }] },
    ]);

    assert.equal(sumBalances(balances), 0);
    assert.equal(balances.get(A), 6666);
    // B y C deben 33.33 o 33.34 cada uno
    assert.ok([-3333, -3334].includes(balances.get(B)!));
    assert.ok([-3333, -3334].includes(balances.get(C)!));
  });

  it('respeta los porcentajes en modo percentage', () => {
    const balances = calculateBalances([
      { payerId: A, amount: 200, participants: [{ userId: A, share: 50 }, { userId: B, share: 30 }, { userId: C, share: 20 }] },
    ]);

    assert.equal(balances.get(A), 10000);
    assert.equal(balances.get(B), -6000);
    assert.equal(balances.get(C), -4000);
  });

  it('reduce las deudas en cadena a una sola transferencia', () => {
    // A paga por B, B paga por C, C paga por A (en cadena) con importes distintos
    const balances = calculateBalances([
      { payerId: A, amount: 30, participants: [{ userId: B, share: 100 }] },
      { payerId: B, amount: 30, participants: [{ userId: C, share: 100 }] },
    ]);

    const transactions = simplifyDebts(balances);
    assert.deepEqual(transactions, [{ from: C, to: A, amount: 30 }]);
  });

  it('descuenta los pagos completados del saldo', () => {
    const balances = calculateBalances(
      [{ payerId: A, amount: 50, participants: [{ userId: B, share: 100 }] }],
      [{ payerId: B, receiverId: A, amount: 20 }],
    );

    assert.deepEqual(simplifyDebts(balances), [{ from: B, to: A, amount: 30 }]);
  });

  it('no genera transferencias si todo está saldado e incluye miembros sin gastos', () => {
    const balances = calculateBalances(
      [{ payerId: A, amount: 10, participants: [{ userId: B, share: 100 }] }],
      [{ payerId: B, receiverId: A, amount: 10 }],
      [A, B, C],
    );

    assert.equal(balances.get(C), 0);
    assert.deepEqual(simplifyDebts(balances), []);
  });

  it('genera como máximo n-1 transferencias y salda todas las deudas', () => {
    const users = ['u1', 'u2', 'u3', 'u4', 'u5'];
    const all = users.map((u) => ({ userId: u, share: 20 }));
    const balances = calculateBalances([
      { payerId: 'u1', amount: 123.45, participants: all },
      { payerId: 'u2', amount: 67.89, participants: all },
      { payerId: 'u3', amount: 10, participants: [{ userId: 'u4', share: 60 }, { userId: 'u5', share: 40 }] },
    ]);

    const transactions = simplifyDebts(balances);
    assert.ok(transactions.length <= users.length - 1);

    // Aplicar las transferencias debe dejar todos los saldos a 0
    const after = new Map(balances);
    for (const t of transactions) {
      after.set(t.from, after.get(t.from)! + Math.round(t.amount * 100));
      after.set(t.to, after.get(t.to)! - Math.round(t.amount * 100));
    }
    assert.ok([...after.values()].every((v) => v === 0));
  });
});

describe('Controlador getSimplifiedExpenses', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const groupId = new Types.ObjectId().toString();
  const userA = new Types.ObjectId().toString();
  const userB = new Types.ObjectId().toString();
  const outsider = new Types.ObjectId().toString();

  const mockGroup = {
    _id: new Types.ObjectId(groupId),
    createdBy: new Types.ObjectId(userA),
    members: [new Types.ObjectId(userA), new Types.ObjectId(userB)],
  };

  it('debe devolver 400 si el groupId no es válido', async () => {
    const req = createMockReq({ user: { id: userA }, params: { groupId: 'no-valido' } });
    const res = createMockRes();

    await getSimplifiedExpenses(req, res);

    assert.equal(res.statusCode, 400);
  });

  it('debe devolver 404 si el grupo no existe', async () => {
    vi.spyOn(Group, 'findById').mockImplementation((async () => null) as any);
    const req = createMockReq({ user: { id: userA }, params: { groupId } });
    const res = createMockRes();

    await getSimplifiedExpenses(req, res);

    assert.equal(res.statusCode, 404);
  });

  it('debe devolver 403 si el usuario no pertenece al grupo', async () => {
    vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);
    const req = createMockReq({ user: { id: outsider }, params: { groupId } });
    const res = createMockRes();

    await getSimplifiedExpenses(req, res);

    assert.equal(res.statusCode, 403);
  });

  it('debe devolver saldos y transferencias simplificadas del grupo', async () => {
    vi.spyOn(Group, 'findById').mockImplementation((async () => mockGroup) as any);
    vi.spyOn(Expense, 'find').mockImplementation((async () => [
      {
        payerId: new Types.ObjectId(userA),
        amount: 60,
        participants: [
          { userId: new Types.ObjectId(userA), share: 50 },
          { userId: new Types.ObjectId(userB), share: 50 },
        ],
      },
    ]) as any);
    vi.spyOn(Payment, 'find').mockImplementation((async () => [
      { payerId: new Types.ObjectId(userB), receiverId: new Types.ObjectId(userA), amount: 10 },
    ]) as any);
    vi.spyOn(User, 'find').mockImplementation((async () => [
      { _id: new Types.ObjectId(userA), name: 'Ana', email: 'ana@test.com' },
      { _id: new Types.ObjectId(userB), name: 'Beto', email: 'beto@test.com' },
    ]) as any);

    const req = createMockReq({ user: { id: userB }, params: { groupId } });
    const res = createMockRes();

    await getSimplifiedExpenses(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.groupId, groupId);
    assert.deepEqual(res.body.balances, [
      { user: { _id: userA, name: 'Ana', email: 'ana@test.com' }, balance: 20 },
      { user: { _id: userB, name: 'Beto', email: 'beto@test.com' }, balance: -20 },
    ]);
    assert.deepEqual(res.body.transactions, [
      {
        from: { _id: userB, name: 'Beto', email: 'beto@test.com' },
        to: { _id: userA, name: 'Ana', email: 'ana@test.com' },
        amount: 20,
      },
    ]);
  });
});
