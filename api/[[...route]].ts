// Force Google DNS for SRV record resolution (MongoDB Atlas)
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
import { Hono } from 'hono';
import type { IncomingMessage, ServerResponse } from 'http';
import { cors } from 'hono/cors';
import { createMiddleware } from 'hono/factory';
import { except } from 'hono/combine';
import { connectDB } from './_lib/db.js';
import { verifyAuth, type AuthUser } from './_lib/auth.js';
import { checkRateLimit } from './_lib/rateLimit.js';
import {
  calculateXP,
  levelFromXP,
  type Difficulty,
  SOLVER_MILESTONE_10_XP,
  SOLVER_MILESTONE_50_XP,
} from './_lib/xp.js';
import { User } from './_lib/models/User.js';
import { Puzzle } from './_lib/models/Puzzle.js';
import { Completion } from './_lib/models/Completion.js';
import { Like } from './_lib/models/Like.js';

export const config = { runtime: 'nodejs' };

type Env = {
  Variables: {
    authUser: AuthUser | null;
  };
};

const app = new Hono<Env>().basePath('/api');

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', async (_c, next) => {
  await connectDB();
  await next();
});

// Auth middleware — skipped for public GET endpoints
const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authUser = await verifyAuth(c.req.raw);
  c.set('authUser', authUser);
  await next();
});

app.use('*', except(
  (c) => {
    if (c.req.method !== 'GET') return false;
    const p = c.req.path;
    return p === '/api/leaderboard'
      || p.startsWith('/api/puzzles')
      || (p.startsWith('/api/users/') && !p.startsWith('/api/users/me'));
  },
  authMiddleware,
));

// Rate limiting (runs on all routes, uses IP for unauthenticated)
app.use('*', async (c, next) => {
  const identifier = c.get('authUser')?.clerkId || c.req.header('x-forwarded-for') || 'anonymous';
  const isChat = c.req.path.includes('/chat');
  const { success } = await checkRateLimit(identifier, isChat ? 'chat' : 'api');

  if (!success) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }

  await next();
});

// ---------------------------------------------------------------------------
// USERS
// ---------------------------------------------------------------------------

// GET /api/users/me — current user profile (upsert on first login)
// Accepts optional ?displayName=... and ?avatarUrl=... to sync from Clerk
app.get('/users/me', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  let user = await User.findOne({ clerkId: authUser.clerkId });

  if (!user) {
    const username = `user_${authUser.clerkId.slice(-8)}`;
    user = await User.create({
      clerkId: authUser.clerkId,
      username,
      displayName: c.req.query('displayName')?.replaceAll('+', ' ') || username,
      avatarUrl: c.req.query('avatarUrl')?.replaceAll('+', ' ') || null,
    });
  } else {
    // Sync display name / avatar from Clerk if provided
    const dn = c.req.query('displayName')?.replaceAll('+', ' ');
    const av = c.req.query('avatarUrl')?.replaceAll('+', ' ');
    let dirty = false;
    if (dn && dn !== user.displayName) { user.displayName = dn; dirty = true; }
    if (av && av !== user.avatarUrl) { user.avatarUrl = av; dirty = true; }
    if (dirty) await user.save();
  }

  if (user.isBanned) return c.json({ error: 'Your account has been suspended' }, 403);

  return c.json({ user });
});

// GET /api/users/me/puzzles
app.get('/users/me/puzzles', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const puzzles = await Puzzle.find({ authorId: user._id })
    .sort({ createdAt: -1 })
    .select('-definition');

  return c.json({ puzzles });
});

// GET /api/users/me/completions
app.get('/users/me/completions', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const completions = await Completion.find({ userId: user._id })
    .sort({ completedAt: -1 })
    .limit(50)
    .lean();

  return c.json({ completions });
});

// GET /api/users/:username — public profile
app.get('/users/:username', async (c) => {
  const { username } = c.req.param();
  const user = await User.findOne({ username }).select('-clerkId').lean();
  if (!user) return c.json({ error: 'User not found' }, 404);

  const [puzzles, completions] = await Promise.all([
    Puzzle.find({ authorId: user._id, status: 'published' })
      .sort({ createdAt: -1 })
      .select({ 'definition.inventory': 0, 'definition.validation_rules': 0, 'definition.board.initial_state': 0, 'definition.board.blocked_cells': 0, 'definition.goal': 0 })
      .lean(),
    Completion.find({ userId: user._id })
      .sort({ completedAt: -1 })
      .limit(20)
      .lean(),
  ]);

  return c.json({ user, puzzles, completions });
});

// ---------------------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------------------

