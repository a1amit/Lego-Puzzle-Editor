import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IUser extends Document {
  clerkId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  xp: number;
  level: number;
  puzzlesCreated: number;
  puzzlesCompleted: number;
  streakDays: number;
  lastSolveDate: Date | null;
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
    xp: { type: Number, default: 0, index: -1 },
    level: { type: Number, default: 0 },
    puzzlesCreated: { type: Number, default: 0 },
    puzzlesCompleted: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastSolveDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
