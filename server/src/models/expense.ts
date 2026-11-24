import { Schema, model, Document, Types } from 'mongoose';

interface Participant {
  userId: Types.ObjectId;
  share: number; // Para saber el porcentaje o cantidad que le corresponde a cada participante, dependiendo del splitMode
}

interface ExpenseDocumentInterface extends Document {
  groupId: Types.ObjectId;
  payerId: Types.ObjectId;
  concept: string;
  amount: number;
  splitMode: 'equal' | 'percentage' | 'roulette' | 'allOrNothing';
  allOrNothingResult?: 'payerPaysAll' | 'othersPayAll';
  participants: Participant[];
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<ExpenseDocumentInterface>({
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
  concept: {
    type: String,
    required: [true, "El concepto del gasto es obligatorio"],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, "El importe es obligatorio"],
    min: [0.01, "El importe debe ser mayor que 0"],
  },
  splitMode: {
    type: String,
    enum: ['equal', 'percentage', 'roulette', 'allOrNothing'],
    default: 'equal',
  },
  allOrNothingResult: {
    type: String,
    enum: ['payerPaysAll', 'othersPayAll'],
  },
  participants: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    share: { type: Number, required: true, min: 0 }
  }],
}, { timestamps: true });

export const Expense = model<ExpenseDocumentInterface>('Expense', ExpenseSchema);