import { describe, it, afterEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { User } from '../src/models/user.js';
import {
  getUsers,
  getMe,
  getUserById,
  updateUser,
  deleteUser,
} from '../src/controllers/userController.js';
import { createMockReq, createMockRes } from './helpers/mockExpress.js';

describe('Controlador userController', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const currentUserId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();

  describe('getUsers', () => {
    it('debe devolver 400 si no se proporciona ni name ni email en la query', async () => {
      const req = createMockReq({ user: { id: currentUserId }, query: {} });
      const res = createMockRes();

      await getUsers(req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /parámetro de búsqueda/);
    });

    it('debe buscar usuarios excluyendo al usuario autenticado y devolver 200', async () => {
      let capturedFilter: any;
      vi.spyOn(User, 'find').mockImplementation(((filter: any) => {
        capturedFilter = filter;
        return {
          select: async () => [{ name: 'Bea', email: 'bea@gmail.com', trustScore: 100 }],
        };
      }) as any);

      const req = createMockReq({
        user: { id: currentUserId },
        query: { name: 'Bea' },
      });
      const res = createMockRes();

      await getUsers(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(capturedFilter._id, { $ne: currentUserId });
      assert.deepEqual(capturedFilter.name, { $regex: 'Bea', $options: 'i' });
      assert.equal(res.body.length, 1);
    });

    it('debe buscar por email y devolver 200', async () => {
      let capturedFilter: any;
      vi.spyOn(User, 'find').mockImplementation(((filter: any) => {
        capturedFilter = filter;
        return {
          select: async () => [{ name: 'Bea', email: 'bea@gmail.com', trustScore: 100 }],
        };
      }) as any);

      const req = createMockReq({
        user: { id: currentUserId },
        query: { email: 'bea@' },
      });
      const res = createMockRes();

      await getUsers(req, res);

      assert.equal(res.statusCode, 200);
      assert.deepEqual(capturedFilter.email, { $regex: 'bea@', $options: 'i' });
    });

    it('debe devolver 500 si User.find falla', async () => {
      vi.spyOn(User, 'find').mockImplementation((() => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({
        user: { id: currentUserId },
        query: { name: 'Bea' },
      });
      const res = createMockRes();

      await getUsers(req, res);

      assert.equal(res.statusCode, 500);
    });
  });

  describe('getMe', () => {
    it('debe devolver 200 con los datos del usuario autenticado', async () => {
      vi.spyOn(User, 'findById').mockImplementation((() => ({
        select: async () => ({ _id: currentUserId, name: 'Álvaro', email: 'alvaro@ull.edu.es', trustScore: 100 }),
      })) as any);

      const req = createMockReq({ user: { id: currentUserId } });
      const res = createMockRes();

      await getMe(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.name, 'Álvaro');
    });

    it('debe devolver 404 si el usuario no existe', async () => {
      vi.spyOn(User, 'findById').mockImplementation((() => ({
        select: async () => null,
      })) as any);

      const req = createMockReq({ user: { id: currentUserId } });
      const res = createMockRes();

      await getMe(req, res);

      assert.equal(res.statusCode, 404);
    });

    it('debe devolver 500 si findById falla', async () => {
      vi.spyOn(User, 'findById').mockImplementation((() => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({ user: { id: currentUserId } });
      const res = createMockRes();

      await getMe(req, res);

      assert.equal(res.statusCode, 500);
    });
  });

  describe('getUserById', () => {
    it('debe devolver 200 con el usuario solicitado', async () => {
      vi.spyOn(User, 'findById').mockImplementation((() => ({
        select: async () => ({ _id: otherUserId, name: 'Carlos', email: 'carlos@gmail.com' }),
      })) as any);

      const req = createMockReq({ params: { id: otherUserId } });
      const res = createMockRes();

      await getUserById(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.name, 'Carlos');
    });

    it('debe devolver 404 si el usuario solicitado no existe', async () => {
      vi.spyOn(User, 'findById').mockImplementation((() => ({
        select: async () => null,
      })) as any);

      const req = createMockReq({ params: { id: otherUserId } });
      const res = createMockRes();

      await getUserById(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Usuario no encontrado' });
    });

    it('debe devolver 500 si findById falla', async () => {
      vi.spyOn(User, 'findById').mockImplementation((() => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({ params: { id: otherUserId } });
      const res = createMockRes();

      await getUserById(req, res);

      assert.equal(res.statusCode, 500);
    });
  });

  describe('updateUser', () => {
    it('debe devolver 403 si intenta modificar el perfil de otro usuario', async () => {
      const req = createMockReq({
        user: { id: currentUserId },
        params: { id: otherUserId },
        body: { name: 'Intruso' },
      });
      const res = createMockRes();

      await updateUser(req, res);

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { message: 'No tienes permiso para modificar el perfil de otro usuario' });
    });

    it('debe devolver 400 si intenta modificar trustScore u otro campo no permitido', async () => {
      const req = createMockReq({
        user: { id: currentUserId },
        params: { id: currentUserId },
        body: { trustScore: 100 },
      });
      const res = createMockRes();

      await updateUser(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Actualización no permitida' });
    });

    it('debe actualizar y devolver 200 cuando modifica campos permitidos de su propio perfil', async () => {
      vi.spyOn(User, 'findByIdAndUpdate').mockImplementation((() => ({
        select: async () => ({ _id: currentUserId, name: 'Álvaro Editado', email: 'alvaro@ull.edu.es' }),
      })) as any);

      const req = createMockReq({
        user: { id: currentUserId },
        params: { id: currentUserId },
        body: { name: 'Álvaro Editado' },
      });
      const res = createMockRes();

      await updateUser(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.name, 'Álvaro Editado');
    });

    it('debe devolver 404 si el usuario a actualizar no existe', async () => {
      vi.spyOn(User, 'findByIdAndUpdate').mockImplementation((() => ({
        select: async () => null,
      })) as any);

      const req = createMockReq({
        user: { id: currentUserId },
        params: { id: currentUserId },
        body: { name: 'Álvaro Editado' },
      });
      const res = createMockRes();

      await updateUser(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Usuario no encontrado' });
    });

    it('debe devolver 400 si findByIdAndUpdate lanza un error de validación', async () => {
      vi.spyOn(User, 'findByIdAndUpdate').mockImplementation((() => {
        throw new Error('Validation error');
      }) as any);

      const req = createMockReq({
        user: { id: currentUserId },
        params: { id: currentUserId },
        body: { email: 'invalido' },
      });
      const res = createMockRes();

      await updateUser(req, res);

      assert.equal(res.statusCode, 400);
    });
  });

  describe('deleteUser', () => {
    it('debe devolver 403 si intenta eliminar la cuenta de otro usuario', async () => {
      const req = createMockReq({
        user: { id: currentUserId },
        params: { id: otherUserId },
      });
      const res = createMockRes();

      await deleteUser(req, res);

      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { message: 'Solo puedes eliminar tu propia cuenta' });
    });

    it('debe eliminar la propia cuenta y devolver 200', async () => {
      vi.spyOn(User, 'findByIdAndDelete').mockImplementation((async () => ({
        _id: currentUserId,
        name: 'Álvaro',
      })) as any);

      const req = createMockReq({
        user: { id: currentUserId },
        params: { id: currentUserId },
      });
      const res = createMockRes();

      await deleteUser(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body._id, currentUserId);
    });

    it('debe devolver 404 si el usuario a eliminar no existe', async () => {
      vi.spyOn(User, 'findByIdAndDelete').mockImplementation((async () => null) as any);

      const req = createMockReq({
        user: { id: currentUserId },
        params: { id: currentUserId },
      });
      const res = createMockRes();

      await deleteUser(req, res);

      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Usuario no encontrado' });
    });

    it('debe devolver 500 si findByIdAndDelete falla', async () => {
      vi.spyOn(User, 'findByIdAndDelete').mockImplementation((async () => {
        throw new Error('DB error');
      }) as any);

      const req = createMockReq({
        user: { id: currentUserId },
        params: { id: currentUserId },
      });
      const res = createMockRes();

      await deleteUser(req, res);

      assert.equal(res.statusCode, 500);
    });
  });
});
