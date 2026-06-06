import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Shield, ShieldOff, Ban, CheckCircle, Search } from 'lucide-react';
import { Button } from '../../components/ui/shadcn/button';
import { Badge } from '../../components/ui/shadcn/badge';
import { useAppAuth } from '../../auth/AuthProvider';
import { useUserStore } from '../../store/userStore';

interface AdminUser {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  isBanned: boolean;
  xp: number;
  level: number;
  puzzlesCreated: number;
  puzzlesCompleted: number;
  createdAt: string;
}

export default function AdminPage() {
  const { isSignedIn, getToken } = useAppAuth();
  const myRole = useUserStore((s) => s.profile?.role);
  const myUserId = useUserStore((s) => s.profile?._id);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isSignedIn || myRole !== 'admin') return;
    (async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const { users: data } = await res.json();
          setUsers(data || []);
        }
      } catch { /* ignore */ }
      setIsLoading(false);
    })();
  }, [isSignedIn, myRole, getToken]);

  const updateUser = (userId: string, updates: { role?: string; isBanned?: boolean }) => {
    toast.promise(
      (async () => {
        const token = await getToken();
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update');
        }
        const { user } = await res.json();
        setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, ...user } : u)));
      })(),
      {
        loading: 'Updating...',
        success: 'User updated',
        error: (err) => err.message || 'Failed to update user',
      }
    );
  };

  if (!isSignedIn || myRole !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground mt-2">You must be an admin to view this page.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to Gallery</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <Badge variant="outline" className="text-xs">
          {users.length} users
        </Badge>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-card border border-border focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.filter((u) => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (u.displayName || '').toLowerCase().includes(q)
              || u.username.toLowerCase().includes(q)
              || u.role.includes(q);
          }).map((u) => (
            <div
              key={u._id}
              className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-card border transition-colors ${
                u.isBanned ? 'border-destructive/30 bg-destructive/5' : 'border-border'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {(u.displayName || u.username)[0]?.toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {u.displayName || u.username}
                    </span>
                    {u.role === 'admin' && (
                      <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Admin</Badge>
                    )}
                    {u.isBanned && (
                      <Badge variant="destructive" className="text-[10px]">Banned</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>Lvl {u.level}</span>
                    <span>{u.xp} XP</span>
                    <span>{u.puzzlesCreated} created</span>
                    <span>{u.puzzlesCompleted} solved</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                {u._id === myUserId ? (
                  <Badge variant="outline" className="text-[10px]">You</Badge>
                ) : (
                  <>
                    {u.role === 'admin' ? (
                      <Button variant="ghost" size="sm" className="h-10 sm:h-8 gap-1.5 text-xs" onClick={() => updateUser(u._id, { role: 'user' })} title="Remove admin">
                        <ShieldOff className="h-3.5 w-3.5" />Demote
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-10 sm:h-8 gap-1.5 text-xs" onClick={() => updateUser(u._id, { role: 'admin' })} title="Make admin">
                        <Shield className="h-3.5 w-3.5" />Promote
                      </Button>
                    )}
                    {u.isBanned ? (
                      <Button variant="ghost" size="sm" className="h-10 sm:h-8 gap-1.5 text-xs text-success" onClick={() => updateUser(u._id, { isBanned: false })} title="Unban user">
                        <CheckCircle className="h-3.5 w-3.5" />Unban
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-10 sm:h-8 gap-1.5 text-xs text-destructive" onClick={() => updateUser(u._id, { isBanned: true })} title="Ban user">
                        <Ban className="h-3.5 w-3.5" />Ban
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
