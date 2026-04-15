import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Show, SignInButton, useUser } from '../../auth/AuthProvider';
import { useUserStore } from '../../store/userStore';
import { useClerk } from '@clerk/react';
import { XPBar } from '../ui/XPBar';
import { Button } from '../ui/shadcn/button';
import {
  Home,
  Trophy,
  Plus,
  FolderOpen,
  Shield,
  LogIn,
  LogOut,
  User,
  ChevronLeft,
} from 'lucide-react';

function LegoLogo({ className = 'w-8 h-8' }: { className?: string }) {
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

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  badge?: string;
  collapsed: boolean;
  onClick?: () => void;
}

function NavItem({ to, icon, label, isActive, badge, collapsed, onClick }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-primary/15 text-primary border border-primary/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent border border-transparent'
      } ${collapsed ? 'justify-center px-2' : ''}`}
    >
      <span className="shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
              {badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className = '' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const { signOut } = useClerk();
  const userRole = useUserStore((s) => s.profile?.role);
  const pathname = location.pathname;

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.username || 'User';

  return (
    <aside
      className={`hidden md:flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 transition-all duration-200 ${
        collapsed ? 'w-[68px]' : 'w-[220px]'
      } ${className}`}
    >
      {/* Logo + Collapse */}
      <div className={`flex items-center h-14 px-3 border-b border-sidebar-border shrink-0 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
          <LegoLogo className="w-8 h-8" />
          {!collapsed && (
            <span className="font-bold text-base text-foreground tracking-tight">Virtual Lego</span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* User section */}
      <Show when="signed-in">
        <div className={`px-3 py-4 border-b border-sidebar-border ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <button onClick={() => navigate(`/profile/${user?.id}`)} className="shrink-0">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="w-9 h-9 rounded-full border-2 border-primary/30" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="" className="w-10 h-10 rounded-full border-2 border-primary/30 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                <XPBar compact />
              </div>
            </div>
          )}
        </div>
      </Show>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex justify-center p-2 mb-2 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        )}

        <NavItem
          to="/"
          icon={<Home className="h-4.5 w-4.5" />}
          label="Gallery"
          isActive={pathname === '/'}
          collapsed={collapsed}
        />
        <NavItem
          to="/leaderboard"
          icon={<Trophy className="h-4.5 w-4.5" />}
          label="Leaderboard"
          isActive={pathname === '/leaderboard'}
          collapsed={collapsed}
        />

        <Show when="signed-in">
          <div className={`pt-3 ${!collapsed ? 'px-3' : ''}`}>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                My stuff
              </p>
            )}
            {collapsed && <div className="h-px bg-sidebar-border mb-2" />}
          </div>
          <NavItem
            to="/my-puzzles"
            icon={<FolderOpen className="h-4.5 w-4.5" />}
            label="My Puzzles"
            isActive={pathname === '/my-puzzles'}
            collapsed={collapsed}
          />
          <NavItem
            to={`/profile/${user?.id}`}
            icon={<User className="h-4.5 w-4.5" />}
            label="My Profile"
            isActive={pathname.startsWith('/profile/')}
            collapsed={collapsed}
          />
          {userRole === 'admin' && (
            <NavItem
              to="/admin"
              icon={<Shield className="h-4.5 w-4.5" />}
              label="Admin"
              isActive={pathname === '/admin'}
              collapsed={collapsed}
            />
          )}
        </Show>

        {/* Create puzzle CTA */}
        <div className="pt-3">
          {collapsed ? (
            <Button
              size="icon"
              className="w-full h-9 bg-gold text-gold-foreground hover:bg-gold/90"
              onClick={() => navigate('/create')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="w-full gap-2 bg-gold text-gold-foreground hover:bg-gold/90 font-semibold"
              size="sm"
              onClick={() => navigate('/create')}
            >
              <Plus className="h-4 w-4" />
              Create Puzzle
            </Button>
          )}
        </div>
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-1">
        <Show when="signed-in">
          {collapsed ? (
            <button
              onClick={() => signOut({ redirectUrl: '/' })}
              className="w-full flex justify-center p-2 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => signOut({ redirectUrl: '/' })}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          )}
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            {collapsed ? (
              <Button size="icon" variant="outline" className="w-full h-9">
                <LogIn className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </SignInButton>
        </Show>
      </div>
    </aside>
  );
}
