/**
 * Migration script: recalculate all users' XP based on the new rules.
 *
 * New rules:
 *   - XP is only awarded on the FIRST solve of a puzzle
 *   - Fixed amounts: easy=50, medium=100, hard=200, expert=400
 *   - No multipliers (no efficiency, streak, or first-solve bonuses)
 *
 * This script:
 *   1. Fixes all completion records (correct xpEarned for first-solves, 0 for repeats)
 *   2. Recalculates each user's total XP (completions + publish XP + milestone XP)
 *   3. Recalculates each user's level
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." npx tsx scripts/fix-xp.ts
 */

import dns from 'dns';
import mongoose from 'mongoose';

// Force Google DNS so SRV lookups work regardless of local router DNS
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
import { User } from '../api/_lib/models/User';
import { Puzzle } from '../api/_lib/models/Puzzle';
import { Completion } from '../api/_lib/models/Completion';
import { levelFromXP, PUZZLE_PUBLISH_XP, SOLVER_MILESTONE_10_XP, SOLVER_MILESTONE_50_XP } from '../api/_lib/xp';

const BASE_XP: Record<string, number> = {
  easy: 50,
  medium: 100,
  hard: 200,
  expert: 400,
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.\n');

  // Build a slug -> difficulty lookup from all puzzles
  const allPuzzles = await Puzzle.find({}, { slug: 1, difficulty: 1, authorId: 1, stats: 1, isLegacy: 1, status: 1 }).lean();
  const puzzleBySlug = new Map<string, { difficulty: string; authorId: string; uniquePlayers: number }>();
  const puzzleById = new Map<string, { difficulty: string }>();

  for (const p of allPuzzles) {
    puzzleBySlug.set(p.slug, {
      difficulty: p.difficulty,
      authorId: p.authorId.toString(),
      uniquePlayers: p.stats?.uniquePlayers ?? 0,
    });
    puzzleById.set(p._id.toString(), { difficulty: p.difficulty });
  }

  // Process all users
  const users = await User.find({});
  console.log(`Found ${users.length} users to process.\n`);

  let totalUsersFixed = 0;

  for (const user of users) {
    const oldXP = user.xp;
    const oldLevel = user.level;

    // 1. Fix completion records and sum correct XP from completions
    const completions = await Completion.find({ userId: user._id });
    let completionXP = 0;

    for (const comp of completions) {
      // Determine difficulty
      let difficulty = puzzleById.get(comp.puzzleId.toString())?.difficulty;
      if (!difficulty) {
        difficulty = puzzleBySlug.get(comp.puzzleSlug)?.difficulty;
      }
      if (!difficulty) difficulty = 'medium'; // fallback

      const correctXP = comp.isFirstSolve ? (BASE_XP[difficulty] ?? 100) : 0;

      if (comp.xpEarned !== correctXP) {
        await Completion.updateOne({ _id: comp._id }, { $set: { xpEarned: correctXP } });
      }

      completionXP += correctXP;
    }

    // 2. Add publish XP: 50 XP per published puzzle (non-legacy)
    const publishedCount = await Puzzle.countDocuments({
      authorId: user._id,
      status: 'published',
      isLegacy: false,
    });
    const publishXP = publishedCount * PUZZLE_PUBLISH_XP;

    // 3. Add milestone XP for created puzzles
    let milestoneXP = 0;
    const userPuzzles = allPuzzles.filter(
      (p) => p.authorId.toString() === user._id.toString() && !p.isLegacy && p.status === 'published'
    );
    for (const p of userPuzzles) {
      const up = p.stats?.uniquePlayers ?? 0;
      if (up >= 50) milestoneXP += SOLVER_MILESTONE_50_XP;
      if (up >= 10) milestoneXP += SOLVER_MILESTONE_10_XP;
    }

    // 4. Set corrected totals
    const newXP = completionXP + publishXP + milestoneXP;
    const newLevel = levelFromXP(newXP);

    if (user.xp !== newXP || user.level !== newLevel) {
      user.xp = newXP;
      user.level = newLevel;
      await user.save();
      totalUsersFixed++;
      console.log(
        `  ${user.username}: XP ${oldXP} -> ${newXP} (level ${oldLevel} -> ${newLevel})` +
        ` [completions: ${completionXP}, publish: ${publishXP}, milestones: ${milestoneXP}]`
      );
    }
  }

  console.log(`\nDone. Fixed ${totalUsersFixed} / ${users.length} users.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