// POST /api/admin/bootstrap — promote first user to admin (only works if no admins exist)
app.post('/admin/bootstrap', async (c) => {
  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin) return c.json({ error: 'Admin already exists' }, 400);

  // Try auth first, fall back to finding first user
  const authUser = c.get('authUser');
  const user = authUser
    ? await User.findOne({ clerkId: authUser.clerkId })
    : await User.findOne().sort({ createdAt: 1 });
  if (!user) return c.json({ error: 'No users found' }, 404);

  user.role = 'admin';
  await user.save();
  return c.json({ user: { username: user.username, displayName: user.displayName, role: user.role }, message: 'Admin created' });
});

// GET /api/admin/users — list all users (admin only)
app.get('/admin/users', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const admin = await User.findOne({ clerkId: authUser.clerkId });
  if (!admin || admin.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const users = await User.find().sort({ createdAt: -1 }).select('-__v').lean();
  return c.json({ users });
});

// PATCH /api/admin/users/:userId — update user role or ban status (admin only)
app.patch('/admin/users/:userId', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const admin = await User.findOne({ clerkId: authUser.clerkId });
  if (!admin || admin.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const { userId } = c.req.param();
  const target = await User.findById(userId);
  if (!target) return c.json({ error: 'User not found' }, 404);

  // Prevent self-demotion
  if (target.clerkId === authUser.clerkId) return c.json({ error: 'Cannot modify your own account' }, 400);

  const body = await c.req.json<{ role?: string; isBanned?: boolean }>();
  if (body.role === 'admin' || body.role === 'user') target.role = body.role;
  if (typeof body.isBanned === 'boolean') target.isBanned = body.isBanned;

  await target.save();
  return c.json({ user: target });
});

// ---------------------------------------------------------------------------
// PUZZLES
// ---------------------------------------------------------------------------

