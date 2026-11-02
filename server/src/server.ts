import 'dotenv/config'
import express from 'express';
import cors from 'cors';

import './db/mongoose.js'
import { authRouter } from './routes/authRoutes.js';
import { userRouter } from './routes/userRouter.js';

// Inicializar la aplicación de Express
const app = express();

app.use(cors()); // Permite que el frontend  se comunique con este backend
app.use(express.json()); // Permite leer los datos que vengan en formato JSON

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

// Ruta de prueba (cambiar)
app.get('/', (req, res) => {
  res.send('El servidor está corriendo correctamente.');
});

// Definir un puerto y levantar el servidor
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo correctamente en http://localhost:${PORT}`);
});