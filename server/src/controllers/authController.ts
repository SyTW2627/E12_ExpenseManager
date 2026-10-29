import type { Request, Response } from 'express';
import { User } from '../models/user.js'; // Ajusta la ruta si tu archivo user.ts está en otra carpeta (ej. '../db/user')

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Validar que no falten datos 
    if (!name || !email || !password) {
      res.status(400).json({ message: 'Todos los campos son obligatorios' });
      return;
    }

    // Comprobar si el correo ya existe en la base de datos
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(409).json({ message: 'El correo electrónico ya está registrado' });
      return;
    }

    // Crear el usuario. 
    const newUser = new User({ name, email, password });

    // 4. Guardar en la base de datos
    await newUser.save();

    // 5. Responder al cliente. 
    res.status(201).json({
      message: 'Usuario registrado correctamente',
      user: newUser
    });

  } catch (error: any) {
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};