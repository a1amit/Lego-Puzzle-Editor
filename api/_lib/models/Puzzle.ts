import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IPuzzle extends Document {
  definition: Record<string, unknown>;
  authorId: Types.ObjectId;
  authorUsername: string;
  status: 'draft' | 'published' | 'unlisted' | 'archived';
  slug: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  tags: string[];
  isLegacy: boolean;
  isFeatured: boolean;
  stats: {
    plays: number;
    completions: number;
    uniquePlayers: number;
    avgMoves: number;
    avgTimeSeconds: number;
    likes: number;
    completionRate: number;
    difficultyRating: number;
  };
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

const PuzzleSchema = new Schema<IPuzzle>(
  {
    definition: { type: Schema.Types.Mixed, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorUsername: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'unlisted', 'archived'],
      default: 'draft',
      index: true,
    },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, default: 'Coverage', index: true },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'expert'],
      default: 'medium',
      index: true,
    },
    tags: [{ type: String }],
    isLegacy: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false, index: true },
    stats: {
      plays: { type: Number, default: 0 },
      completions: { type: Number, default: 0 },
      uniquePlayers: { type: Number, default: 0 },
      avgMoves: { type: Number, default: 0 },
      avgTimeSeconds: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      difficultyRating: { type: Number, default: 1200 },
    },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PuzzleSchema.index(
  { 'definition.title': 'text', 'definition.description': 'text', tags: 'text', authorUsername: 'text' },
  { name: 'puzzle_search' }
);

export const Puzzle: Model<IPuzzle> =
  mongoose.models.Puzzle || mongoose.model<IPuzzle>('Puzzle', PuzzleSchema);
