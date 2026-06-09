import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Plus, Pencil, Eye, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '../../components/ui/shadcn/button';
import { Badge } from '../../components/ui/shadcn/badge';
import { useAppAuth } from '../../auth/AuthProvider';

interface PuzzleEntry {
  _id: string;
  slug: string;
  status: 'draft' | 'published' | 'unlisted' | 'archived';
  category: string;
  difficulty: string;
  definition: { title?: string; description?: string };
  stats: { plays: number; completions: number; likes: number };
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

const STATUS_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; className?: string }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'default', className: 'bg-success/15 text-success border-success/20' },
  unlisted: { label: 'Unlisted', variant: 'outline' },
  archived: { label: 'Archived', variant: 'outline' },
};

export default function MyPuzzlesPage() {
  const { isSignedIn, getToken } = useAppAuth();
  const navigate = useNavigate();
  const [puzzles, setPuzzles] = useState<PuzzleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/users/me/puzzles', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { puzzles: data } = await res.json();
          setPuzzles(data || []);
        }
      } catch {
        // API not available
      }
      setIsLoading(false);
    }
    if (isSignedIn) load();
  }, [isSignedIn, getToken]);

  const handleDelete = (slug: string) => {
    if (deletingSlug === slug) {
      setDeletingSlug(null);
      toast.promise(
        (async () => {
          const token = await getToken();
          const res = await fetch(`/api/puzzles/${slug}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to delete');
          }
          setPuzzles((prev) => prev.filter((p) => p.slug !== slug));
        })(),
        {
          loading: 'Deleting puzzle...',
          success: 'Puzzle deleted',
          error: (err) => err.message || 'Failed to delete puzzle',
        }
      );
    } else {
      setDeletingSlug(slug);
      setTimeout(() => setDeletingSlug((cur) => (cur === slug ? null : cur)), 3000);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="px-4 sm:px-6 py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">Sign in to manage your puzzles</h2>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Back to Gallery</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            My Puzzles
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1.5">{puzzles.length} puzzle{puzzles.length !== 1 ? 's' : ''} created</p>
        </div>
        <Button onClick={() => navigate('/create')} size="sm" className="brick-btn gap-1.5 bg-gold text-gold-foreground hover:bg-gold font-bold">
          <Plus className="h-4 w-4" />New Puzzle
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[72px] rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : puzzles.length === 0 ? (
        <div className="rounded-xl bg-[var(--surface-raised)]/70 backdrop-blur-xl border border-dashed border-border p-12 text-center">
          {/* CSS-built LEGO brick: rounded rect + 2 studs, slightly tilted */}
          <div
            aria-hidden="true"
            className="relative mx-auto mt-2 mb-6 h-8 w-16 -rotate-6 rounded-[4px] bg-[#D01012] shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
          >
            <span className="absolute -top-2 left-[15%] h-[22px] w-[22px] rounded-full bg-inherit brightness-125 shadow-[inset_0_-2px_3px_rgba(0,0,0,0.25)]" />
            <span className="absolute -top-2 right-[15%] h-[22px] w-[22px] rounded-full bg-inherit brightness-125 shadow-[inset_0_-2px_3px_rgba(0,0,0,0.25)]" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">No puzzles yet</h2>
          <p className="text-sm text-muted-foreground mb-6">Every great build starts with a single brick.</p>
          <Button onClick={() => navigate('/create')} className="brick-btn gap-2 bg-gold text-gold-foreground hover:bg-gold font-bold">
            <Plus className="h-4 w-4" />Create Your First Puzzle
          </Button>
        </div>
      ) : (
        <div className="bg-[var(--surface-raised)]/70 backdrop-blur-xl border border-border rounded-xl p-2 sm:p-3 space-y-1.5">
          {puzzles.map((p, i) => {
            const style = STATUS_STYLES[p.status] || STATUS_STYLES.draft;
            return (
              <div
                key={p._id}
                className="card-rise flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors group"
                style={{ '--i': i } as CSSProperties}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {p.definition?.title || p.slug}
                    </p>
                    <Badge variant={style.variant} className={`text-[10px] shrink-0 ${style.className || ''}`}>
                      {style.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{p.category}</span>
                    <span className="capitalize">{p.difficulty}</span>
                    {p.status === 'published' && (
                      <>
                        <span className="font-mono">{p.stats.completions} solves</span>
                        <span className="font-mono">{p.stats.likes} likes</span>
                      </>
                    )}
                    <span className="font-mono">{new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 sm:h-8 sm:w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    onClick={() => navigate(`/puzzle/${p.slug}`)}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 sm:h-8 sm:w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    onClick={() => navigate(`/puzzle/${p.slug}/edit`)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={deletingSlug === p.slug ? 'destructive' : 'ghost'}
                    size="sm"
                    className={`h-10 w-10 sm:h-8 sm:w-8 p-0 ${deletingSlug !== p.slug ? 'hover:bg-destructive/10 hover:text-destructive' : ''}`}
                    onClick={() => handleDelete(p.slug)}
                    title={deletingSlug === p.slug ? 'Click again to confirm' : 'Delete'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