// GET /api/puzzles — list / search / filter
app.get('/puzzles', async (c) => {
  const {
    search,
    category,
    difficulty,
    sort = 'newest',
    page = '1',
    limit = '20',
    featured,
  } = c.req.query();

  const query: Record<string, unknown> = { status: 'published' };

  if (search) query.$text = { $search: search };
  if (category) query.category = category;
  if (difficulty) query.difficulty = difficulty;
  if (featured === 'true') query.isFeatured = true;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  let sortOption: Record<string, 1 | -1> = {};
  switch (sort) {
    case 'popular':    sortOption = { 'stats.plays': -1 }; break;
    case 'difficulty': sortOption = { difficulty: 1 }; break;
    case 'likes':      sortOption = { 'stats.likes': -1 }; break;
    default:           sortOption = { createdAt: -1 };
  }

  const [puzzles, total] = await Promise.all([
    Puzzle.find(query).sort(sortOption).skip(skip).limit(limitNum)
      .select({ 'definition.inventory': 0, 'definition.validation_rules': 0, 'definition.board.initial_state': 0, 'definition.board.blocked_cells': 0, 'definition.goal': 0 })
      .lean(),
    Puzzle.countDocuments(query),
  ]);

  return c.json({
    puzzles,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

// GET /api/puzzles/:slug
app.get('/puzzles/:slug', async (c) => {
  const { slug } = c.req.param();
  const puzzle = await Puzzle.findOne({ slug });
  if (!puzzle) return c.json({ error: 'Puzzle not found' }, 404);

  await Puzzle.updateOne({ _id: puzzle._id }, { $inc: { 'stats.plays': 1 } });

  const authUser = c.get('authUser');
  let isLiked = false;
  if (authUser) {
    const user = await User.findOne({ clerkId: authUser.clerkId });
    if (user) {
      isLiked = !!(await Like.findOne({ userId: user._id, puzzleId: puzzle._id }));
    }
  }

  return c.json({ puzzle, isLiked });
});

// POST /api/puzzles/create
app.post('/puzzles/create', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user) return c.json({ error: 'User not found' }, 404);


  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid or missing JSON body' }, 400);
  }
  const { definition, category, difficulty, tags } = body as {
    definition?: Record<string, any>;
    category?: string;
    difficulty?: string;
    tags?: string[];
  };

  if (!definition?.title) {
    return c.json({ error: 'Puzzle definition with title is required' }, 400);
  }

  // Dimension limits
  const dims = definition?.board?.dimensions;
  if (dims && (dims.width > 50 || dims.height > 50)) {
    return c.json({ error: 'Board dimensions cannot exceed 50x50' }, 400);
  }

  // Generate unique slug
  const baseSlug = (definition.title as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  let slug = baseSlug;
  let counter = 1;
  while (await Puzzle.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const puzzle = await Puzzle.create({
    definition,
    authorId: user._id,
    authorUsername: user.displayName || user.username,
    status: 'draft',
    slug,
    category: category || 'Coverage',
    difficulty: difficulty || 'medium',
    tags: tags || [],
  });

  return c.json({ puzzle }, 201);
});

// PATCH /api/puzzles/:slug — update puzzle definition
app.patch('/puzzles/:slug', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const { slug } = c.req.param();
  const puzzle = user.role === 'admin'
    ? await Puzzle.findOne({ slug })
    : await Puzzle.findOne({ slug, authorId: user._id });
  if (!puzzle) return c.json({ error: 'Puzzle not found or not owned' }, 404);

  const body = await c.req.json<{ definition?: Record<string, unknown>; category?: string; difficulty?: string; tags?: string[] }>();

  if (body.definition) {
    puzzle.definition = body.definition;
    // Sync difficulty from definition metadata if not explicitly provided
    const metaDiff = (body.definition as any)?.metadata?.difficulty;
    if (!body.difficulty && metaDiff) {
      puzzle.difficulty = metaDiff as 'easy' | 'medium' | 'hard' | 'expert';
    }
  }
  if (body.category) puzzle.category = body.category;
  if (body.difficulty) puzzle.difficulty = body.difficulty as 'easy' | 'medium' | 'hard' | 'expert';
  if (body.tags) puzzle.tags = body.tags;
  puzzle.authorUsername = user.displayName || user.username;

  await puzzle.save();
  return c.json({ puzzle });
});

// POST /api/puzzles/sync-difficulty — admin: sync DB difficulty from definition.metadata.difficulty
app.post('/puzzles/sync-difficulty', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user || user.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

  const puzzles = await Puzzle.find({ 'definition.metadata.difficulty': { $exists: true } });
  let updated = 0;
  for (const p of puzzles) {
    const metaDiff = (p.definition as any)?.metadata?.difficulty;
    if (metaDiff && metaDiff !== p.difficulty) {
      p.difficulty = metaDiff;
      await p.save();
      updated++;
    }
  }

  return c.json({ updated, total: puzzles.length });
});

// POST /api/puzzles/fix-xp — admin: recalculate XP for completions with wrong difficulty
app.post('/puzzles/fix-xp', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user || user.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

  const body = await c.req.json<{ corrections: { slug: string; newDifficulty: Difficulty }[] }>();
  const results: { slug: string; completionsFixed: number; totalXpDelta: number }[] = [];

  for (const { slug, newDifficulty } of body.corrections) {
    const newXp = calculateXP({ difficulty: newDifficulty, isFirstSolve: true });
    // Only fix first-solve completions that earned XP
    const completions = await Completion.find({ puzzleSlug: slug, isFirstSolve: true, xpEarned: { $gt: 0, $ne: newXp } });

    let totalDelta = 0;
    for (const comp of completions) {
      const delta = newXp - comp.xpEarned;
      comp.xpEarned = newXp;
      await comp.save();
      await User.updateOne({ _id: comp.userId }, { $inc: { xp: delta } });
      totalDelta += delta;
    }

    results.push({ slug, completionsFixed: completions.length, totalXpDelta: totalDelta });
  }

  // Recalculate levels for all affected users
  const affectedUserIds = new Set<string>();
  for (const { slug } of body.corrections) {
    const comps = await Completion.find({ puzzleSlug: slug, isFirstSolve: true }).select('userId');
    comps.forEach(c => affectedUserIds.add(c.userId.toString()));
  }
  for (const uid of affectedUserIds) {
    const u = await User.findById(uid);
    if (u) {
      u.level = levelFromXP(u.xp);
      await u.save();
    }
  }

  return c.json({ results });
});

// DELETE /api/puzzles/:slug — delete own puzzle
app.delete('/puzzles/:slug', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const { slug } = c.req.param();
  const puzzle = user.role === 'admin'
    ? await Puzzle.findOne({ slug })
    : await Puzzle.findOne({ slug, authorId: user._id });
  if (!puzzle) return c.json({ error: 'Puzzle not found or not owned' }, 404);

  const wasPublished = puzzle.status === 'published';
  await Puzzle.deleteOne({ _id: puzzle._id });
  await Completion.deleteMany({ puzzleId: puzzle._id });
  await Like.deleteMany({ puzzleId: puzzle._id });

  if (wasPublished && user.puzzlesCreated > 0) {
    user.puzzlesCreated -= 1;
    await user.save();
  }

  return c.json({ deleted: true });
});

