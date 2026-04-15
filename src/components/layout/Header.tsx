import { useState, type SVGProps } from 'react';

function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
import { Link, useNavigate } from 'react-router';
import { usePuzzleStore } from '../../store/puzzleStore';
import { useEditorViewStore, type EditorViewMode } from '../../store/editorViewStore';
import { useUserStore } from '../../store/userStore';
import { Show, SignInButton, useUser } from '../../auth/AuthProvider';
import { XPBar } from '../ui/XPBar';
import { LegoHelperIcon } from '../ui/LegoHelperIcon';
import { Button } from '../ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/shadcn/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/shadcn/tooltip';
import {
  BookOpen,
  Columns2,
  CodeXml,
  Eye,
  Menu,
  Undo2,
  Redo2,
  Home,
  Trophy,
  LogIn,
  User,
  LogOut,
  FolderOpen,
  Shield,
} from 'lucide-react';
import { useClerk } from '@clerk/react';

// 2x2 Lego brick grid logo
function LegoLogo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="6" fill="oklch(0.17 0.055 250)" />
      <rect x="3" y="3" width="12" height="12" rx="2.5" fill="#D01012" />
      <ellipse cx="9" cy="7" rx="3" ry="1.5" fill="#D01012" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <rect x="17" y="3" width="12" height="12" rx="2.5" fill="#F5CD2F" />
      <ellipse cx="23" cy="7" rx="3" ry="1.5" fill="#F5CD2F" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <rect x="3" y="17" width="12" height="12" rx="2.5" fill="#287F46" />
      <ellipse cx="9" cy="21" rx="3" ry="1.5" fill="#287F46" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <rect x="17" y="17" width="12" height="12" rx="2.5" fill="#0055BF" />
      <ellipse cx="23" cy="21" rx="3" ry="1.5" fill="#0055BF" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
    </svg>
  );
}

export type ViewMode = EditorViewMode;

interface HeaderProps {
  onChatToggle: () => void;
  isChatOpen: boolean;
  onShowInstructions: () => void;
  isPuzzleRoute: boolean;
}

/** View mode toggle group — shown on edit routes, or for owners/admins */
function ViewModeToggle() {
  const viewMode = useEditorViewStore((s) => s.viewMode);
  const setViewMode = useEditorViewStore((s) => s.setViewMode);
  const canEdit = useEditorViewStore((s) => s.canEdit);

  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-0.5 p-1 bg-secondary backdrop-blur-sm shadow-inner rounded-lg border border-border">
      <Button variant={viewMode === 'split' ? 'default' : 'ghost'} size="sm" className="h-7 px-3 text-xs gap-1.5" onClick={() => setViewMode('split')}>
        <Columns2 className="h-3.5 w-3.5" />Split
      </Button>
      <Button variant={viewMode === 'editor' ? 'default' : 'ghost'} size="sm" className="h-7 px-3 text-xs gap-1.5" onClick={() => setViewMode('editor')}>
        <CodeXml className="h-3.5 w-3.5" />Editor
      </Button>
      <Button variant={viewMode === 'preview' ? 'default' : 'ghost'} size="sm" className="h-7 px-3 text-xs gap-1.5" onClick={() => setViewMode('preview')}>
        <Eye className="h-3.5 w-3.5" />Preview
      </Button>
    </div>
  );
}

