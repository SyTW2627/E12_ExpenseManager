/**
 * Script para poblar la base de datos local con datos de ejemplo.
 * Se usa con: npm run seed
 */
import 'dotenv/config';
import { connect, disconnect, type Types } from 'mongoose';
import { User } from './models/user.js';
import { Group } from './models/group.js';
import { Expense } from './models/expense.js';
import { Payment } from './models/payment.js';
import { Notification, type NotificationType } from './models/notification.js';

const PASSWORD = 'demo1234';

const usersData = [
  { name: 'Ana García', email: 'ana@gmail.com' },
  { name: 'Bea López', email: 'bea@gmail.com' },
  { name: 'Carlos Pérez', email: 'carlos@gmail.com' },
  { name: 'David Ruiz', email: 'david@gmail.com' },
  { name: 'Elena Torres', email: 'elena@gmail.com' },
  { name: 'Fran Molina', email: 'fran@gmail.com' },
  { name: 'Gema Ortiz', email: 'gema@gmail.com' },
  { name: 'Héctor Navarro', email: 'hector@gmail.com' },
  { name: 'Irene Castro', email: 'irene@gmail.com' },
];

const seedInviteCodes = ['PISO01', 'LISBOA', 'CENA24', 'FUTBOL', 'ERASMU', 'REGALO', 'GYM123'];

type Id = Types.ObjectId;

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const equalShares = (ids: Id[]) =>
  ids.map((userId) => ({ userId, share: Math.round((100 / ids.length) * 100) / 100 }));