// PATCH /api/puzzles/:slug/publish
app.patch('/puzzles/:slug/publish', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const { slug } = c.req.param();
  const puzzle = user.role === 'admin'
    ? await Puzzle.findOne({ slug })
    : await Puzzle.findOne({ slug, authorId: user._id });
  if (!puzzle) return c.json({ error: 'Puzzle not found or not owned' }, 404);
  if (puzzle.status === 'published') return c.json({ error: 'Already published' }, 400);

  puzzle.status = 'published';
  puzzle.publishedAt = new Date();
  puzzle.authorUsername = user.displayName || user.username;
  await puzzle.save();

  user.puzzlesCreated += 1;
  await user.save();

  return c.json({ puzzle });
});

// PATCH /api/puzzles/:slug/unpublish
app.patch('/puzzles/:slug/unpublish', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const { slug } = c.req.param();
  const puzzle = user.role === 'admin'
    ? await Puzzle.findOne({ slug })
    : await Puzzle.findOne({ slug, authorId: user._id });
  if (!puzzle) return c.json({ error: 'Puzzle not found or not owned' }, 404);
  if (puzzle.status !== 'published') return c.json({ error: 'Puzzle is not published' }, 400);

  puzzle.status = 'draft';
  await puzzle.save();

  if (user.puzzlesCreated > 0) {
    user.puzzlesCreated -= 1;
    await user.save();
  }

  return c.json({ puzzle });
});

// POST /api/puzzles/:slug/like (toggle)
app.post('/puzzles/:slug/like', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const { slug } = c.req.param();
  const puzzle = await Puzzle.findOne({ slug });
  if (!puzzle) return c.json({ error: 'Puzzle not found' }, 404);

  const existing = await Like.findOne({ userId: user._id, puzzleId: puzzle._id });

  if (existing) {
    await Like.deleteOne({ _id: existing._id });
    await Puzzle.updateOne({ _id: puzzle._id }, { $inc: { 'stats.likes': -1 } });
    return c.json({ liked: false });
  }

  await Like.create({ userId: user._id, puzzleId: puzzle._id });
  await Puzzle.updateOne({ _id: puzzle._id }, { $inc: { 'stats.likes': 1 } });
  return c.json({ liked: true });
});

// POST /api/puzzles/:slug/complete
app.post('/puzzles/:slug/complete', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const { slug } = c.req.param();
  const puzzle = await Puzzle.findOne({ slug });

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid or missing JSON body' }, 400);
  }
  const { moveCount, timeSeconds } = body;

  // Determine difficulty — from DB puzzle or client hint, default to medium
  const difficulty: Difficulty = (puzzle?.difficulty as Difficulty)
    || (body.difficulty as Difficulty)
    || 'medium';

  // Basic sanity check — reject obviously invalid times
  if (!timeSeconds || (timeSeconds as number) < 1) {
    return c.json({ error: 'Invalid completion time' }, 400);
  }

  // For built-in puzzles (no DB record), track by slug only
  const isFirstSolve = puzzle
    ? !(await Completion.exists({ userId: user._id, puzzleId: puzzle._id }))
    : !(await Completion.exists({ userId: user._id, puzzleSlug: slug }));

  // No XP for solving your own puzzles; otherwise XP only on first solve
  const isOwnPuzzle = puzzle ? puzzle.authorId.toString() === user._id.toString() : false;
  const xpEarned = isOwnPuzzle ? 0 : calculateXP({ difficulty, isFirstSolve });

  const completion = await Completion.create({
    userId: user._id,
    puzzleId: puzzle?._id ?? user._id, // use user ID as placeholder for built-in puzzles
    puzzleSlug: slug,
    moveCount: moveCount as number,
    timeSeconds: timeSeconds as number,
    xpEarned,
    isFirstSolve,
  });

  // Update streak (compare by UTC calendar date, not raw hours)
  const now = new Date();
  let newStreakDays = user.streakDays;
  if (user.lastSolveDate) {
    const toUTCDate = (d: Date) =>
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const daysSince =
      (toUTCDate(now) - toUTCDate(new Date(user.lastSolveDate))) /
      (1000 * 60 * 60 * 24);
    newStreakDays = daysSince === 1 ? newStreakDays + 1 : daysSince > 1 ? 1 : newStreakDays;
  } else {
    newStreakDays = 1;
  }

  const previousLevel = user.level;
  user.xp += xpEarned;
  user.level = levelFromXP(user.xp);
  if (isFirstSolve) user.puzzlesCompleted += 1;
  user.streakDays = newStreakDays;
  user.lastSolveDate = now;
  await user.save();

  // Update puzzle stats (only for DB puzzles)
  if (puzzle) {
    await Puzzle.updateOne(
      { _id: puzzle._id },
      { $inc: { 'stats.completions': 1, ...(isFirstSolve ? { 'stats.uniquePlayers': 1 } : {}) } }
    );

    // Creator milestone rewards
    if (isFirstSolve && puzzle.authorId.toString() !== user._id.toString()) {
      const uniquePlayers = puzzle.stats.uniquePlayers + 1;
      let creatorXP = 0;
      if (uniquePlayers === 10) creatorXP = SOLVER_MILESTONE_10_XP;
      else if (uniquePlayers === 50) creatorXP = SOLVER_MILESTONE_50_XP;

      if (creatorXP > 0) {
        const author = await User.findById(puzzle.authorId);
        if (author) {
          author.xp += creatorXP;
          author.level = levelFromXP(author.xp);
          await author.save();
        }
      }
    }
  }

  return c.json({
    completion,
    xpEarned,
    totalXP: user.xp,
    level: user.level,
    levelUp: user.level > previousLevel,
    streak: newStreakDays,
  });
});

