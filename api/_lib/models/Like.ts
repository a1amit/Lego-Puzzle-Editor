import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface ILike extends Document {
  userId: Types.ObjectId;
  puzzleId: Types.ObjectId;
  createdAt: Date;
}

const LikeSchema = new Schema<ILike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    puzzleId: { type: Schema.Types.ObjectId, ref: 'Puzzle', required: true },
  },
  { timestamps: true }
);

LikeSchema.index({ userId: 1, puzzleId: 1 }, { unique: true });

export const Like: Model<ILike> =
  mongoose.models.Like || mongoose.model<ILike>('Like', LikeSchema);
