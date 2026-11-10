import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extendemos la interfaz Request para poder usarlos datos del usuario verificado
export interface AuthRequest extends Request {
  user?: string | jwt.JwtPayload;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Obtener el token de la cabecera 'Authorization: Bearer <token>'
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Si no hay token, rechazamos la petición 
  if (!token) {
    res.status(401).json({ message: 'Acceso denegado: Autenticación requerida' });
    return;
  }

  // Verificamos que el token sea válido y no haya sido manipulado
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = decoded; // Guardamos los datos del usuario para que las rutas puedan usarlos
    next(); // Permite que la petición continúe hacia el router 
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};