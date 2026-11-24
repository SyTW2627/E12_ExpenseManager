import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType =
  | 'expense_created'
  | 'payment_created'
  | 'payment_completed'
  | 'all_or_nothing'
  | 'low_trust_score';

export interface NotificationDocumentInterface extends Document {
  userId: Types.ObjectId;
  groupId: Types.ObjectId;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDocumentInterface>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    type: {
      type: String,
      enum: ['expense_created', 'payment_created', 'payment_completed', 'all_or_nothing', 'low_trust_score'],
      required: [true, 'El tipo de notificación es obligatorio'],
    },
    message: {
      type: String,
      required: [true, 'El mensaje de la notificación es obligatorio'],
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Notification = model<NotificationDocumentInterface>('Notification', NotificationSchema);