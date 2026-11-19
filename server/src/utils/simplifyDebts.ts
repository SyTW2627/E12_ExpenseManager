/**
 * Lógica para calcular los saldos de un grupo y simplificar las deudas,
 * de forma que se necesite el menor número posible de transferencias.
 *
 * Todos los cálculos se hacen en céntimos (enteros) para evitar errores
 * de redondeo con números decimales.
 */

export interface ExpenseLike {
  payerId: { toString(): string };
  amount: number;
  participants: { userId: { toString(): string }; share: number }[];
}

export interface PaymentLike {
  payerId: { toString(): string };
  receiverId: { toString(): string };
  amount: number;
}

export interface SimplifiedTransaction {
  from: string; // Quien debe pagar
  to: string; // Quien debe recibir
  amount: number; // En euros, con dos decimales
}

const toCents = (value: number) => Math.round(Number(value) * 100);

/**
 * Reparte una cantidad en céntimos entre los participantes de forma proporcional
 * a su share, usando el método del mayor resto para que la suma sea exacta.
 * El share se interpreta como peso relativo (porcentaje), por lo que un reparto
 * equitativo de 33.33 + 33.33 + 33.33 sigue repartiendo el 100% del importe.
 */
const splitAmount = (totalCents: number, participants: ExpenseLike['participants']) => {
  const totalShare = participants.reduce((acc, p) => acc + Number(p.share), 0);
  if (totalShare <= 0) return [];

  const parts = participants.map((p) => {
    const exact = (totalCents * Number(p.share)) / totalShare;
    return { userId: p.userId.toString(), cents: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  let leftover = totalCents - parts.reduce((acc, p) => acc + p.cents, 0);
  const byRemainder = [...parts].sort((a, b) => b.remainder - a.remainder);
  // El resto siempre es menor que el número de participantes
  for (let i = 0; leftover > 0 && i < byRemainder.length; i++, leftover--) {
    byRemainder[i]!.cents += 1;
  }

  return parts;
};

/**
 * Calcula el saldo neto (en céntimos) de cada usuario.
 * Saldo positivo: le deben dinero. Saldo negativo: debe dinero.
 * Los pagos ya completados entre miembros reducen las deudas pendientes.
 */
export const calculateBalances = (
  expenses: ExpenseLike[],
  payments: PaymentLike[] = [],
  memberIds: string[] = [],
): Map<string, number> => {
  const balances = new Map<string, number>();
  memberIds.forEach((id) => balances.set(id, 0));

  const add = (id: string, cents: number) => balances.set(id, (balances.get(id) ?? 0) + cents);

  for (const expense of expenses) {
    const totalCents = toCents(expense.amount);
    const parts = splitAmount(totalCents, expense.participants ?? []);
    if (parts.length === 0) continue;

    add(expense.payerId.toString(), totalCents);
    for (const part of parts) {
      add(part.userId, -part.cents);
    }
  }

  for (const payment of payments) {
    const cents = toCents(payment.amount);
    add(payment.payerId.toString(), cents);
    add(payment.receiverId.toString(), -cents);
  }

  return balances;
};

/**
 * Simplifica las deudas: empareja en cada paso al mayor deudor con el mayor
 * acreedor, generando como máximo (n - 1) transferencias para n usuarios.
 */
export const simplifyDebts = (balances: Map<string, number>): SimplifiedTransaction[] => {
  const debtors = [...balances.entries()]
    .filter(([, cents]) => cents < 0)
    .map(([id, cents]) => ({ id, cents: -cents }));
  const creditors = [...balances.entries()]
    .filter(([, cents]) => cents > 0)
    .map(([id, cents]) => ({ id, cents }));

  const transactions: SimplifiedTransaction[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort((a, b) => b.cents - a.cents);
    creditors.sort((a, b) => b.cents - a.cents);

    const debtor = debtors[0]!;
    const creditor = creditors[0]!;
    const cents = Math.min(debtor.cents, creditor.cents);

    transactions.push({ from: debtor.id, to: creditor.id, amount: cents / 100 });

    debtor.cents -= cents;
    creditor.cents -= cents;
    if (debtor.cents === 0) debtors.shift();
    if (creditor.cents === 0) creditors.shift();
  }

  return transactions;
};
