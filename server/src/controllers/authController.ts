import express from 'express';
import { User } from '../models/user.js';
import jwt from 'jsonwebtoken'

/**
 * Genera un token JWT para un usuario dado.
 * @param userId - Idenntificador único del usuario para el cual se genera el token.
 * @returns Retorna un token JWT firmado que expira en 7 días.
 */
const generateToken = (userId: unknown): string => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
};

/**
 * Funcion para registrar un nuevo usuario en la base de datos.
 * @param req - La solicitud HTTP
 * @param res - La respuesta HTTP
 * @returns Devuelve los datos del usuario si el registro es exitoso, o un mensaje de error si ocurre algún problema.
 */
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

    // Normalizar los datos
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Validar la longitud de la contraseña
    if (password.length < 8) {
      res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres'
      });
      return;
    }

    // Comprobar si el correo ya está registrado
    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      res.status(409).json({
        message: 'El correo electrónico ya está registrado'
      });
      return;
    }

    // Crear el usuario
    const newUser = new User({
      name: normalizedName,
      email: normalizedEmail,
      password: password
    });

    // Guardar en la base de datos
    await newUser.save();

    // Generar el token JWT
    const token = generateToken(newUser._id);

    // Respuesta al cliente
    res.status(201).json({
      message: 'Usuario registrado correctamente',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        trustScore: newUser.trustScore
      }
    });

  } catch (error: any) {
    console.error('Error en el registro:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};


/**
 * Funcion para autenticar un usuario existente y generar un token JWT.
 * @param req - La solicitud HTTP
 * @param res - Respuesta HTTP
 * @returns Devuelve un token JWT y los datos del usuario si las credenciales son correctas, o un mensaje de error si no lo son.
 */
export const loginUser = async (req: express.Request, res: express.Response) => {
  try {
    const { email, password } = req.body ;

    // Validar campos obligatorios
    if (
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password
    ) {
      res.status(400).json({
        message: 'Correo electrónico y contraseña son obligatorios'
      });
      return;
    }

    // Buscar el usuario por correo electrónico (normalizado)
    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    // Verificar si el usuario existe y si la contraseña es correcta
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({
        message: 'Credenciales incorrectas'
      });
      return;
    }

    const token = generateToken(user._id);

    // Respuesta al cliente con el token y los datos del usuario
    res.status(200).json({
      message: 'Credenciales verificadas correctamente',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        trustScore: user.trustScore
      }
    });

  } catch (error: any) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};