/**
 * Seed script: imports the 14 hard-coded puzzles into MongoDB.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." npx tsx scripts/seed-legacy-puzzles.ts
 *
 * Each puzzle gets:
 *   - isLegacy: true
 *   - status: 'published'
 *   - authorUsername: 'system'
 *   - Deterministic slug from its category ID
 */

import mongoose from 'mongoose';

// We need to import the puzzle data. Since this script runs via tsx,
// we can import TypeScript files directly.

// Import puzzle definitions
import {
  DEFAULT_PUZZLE, COLORFUL_COVERAGE_PUZZLE, GRID_PUZZLE,
  FIT_ALL_PUZZLE,
  SLIDER_PUZZLE, KLOTSKI_RED_DONKEY, KLOTSKI_CROSSWAY, PEN_CHALLENGE_PUZZLE,
  BINARY_PUZZLE, BINARY_PUZZLE_SOS, BINARY_PUZZLE_BUILDING_BLOCKS,
  NONOGRAM_PUZZLE, NONOGRAM_PUZZLE_2,
} from '../src/types/puzzle';

// Puzzle model
import { Puzzle } from '../api/_lib/models/Puzzle';
import { User } from '../api/_lib/models/User';

interface SeedPuzzle {
  slug: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  definition: unknown;
  label: string;
  isFeatured: boolean;
}

const LEGACY_PUZZLES: SeedPuzzle[] = [
  { slug: 'coverage', category: 'Coverage', difficulty: 'easy', definition: DEFAULT_PUZZLE, label: 'T-Time', isFeatured: true },
  { slug: 'rainbow', category: 'Coverage', difficulty: 'medium', definition: COLORFUL_COVERAGE_PUZZLE, label: 'Rainbow Bricks', isFeatured: true },
  { slug: 'grid', category: 'Coverage', difficulty: 'easy', definition: GRID_PUZZLE, label: 'Grid Fill', isFeatured: false },
  { slug: 'fit-all', category: 'Fit All', difficulty: 'medium', definition: FIT_ALL_PUZZLE, label: 'Tetris Pack', isFeatured: true },
  { slug: 'slider', category: 'Slider / Klotski', difficulty: 'hard', definition: SLIDER_PUZZLE, label: 'Klotski Classic', isFeatured: true },
  { slug: 'klotski-red-donkey', category: 'Slider / Klotski', difficulty: 'expert', definition: KLOTSKI_RED_DONKEY, label: 'Red Donkey', isFeatured: false },
  { slug: 'klotski-crossway', category: 'Slider / Klotski', difficulty: 'hard', definition: KLOTSKI_CROSSWAY, label: 'Crossway', isFeatured: false },
  { slug: 'binary', category: 'Binary Safe', difficulty: 'medium', definition: BINARY_PUZZLE, label: 'Greeting', isFeatured: false },
  { slug: 'binary-deserted-island', category: 'Binary Safe', difficulty: 'medium', definition: BINARY_PUZZLE_SOS, label: 'Deserted Island', isFeatured: false },
  { slug: 'binary-building-blocks', category: 'Binary Safe', difficulty: 'medium', definition: BINARY_PUZZLE_BUILDING_BLOCKS, label: 'Building Blocks', isFeatured: false },
  { slug: 'pen-challenge', category: 'Brain Teasers', difficulty: 'hard', definition: PEN_CHALLENGE_PUZZLE, label: 'Pen Challenge', isFeatured: false },
  { slug: 'nonogram', category: 'Logic Puzzles', difficulty: 'medium', definition: NONOGRAM_PUZZLE, label: 'Nonogram: Cross', isFeatured: false },
  { slug: 'nonogram-2', category: 'Logic Puzzles', difficulty: 'medium', definition: NONOGRAM_PUZZLE_2, label: 'Nonogram: Cross 2', isFeatured: false },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  // Create or find the "system" user for legacy puzzles
  let systemUser = await User.findOne({ username: 'system' });
  if (!systemUser) {
    systemUser = await User.create({
      clerkId: 'system-legacy',
      username: 'system',
      bio: 'Built-in puzzle collection',
      xp: 0,
      level: 0,
    });
    console.log('Created system user');
  }

  let created = 0;
  let skipped = 0;

  for (const p of LEGACY_PUZZLES) {
    const exists = await Puzzle.findOne({ slug: p.slug });
    if (exists) {
      console.log(`  Skip (exists): ${p.slug}`);
      skipped++;
      continue;
    }

    await Puzzle.create({
      definition: p.definition,
      authorId: systemUser._id,
      authorUsername: 'system',
      status: 'published',
      slug: p.slug,
      category: p.category,
      difficulty: p.difficulty,
      tags: ['classic', p.category.toLowerCase()],
      isLegacy: true,
      isFeatured: p.isFeatured,
      publishedAt: new Date(),
    });

    console.log(`  Created: ${p.slug} (${p.label})`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
