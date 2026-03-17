/**
 * End-to-end API test script
 * Run with: npx tsx scripts/test-api.ts
 */

const BASE = 'http://localhost:3000';

let passed = 0;
let failed = 0;

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Seed data directly via MongoDB (bypasses Clerk auth)
// ---------------------------------------------------------------------------
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

import mongoose from 'mongoose';

import 'dotenv/config';
const MONGO_URI = process.env.MONGODB_URI!;

const UserSchema = new mongoose.Schema({
  clerkId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  avatarUrl: { type: String, default: null },
  bio: { type: String, default: '' },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  puzzlesCreated: { type: Number, default: 0 },
  puzzlesCompleted: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
  lastSolveDate: { type: Date, default: null },
}, { timestamps: true });

const PuzzleSchema = new mongoose.Schema({
  definition: { type: mongoose.Schema.Types.Mixed, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorUsername: { type: String, required: true },
  status: { type: String, default: 'draft' },
  slug: { type: String, required: true, unique: true },
  category: { type: String, default: 'Coverage' },
  difficulty: { type: String, default: 'medium' },
  tags: [{ type: String }],
  isLegacy: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
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
}, { timestamps: true });

const CompletionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  puzzleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Puzzle', required: true },
  puzzleSlug: { type: String, required: true },
  moveCount: { type: Number, required: true },
  timeSeconds: { type: Number, required: true },
  xpEarned: { type: Number, required: true },
  isFirstSolve: { type: Boolean, default: false },
  completedAt: { type: Date, default: Date.now },
});

const LikeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  puzzleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Puzzle', required: true },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Puzzle = mongoose.model('Puzzle', PuzzleSchema);
const Completion = mongoose.model('Completion', CompletionSchema);
const Like = mongoose.model('Like', LikeSchema);

