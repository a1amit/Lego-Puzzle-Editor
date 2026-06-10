import { Link, useLocation } from 'react-router';
import { m } from 'framer-motion';
import { Home, Trophy, Plus, FolderOpen, User, LogIn } from 'lucide-react';
import { Show, SignInButton, useUser } from '../../auth/AuthProvider';

interface TabProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function Tab({ to, icon, label, isActive }: TabProps) {
  return (
    <Link
      to={to}
      className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 h-full transition-colors active:scale-95 ${
        isActive ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      {/* Active "stud": springy dot that slides along the tab bar */}
      {isActive && (
        <m.span
          layoutId="mobilenav-active-stud"
          transition={{ type: 'spring', visualDuration: 0.3, bounce: 0.3 }}
          className="absolute top-1 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
        />
      )}
      <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
      <span className="text-[10px] font-medium leading-none truncate max-w-full px-0.5">{label}</span>
    </Link>
  );
}

/**
 * Mobile bottom tab bar — the primary navigation on phones, replacing the
 * desktop-only Sidebar (hidden md:flex). Rendered by RootLayout only on
 * non-puzzle routes at <md; puzzle routes get their own bottom action bar.
 */
export function MobileNav() {
  const location = useLocation();
  const { user } = useUser();
  const pathname = location.pathname;

  return (
    <nav
      className="md:hidden shrink-0 flex items-stretch h-14 bg-[var(--surface-raised)]/95 backdrop-blur-md border-t border-[var(--border-subtle)] pb-safe z-40"
      aria-label="Primary"
    >
      <Tab to="/" icon={<Home className="h-5 w-5" />} label="Gallery" isActive={pathname === '/'} />
      <Tab
        to="/leaderboard"
        icon={<Trophy className="h-5 w-5" />}
        label="Ranks"
        isActive={pathname === '/leaderboard'}
      />

      {/* Center Create CTA — elevated accent button */}
      <Link
        to="/create"
        className="flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 h-full"
        aria-label="Create puzzle"
      >
        <span className="w-10 h-10 -mt-3 flex items-center justify-center rounded-full bg-gold text-gold-foreground shadow-lg shadow-gold/30 ring-4 ring-[var(--surface-raised)]">
          <Plus className="h-5 w-5" />
        </span>
        <span className="text-[10px] font-medium leading-none text-gold">Create</span>
      </Link>

      <Show when="signed-in">
        <Tab
          to="/my-puzzles"
          icon={<FolderOpen className="h-5 w-5" />}
          label="Puzzles"
          isActive={pathname === '/my-puzzles'}
        />
        <Tab
          to={`/profile/${user?.id}`}
          icon={
            user?.imageUrl ? (
              <img src={user.imageUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
            ) : (
              <User className="h-5 w-5" />
            )
          }
          label="Profile"
          isActive={pathname.startsWith('/profile/')}
        />
      </Show>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 h-full text-muted-foreground">
            <span className="w-6 h-6 flex items-center justify-center">
              <LogIn className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-medium leading-none">Sign In</span>
          </button>
        </SignInButton>
      </Show>
    </nav>
  );
}
