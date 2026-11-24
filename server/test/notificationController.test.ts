import { describe, it, afterEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { Notification } from '../src/models/notification.js';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../src/controllers/notificationController.js';
import { createMockReq, createMockRes } from './helpers/mockExpress.js';

describe('Controlador notificationController', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const userId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();
  const groupId = new Types.ObjectId().toString();

  describe('getNotifications', () => {
    it('debe devolver 401 si no hay usuario autenticado', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await getNotifications(req, res);

      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.body, { message: 'Usuario no autenticado' });
    });

    it('debe devolver 200 con las notificaciones del usuario autenticado', async () => {
      let capturedFilter: Record<string, unknown> | undefined;
      vi.spyOn(Notification, 'find').mockImplementation(((filter: Record<string, unknown>) => {
        capturedFilter = filter;
        return {
          sort: () => ({
            populate: async () => [
              {
                _id: new Types.ObjectId().toString(),
                userId,
                groupId: { _id: groupId, name: 'Viaje a Lisboa' },
                type: 'expense_created',
                message: 'Ana añadió un gasto',
                read: false,
              },
            ],
          }),
        };
      }) as any);

      const req = createMockReq({ user: { id: userId } });
      const res = createMockRes();

      await getNotifications(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(capturedFilter, { userId });
      assert.equal(res.body.length, 1);
    });

    it('debe filtrar por read = false cuando se envía unreadOnly=true', async () => {
      let capturedFilter: Record<string, unknown> | undefined;
      vi.spyOn(Notification, 'find').mockImplementation(((filter: Record<string, unknown>) => {
        capturedFilter = filter;
        return {
          sort: () => ({
            populate: async () => [],
          }),
        };
      }) as any);

      const req = createMockReq({ user: { id: userId }, query: { unreadOnly: 'true' } });
      const res = createMockRes();

      await getNotifications(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(capturedFilter, { userId, read: false });
    });

    it('debe devolver 500 si ocurre un error al consultar las notificaciones', async () => {
      vi.spyOn(Notification, 'find').mockImplementation((() => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({ user: { id: userId } });
      const res = createMockRes();

      await getNotifications(req, res);

      assert.equal(res.statusCode, 500);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('debe devolver 401 si no hay usuario autenticado', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await markAllNotificationsAsRead(req, res);

      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.body, { message: 'Usuario no autenticado' });
    });

    it('debe llamar a updateMany con { userId, read: false } y devolver 200 con modifiedCount', async () => {
      let capturedFilter: Record<string, unknown> | undefined;
      let capturedUpdate: Record<string, unknown> | undefined;
      vi.spyOn(Notification, 'updateMany').mockImplementation((async (
        filter: Record<string, unknown>,
        update: Record<string, unknown>
      ) => {
        capturedFilter = filter;
        capturedUpdate = update;
        return { modifiedCount: 3 };
      }) as any);

      const req = createMockReq({ user: { id: userId } });
      const res = createMockRes();

      await markAllNotificationsAsRead(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(capturedFilter, { userId, read: false });
      assert.deepEqual(capturedUpdate, { $set: { read: true } });
      assert.deepEqual(res.body, {
        message: 'Todas las notificaciones marcadas como leídas',
        modifiedCount: 3,
      });
    });

    it('debe devolver 500 si updateMany falla', async () => {
      vi.spyOn(Notification, 'updateMany').mockImplementation((async () => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({ user: { id: userId } });
      const res = createMockRes();

      await markAllNotificationsAsRead(req, res);

      assert.equal(res.statusCode, 500);
    });
  });

  describe('markNotificationAsRead', () => {
    it('debe devolver 400 si el id de la notificación no es un ObjectId válido', async () => {
      const req = createMockReq({ user: { id: userId }, params: { id: 'id-invalido' } });
      const res = createMockRes();

      await markNotificationAsRead(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Identificador de notificación inválido' });
    });

    it('debe devolver 404 si la notificación no existe', async () => {
      vi.spyOn(Notification, 'findById').mockImplementation((async () => null) as any);

      const req = createMockReq({
        user: { id: userId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await markNotificationAsRead(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Notificación no encontrada' });
    });

    it('debe devolver 403 si la notificación pertenece a otro usuario', async () => {
      vi.spyOn(Notification, 'findById').mockImplementation((async () => ({
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(otherUserId),
        read: false,
      })) as any);

      const req = createMockReq({
        user: { id: userId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await markNotificationAsRead(req, res);

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { message: 'No tienes permiso para modificar esta notificación' });
    });

    it('debe marcar read = true, guardar, poblar groupId y devolver 200', async () => {
      const saveSpy = vi.fn(async function (this: any) {
        return this;
      });
      const populateSpy = vi.fn(async function (this: any) {
        return this;
      });

      const mockNotification: any = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        groupId: new Types.ObjectId(groupId),
        type: 'payment_completed',
        message: 'Bea confirmó tu pago de 20 €',
        read: false,
        save: saveSpy,
        populate: populateSpy,
      };
      vi.spyOn(Notification, 'findById').mockImplementation((async () => mockNotification) as any);

      const req = createMockReq({
        user: { id: userId },
        params: { id: mockNotification._id.toString() },
      });
      const res = createMockRes();

      await markNotificationAsRead(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(mockNotification.read, true);
      assert.equal(saveSpy.mock.calls.length, 1);
      assert.equal(populateSpy.mock.calls.length, 1);
      assert.equal(res.body, mockNotification);
    });

    it('si ya estaba leída, debe devolver 200 sin volver a llamar a save()', async () => {
      const saveSpy = vi.fn(async function (this: any) {
        return this;
      });
      const populateSpy = vi.fn(async function (this: any) {
        return this;
      });

      const mockNotification: any = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(userId),
        groupId: new Types.ObjectId(groupId),
        type: 'expense_created',
        message: 'Notificación ya leída',
        read: true,
        save: saveSpy,
        populate: populateSpy,
      };
      vi.spyOn(Notification, 'findById').mockImplementation((async () => mockNotification) as any);

      const req = createMockReq({
        user: { id: userId },
        params: { id: mockNotification._id.toString() },
      });
      const res = createMockRes();

      await markNotificationAsRead(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(saveSpy.mock.calls.length, 0);
      assert.equal(populateSpy.mock.calls.length, 1);
    });

    it('debe devolver 500 si findById lanza un error', async () => {
      vi.spyOn(Notification, 'findById').mockImplementation((async () => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({
        user: { id: userId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await markNotificationAsRead(req, res);

      assert.equal(res.statusCode, 500);
    });
  });
});