async function cleanDB() {
  await User.deleteMany({});
  await Puzzle.deleteMany({});
  await Completion.deleteMany({});
  await Like.deleteMany({});
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!\n');

  // Clean slate
  await cleanDB();
  console.log('Database cleaned.\n');

  // =========================================================================
  // TEST 1: Seed users
  // =========================================================================
  console.log('--- TEST 1: Create Users ---');
  const alice = await User.create({
    clerkId: 'clerk_alice_001',
    username: 'alice_builder',
    bio: 'I love building puzzles!',
    xp: 500,
    level: 5,
    puzzlesCreated: 3,
  });
  assert('Alice created', !!alice._id);

  const bob = await User.create({
    clerkId: 'clerk_bob_002',
    username: 'bob_solver',
    bio: 'Puzzle solving champion',
    xp: 250,
    level: 3,
    puzzlesCompleted: 10,
    streakDays: 3,
  });
  assert('Bob created', !!bob._id);

  const charlie = await User.create({
    clerkId: 'clerk_charlie_003',
    username: 'charlie_newbie',
    xp: 0,
    level: 0,
  });
  assert('Charlie created (new user, 0 XP)', !!charlie._id);

  // =========================================================================
  // TEST 2: Seed puzzles
  // =========================================================================
  console.log('\n--- TEST 2: Create Puzzles ---');
  const puzzle1 = await Puzzle.create({
    definition: {
      title: 'Easy Starter',
      description: 'A simple puzzle for beginners',
      board: { dimensions: { width: 5, height: 5 } },
    },
    authorId: alice._id,
    authorUsername: 'alice_builder',
    status: 'published',
    slug: 'easy-starter',
    category: 'Coverage',
    difficulty: 'easy',
    tags: ['beginner', 'tutorial'],
    isFeatured: true,
    publishedAt: new Date(),
    stats: { plays: 42, completions: 20, uniquePlayers: 18, likes: 8, avgMoves: 12, avgTimeSeconds: 45, completionRate: 0.47, difficultyRating: 1100 },
  });
  assert('Puzzle 1 (easy, published, featured)', !!puzzle1._id);

  const puzzle2 = await Puzzle.create({
    definition: {
      title: 'Mind Bender',
      description: 'A challenging puzzle for experts',
      board: { dimensions: { width: 10, height: 10 } },
    },
    authorId: alice._id,
    authorUsername: 'alice_builder',
    status: 'published',
    slug: 'mind-bender',
    category: 'Coverage',
    difficulty: 'hard',
    tags: ['challenge', 'expert'],
    publishedAt: new Date(),
    stats: { plays: 100, completions: 5, uniquePlayers: 80, likes: 25, avgMoves: 50, avgTimeSeconds: 300, completionRate: 0.05, difficultyRating: 1500 },
  });
  assert('Puzzle 2 (hard, published)', !!puzzle2._id);

  const puzzle3 = await Puzzle.create({
    definition: { title: 'Work In Progress', board: { dimensions: { width: 8, height: 8 } } },
    authorId: bob._id,
    authorUsername: 'bob_solver',
    status: 'draft',
    slug: 'work-in-progress',
    difficulty: 'medium',
    tags: [],
  });
  assert('Puzzle 3 (draft, should NOT appear in public listings)', !!puzzle3._id);

  // =========================================================================
  // TEST 3: API - List published puzzles
  // =========================================================================
  console.log('\n--- TEST 3: GET /api/puzzles ---');
  const { status: s3, data: d3 } = await api('GET', '/api/puzzles');
  assert('Status 200', s3 === 200);
  assert('Returns 2 published puzzles (not draft)', d3.puzzles?.length === 2, `got ${d3.puzzles?.length}`);
  assert('Pagination total = 2', d3.pagination?.total === 2);

  // =========================================================================
  // TEST 4: API - Filter puzzles by difficulty
  // =========================================================================
  console.log('\n--- TEST 4: GET /api/puzzles?difficulty=easy ---');
  const { data: d4 } = await api('GET', '/api/puzzles?difficulty=easy');
  assert('Returns 1 easy puzzle', d4.puzzles?.length === 1);
  assert('Puzzle is "Easy Starter"', d4.puzzles?.[0]?.slug === 'easy-starter');

  // =========================================================================
  // TEST 5: API - Featured puzzles
  // =========================================================================
  console.log('\n--- TEST 5: GET /api/puzzles?featured=true ---');
  const { data: d5 } = await api('GET', '/api/puzzles?featured=true');
  assert('Returns 1 featured puzzle', d5.puzzles?.length === 1);
  assert('Featured puzzle is "Easy Starter"', d5.puzzles?.[0]?.slug === 'easy-starter');

  // =========================================================================
  // TEST 6: API - Sort by likes
  // =========================================================================
  console.log('\n--- TEST 6: GET /api/puzzles?sort=likes ---');
  const { data: d6 } = await api('GET', '/api/puzzles?sort=likes');
  assert('Most liked puzzle first', d6.puzzles?.[0]?.slug === 'mind-bender', `got ${d6.puzzles?.[0]?.slug}`);

  // =========================================================================
  // TEST 7: API - Get single puzzle (increments plays)
  // =========================================================================
  console.log('\n--- TEST 7: GET /api/puzzles/easy-starter ---');
  const playsBefore = puzzle1.stats.plays;
  const { status: s7, data: d7 } = await api('GET', '/api/puzzles/easy-starter');
  assert('Status 200', s7 === 200);
  assert('Returns puzzle with definition', !!d7.puzzle?.definition?.title);
  assert('Has isLiked field', d7.isLiked === false);
  // Check play count incremented in DB
  const refreshed = await Puzzle.findOne({ slug: 'easy-starter' });
  assert('Play count incremented', refreshed!.stats.plays === playsBefore + 1, `was ${playsBefore}, now ${refreshed!.stats.plays}`);

  // =========================================================================
  // TEST 8: API - Puzzle not found
  // =========================================================================
  console.log('\n--- TEST 8: GET /api/puzzles/nonexistent ---');
  const { status: s8, data: d8 } = await api('GET', '/api/puzzles/nonexistent');
  assert('Status 404', s8 === 404);
  assert('Error message', d8.error === 'Puzzle not found');

  // =========================================================================
  // TEST 9: API - User profiles
  // =========================================================================
  console.log('\n--- TEST 9: GET /api/users/:username ---');
  const { status: s9, data: d9 } = await api('GET', '/api/users/alice_builder');
  assert('Status 200', s9 === 200);
  assert('Returns user without clerkId', !d9.user?.clerkId);
  assert('Username matches', d9.user?.username === 'alice_builder');
  assert('XP = 500', d9.user?.xp === 500);
  assert('Returns published puzzles', d9.puzzles?.length === 2);

  const { data: d9b } = await api('GET', '/api/users/bob_solver');
  assert('Bob profile - draft puzzle NOT in public list', d9b.puzzles?.length === 0);

  // =========================================================================
  // TEST 10: API - User not found
  // =========================================================================
  console.log('\n--- TEST 10: GET /api/users/nobody ---');
  const { status: s10 } = await api('GET', '/api/users/nobody');
  assert('Status 404', s10 === 404);

  // =========================================================================
  // TEST 11: API - Leaderboard
  // =========================================================================
  console.log('\n--- TEST 11: GET /api/leaderboard ---');
  const { data: d11 } = await api('GET', '/api/leaderboard');
  assert('Returns 2 users with xp > 0 (not Charlie)', d11.entries?.length === 2, `got ${d11.entries?.length}`);
  assert('Alice is rank 1 (highest XP)', d11.entries?.[0]?.username === 'alice_builder');
  assert('Bob is rank 2', d11.entries?.[1]?.username === 'bob_solver');
  assert('Ranks are numbered', d11.entries?.[0]?.rank === 1 && d11.entries?.[1]?.rank === 2);

  // =========================================================================
  // TEST 12: API - Auth-protected endpoints without token
  // =========================================================================
  console.log('\n--- TEST 12: Auth-protected endpoints (no token) ---');
  const { status: s12a } = await api('GET', '/api/users/me');
  assert('GET /api/users/me → 401', s12a === 401);

  const { status: s12b } = await api('POST', '/api/puzzles/create', {
    definition: { title: 'Hack attempt' },
  });
  assert('POST /api/puzzles/create → 401', s12b === 401);

  const { status: s12c } = await api('POST', '/api/puzzles/easy-starter/complete', {
    moveCount: 10,
    timeSeconds: 30,
  });
  assert('POST /api/puzzles/:slug/complete → 401', s12c === 401);

  const { status: s12d } = await api('POST', '/api/puzzles/easy-starter/like');
  assert('POST /api/puzzles/:slug/like → 401', s12d === 401);

  const { status: s12e } = await api('PATCH', '/api/puzzles/work-in-progress/publish');
  assert('PATCH /api/puzzles/:slug/publish → 401', s12e === 401);

  // =========================================================================
  // TEST 13: API - Pagination
  // =========================================================================
  console.log('\n--- TEST 13: Pagination ---');
  const { data: d13 } = await api('GET', '/api/puzzles?limit=1&page=1');
  assert('Page 1: returns 1 puzzle', d13.puzzles?.length === 1);
  assert('Total pages = 2', d13.pagination?.totalPages === 2);

  const { data: d13b } = await api('GET', '/api/puzzles?limit=1&page=2');
  assert('Page 2: returns 1 puzzle', d13b.puzzles?.length === 1);
  assert('Different puzzle than page 1', d13b.puzzles?.[0]?.slug !== d13.puzzles?.[0]?.slug);

  // =========================================================================
  // TEST 14: Direct DB - Completions & XP
  // =========================================================================
  console.log('\n--- TEST 14: Completions & XP (direct DB) ---');
  const completion1 = await Completion.create({
    userId: bob._id,
    puzzleId: puzzle1._id,
    puzzleSlug: 'easy-starter',
    moveCount: 10,
    timeSeconds: 30,
    xpEarned: 100,
    isFirstSolve: true,
  });
  assert('Completion created', !!completion1._id);

  // Update Bob's XP
  bob.xp += 100;
  bob.puzzlesCompleted += 1;
  await bob.save();

  const { data: d14 } = await api('GET', '/api/users/bob_solver');
  assert('Bob XP updated to 350', d14.user?.xp === 350);
  assert('Bob completions = 11', d14.user?.puzzlesCompleted === 11);

  // =========================================================================
  // TEST 15: Direct DB - Likes
  // =========================================================================
  console.log('\n--- TEST 15: Likes (direct DB) ---');
  await Like.create({ userId: bob._id, puzzleId: puzzle1._id });
  await Puzzle.updateOne({ _id: puzzle1._id }, { $inc: { 'stats.likes': 1 } });

  const { data: d15 } = await api('GET', '/api/puzzles/easy-starter');
  assert('Like count increased to 9', d15.puzzle?.stats?.likes === 9, `got ${d15.puzzle?.stats?.likes}`);

  // Test unique constraint on likes
  try {
    await Like.create({ userId: bob._id, puzzleId: puzzle1._id });
    assert('Duplicate like prevented', false, 'should have thrown');
  } catch (err: any) {
    assert('Duplicate like prevented (unique index)', err.code === 11000);
  }

  // =========================================================================
  // TEST 16: API - 404 fallback
  // =========================================================================
  console.log('\n--- TEST 16: API fallback ---');
  const { status: s16, data: d16 } = await api('GET', '/api/totally/random/path');
  assert('Unknown route → 404', s16 === 404);
  assert('Returns JSON error', d16.error === 'Not found');

  // =========================================================================
  // TEST 17: Direct DB - Multiple completions of same puzzle
  // =========================================================================
  console.log('\n--- TEST 17: Multiple completions tracking ---');
  await Completion.create({
    userId: bob._id,
    puzzleId: puzzle1._id,
    puzzleSlug: 'easy-starter',
    moveCount: 8,
    timeSeconds: 25,
    xpEarned: 50,
    isFirstSolve: false,
  });
  const bobCompletions = await Completion.countDocuments({ userId: bob._id, puzzleId: puzzle1._id });
  assert('Bob has 2 completions of same puzzle', bobCompletions === 2);

  const firstSolves = await Completion.countDocuments({ userId: bob._id, isFirstSolve: true });
  assert('Only 1 first-solve', firstSolves === 1);

  // =========================================================================
  // TEST 18: DB collections exist
  // =========================================================================
  console.log('\n--- TEST 18: Verify all collections ---');
  const collections = await mongoose.connection.db!.listCollections().toArray();
  const names = collections.map((c) => c.name).sort();
  console.log('  Collections:', names.join(', '));
  assert('users collection exists', names.includes('users'));
  assert('puzzles collection exists', names.includes('puzzles'));
  assert('completions collection exists', names.includes('completions'));
  assert('likes collection exists', names.includes('likes'));

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(50));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('='.repeat(50));

  // Cleanup
  await cleanDB();
  console.log('\nDatabase cleaned up.');
  await mongoose.disconnect();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
