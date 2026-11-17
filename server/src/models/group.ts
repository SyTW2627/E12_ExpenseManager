import { Schema, model, Document, Types } from 'mongoose';
import crypto from 'crypto';
interface GroupDocumentInterface extends Document {
  name: string;
  description?: string;
  createdBy: Types.ObjectId;
  members: Types.ObjectId[];
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<GroupDocumentInterface>({
  name: {
    type: String,
    required: [true, "El nombre del grupo es obligatorio"],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: {
    type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    required: true,
  },
  inviteCode: {
    type: String,
    unique: true, // Debe ser único
  },
}, { timestamps: true });

// Función para generar el código de invitación automáticamente.
GroupSchema.pre('save', async function () {
  // Si el grupo ya tiene un inviteCode, salimos inmediatamente y Mongoose lo guarda
  if (this.inviteCode) {
    return;
  }

  // Generamos un string hexadecimal aleatorio de 6 caracteres en mayúsculas
  this.inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
});

export const Group = model<GroupDocumentInterface>('Group', GroupSchema);