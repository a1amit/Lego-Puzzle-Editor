import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Plus, Pencil, Eye, Trash2, Globe, FileText, ArrowLeft } from 'lucide-react';
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

const STATUS_STYLES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  published: { label: 'Published', variant: 'default' },
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
      // Confirmed — actually delete
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
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-semibold text-foreground">Sign in to manage your puzzles</h2>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to Gallery</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">My Puzzles</h1>
        </div>
        <Button onClick={() => navigate('/create')} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />New Puzzle
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : puzzles.length === 0 ? (
        <div className="rounded-xl bg-card/50 border border-dashed border-border p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">You haven't created any puzzles yet.</p>
          <Button onClick={() => navigate('/create')}>
            <Plus className="h-4 w-4 mr-2" />Create Your First Puzzle
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {puzzles.map((p) => {
            const style = STATUS_STYLES[p.status] || STATUS_STYLES.draft;
            return (
              <div
                key={p._id}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {p.definition?.title || p.slug}
                    </p>
                    <Badge variant={style.variant} className="text-[10px] shrink-0">
                      {style.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{p.category}</span>
                    <span className="capitalize">{p.difficulty}</span>
                    {p.status === 'published' && (
                      <>
                        <span>{p.stats.completions} solves</span>
                        <span>{p.stats.likes} likes</span>
                      </>
                    )}
                    <span>{new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => navigate(`/puzzle/${p.slug}`)}
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => navigate(`/puzzle/${p.slug}/edit`)}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={deletingSlug === p.slug ? 'destructive' : 'ghost'}
                    size="sm"
                    className="h-8 w-8 p-0"
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
