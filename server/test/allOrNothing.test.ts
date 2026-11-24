import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { playAllOrNothing } from '../src/utils/allOrNothing.js';

describe('Utilidad allOrNothing - playAllOrNothing', () => {
  const payerId = 'userA';
  const memberIds = ['userA', 'userB', 'userC'];

  it('cuando drawCoin devuelve 0, el pagador asume el 100% del gasto', () => {
    const outcome = playAllOrNothing(payerId, memberIds, () => 0);

    assert.equal(outcome.result, 'payerPaysAll');
    assert.deepEqual(outcome.participants, [{ userId: payerId, share: 100 }]);
  });

  it('cuando drawCoin devuelve 1 con 3 miembros, reparte a partes iguales entre el resto (50%)', () => {
    const outcome = playAllOrNothing(payerId, memberIds, () => 1);

    assert.equal(outcome.result, 'othersPayAll');
    assert.deepEqual(outcome.participants, [
      { userId: 'userB', share: 50 },
      { userId: 'userC', share: 50 },
    ]);
  });

  it('cuando drawCoin devuelve 1 con 4 miembros, redondea el reparto a 33.33% entre los otros 3', () => {
    const outcome = playAllOrNothing(payerId, ['userA', 'userB', 'userC', 'userD'], () => 1);

    assert.equal(outcome.result, 'othersPayAll');
    assert.deepEqual(outcome.participants, [
      { userId: 'userB', share: 33.33 },
      { userId: 'userC', share: 33.33 },
      { userId: 'userD', share: 33.33 },
    ]);
  });

  it('usa el generador aleatorio por defecto cuando no se pasa drawCoin y devuelve un resultado válido', () => {
    const outcome = playAllOrNothing(payerId, memberIds);

    assert.ok(outcome.result === 'payerPaysAll' || outcome.result === 'othersPayAll');
    if (outcome.result === 'payerPaysAll') {
      assert.deepEqual(outcome.participants, [{ userId: payerId, share: 100 }]);
    } else {
      assert.equal(outcome.participants.length, 2);
      assert.ok(outcome.participants.every((p) => p.userId !== payerId && p.share === 50));
    }
  });
});
