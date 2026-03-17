import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface ICompletion extends Document {
  userId: Types.ObjectId;
  puzzleId: Types.ObjectId;
  puzzleSlug: string;
  moveCount: number;
  timeSeconds: number;
  xpEarned: number;
  isFirstSolve: boolean;
  completedAt: Date;
}

const CompletionSchema = new Schema<ICompletion>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  puzzleId: { type: Schema.Types.ObjectId, ref: 'Puzzle', required: true, index: true },
  puzzleSlug: { type: String, required: true },
  moveCount: { type: Number, required: true },
  timeSeconds: { type: Number, required: true },
  xpEarned: { type: Number, required: true },
  isFirstSolve: { type: Boolean, default: false },
  completedAt: { type: Date, default: Date.now },
});

CompletionSchema.index({ userId: 1, puzzleId: 1, completedAt: 1 });

export const Completion: Model<ICompletion> =
  mongoose.models.Completion || mongoose.model<ICompletion>('Completion', CompletionSchema);