/** Signed-in user avatar dropdown — single button replaces both our icon + Clerk's UserButton */
function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const userRole = useUserStore((s) => s.profile?.role);

  if (!user) return null;

  const displayName = user.firstName || user.username || 'User';
  const avatarUrl = user.imageUrl;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="h-8 w-8 rounded-full overflow-hidden border-2 border-transparent hover:border-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-foreground">{displayName}</p>
          <p className="text-xs text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { navigate(`/profile/${user.id}`, { viewTransition: true }); setOpen(false); }} className="gap-3 py-2">
          <User className="h-4 w-4" /><span>My Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { navigate('/my-puzzles', { viewTransition: true }); setOpen(false); }} className="gap-3 py-2">
          <FolderOpen className="h-4 w-4" /><span>My Puzzles</span>
        </DropdownMenuItem>
        {userRole === 'admin' && (
          <DropdownMenuItem onClick={() => { navigate('/admin', { viewTransition: true }); setOpen(false); }} className="gap-3 py-2">
            <Shield className="h-4 w-4" /><span>Admin Panel</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { signOut({ redirectUrl: '/' }); setOpen(false); }} className="gap-3 py-2 text-destructive">
          <LogOut className="h-4 w-4" /><span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ onChatToggle, isChatOpen, onShowInstructions, isPuzzleRoute }: HeaderProps) {
  const { puzzle, undoStack, redoStack } = usePuzzleStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleUndo = () => usePuzzleStore.getState().undo();
  const handleRedo = () => usePuzzleStore.getState().redo();

  return (
    <header className="relative h-12 md:h-14 bg-[var(--surface-raised)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] flex items-center px-4 z-40">
      {/* Left: Logo (mobile always, desktop only on puzzle routes) + Puzzle title */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        <Link to="/" className={`flex items-center gap-2.5 hover:opacity-80 transition-opacity ${!isPuzzleRoute ? 'md:hidden' : ''}`}>
          <LegoLogo className="w-8 h-8" />
          {isPuzzleRoute && (
            <span className="font-semibold text-lg text-foreground tracking-tight hidden sm:inline">
              Virtual Lego
            </span>
          )}
        </Link>

        {!isPuzzleRoute && (
          <nav className="hidden sm:flex items-center">
            {/* On non-puzzle pages, sidebar handles nav — header just shows page context */}
          </nav>
        )}

        {isPuzzleRoute && (
          <>
            <div className="h-6 w-px bg-[var(--border-subtle)] hidden sm:block" />
            {puzzle && (
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">{puzzle.title}</span>
            )}
          </>
        )}
      </div>

      {/* Center: View mode toggle (only on puzzle routes, desktop only) */}
      <div className="hidden sm:flex flex-1 items-center justify-center">
        {isPuzzleRoute && <ViewModeToggle />}
      </div>

      {/* Right: Actions (desktop) */}
      <TooltipProvider delayDuration={300}>
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 ml-auto">
          {isPuzzleRoute && (undoStack.length > 0 || redoStack.length > 0) && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={undoStack.length === 0}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRedo} disabled={redoStack.length === 0}>
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>
              <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5" />
            </>
          )}

          {/* Assistant + Guide — only on puzzle routes */}
          {isPuzzleRoute && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={isChatOpen ? 'default' : 'ghost'} size="sm" className="gap-2 h-8" onClick={onChatToggle}>
                    <div className="w-5 h-5"><LegoHelperIcon className="w-full h-full" /></div>
                    <span className="text-xs font-medium hidden md:inline">Assistant</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Puzzle Assistant</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-8" onClick={onShowInstructions}>
                    <BookOpen className="h-4 w-4" />
                    <span className="text-xs hidden md:inline">Guide</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Puzzle Creator Guide</TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Show auth + XP on puzzle routes (sidebar handles these elsewhere) */}
          {isPuzzleRoute && (
            <>
              <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5" />
              <XPBar />
              <Show when="signed-in">
                <UserMenu />
              </Show>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs">
                    <LogIn className="h-3.5 w-3.5" />Sign In
                  </Button>
                </SignInButton>
              </Show>
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a href="https://github.com/a1amit/Lego-Puzzle-Editor" target="_blank" rel="noopener noreferrer">
                  <GithubIcon className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View on GitHub</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Right: Mobile hamburger menu */}
      <div className="flex sm:hidden items-center gap-1.5 ml-auto">
        {isPuzzleRoute && (undoStack.length > 0 || redoStack.length > 0) && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={undoStack.length === 0}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRedo} disabled={redoStack.length === 0}>
              <Redo2 className="h-4 w-4" />
            </Button>
          </>
        )}

        <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Menu className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Navigate</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { navigate('/', { viewTransition: true }); setMobileMenuOpen(false); }} className="gap-3 py-2">
              <Home className="h-4 w-4" /><span>Gallery</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { navigate('/leaderboard', { viewTransition: true }); setMobileMenuOpen(false); }} className="gap-3 py-2">
              <Trophy className="h-4 w-4" /><span>Leaderboard</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {isPuzzleRoute && (
              <>
                <DropdownMenuItem onClick={() => { onChatToggle(); setMobileMenuOpen(false); }} className="gap-3 py-2">
                  <div className="w-4 h-4"><LegoHelperIcon className="w-full h-full" /></div>
                  <span>Assistant</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { onShowInstructions(); setMobileMenuOpen(false); }} className="gap-3 py-2">
                  <BookOpen className="h-4 w-4" /><span>Guide</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem asChild className="gap-3 py-2">
              <a href="https://github.com/a1amit/Lego-Puzzle-Editor" target="_blank" rel="noopener noreferrer">
                <GithubIcon className="h-4 w-4" /><span>GitHub</span>
              </a>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Account</DropdownMenuLabel>

            <Show when="signed-in">
              <MobileUserSection onClose={() => setMobileMenuOpen(false)} />
            </Show>
            <Show when="signed-out">
              <div className="px-2 py-1.5">
                <SignInButton mode="modal">
                  <Button variant="default" size="sm" className="w-full gap-2">
                    <LogIn className="h-4 w-4" />Sign In
                  </Button>
                </SignInButton>
              </div>
            </Show>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/** Mobile signed-in user section inside hamburger menu */
function MobileUserSection({ onClose }: { onClose: () => void }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const userRole = useUserStore((s) => s.profile?.role);

  if (!user) return null;

  return (
    <>
      <div className="px-3 py-2 flex items-center gap-3">
        {user.imageUrl ? (
          <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {(user.firstName || 'U')[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{user.firstName || user.username || 'User'}</p>
          <p className="text-xs text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>
      <DropdownMenuItem onClick={() => { navigate(`/profile/${user.id}`, { viewTransition: true }); onClose(); }} className="gap-3 py-2">
        <User className="h-4 w-4" /><span>My Profile</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => { navigate('/my-puzzles', { viewTransition: true }); onClose(); }} className="gap-3 py-2">
        <FolderOpen className="h-4 w-4" /><span>My Puzzles</span>
      </DropdownMenuItem>
      {userRole === 'admin' && (
        <DropdownMenuItem onClick={() => { navigate('/admin', { viewTransition: true }); onClose(); }} className="gap-3 py-2">
          <Shield className="h-4 w-4" /><span>Admin Panel</span>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => { signOut({ redirectUrl: '/' }); onClose(); }} className="gap-3 py-2 text-destructive">
        <LogOut className="h-4 w-4" /><span>Sign Out</span>
      </DropdownMenuItem>
    </>
  );
}
