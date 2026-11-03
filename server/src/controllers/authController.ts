import express from 'express';
import { User } from '../models/user.js';
import jwt from 'jsonwebtoken'

const generateToken = (userId: unknown): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
};

export const registerUser = async (req: express.Request, res: express.Response) => {
  try {
    const { name, email, password } = req.body;

    // Validar que todos los campos sean cadenas de texto
    if (
      typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' ||
      !name.trim() || !email.trim() || !password.trim()
    ) {
      res.status(400).json({ message: 'Todos los campos son obligatorios' });
      return;
    }

    // 2. Normalizar los datos
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Validar el formato del correo electrónico
    // PODEMOS MEJOR HACERLO CON UNA LIB
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ message: 'El correo electrónico no es válido' });
      return;
    }

    // 4. Validar la longitud de la contraseña
    if (password.length < 8) {
      res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres'
      });
      return;
    }

    // 5. Comprobar si el correo ya está registrado
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      res.status(409).json({
        message: 'El correo electrónico ya está registrado'
      });
      return;
    }

    // 7. Crear el usuario
    const newUser = new User({
      name: normalizedName,
      email: normalizedEmail,
      password: password
    });

    // 8. Guardar en la base de datos
    await newUser.save();

    // Generar el token JWT
    const token = generateToken(newUser._id);

    // 9. Respuesta al cliente
    res.status(201).json({
      message: 'Usuario registrado correctamente',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email
      }
    });

  } catch (error: any) {
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};


export const loginUser = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body ;

    // 1. Validate required fields
    if (
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password
    ) {
      res.status(400).json({
        message: 'Correo electrónico y contraseña son obligatorios'
      });
      return;
    }

    // 2. Find the user by email
    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    // 3. Verify user existence and password
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({
        message: 'Credenciales incorrectas'
      });
      return;
    }

    const token = generateToken(user._id);

    // 4. Successful login
    res.status(200).json({
      message: 'Credenciales verificadas correctamente',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error: any) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};