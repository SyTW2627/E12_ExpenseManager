import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { Payment } from '../src/models/payment.js';
import { Group } from '../src/models/group.js';
import { Notification } from '../src/models/notification.js';
import {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} from '../src/controllers/paymentController.js';
import { createMockReq, createMockRes } from './helpers/mockExpress.js';

describe('Controlador paymentController', () => {
  beforeEach(() => {
    vi.spyOn(Notification, 'create').mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    it('debe devolver 404 si el grupo no existe', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => null) as any);

      const req = createMockReq({
        user: { id: payerId },
        body: { groupId, receiverId, amount: 20 },
      });
      const res = createMockRes();

      await createPayment(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Grupo no encontrado' });
    });

    it('debe devolver 403 si el pagador no pertenece al grupo', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => ({
        createdBy: new Types.ObjectId(receiverId),
        members: [new Types.ObjectId(receiverId)],
      })) as any);

      const req = createMockReq({
        user: { id: outsiderId },
        body: { groupId, receiverId, amount: 20 },
      });
      const res = createMockRes();

      await createPayment(req, res);

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { message: 'No perteneces a este grupo' });
    });

    it('debe devolver 400 si el receptor no pertenece al grupo', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => ({
        createdBy: new Types.ObjectId(payerId),
        members: [new Types.ObjectId(payerId)],
      })) as any);

      const req = createMockReq({
        user: { id: payerId },
        body: { groupId, receiverId: outsiderId, amount: 20 },
      });
      const res = createMockRes();

      await createPayment(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'El receptor no pertenece a este grupo' });
    });

    it('debe crear el pago con status pending por defecto y devolver 201 (incluso si uno es solo createdBy)', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => ({
        createdBy: new Types.ObjectId(receiverId),
        members: [new Types.ObjectId(payerId)],
      })) as any);
      vi.spyOn(Payment.prototype, 'save').mockImplementation((async function (this: any) {
        return this;
      }) as any);
      vi.spyOn(Payment.prototype, 'populate').mockImplementation((async function (this: any) {
        return this;
      }) as any);

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

    it('debe devolver 400 si falla al guardar el pago', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => ({
        createdBy: new Types.ObjectId(payerId),
        members: [new Types.ObjectId(payerId), new Types.ObjectId(receiverId)],
      })) as any);
      vi.spyOn(Payment.prototype, 'save').mockImplementation((async () => {
        throw new Error('Validation error');
      }) as any);

      const req = createMockReq({
        user: { id: payerId },
        body: { groupId, receiverId, amount: -5 },
      });
      const res = createMockRes();

      await createPayment(req, res);

      assert.equal(res.statusCode, 400);
    });
  });

  describe('getPayments y getPaymentById', () => {
    it('getPayments debe devolver 200 con la lista de pagos del usuario', async () => {
      vi.spyOn(Payment, 'find').mockImplementation((() => ({
        populate: () => ({
          populate: async () => [{ amount: 30, status: 'pending' }],
        }),
      })) as any);

      const req = createMockReq({ user: { id: payerId }, query: { groupId } });
      const res = createMockRes();

      await getPayments(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.length, 1);
    });

    it('getPayments debe aplicar filtros de payerId y receiverId cuando se envían en query', async () => {
      let capturedFilter: Record<string, unknown> | undefined;
      vi.spyOn(Payment, 'find').mockImplementation(((filter: Record<string, unknown>) => {
        capturedFilter = filter;
        return {
          populate: () => ({
            populate: async () => [],
          }),
        };
      }) as any);

      const req = createMockReq({
        user: { id: payerId },
        query: { payerId, receiverId },
      });
      const res = createMockRes();

      await getPayments(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(capturedFilter?.payerId, payerId);
      assert.equal(capturedFilter?.receiverId, receiverId);
    });

    it('getPayments debe devolver 500 si Payment.find falla', async () => {
      vi.spyOn(Payment, 'find').mockImplementation((() => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({ user: { id: payerId } });
      const res = createMockRes();

      await getPayments(req, res);

      assert.equal(res.statusCode, 500);
    });

    it('getPaymentById debe devolver 404 si el pago no existe', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((() => ({
        populate: () => ({
          populate: async () => null,
        }),
      })) as any);

      const req = createMockReq({
        user: { id: payerId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getPaymentById(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Pago no encontrado' });
    });

    it('getPaymentById debe devolver 403 si el usuario no es ni pagador ni receptor', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((() => ({
        populate: () => ({
          populate: async () => ({
            payerId: { _id: new Types.ObjectId(payerId) },
            receiverId: { _id: new Types.ObjectId(receiverId) },
            amount: 30,
          }),
        }),
      })) as any);

      const req = createMockReq({
        user: { id: outsiderId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getPaymentById(req, res);

      assert.equal(res.statusCode, 403);
    });

    it('getPaymentById debe devolver 200 si el usuario es el pagador o el receptor', async () => {
      const mockPayment = {
        payerId: { _id: new Types.ObjectId(payerId) },
        receiverId: { _id: new Types.ObjectId(receiverId) },
        amount: 30,
      };
      vi.spyOn(Payment, 'findById').mockImplementation((() => ({
        populate: () => ({
          populate: async () => mockPayment,
        }),
      })) as any);

      const req = createMockReq({
        user: { id: receiverId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getPaymentById(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.amount, 30);
    });

    it('getPaymentById debe devolver 500 si Payment.findById falla', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((() => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({
        user: { id: payerId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getPaymentById(req, res);

      assert.equal(res.statusCode, 500);
    });
  });

  describe('updatePayment', () => {
    it('debe devolver 400 si se intenta actualizar un campo distinto a status', async () => {
      const req = createMockReq({
        user: { id: receiverId },
        params: { id: new Types.ObjectId().toString() },
        body: { amount: 999 },
      });
      const res = createMockRes();

      await updatePayment(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Actualización no permitida' });
    });

    it('debe devolver 404 si el pago no existe', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((async () => null) as any);

      const req = createMockReq({
        user: { id: receiverId },
        params: { id: new Types.ObjectId().toString() },
        body: { status: 'completed' },
      });
      const res = createMockRes();

      await updatePayment(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Pago no encontrado' });
    });

    it('debe devolver 403 si quien intenta confirmar el pago no es el receptor', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((async () => ({
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'pending',
      })) as any);

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

    it('debe devolver 400 si status no es completed', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((async () => ({
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'pending',
      })) as any);

      const req = createMockReq({
        user: { id: receiverId },
        params: { id: new Types.ObjectId().toString() },
        body: { status: 'pending' },
      });
      const res = createMockRes();

      await updatePayment(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Solo se puede marcar el pago como completado' });
    });

    it('debe devolver 400 si el pago ya estaba completado', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((async () => ({
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'completed',
      })) as any);

      const req = createMockReq({
        user: { id: receiverId },
        params: { id: new Types.ObjectId().toString() },
        body: { status: 'completed' },
      });
      const res = createMockRes();

      await updatePayment(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'El pago ya está completado' });
    });

    it('debe confirmar el pago (status = completed) cuando lo solicita el receptor', async () => {
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
      vi.spyOn(Payment, 'findById').mockImplementation((async () => mockPayment) as any);

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

    it('debe devolver 400 si falla al guardar la actualización', async () => {
      const mockPayment: any = {
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'pending',
        save: async () => {
          throw new Error('Save failed');
        },
      };
      vi.spyOn(Payment, 'findById').mockImplementation((async () => mockPayment) as any);

      const req = createMockReq({
        user: { id: receiverId },
        params: { id: new Types.ObjectId().toString() },
        body: { status: 'completed' },
      });
      const res = createMockRes();

      await updatePayment(req, res);

      assert.equal(res.statusCode, 400);
    });
  });

  describe('deletePayment', () => {
    it('debe devolver 404 si el pago no existe', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((async () => null) as any);

      const req = createMockReq({
        user: { id: payerId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deletePayment(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Pago no encontrado' });
    });

    it('debe devolver 403 si quien intenta eliminar no es el pagador', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((async () => ({
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'pending',
      })) as any);

      const req = createMockReq({
        user: { id: receiverId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deletePayment(req, res);

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { message: 'Solo quien emitió el pago puede eliminarlo' });
    });

    it('debe devolver 400 si se intenta eliminar un pago que ya está completado', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((async () => ({
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'completed',
      })) as any);

      const req = createMockReq({
        user: { id: payerId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deletePayment(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'No se puede eliminar un pago ya completado' });
    });

    it('debe eliminar un pago pendiente cuando lo solicita el pagador', async () => {
      let deleted = false;
      vi.spyOn(Payment, 'findById').mockImplementation((async () => ({
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        status: 'pending',
        deleteOne: async () => {
          deleted = true;
        },
      })) as any);

      const req = createMockReq({
        user: { id: payerId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deletePayment(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(deleted, true);
    });

    it('debe devolver 500 si Payment.findById falla', async () => {
      vi.spyOn(Payment, 'findById').mockImplementation((async () => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({
        user: { id: payerId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deletePayment(req, res);

      assert.equal(res.statusCode, 500);
    });
  });

  describe('notificaciones automáticas en pagos', () => {
    it('createPayment debe crear una notificación payment_created para el receptor', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => ({
        createdBy: new Types.ObjectId(payerId),
        members: [new Types.ObjectId(payerId), new Types.ObjectId(receiverId)],
      })) as any);
      vi.spyOn(Payment.prototype, 'save').mockImplementation((async function (this: any) {
        return this;
      }) as any);
      vi.spyOn(Payment.prototype, 'populate').mockImplementation((async function (this: any) {
        Object.defineProperty(this, 'payerId', {
          value: { _id: new Types.ObjectId(payerId), name: 'Carlos Pérez', email: 'carlos@gmail.com' },
          configurable: true,
        });
        return this;
      }) as any);

      const createSpy = vi.spyOn(Notification, 'create').mockResolvedValue({} as any);

      const req = createMockReq({
        user: { id: payerId },
        body: { groupId, receiverId, amount: 50 },
      });
      const res = createMockRes();

      await createPayment(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(createSpy.mock.calls.length, 1);
      const doc = createSpy.mock.calls[0]?.[0] as any;
      assert.equal(doc.userId, receiverId);
      assert.equal(doc.groupId, groupId);
      assert.equal(doc.type, 'payment_created');
      assert.match(doc.message, /Carlos Pérez ha registrado un pago/);
    });

    it('updatePayment debe crear una notificación payment_completed para el pagador cuando el receptor confirma', async () => {
      const mockPayment: any = {
        groupId: new Types.ObjectId(groupId),
        payerId: new Types.ObjectId(payerId),
        receiverId: new Types.ObjectId(receiverId),
        amount: 35,
        status: 'pending',
        save: async function () {
          return this;
        },
        populate: async function (field: string) {
          if (field === 'payerId') {
            this.payerId = { _id: new Types.ObjectId(payerId), name: 'Carlos Pérez' };
          }
          if (field === 'receiverId') {
            this.receiverId = { _id: new Types.ObjectId(receiverId), name: 'Ana García' };
          }
          return this;
        },
      };
      vi.spyOn(Payment, 'findById').mockImplementation((async () => mockPayment) as any);
      const createSpy = vi.spyOn(Notification, 'create').mockResolvedValue({} as any);

      const req = createMockReq({
        user: { id: receiverId },
        params: { id: new Types.ObjectId().toString() },
        body: { status: 'completed' },
      });
      const res = createMockRes();

      await updatePayment(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(createSpy.mock.calls.length, 1);
      const doc = createSpy.mock.calls[0]?.[0] as any;
      assert.equal(doc.userId, payerId);
      assert.equal(doc.type, 'payment_completed');
      assert.match(doc.message, /Ana García ha confirmado tu pago/);
    });
  });
});
