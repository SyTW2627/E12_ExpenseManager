import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { Payment } from '../src/models/payment.js';
import { Group } from '../src/models/group.js';
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} from '../src/controllers/paymentController.js';
import { createMockReq, createMockRes } from './helpers/mockExpress.js';

describe('Controlador paymentController', () => {
  const groupId = new Types.ObjectId().toString();
  const payerId = new Types.ObjectId().toString();
  const receiverId = new Types.ObjectId().toString();
  const outsiderId = new Types.ObjectId().toString();

  describe('createPayment', () => {
    it('debe devolver 400 si groupId o receiverId no son ObjectIds válidos', async () => {
      const req = createMockReq({
        user: { id: payerId },
        body: { groupId: 'invalido', receiverId, amount: 20 },
      });
      const res = createMockRes();

      await createPayment(req, res);

      assert.equal(res.statusCode, 400);
    });

    it('debe devolver 400 si el usuario intenta hacerse un pago a sí mismo', async () => {
      const req = createMockReq({
        user: { id: payerId },
        body: { groupId, receiverId: payerId, amount: 20 },
      });
      const res = createMockRes();

      await createPayment(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'No puedes hacerte un pago a ti mismo' });
    });

    it('debe devolver 403 si el pagador no pertenece al grupo', async (t) => {
      t.mock.method(Group, 'findById', async () => ({
        createdBy: new Types.ObjectId(receiverId),
        members: [new Types.ObjectId(receiverId)],
      }));

      const req = createMockReq({
        user: { id: outsiderId },
        body: { groupId, receiverId, amount: 20 },
      });
      const res = createMockRes();

      await createPayment(req, res);

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { message: 'No perteneces a este grupo' });
    });

    it('debe crear el pago con status pending por defecto y devolver 201', async (t) => {
      t.mock.method(Group, 'findById', async () => ({
        createdBy: new Types.ObjectId(payerId),
        members: [new Types.ObjectId(payerId), new Types.ObjectId(receiverId)],
      }));
      t.mock.method(Payment.prototype, 'save', async function (this: any) {
        return this;
      });
      t.mock.method(Payment.prototype, 'populate', async function (this: any) {
        return this;
      });

      const req = createMockReq({
        user: { id: payerId },
        body: { groupId, receiverId, amount: 50 },
      });
      const res = createMockRes();

      await createPayment(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.amount, 50);
      assert.equal(res.body.status, 'pending');
      assert.equal(res.body.payerId.toString(), payerId);
    });
  });

  describe('getPayments y getPaymentById', () => {
    it('getPayments debe devolver 200 con la lista de pagos del usuario', async (t) => {
      t.mock.method(Payment, 'find', () => ({
        populate: () => ({
          populate: async () => [{ amount: 30, status: 'pending' }],
        }),
      }));

      const req = createMockReq({ user: { id: payerId }, query: { groupId } });
      const res = createMockRes();

      await getPayments(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.length, 1);
    });

    it('getPaymentById debe devolver 403 si el usuario no es ni pagador ni receptor', async (t) => {
      t.mock.method(Payment, 'findById', () => ({
        populate: () => ({
          populate: async () => ({
            payerId: { _id: new Types.ObjectId(payerId) },
            receiverId: { _id: new Types.ObjectId(receiverId) },
            amount: 30,
          }),
        }),
      }));

      const req = createMockReq({
        user: { id: outsiderId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getPaymentById(req, res);

      assert.equal(res.statusCode, 403);
    });
  });

  describe('updatePayment', () => {
    it('debe devolver 403 si quien intenta confirmar el pago no es el receptor', async (t) => {
      t.mock.method(Payment, 'findById', async () => ({
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'pending',
      }));

      const req = createMockReq({
        user: { id: payerId }, // El pagador no puede auto-confirmarse el pago
        params: { id: new Types.ObjectId().toString() },
        body: { status: 'completed' },
      });
      const res = createMockRes();

      await updatePayment(req, res);

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { message: 'Solo el receptor puede confirmar este pago' });
    });

    it('debe confirmar el pago (status = completed) cuando lo solicita el receptor', async (t) => {
      const mockPayment: any = {
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'pending',
        save: async function () {
          return this;
        },
        populate: async function () {
          return this;
        },
      };
      t.mock.method(Payment, 'findById', async () => mockPayment);

      const req = createMockReq({
        user: { id: receiverId },
        params: { id: new Types.ObjectId().toString() },
        body: { status: 'completed' },
      });
      const res = createMockRes();

      await updatePayment(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockPayment.status, 'completed');
    });
  });

  describe('deletePayment', () => {
    it('debe devolver 400 si se intenta eliminar un pago que ya está completado', async (t) => {
      t.mock.method(Payment, 'findById', async () => ({
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'completed',
      }));

      const req = createMockReq({
        user: { id: payerId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deletePayment(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'No se puede eliminar un pago ya completado' });
    });

    it('debe eliminar un pago pendiente cuando lo solicita el pagador', async (t) => {
      let deleted = false;
      t.mock.method(Payment, 'findById', async () => ({
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'pending',
        deleteOne: async () => {
          deleted = true;
        },
      }));

      const req = createMockReq({
        user: { id: payerId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deletePayment(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(deleted, true);
    });
  });
});