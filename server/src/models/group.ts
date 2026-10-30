import { Schema, model, Document, Types } from 'mongoose';

interface GroupDocumentInterface extends Document {
  name: string;
  description?: string;
  createdBy: Types.ObjectId;
  members: Types.ObjectId[];
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
}, { timestamps: true });

export const Group = model<GroupDocumentInterface>('Group', GroupSchema);