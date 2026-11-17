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

const PASSWORD = 'demo1234';

const usersData = [
  { name: 'Ana García', email: 'ana@gmail.com' },
  { name: 'Bea López', email: 'bea@gmail.com' },
  { name: 'Carlos Pérez', email: 'carlos@gmail.com' },
  { name: 'David Ruiz', email: 'david@gmail.com' },
  { name: 'Elena Torres', email: 'elena@gmail.com' },
];

async function seed() {
  await connect(process.env.MONGODB_URL!);
  console.log('Conectado a', process.env.MONGODB_URL);

  // Limpiar solo los datos de ejecuciones anteriores
  const oldUsers = await User.find({ email: { $in: usersData.map((u) => u.email) } });
  const oldIds = oldUsers.map((u) => u._id);
  const oldGroups = await Group.find({ createdBy: { $in: oldIds } });
  const oldGroupIds = oldGroups.map((g) => g._id);
  await Expense.deleteMany({ groupId: { $in: oldGroupIds } });
  await Payment.deleteMany({ groupId: { $in: oldGroupIds } });
  await Group.deleteMany({ _id: { $in: oldGroupIds } });
  await User.deleteMany({ _id: { $in: oldIds } });

  // Usuarios 
  const users = [];
  for (const data of usersData) {
    users.push(await User.create({ ...data, password: PASSWORD }));
  }
  const [ana, bea, carlos, david, elena] = users.map((u) => u._id as Types.ObjectId) as [
    Types.ObjectId, Types.ObjectId, Types.ObjectId, Types.ObjectId, Types.ObjectId,
  ];

  // Grupos con códigos de invitación fijos para poder probar 
  const piso = await Group.create({
    name: 'Piso compartido',
    description: 'Gastos del piso: alquiler, luz, internet y compra común',
    createdBy: ana,
    members: [ana, bea, carlos],
    inviteCode: 'PISO01',
  });
  const viaje = await Group.create({
    name: 'Viaje a Lisboa',
    description: 'Escapada de fin de semana en marzo',
    createdBy: bea,
    members: [bea, ana, david, elena],
    inviteCode: 'LISBOA',
  });
  const cena = await Group.create({
    name: 'Cena de clase',
    description: 'Cena de fin de cuatrimestre',
    createdBy: carlos,
    members: [carlos, david],
    inviteCode: 'CENA24',
  });
  const futbol = await Group.create({
    name: 'Fútbol de los jueves',
    description: 'Alquiler de la pista y material',
    createdBy: elena,
    members: [elena, david, carlos],
    inviteCode: 'FUTBOL',
  });

  const equal = (ids: Types.ObjectId[]) =>
    ids.map((userId) => ({ userId, share: Math.round((100 / ids.length) * 100) / 100 }));

  await Expense.create([
    { groupId: piso._id, payerId: ana, concept: 'Alquiler noviembre', amount: 900, splitMode: 'equal', participants: equal([ana, bea, carlos]) },
    { groupId: piso._id, payerId: bea, concept: 'Factura de la luz', amount: 74.6, splitMode: 'equal', participants: equal([ana, bea, carlos]) },
    { groupId: piso._id, payerId: carlos, concept: 'Compra Mercadona', amount: 52.3, splitMode: 'equal', participants: equal([ana, bea, carlos]) },
    { groupId: piso._id, payerId: ana, concept: 'Internet', amount: 35, splitMode: 'percentage',
      participants: [{ userId: ana, share: 50 }, { userId: bea, share: 25 }, { userId: carlos, share: 25 }] },
    { groupId: viaje._id, payerId: bea, concept: 'Vuelos', amount: 320, splitMode: 'equal', participants: equal([bea, ana, david, elena]) },
    { groupId: viaje._id, payerId: david, concept: 'Apartamento (2 noches)', amount: 240, splitMode: 'equal', participants: equal([bea, ana, david, elena]) },
    { groupId: viaje._id, payerId: elena, concept: 'Cena en Alfama', amount: 96.4, splitMode: 'equal', participants: equal([bea, ana, david, elena]) },
    { groupId: cena._id, payerId: carlos, concept: 'Reserva restaurante', amount: 60, splitMode: 'equal', participants: equal([carlos, david]) },
    { groupId: futbol._id, payerId: elena, concept: 'Pista octubre', amount: 45, splitMode: 'equal', participants: equal([elena, david, carlos]) },
  ]);

  await Payment.create([
    { groupId: piso._id, payerId: bea, receiverId: ana, amount: 300, status: 'completed' },
    { groupId: piso._id, payerId: carlos, receiverId: ana, amount: 150, status: 'pending' },
    { groupId: viaje._id, payerId: ana, receiverId: bea, amount: 80, status: 'completed' },
    { groupId: viaje._id, payerId: elena, receiverId: david, amount: 60, status: 'pending' },
    { groupId: cena._id, payerId: david, receiverId: carlos, amount: 30, status: 'completed' },
  ]);

  console.log('\nDatos de demo creados:');
  console.log(`  ${users.length} usuarios (contraseña: ${PASSWORD})`);
  for (const u of usersData) console.log(`    - ${u.email}`);
  console.log('  4 grupos: PISO01, LISBOA, CENA24, FUTBOL (ana@gmail.com no está en FUTBOL)');
  console.log('  9 gastos y 5 pagos');
}

seed()
  .catch((error) => {
    console.error('Error al poblar la base de datos:', error);
    process.exitCode = 1;
  })
  .finally(() => disconnect());
