import { describe, it, afterEach, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { Group } from '../src/models/group.js';
import {
  createGroup,
  joinGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
} from '../src/controllers/groupController.js';
import { createMockReq, createMockRes } from './helpers/mockExpress.js';

describe('Controlador groupController', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const creatorId = new Types.ObjectId().toString();
  const memberId = new Types.ObjectId().toString();
  const outsiderId = new Types.ObjectId().toString();

  describe('createGroup', () => {
    it('debe crear un grupo, asignar createdBy desde el token e incluir al creador en members', async () => {
      vi.spyOn(Group.prototype, 'save').mockImplementation((async function (this: any) {
        this.inviteCode = 'ABC123';
        return this;
      }) as any);
      vi.spyOn(Group.prototype, 'populate').mockImplementation((async function (this: any) {
        return this;
      }) as any);

      const req = createMockReq({
        user: { id: creatorId },
        body: { name: 'Viaje a Lisboa', description: 'Escapada' },
      });
      const res = createMockRes();

      await createGroup(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.name, 'Viaje a Lisboa');
      assert.equal(res.body.createdBy.toString(), creatorId);
      assert.ok(res.body.members.some((m: any) => m.toString() === creatorId));
    });
  });

  describe('joinGroup', () => {
    it('debe devolver 400 si no se envía inviteCode', async () => {
      const req = createMockReq({ user: { id: memberId }, body: {} });
      const res = createMockRes();

      await joinGroup(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'El código de invitación es obligatorio' });
    });

    it('debe devolver 404 si el código de invitación no corresponde a ningún grupo', async () => {
      vi.spyOn(Group, 'findOne').mockImplementation((async () => null) as any);

      const req = createMockReq({ user: { id: memberId }, body: { inviteCode: 'NOEXST' } });
      const res = createMockRes();

      await joinGroup(req, res);

      assert.equal(res.statusCode, 404);
    });

    it('debe devolver 400 si el usuario ya es miembro del grupo', async () => {
      vi.spyOn(Group, 'findOne').mockImplementation((async () => ({
        members: [new Types.ObjectId(memberId)],
      })) as any);

      const req = createMockReq({ user: { id: memberId }, body: { inviteCode: 'LISBOA' } });
      const res = createMockRes();

      await joinGroup(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Ya eres miembro de este grupo' });
    });

    it('debe añadir al usuario a members y devolver 200', async () => {
      const mockGroup: any = {
        name: 'Viaje a Lisboa',
        members: [new Types.ObjectId(creatorId)],
        save: async function () {
          return this;
        },
        populate: async function () {
          return this;
        },
      };
      vi.spyOn(Group, 'findOne').mockImplementation((async () => mockGroup) as any);

      const req = createMockReq({ user: { id: memberId }, body: { inviteCode: 'lisboa' } });
      const res = createMockRes();

      await joinGroup(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.message, 'Te has unido al grupo correctamente');
      assert.equal(mockGroup.members.length, 2);
    });
  });

  describe('getGroups', () => {
    it('debe devolver 401 si no hay usuario autenticado', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await getGroups(req, res);

      assert.equal(res.statusCode, 401);
    });

    it('debe devolver 200 con los grupos del usuario', async () => {
      vi.spyOn(Group, 'find').mockImplementation((() => ({
        populate: () => ({
          populate: async () => [{ name: 'Piso compartido' }],
        }),
      })) as any);

      const req = createMockReq({ user: { id: creatorId } });
      const res = createMockRes();

      await getGroups(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.length, 1);
    });
  });

  describe('getGroupById', () => {
    it('debe devolver 403 si el usuario no es miembro ni creador del grupo', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((() => ({
        populate: () => ({
          populate: async () => ({
            name: 'Grupo Privado',
            createdBy: { _id: new Types.ObjectId(creatorId) },
            members: [{ _id: new Types.ObjectId(creatorId) }],
          }),
        }),
      })) as any);

      const req = createMockReq({
        user: { id: outsiderId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getGroupById(req, res);

      assert.equal(res.statusCode, 403);
    });

    it('debe devolver 200 si el usuario es miembro del grupo', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((() => ({
        populate: () => ({
          populate: async () => ({
            name: 'Grupo Compartido',
            createdBy: { _id: new Types.ObjectId(creatorId) },
            members: [{ _id: new Types.ObjectId(memberId) }],
          }),
        }),
      })) as any);

      const req = createMockReq({
        user: { id: memberId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await getGroupById(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.name, 'Grupo Compartido');
    });
  });

  describe('updateGroup y deleteGroup', () => {
    it('updateGroup debe devolver 403 si quien intenta editar no es el creador', async () => {
      vi.spyOn(Group, 'findById').mockImplementation((async () => ({
        createdBy: new Types.ObjectId(creatorId),
      })) as any);

      const req = createMockReq({
        user: { id: memberId },
        params: { id: new Types.ObjectId().toString() },
        body: { name: 'Nuevo Nombre' },
      });
      const res = createMockRes();

      await updateGroup(req, res);

      assert.equal(res.statusCode, 403);
    });

    it('deleteGroup debe eliminar el grupo y devolver 200 cuando lo solicita su creador', async () => {
      let deleted = false;
      vi.spyOn(Group, 'findById').mockImplementation((async () => ({
        name: 'Viaje a borrar',
        createdBy: new Types.ObjectId(creatorId),
        deleteOne: async () => {
          deleted = true;
        },
      })) as any);

      const req = createMockReq({
        user: { id: creatorId },
        params: { id: new Types.ObjectId().toString() },
      });
      const res = createMockRes();

      await deleteGroup(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(deleted, true);
    });
  });
});
