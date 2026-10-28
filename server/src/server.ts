import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Cargar las variables de entorno (el archivo .env) 
// Falta por configurar el archivo .env con las variables necesarias para la conexión a la base de datos 
dotenv.config();

// Inicializar la aplicación de Express
const app = express();

app.use(cors()); // Permite que el frontend  se comunique con este backend
app.use(express.json()); // Permite leer los datos que vengan en formato JSON

// Ruta de prueba (cambiar)
app.get('/', (req: Request, res: Response) => {
  res.send('El servidor está corriendo correctamente.');
});

// Definir un puerto y levantar el servidor
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo correctamente en http://localhost:${PORT}`);
});