async function seed() {
  await connect(process.env.MONGODB_URL!);
  console.log('Conectado a', process.env.MONGODB_URL);

  // Limpiar solo los datos de ejecuciones anteriores
  // (incluye los correos @demo.com de la primera versión del script)
  const seedEmails = usersData.flatMap((u) => [u.email, u.email.replace('@gmail.com', '@demo.com')]);
  const oldUsers = await User.find({ email: { $in: seedEmails } });
  const oldIds = oldUsers.map((u) => u._id);
  const oldGroups = await Group.find({
    $or: [{ createdBy: { $in: oldIds } }, { inviteCode: { $in: seedInviteCodes } }],
  });
  const oldGroupIds = oldGroups.map((g) => g._id);
  await Expense.deleteMany({ groupId: { $in: oldGroupIds } });
  await Payment.deleteMany({ groupId: { $in: oldGroupIds } });
  await Notification.deleteMany({ $or: [{ groupId: { $in: oldGroupIds } }, { userId: { $in: oldIds } }] });
  await Group.deleteMany({ _id: { $in: oldGroupIds } });
  await User.deleteMany({ _id: { $in: oldIds } });

  // Usuarios
  const users = [];
  for (const data of usersData) {
    users.push(await User.create({ ...data, password: PASSWORD }));
  }
  const [ana, bea, carlos, david, elena, fran, gema, hector, irene] = users.map((u) => u._id as Id) as [
    Id, Id, Id, Id, Id, Id, Id, Id, Id,
  ];

  // Grupos con códigos de invitación fijos para poder probar
  const createGroup = (data: { name: string; description: string; createdBy: Id; members: Id[]; inviteCode: string; days: number }) =>
    Group.create({ ...data, createdAt: daysAgo(data.days), updatedAt: daysAgo(data.days) });

  const piso = await createGroup({
    name: 'Piso compartido',
    description: 'Gastos del piso: alquiler, luz, internet y compra común',
    createdBy: ana,
    members: [ana, bea, carlos],
    inviteCode: 'PISO01',
    days: 120,
  });
  const viaje = await createGroup({
    name: 'Viaje a Lisboa',
    description: 'Escapada de fin de semana en marzo',
    createdBy: bea,
    members: [bea, ana, david, elena],
    inviteCode: 'LISBOA',
    days: 90,
  });
  const cena = await createGroup({
    name: 'Cena de clase',
    description: 'Cena de fin de cuatrimestre',
    createdBy: carlos,
    members: [carlos, david],
    inviteCode: 'CENA24',
    days: 40,
  });
  // ana@gmail.com no está en este grupo: sirve para probar unirse con el código
  const futbol = await createGroup({
    name: 'Fútbol de los jueves',
    description: 'Alquiler de la pista y material',
    createdBy: elena,
    members: [elena, david, carlos],
    inviteCode: 'FUTBOL',
    days: 75,
  });
  const erasmus = await createGroup({
    name: 'Erasmus en Bolonia',
    description: 'Piso, transporte y salidas durante el Erasmus',
    createdBy: gema,
    members: [gema, ana, fran, hector, irene, bea],
    inviteCode: 'ERASMU',
    days: 100,
  });
  const regalo = await createGroup({
    name: 'Regalo cumpleaños Bea',
    description: 'Regalo sorpresa y merienda',
    createdBy: ana,
    members: [ana, carlos, david, elena],
    inviteCode: 'REGALO',
    days: 15,
  });
  const gym = await createGroup({
    name: 'Gimnasio',
    description: 'Cuota mensual compartida',
    createdBy: fran,
    members: [fran, ana],
    inviteCode: 'GYM123',
    days: 60,
  });

  // Gastos: [grupo, quién paga, concepto, importe, hace cuántos días, reparto]
  // Sin reparto indicado se divide a partes iguales entre todos los miembros del grupo
  type Split =
    | { mode: 'percentage'; shares: [Id, number][] }
    | { mode: 'equal'; among: Id[] }
    | { mode: 'allOrNothing'; result: 'payerPaysAll' | 'othersPayAll' };
  type Row = [typeof piso, Id, string, number, number, Split?];

  const rows: Row[] = [
    [piso, ana, 'Alquiler septiembre', 900, 110],
    [piso, bea, 'Factura de la luz (agosto)', 68.4, 105],
    [piso, carlos, 'Compra Mercadona', 52.3, 98],
    [piso, ana, 'Internet', 35, 95, { mode: 'percentage', shares: [[ana, 50], [bea, 25], [carlos, 25]] }],
    [piso, ana, 'Alquiler octubre', 900, 80],
    [piso, bea, 'Productos de limpieza', 23.75, 72],
    [piso, carlos, 'Factura del agua', 41.2, 66],
    [piso, carlos, 'Compra Lidl', 61.9, 58],
    [piso, ana, 'Alquiler noviembre', 900, 50],
    [piso, bea, 'Factura de la luz (octubre)', 74.6, 44],
    [piso, ana, 'Bombona de butano', 22, 30, { mode: 'allOrNothing', result: 'othersPayAll' }],
    [piso, carlos, 'Pizza del viernes', 36.5, 9, { mode: 'allOrNothing', result: 'payerPaysAll' }],
    [piso, bea, 'Compra Carrefour', 47.15, 4],

    [viaje, bea, 'Vuelos', 320, 88],
    [viaje, david, 'Apartamento (2 noches)', 240, 86],
    [viaje, elena, 'Cena en Alfama', 96.4, 85],
    [viaje, ana, 'Tranvía 28 y metro', 34, 85],
    [viaje, bea, 'Pasteles de Belém', 18.6, 84, { mode: 'equal', among: [bea, ana, elena] }],
    [viaje, david, 'Entradas Torre de Belém', 44, 84],
    [viaje, elena, 'Taxi al aeropuerto', 27.5, 83, { mode: 'allOrNothing', result: 'othersPayAll' }],

    [cena, carlos, 'Reserva restaurante', 60, 35],
    [cena, david, 'Copas después de cenar', 32, 34],

    [futbol, elena, 'Pista septiembre', 45, 70],
    [futbol, david, 'Balón nuevo', 29.99, 62],
    [futbol, elena, 'Pista octubre', 45, 40],
    [futbol, carlos, 'Pista noviembre', 45, 10],

    [erasmus, gema, 'Fianza del piso', 1200, 95],
    [erasmus, ana, 'Muebles de IKEA', 186.4, 92],
    [erasmus, fran, 'Abono de transporte', 210, 90],
    [erasmus, hector, 'Cena de bienvenida', 132, 88],
    [erasmus, irene, 'Excursión a Florencia', 264, 60],
    [erasmus, bea, 'Compra semanal', 78.35, 45, { mode: 'equal', among: [bea, ana, gema] }],
    [erasmus, gema, 'Wifi del piso', 30, 40, { mode: 'percentage', shares: [[gema, 30], [ana, 20], [fran, 20], [hector, 15], [irene, 15]] }],
    [erasmus, hector, 'Aperitivo en la plaza', 54, 20, { mode: 'allOrNothing', result: 'payerPaysAll' }],
    [erasmus, ana, 'Entradas concierto', 150, 6],

    [regalo, ana, 'Regalo: auriculares', 89.9, 12],
    [regalo, carlos, 'Tarta', 32, 3],
    [regalo, elena, 'Globos y decoración', 14.5, 2],

    [gym, fran, 'Cuota septiembre', 59.8, 58],
    [gym, fran, 'Cuota octubre', 59.8, 28],
    [gym, ana, 'Cuota noviembre', 59.8, 1],
  ];

  const expenses = rows.map(([group, payerId, concept, amount, days, split]) => {
    const base = { groupId: group._id, payerId, concept, amount, createdAt: daysAgo(days), updatedAt: daysAgo(days) };
    if (!split) return { ...base, splitMode: 'equal' as const, participants: equalShares(group.members as Id[]) };
    if (split.mode === 'equal') return { ...base, splitMode: 'equal' as const, participants: equalShares(split.among) };
    if (split.mode === 'percentage') {
      return { ...base, splitMode: 'percentage' as const, participants: split.shares.map(([userId, share]) => ({ userId, share })) };
    }
    const others = (group.members as Id[]).filter((id) => !id.equals(payerId));
    return {
      ...base,
      splitMode: 'allOrNothing' as const,
      allOrNothingResult: split.result,
      participants: split.result === 'payerPaysAll' ? [{ userId: payerId, share: 100 }] : equalShares(others),
    };
  });
  await Expense.create(expenses);

  const payments: [typeof piso, Id, Id, number, 'pending' | 'completed', number][] = [
    [piso, bea, ana, 300, 'completed', 78],
    [piso, carlos, ana, 300, 'completed', 77],
    [piso, bea, ana, 280, 'completed', 48],
    [piso, carlos, ana, 150, 'pending', 3],
    [viaje, ana, bea, 80, 'completed', 80],
    [viaje, elena, david, 60, 'pending', 79],
    [cena, david, carlos, 30, 'completed', 33],
    [futbol, carlos, elena, 15, 'completed', 39],
    [erasmus, ana, gema, 200, 'completed', 85],
    [erasmus, fran, gema, 200, 'completed', 84],
    [erasmus, hector, gema, 150, 'pending', 5],
    [regalo, david, ana, 22.5, 'pending', 1],
    [gym, ana, fran, 59.8, 'completed', 20],
  ];
  await Payment.create(
    payments.map(([group, payerId, receiverId, amount, status, days]) => ({
      groupId: group._id, payerId, receiverId, amount, status, createdAt: daysAgo(days), updatedAt: daysAgo(days),
    }))
  );

  const notifications: [Id, typeof piso, NotificationType, string, boolean, number][] = [
    [ana, piso, 'payment_created', 'Carlos Pérez ha registrado un pago de 150,00 € para ti. Confírmalo cuando lo recibas.', false, 3],
    [ana, regalo, 'payment_created', 'David Ruiz ha registrado un pago de 22,50 € para ti.', false, 1],
    [ana, erasmus, 'expense_created', 'Ana García ha añadido "Entradas concierto" (150,00 €) en Erasmus en Bolonia.', true, 6],
    [ana, piso, 'all_or_nothing', 'Carlos Pérez jugó a Todo o nada con "Pizza del viernes" y le tocó pagarlo todo.', false, 9],
    [ana, gym, 'expense_created', 'Has añadido "Cuota noviembre" (59,80 €) en Gimnasio.', true, 1],
    [bea, piso, 'payment_completed', 'Ana García ha confirmado tu pago de 280,00 €.', true, 47],
  ];
  await Notification.create(
    notifications.map(([userId, group, type, message, read, days]) => ({
      userId, groupId: group._id, type, message, read, createdAt: daysAgo(days), updatedAt: daysAgo(days),
    }))
  );

  console.log('\nDatos de demo creados:');
  console.log(`  ${users.length} usuarios (contraseña: ${PASSWORD})`);
  for (const u of usersData) console.log(`    - ${u.email}`);
  console.log(`  7 grupos: ${seedInviteCodes.join(', ')} (ana@gmail.com no está en FUTBOL)`);
  console.log(`  ${expenses.length} gastos, ${payments.length} pagos y ${notifications.length} notificaciones`);
}

seed()
  .catch((error) => {
    console.error('Error al poblar la base de datos:', error);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
