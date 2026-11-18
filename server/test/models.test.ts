import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { User } from '../src/models/user.js';
import { Group } from '../src/models/group.js';
import { Expense } from '../src/models/expense.js';
import { Payment } from '../src/models/payment.js';

describe('Modelos de Mongoose - Validaciones y lógica interna', () => {
  describe('Modelo User', () => {
    it('debe validar un usuario válido y asignar trustScore = 100 por defecto', async () => {
      const user = new User({
        name: 'Álvaro',
        email: 'alvaro@ull.edu.es',
        password: 'password123',
      });

      await user.validate();
      assert.equal(user.trustScore, 100);
      assert.equal(user.email, 'alvaro@ull.edu.es');
    });

    it('debe rechazar un email con formato inválido', async () => {
      const user = new User({
        name: 'Álvaro',
        email: 'correo-invalido',
        password: 'password123',
      });

      await assert.rejects(async () => {
        await user.validate();
      });
    });

    it('debe rechazar una contraseña de menos de 6 caracteres', async () => {
      const user = new User({
        name: 'Álvaro',
        email: 'alvaro@ull.edu.es',
        password: '123',
      });

      await assert.rejects(async () => {
        await user.validate();
      });
    });

    it('debe rechazar un trustScore menor que 0 o mayor que 100', async () => {
      const userLow = new User({
        name: 'Álvaro',
        email: 'alvaro@ull.edu.es',
        password: 'password123',
        trustScore: -5,
      });
      await assert.rejects(async () => {
        await userLow.validate();
      });

      const userHigh = new User({
        name: 'Álvaro',
        email: 'alvaro@ull.edu.es',
        password: 'password123',
        trustScore: 105,
      });
      await assert.rejects(async () => {
        await userHigh.validate();
      });
    });

    it('debe comparar contraseñas correctamente con comparePassword y ocultar password en toJSON', async () => {
      const hashedPassword = await bcrypt.hash('secreto123', 10);
      const user = new User({
        name: 'Lucía',
        email: 'lucia@ull.edu.es',
        password: hashedPassword,
      });

      const isMatch = await user.comparePassword('secreto123');
      const isWrong = await user.comparePassword('otraClave');
      assert.equal(isMatch, true);
      assert.equal(isWrong, false);

      const json = user.toJSON();
      assert.equal((json as any).password, undefined);
      assert.equal((json as any).__v, undefined);
      assert.equal(json.name, 'Lucía');
    });
  });

  describe('Modelo Group', () => {
    it('debe validar un grupo correctamente con creador y miembros', async () => {
      const userId = new Types.ObjectId();
      const group = new Group({
        name: 'Viaje a Madrid',
        description: 'Escapada de fin de semana',
        createdBy: userId,
        members: [userId],
      });

      await group.validate();
      assert.equal(group.name, 'Viaje a Madrid');
    });

    it('debe fallar si falta el nombre o createdBy', async () => {
      const group = new Group({});
      await assert.rejects(async () => {
        await group.validate();
      });
    });
  });

  describe('Modelo Expense', () => {
    it('debe validar un gasto válido con splitMode por defecto equal', async () => {
      const groupId = new Types.ObjectId();
      const payerId = new Types.ObjectId();
      const expense = new Expense({
        groupId,
        payerId,
        concept: 'Cena Pizzería',
        amount: 45.5,
        participants: [{ userId: payerId, share: 100 }],
      });

      await expense.validate();
      assert.equal(expense.splitMode, 'equal');
    });

    it('debe rechazar un importe menor o igual a 0 o un splitMode inválido', async () => {
      const groupId = new Types.ObjectId();
      const payerId = new Types.ObjectId();
      const expense = new Expense({
        groupId,
        payerId,
        concept: 'Cena',
        amount: 0,
        splitMode: 'invalido' as any,
      });

      await assert.rejects(async () => {
        await expense.validate();
      });
    });
  });

  describe('Modelo Payment', () => {
    it('debe validar un pago válido y asignar status = pending por defecto', async () => {
      const payment = new Payment({
        groupId: new Types.ObjectId(),
        payerId: new Types.ObjectId(),
        receiverId: new Types.ObjectId(),
        amount: 25,
      });

      await payment.validate();
      assert.equal(payment.status, 'pending');
    });

    it('debe rechazar un pago con importe negativo', async () => {
      const payment = new Payment({
        groupId: new Types.ObjectId(),
        payerId: new Types.ObjectId(),
        receiverId: new Types.ObjectId(),
        amount: -10,
      });

      await assert.rejects(async () => {
        await payment.validate();
      });
    });
  });
});