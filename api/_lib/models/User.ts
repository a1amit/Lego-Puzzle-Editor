import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IUser extends Document {
  clerkId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  role: 'user' | 'admin';
  isBanned: boolean;
  xp: number;
  level: number;
  puzzlesCreated: number;
  puzzlesCompleted: number;
  streakDays: number;
  lastSolveDate: Date | null;
  selectedTier: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, default: '' },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isBanned: { type: Boolean, default: false },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    puzzlesCreated: { type: Number, default: 0 },
    puzzlesCompleted: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastSolveDate: { type: Date, default: null },
    selectedTier: { type: String, default: null },
  },
  { timestamps: true }
);

// Compound index for leaderboard sort (ESR: sort fields in order)
UserSchema.index({ xp: -1, puzzlesCompleted: -1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
