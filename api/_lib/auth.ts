import { verifyToken } from '@clerk/backend';

export interface AuthUser {
  clerkId: string;
}

export async function verifyAuth(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return { clerkId: payload.sub };
  } catch {
    return null;
  }
}
