import 'dotenv/config'
import express from 'express';
import cors from 'cors';

import './db/mongoose.js'
import { authRouter } from './routes/authRouter.js';
import { userRouter } from './routes/userRouter.js';
import { groupRouter } from './routes/groupRouter.js';
import { paymentRouter } from './routes/paymentRouter.js';
import { expenseRouter } from './routes/expenseRouter.js';

// middleware de seguridad
import { verifyToken } from './middlewares/authMiddleware.js';

// Inicializar la aplicación de Express
const app = express();

app.use(cors()); // Permite que el frontend  se comunique con este backend
app.use(express.json()); // Permite leer los datos que vengan en formato JSON

app.use('/api/auth', authRouter);

// Rutas protegidas por el middleware de seguridad
app.use('/api', verifyToken, userRouter);
app.use('/api', verifyToken, groupRouter);
app.use('/api', verifyToken, paymentRouter);
app.use('/api', verifyToken, expenseRouter);

// Ruta de prueba (cambiar)
app.get('/', (req, res) => {
  res.send('El servidor está corriendo correctamente.');
});

// Definir un puerto y levantar el servidor
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo correctamente en http://localhost:${PORT}`);
});