// ---------------------------------------------------------------------------
// LEADERBOARD
// ---------------------------------------------------------------------------

app.get('/leaderboard', async (c) => {
  const { window = 'all', page = '1', limit = '50' } = c.req.query();

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  let dateFilter: Record<string, unknown> = {};
  if (window === 'weekly') {
    const d = new Date(); d.setDate(d.getDate() - 7);
    dateFilter = { lastSolveDate: { $gte: d } };
  } else if (window === 'monthly') {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    dateFilter = { lastSolveDate: { $gte: d } };
  }

  const [users, total] = await Promise.all([
    User.find({ xp: { $gt: 0 }, ...dateFilter })
      .sort({ xp: -1, puzzlesCompleted: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('username displayName avatarUrl xp level puzzlesCompleted puzzlesCreated streakDays')
      .lean(),
    User.countDocuments({ xp: { $gt: 0 }, ...dateFilter }),
  ]);

  const entries = users.map((user, index) => ({
    rank: skip + index + 1,
    ...user,
  }));

  return c.json({
    entries,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
  });
});

// ---------------------------------------------------------------------------
// CHAT PROXY (moves API key server-side)
// ---------------------------------------------------------------------------

app.post('/chat', async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid or missing JSON body' }, 400);
  }
  const { messages } = body;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return c.json({ error: 'Chat service not configured' }, 503);

  const openRouterUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
  const primaryModel = process.env.CHAT_MODEL || 'stepfun/step-3.5-flash:free';
  const fallbackModel = process.env.CHAT_FALLBACK_MODEL || 'google/gemma-3-27b-it:free';
  const maxTokens = parseInt(process.env.CHAT_MAX_TOKENS || '1000');
  const temperature = parseFloat(process.env.CHAT_TEMPERATURE || '0.7');

  async function callModel(modelId: string) {
    const res = await fetch(openRouterUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173',
        'X-Title': 'Virtual Lego Puzzle Editor',
      },
      body: JSON.stringify({ model: modelId, messages, max_tokens: maxTokens, temperature }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || `API error: ${res.status}`);
    }
    const data = await res.json();
    return (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content || '';
  }

  try {
    const content = await callModel(primaryModel);
    if (content) return c.json({ success: true, message: content });

    if (primaryModel !== fallbackModel) {
      const fb = await callModel(fallbackModel);
      return c.json({ success: true, message: fb });
    }
    return c.json({ success: false, error: 'Empty response from model' }, 500);
  } catch (error) {
    if (primaryModel !== fallbackModel) {
      try {
        const fb = await callModel(fallbackModel);
        return c.json({ success: true, message: fb });
      } catch { /* both failed */ }
    }
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Chat service error',
    }, 500);
  }
});

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Convert Node.js (req, res) to Web Request, pass to Hono, write Web Response back
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `${protocol}://${host}`);

  // Read request body for non-GET/HEAD methods
  // Vercel dev pre-parses the body onto req.body; fall back to reading the stream
  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const preParsed = (req as unknown as { body?: unknown }).body;
    if (preParsed !== undefined && preParsed !== null) {
      body = typeof preParsed === 'string' ? preParsed : JSON.stringify(preParsed);
    } else {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      body = Buffer.concat(chunks);
    }
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const webRequest = new Request(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  const webResponse = await app.fetch(webRequest);

  res.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));
  const arrayBuffer = await webResponse.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
}
