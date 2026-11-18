import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { User } from '../src/models/user.js';
import { registerUser, loginUser } from '../src/controllers/authController.js';
import { createMockReq, createMockRes } from './helpers/mockExpress.js';

describe('Controlador authController - registerUser y loginUser', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret_key_for_unit_tests';
  });

  describe('registerUser', () => {
    it('debe devolver 400 si faltan campos obligatorios o están vacíos', async () => {
      const req = createMockReq({ body: { name: 'Ana', email: '', password: 'password123' } });
      const res = createMockRes();

      await registerUser(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Todos los campos son obligatorios' });
    });

    it('debe devolver 400 si la contraseña tiene menos de 8 caracteres', async () => {
      const req = createMockReq({
        body: { name: 'Ana', email: 'ana@ull.edu.es', password: '1234567' },
      });
      const res = createMockRes();

      await registerUser(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'La contraseña debe tener al menos 8 caracteres' });
    });

    it('debe devolver 409 si el correo electrónico ya está registrado', async (t) => {
      t.mock.method(User, 'findOne', async () => ({ _id: new Types.ObjectId(), email: 'ana@ull.edu.es' }));

      const req = createMockReq({
        body: { name: 'Ana', email: 'ana@ull.edu.es', password: 'password123' },
      });
      const res = createMockRes();

      await registerUser(req, res);

      assert.equal(res.statusCode, 409);
      assert.deepEqual(res.body, { message: 'El correo electrónico ya está registrado' });
    });

    it('debe registrar un nuevo usuario con código 201 y devolver token y datos del usuario', async (t) => {
      t.mock.method(User, 'findOne', async () => null);
      t.mock.method(User.prototype, 'save', async function (this: any) {
        return this;
      });

      const req = createMockReq({
        body: { name: '  Ana García  ', email: '  ANA@ull.edu.es  ', password: 'password123' },
      });
      const res = createMockRes();

      await registerUser(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.message, 'Usuario registrado correctamente');
      assert.ok(typeof res.body.token === 'string' && res.body.token.length > 0);
      assert.equal(res.body.user.name, 'Ana García');
      assert.equal(res.body.user.email, 'ana@ull.edu.es');
      assert.equal(res.body.user.trustScore, 100);
    });
  });

  describe('loginUser', () => {
    it('debe devolver 400 si faltan email o contraseña', async () => {
      const req = createMockReq({ body: { email: 'ana@ull.edu.es' } });
      const res = createMockRes();

      await loginUser(req, res);

      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { message: 'Correo electrónico y contraseña son obligatorios' });
    });

    it('debe devolver 401 si el usuario no existe', async (t) => {
      t.mock.method(User, 'findOne', async () => null);

      const req = createMockReq({
        body: { email: 'noexiste@ull.edu.es', password: 'password123' },
      });
      const res = createMockRes();

      await loginUser(req, res);

      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.body, { message: 'Credenciales incorrectas' });
    });

    it('debe devolver 401 si la contraseña no coincide', async (t) => {
      t.mock.method(User, 'findOne', async () => ({
        id: '653ad4f1234567890abcdef1',
        name: 'Ana',
        email: 'ana@ull.edu.es',
        trustScore: 100,
        comparePassword: async () => false,
      }));

      const req = createMockReq({
        body: { email: 'ana@ull.edu.es', password: 'wrongpassword' },
      });
      const res = createMockRes();

      await loginUser(req, res);

      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.body, { message: 'Credenciales incorrectas' });
    });

    it('debe devolver 200 con token y usuario cuando las credenciales son válidas', async (t) => {
      const userId = new Types.ObjectId();
      t.mock.method(User, 'findOne', async () => ({
        _id: userId,
        id: userId.toString(),
        name: 'Ana',
        email: 'ana@ull.edu.es',
        trustScore: 98,
        comparePassword: async () => true,
      }));

      const req = createMockReq({
        body: { email: 'ana@ull.edu.es', password: 'password123' },
      });
      const res = createMockRes();

      await loginUser(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.message, 'Credenciales verificadas correctamente');
      assert.ok(typeof res.body.token === 'string' && res.body.token.length > 0);
      assert.equal(res.body.user.name, 'Ana');
      assert.equal(res.body.user.trustScore, 98);
    });
  });
});