import { randomInt } from 'node:crypto';

export type AllOrNothingResult = 'payerPaysAll' | 'othersPayAll';

export interface AllOrNothingOutcome {
  result: AllOrNothingResult;
  participants: { userId: string; share: number }[];
}

/**
 * minijuego "Todo o nada" con un 50% de probabilidad para cada resultado:
 * el pagador asume todo el gasto o se reparte a partes iguales entre el resto de miembros menos para el
 */
export const playAllOrNothing = (
  payerId: string,
  memberIds: string[],
  drawCoin: () => number = () => randomInt(2),
): AllOrNothingOutcome => {
  if (drawCoin() === 0) {
    return { result: 'payerPaysAll', participants: [{ userId: payerId, share: 100 }] };
  }

  const others = memberIds.filter((id) => id !== payerId);
  const share = Math.round((100 / others.length) * 100) / 100;
  return {
    result: 'othersPayAll',
    participants: others.map((userId) => ({ userId, share })),
  };
};
