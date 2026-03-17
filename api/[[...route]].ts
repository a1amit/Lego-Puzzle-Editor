import './_lib/dns-fix';
import { Hono } from 'hono';
import type { IncomingMessage, ServerResponse } from 'http';
import { cors } from 'hono/cors';
import { connectDB } from './_lib/db';
import { verifyAuth, type AuthUser } from './_lib/auth';
import { checkRateLimit } from './_lib/rateLimit';
import {
  calculateXP,
  levelFromXP,
  type Difficulty,
  PUZZLE_PUBLISH_XP,
  SOLVER_MILESTONE_10_XP,
  SOLVER_MILESTONE_50_XP,
} from './_lib/xp';
import { User } from './_lib/models/User';
import { Puzzle } from './_lib/models/Puzzle';
import { Completion } from './_lib/models/Completion';
import { Like } from './_lib/models/Like';

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

app.use('*', async (c, next) => {
  await connectDB();
  await next();
});

app.use('*', async (c, next) => {
  const authUser = await verifyAuth(c.req.raw);
  c.set('authUser', authUser);

  const identifier = authUser?.clerkId || c.req.header('x-forwarded-for') || 'anonymous';
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
    .limit(50);

  return c.json({ completions });
});

// GET /api/users/:username — public profile
app.get('/users/:username', async (c) => {
  const { username } = c.req.param();
  const user = await User.findOne({ username }).select('-clerkId');
  if (!user) return c.json({ error: 'User not found' }, 404);

  const puzzles = await Puzzle.find({ authorId: user._id, status: 'published' })
    .sort({ createdAt: -1 })
    .select('-definition');

  const completions = await Completion.find({ userId: user._id })
    .sort({ completedAt: -1 })
    .limit(20);

  return c.json({ user, puzzles, completions });
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
    Puzzle.find(query).sort(sortOption).skip(skip).limit(limitNum).select('-definition'),
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
  if (user.level < 3) return c.json({ error: 'Must be level 3 or higher to create puzzles' }, 403);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid or missing JSON body' }, 400);
  }
  const { definition, category, difficulty, tags } = body;

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
    authorUsername: user.username,
    status: 'draft',
    slug,
    category: category || 'Coverage',
    difficulty: difficulty || 'medium',
    tags: tags || [],
  });

  return c.json({ puzzle }, 201);
});

// PATCH /api/puzzles/:slug/publish
app.patch('/puzzles/:slug/publish', async (c) => {
  const authUser = c.get('authUser');
  if (!authUser) return c.json({ error: 'Unauthorized' }, 401);

  const user = await User.findOne({ clerkId: authUser.clerkId });
  if (!user) return c.json({ error: 'User not found' }, 404);

  const { slug } = c.req.param();
  const puzzle = await Puzzle.findOne({ slug, authorId: user._id });
  if (!puzzle) return c.json({ error: 'Puzzle not found or not owned' }, 404);
  if (puzzle.status === 'published') return c.json({ error: 'Already published' }, 400);

  puzzle.status = 'published';
  puzzle.publishedAt = new Date();
  await puzzle.save();

  user.xp += PUZZLE_PUBLISH_XP;
  user.level = levelFromXP(user.xp);
  user.puzzlesCreated += 1;
  await user.save();

  return c.json({ puzzle, xpAwarded: PUZZLE_PUBLISH_XP });
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

  // Basic timing validation (relaxed for built-in puzzles without a DB record)
  const minTime: Record<string, number> = puzzle
    ? { easy: 5, medium: 10, hard: 15, expert: 20 }
    : { easy: 2, medium: 3, hard: 5, expert: 8 };
  if ((timeSeconds as number) < (minTime[difficulty] || 2)) {
    return c.json({ error: 'Completion time too fast' }, 400);
  }

  // For built-in puzzles (no DB record), track by slug only
  const isFirstSolve = puzzle
    ? !(await Completion.exists({ userId: user._id, puzzleId: puzzle._id }))
    : !(await Completion.exists({ userId: user._id, puzzleSlug: slug }));

  const completionCount = puzzle
    ? await Completion.countDocuments({ userId: user._id, puzzleId: puzzle._id })
    : await Completion.countDocuments({ userId: user._id, puzzleSlug: slug });

  // Max 3 completions earn XP
  let xpEarned = 0;
  if (completionCount < 3) {
    xpEarned = calculateXP({
      difficulty,
      isFirstSolve,
      moveCount,
      streakDays: user.streakDays,
    });
  }

  const completion = await Completion.create({
    userId: user._id,
    puzzleId: puzzle?._id ?? user._id, // use user ID as placeholder for built-in puzzles
    puzzleSlug: slug,
    moveCount,
    timeSeconds,
    xpEarned,
    isFirstSolve,
  });

  // Update streak
  const now = new Date();
  let newStreakDays = user.streakDays;
  if (user.lastSolveDate) {
    const daysSince = Math.floor(
      (now.getTime() - user.lastSolveDate.getTime()) / (1000 * 60 * 60 * 24)
    );
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
      .select('username displayName avatarUrl xp level puzzlesCompleted puzzlesCreated streakDays'),
    User.countDocuments({ xp: { $gt: 0 }, ...dateFilter }),
  ]);

  const entries = users.map((user, index) => ({
    rank: skip + index + 1,
    ...user.toObject(),
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
