import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

interface UserDocumentInterface extends Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<UserDocumentInterface>({
  name: {
    type: String,
    required: [true, "El nombre es obligatorio"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "El correo electrónico es obligatorio"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "La contraseña es obligatoria"],
    minlength: [6, "La contraseña debe contener al menos 6 caracteres"],
  },
}, { timestamps: true, }); // Creación automática de createdAt y updatedAt

// Hash sobre la contraseña antes de guardarla
UserSchema.pre('save', async function () {
  // Se aplica el hash si la contraseña es nueva o se ha modificado
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar las contraseñas en el login
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Oculta el hash antes de devolver el JSON
UserSchema.set('toJSON', {
  transform: (_, ret) => {
    const { password, __v, ...userWithoutSensitiveData } = ret;
    return userWithoutSensitiveData;
  },
});

export const User = model<UserDocumentInterface>('User', UserSchema);