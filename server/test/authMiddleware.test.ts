import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../src/middlewares/authMiddleware.js';
import { createMockReq, createMockRes, createMockNext } from './helpers/mockExpress.js';

describe('Middleware authMiddleware - verifyToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test_secret_key_for_unit_tests';
  });

  it('debe devolver 401 si no se envía la cabecera Authorization', () => {
    const req = createMockReq();
    const res = createMockRes();
    const { next, wasCalled } = createMockNext();

    verifyToken(req, res, next);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { message: 'Acceso denegado: Autenticación requerida' });
    assert.equal(wasCalled(), false);
  });

  it('debe devolver 401 si el token es inválido o fue firmado con otra clave', () => {
    const invalidToken = jwt.sign({ id: '12345' }, 'clave_incorrecta');
    const req = createMockReq({
      headers: { Authorization: `Bearer ${invalidToken}` },
    });
    const res = createMockRes();
    const { next, wasCalled } = createMockNext();

    verifyToken(req, res, next);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { message: 'Token inválido o expirado' });
    assert.equal(wasCalled(), false);
  });

  it('debe inyectar req.user y llamar a next() cuando el token JWT es válido', () => {
    const validToken = jwt.sign({ id: '653ad4f1234567890abcdef1' }, process.env.JWT_SECRET!);
    const req = createMockReq({
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const res = createMockRes();
    const { next, wasCalled } = createMockNext();

    verifyToken(req, res, next);

    assert.equal(wasCalled(), true);
    assert.equal(req.user?.id, '653ad4f1234567890abcdef1');
  });
});