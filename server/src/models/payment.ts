import { Schema, model, Document, Types } from 'mongoose';

interface PaymentDocumentInterface extends Document {
  groupId: Types.ObjectId;
  payerId: Types.ObjectId;
  receiverId: Types.ObjectId;
  amount: number;
  status: 'pending' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<PaymentDocumentInterface>({
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
  },
  payerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: [true, "El importe del pago es obligatorio"],
    min: [0.01, "El importe debe ser mayor que 0"],
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending', // Pendiente hasta que el receptor confirme que lo ha recibido.
  },
}, { timestamps: true });

export const Payment = model<PaymentDocumentInterface>('Payment', PaymentSchema);