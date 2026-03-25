/**
 * Migration script: recalculate all users' streakDays from completion history.
 *
 * For each user, looks at all completion dates, extracts unique UTC calendar
 * days, and counts the current streak (consecutive days ending at the most
 * recent solve). Also corrects lastSolveDate.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." npx tsx scripts/fix-streaks.ts
 */

import dns from 'dns';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

import { User } from '../api/_lib/models/User';
import { Completion } from '../api/_lib/models/Completion';

function toUTCDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / (1000 * 60 * 60 * 24);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.\n');

  const users = await User.find({});
  console.log(`Found ${users.length} users to process.\n`);

  let totalFixed = 0;

  for (const user of users) {
    const completions = await Completion.find(
      { userId: user._id },
      { completedAt: 1 },
    )
      .sort({ completedAt: 1 })
      .lean();

    if (completions.length === 0) {
      // No completions — streak should be 0, lastSolveDate null
      if (user.streakDays !== 0 || user.lastSolveDate !== null) {
        const oldStreak = user.streakDays;
        user.streakDays = 0;
        user.lastSolveDate = null;
        await user.save();
        totalFixed++;
        console.log(`  ${user.username}: streak ${oldStreak} -> 0 (no completions)`);
      }
      continue;
    }

    // Get unique UTC calendar days (as day numbers), sorted ascending
    const daySet = new Set<number>();
    for (const c of completions) {
      daySet.add(toUTCDay(new Date(c.completedAt)));
    }
    const days = [...daySet].sort((a, b) => a - b);

    // Count current streak: walk backwards from most recent day
    let streak = 1;
    for (let i = days.length - 1; i > 0; i--) {
      if (days[i] - days[i - 1] === 1) {
        streak++;
      } else {
        break;
      }
    }

    const lastSolve = completions[completions.length - 1].completedAt;

    if (user.streakDays !== streak || user.lastSolveDate?.getTime() !== new Date(lastSolve).getTime()) {
      const oldStreak = user.streakDays;
      user.streakDays = streak;
      user.lastSolveDate = new Date(lastSolve);
      await user.save();
      totalFixed++;
      console.log(`  ${user.username}: streak ${oldStreak} -> ${streak} (last solve: ${new Date(lastSolve).toISOString()})`);
    }
  }

  console.log(`\nDone. Fixed ${totalFixed} / ${users.length} users.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
