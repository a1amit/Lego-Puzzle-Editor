import React, { useEffect, Suspense, useState, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useAppAuth, useUser } from '../auth/AuthProvider';
import { LazyMotion, domAnimation, MotionConfig, m, useReducedMotion } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import { Toaster, toast } from 'sonner';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { MobileNav } from '../components/layout/MobileNav';
import { PuzzleShell } from './PuzzleShell';
import { KeyboardShortcutsOverlay } from '../components/ui/KeyboardShortcutsOverlay';
import { usePuzzleStore } from '../store/puzzleStore';
import { useUserStore } from '../store/userStore';
import { useGamificationStore } from '../store/gamificationStore';
import { apiClient } from '../services/apiClient';
import { Sentry } from '../lib/sentry';

const InstructionsModal = React.lazy(() =>
  import('../components/ui/InstructionsModal').then(m => ({ default: m.InstructionsModal }))
);
const ChatPanel = React.lazy(() =>
  import('../components/ui/ChatPanel').then(m => ({ default: m.ChatPanel }))
);
const LevelUpPopup = React.lazy(() =>
  import('../components/ui/LevelUpPopup').then(m => ({ default: m.LevelUpPopup }))
);

const LEGO_COLORS = ['#D01012', '#0055BF', '#F5CD2F', '#287F46', '#FE8A18', '#9B5FC0', '#003DA5'];

const BRICK_COUNT = 20;
const BRICK_CONFIG = Array.from({ length: BRICK_COUNT }, (_, i) => {
  const isSquare = i % 6 === 0;
  return {
    color: LEGO_COLORS[i % LEGO_COLORS.length],
    w: `${28 + (i % 5) * 7}px`,
    ar: isSquare ? '1/1' : i % 3 === 0 ? '2/1' : '3/1',
    studs: isSquare ? '1' : '2',
  };
});

interface BrickState {
  x: number; y: number; rotation: number;
  // base velocity = constant travel direction; throw velocity = user throw (decays)
  baseVx: number; baseVy: number;
  throwVx: number; throwVy: number; throwVr: number;
  dragging: boolean;
}

// Spawn a brick from a random edge heading inward (including diagonals)
function spawnFromEdge(vw: number, vh: number, index: number): Pick<BrickState, 'x' | 'y' | 'baseVx' | 'baseVy' | 'rotation'> {
  const speed = 35 + (index % 5) * 12; // px/sec
  // 8 directions: N, NE, E, SE, S, SW, W, NW
  const dir = index % 8;
  const pad = 60;
  const randX = (pad + ((index * 137) % (vw - pad * 2)));
  const randY = (pad + ((index * 199) % (vh - pad * 2)));
  switch (dir) {
    case 0: return { x: randX, y: vh + pad, baseVx: 0, baseVy: -speed, rotation: 0 };       // from bottom → up
    case 1: return { x: -pad, y: vh + pad, baseVx: speed * 0.7, baseVy: -speed * 0.7, rotation: 45 }; // from bottom-left → diag
    case 2: return { x: -pad, y: randY, baseVx: speed, baseVy: 0, rotation: 90 };            // from left → right
    case 3: return { x: -pad, y: -pad, baseVx: speed * 0.7, baseVy: speed * 0.7, rotation: 135 };   // from top-left → diag
    case 4: return { x: randX, y: -pad, baseVx: 0, baseVy: speed, rotation: 180 };           // from top → down
    case 5: return { x: vw + pad, y: -pad, baseVx: -speed * 0.7, baseVy: speed * 0.7, rotation: 225 }; // from top-right → diag
    case 6: return { x: vw + pad, y: randY, baseVx: -speed, baseVy: 0, rotation: 270 };      // from right → left
    case 7: return { x: vw + pad, y: vh + pad, baseVx: -speed * 0.7, baseVy: -speed * 0.7, rotation: 315 }; // from bottom-right → diag
    default: return { x: randX, y: vh + pad, baseVx: 0, baseVy: -speed, rotation: 0 };
  }
}

function isOffScreen(s: BrickState, vw: number, vh: number) {
  const margin = 80;
  return s.x < -margin || s.x > vw + margin || s.y < -margin || s.y > vh + margin;
}

function LegoBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bricksRef = useRef<(HTMLDivElement | null)[]>([]);
  const stateRef = useRef<BrickState[]>([]);
  const dragRef = useRef<{ idx: number; offsetX: number; offsetY: number; lastX: number; lastY: number; lastTime: number } | null>(null);
  const rafRef = useRef<number>(0);

  // Single useEffect: init state, attach native listeners, start physics
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const container = containerRef.current;
    if (!container) return;
    const elCache = bricksRef.current;

    // Init brick states — pre-advance along paths
    stateRef.current = BRICK_CONFIG.map((_, i) => {
      const spawn = spawnFromEdge(vw, vh, i);
      const progress = ((i * 0.618) % 1);
      const travelTime = Math.max(vw, vh) / (35 + (i % 5) * 12);
      const adv = progress * travelTime;
      return {
        ...spawn,
        x: spawn.x + spawn.baseVx * adv,
        y: spawn.y + spawn.baseVy * adv,
        rotation: spawn.rotation + adv * 5,
        throwVx: 0, throwVy: 0, throwVr: 0, dragging: false,
      };
    });
    for (let i = 0; i < stateRef.current.length; i++) {
      const s = stateRef.current[i];
      const el = elCache[i];
      if (el) el.style.transform = `translate3d(${s.x|0}px,${s.y|0}px,0)rotate(${s.rotation|0}deg)`;
    }

    // --- Native pointer handlers (no React synthetic event overhead) ---
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      const idx = t.dataset.brickIdx;
      if (idx == null) return;
      e.preventDefault();
      const i = +idx;
      t.setPointerCapture(e.pointerId);
      const s = stateRef.current[i];
      s.dragging = true;
      s.throwVx = 0; s.throwVy = 0; s.throwVr = 0;
      dragRef.current = { idx: i, offsetX: e.clientX - s.x, offsetY: e.clientY - s.y, lastX: e.clientX, lastY: e.clientY, lastTime: performance.now() };
      t.classList.add('dragging');
    };
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const s = stateRef.current[d.idx];
      const now = performance.now();
      const dtMs = now - d.lastTime;
      if (dtMs > 0) {
        // High multiplier = bricks fly fast when thrown
        s.throwVx = (e.clientX - d.lastX) / dtMs * 100;
        s.throwVy = (e.clientY - d.lastY) / dtMs * 100;
        s.throwVr = s.throwVx * 2;
      }
      s.x = e.clientX - d.offsetX;
      s.y = e.clientY - d.offsetY;
      d.lastX = e.clientX; d.lastY = e.clientY; d.lastTime = now;
      const el = elCache[d.idx];
      if (el) el.style.transform = `translate3d(${s.x|0}px,${s.y|0}px,0)rotate(${s.rotation|0}deg)`;
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      stateRef.current[d.idx].dragging = false;
      const el = elCache[d.idx];
      if (el) { el.releasePointerCapture(e.pointerId); el.classList.remove('dragging'); }
      dragRef.current = null;
    };
    container.addEventListener('pointerdown', onDown);
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onUp);
    container.addEventListener('pointercancel', onUp);

    // --- Physics loop ---
    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const states = stateRef.current;

      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        if (s.dragging) continue;
        const hasThrow = Math.abs(s.throwVx) > 0.5 || Math.abs(s.throwVy) > 0.5;

        if (hasThrow) {
          // Thrown: apply combined velocity + bounce off edges
          s.x += (s.baseVx + s.throwVx) * dt;
          s.y += (s.baseVy + s.throwVy) * dt;
          s.rotation += (15 + s.throwVr) * dt;
          // Bounce!
          if (s.x < 0)      { s.x = 0;      s.throwVx = Math.abs(s.throwVx) * 0.75; s.throwVr *= -0.8; }
          if (s.x > w - 20)  { s.x = w - 20; s.throwVx = -Math.abs(s.throwVx) * 0.75; s.throwVr *= -0.8; }
          if (s.y < 0)      { s.y = 0;      s.throwVy = Math.abs(s.throwVy) * 0.75; }
          if (s.y > h - 20)  { s.y = h - 20; s.throwVy = -Math.abs(s.throwVy) * 0.75; }
          // Slow decay so they bounce many times
          s.throwVx *= 0.995;
          s.throwVy *= 0.995;
          s.throwVr *= 0.993;
          if (Math.abs(s.throwVx) < 0.5) s.throwVx = 0;
          if (Math.abs(s.throwVy) < 0.5) s.throwVy = 0;
        } else {
          // Normal travel
          s.x += s.baseVx * dt;
          s.y += s.baseVy * dt;
          s.rotation += 8 * dt;
          if (isOffScreen(s, w, h)) {
            const spawn = spawnFromEdge(w, h, i + (now / 1000 | 0));
            s.x = spawn.x; s.y = spawn.y;
            s.baseVx = spawn.baseVx; s.baseVy = spawn.baseVy;
            s.rotation = spawn.rotation;
          }
        }
        const el = elCache[i];
        if (el) el.style.transform = `translate3d(${s.x|0}px,${s.y|0}px,0)rotate(${s.rotation|0}deg)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      container.removeEventListener('pointerdown', onDown);
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerup', onUp);
      container.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <div ref={containerRef} className="lego-bg">
      {BRICK_CONFIG.map((b, i) => (
        <div
          key={i}
          ref={el => { bricksRef.current[i] = el; }}
          className="lego-bg-brick-interactive"
          data-studs={b.studs}
          data-brick-idx={i}
          style={{ '--w': b.w, '--ar': b.ar, background: b.color } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/**
 * Cold-load preloader: the four logo bricks drop and snap into place, then
 * the shell takes over. Shown once per session, skipped entirely for
 * reduced-motion users, total < 1.3s.
 */
const PRELOADER_BRICKS = ['#D01012', '#F5CD2F', '#287F46', '#0055BF'];

function Preloader() {
  const reduceMotion = useReducedMotion();
  // Phased by timers, not animation completion: rAF can stall in background
  // tabs, and the overlay must NEVER stay covering the app.
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>(() => {
    try { return sessionStorage.getItem('vl-preloaded') ? 'gone' : 'show'; } catch { return 'gone'; }
  });

  useEffect(() => {
    if (phase !== 'show') return;
    try { sessionStorage.setItem('vl-preloaded', '1'); } catch { /* private mode */ }
    const t = setTimeout(() => setPhase('fade'), 1250);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'fade') return;
    const t = setTimeout(() => setPhase('gone'), 400);
    return () => clearTimeout(t);
  }, [phase]);

  if (reduceMotion || phase === 'gone') return null;

  return (
    (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-300 ease-out ${
            phase === 'fade' ? 'opacity-0 pointer-events-none' : ''
          }`}
        >
          <div className="flex flex-col items-center gap-5">
            <div className="grid grid-cols-2 gap-1.5">
              {PRELOADER_BRICKS.map((color, i) => (
                <m.div
                  key={color}
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ background: color }}
                  initial={{ y: -70, opacity: 0, rotate: i % 2 ? 8 : -8 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', visualDuration: 0.45, bounce: 0.4, delay: 0.1 + i * 0.12 }}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-white/30 shadow-[inset_0_-1px_2px_rgba(0,0,0,0.25)]" />
                </m.div>
              ))}
            </div>
            <m.span
              className="font-display font-bold text-xl tracking-tight text-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', visualDuration: 0.4, bounce: 0.2, delay: 0.62 }}
            >
              Virtual Lego
            </m.span>
          </div>
        </div>
    )
  );
}

export function RootLayout() {
  const [showChat, setShowChat] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const lastActionError = usePuzzleStore((s) => s.lastActionError);
  const location = useLocation();
  const isPuzzleRoute = location.pathname.startsWith('/puzzle/') || location.pathname === '/create';

  // Auth integration
  const { getToken, isSignedIn } = useAppAuth();
  const { user: clerkUser } = useUser();
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const showLevelUp = useGamificationStore((s) => s.showLevelUp);
  const dismissLevelUp = useGamificationStore((s) => s.dismissLevelUp);
  const processOfflineQueue = useGamificationStore((s) => s.processOfflineQueue);

  // Close chat and instructions when leaving puzzle routes
  useEffect(() => {
    if (!isPuzzleRoute) {
      setShowChat(false);
      setShowInstructions(false);
    }
  }, [isPuzzleRoute]);

  // Set up API client token provider
  useEffect(() => {
    apiClient.setTokenProvider(() => getToken());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Fetch user profile on sign-in
  useEffect(() => {
    if (isSignedIn) {
      const displayName = clerkUser?.firstName
        ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
        : clerkUser?.username || undefined;
      fetchProfile(() => getToken(), {
        displayName,
        avatarUrl: clerkUser?.imageUrl || undefined,
      });
      processOfflineQueue(() => getToken());
    } else {
      useUserStore.getState().clearProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Bridge store errors to Sonner toasts
  useEffect(() => {
    if (lastActionError) toast.error(lastActionError);
  }, [lastActionError]);

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        usePuzzleStore.getState().undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        usePuzzleStore.getState().redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        usePuzzleStore.getState().redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
      <Sentry.ErrorBoundary fallback={<div className="flex items-center justify-center h-screen text-foreground">Something went wrong. Please refresh the page.</div>}>
        <Preloader />
        <div className="h-full w-full flex flex-col overflow-hidden">
          {/* Night-baseplate atmosphere: drifting color orbs + film grain */}
          <div className="atmosphere" aria-hidden="true">
            <div className="atmosphere-orb" />
            <div className="atmosphere-orb" />
            <div className="atmosphere-orb" />
            <div className="atmosphere-grain" />
          </div>
          {/* Animated Lego brick background — hidden on puzzle routes */}
          {!isPuzzleRoute && <LegoBackground />}
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md">
            Skip to main content
          </a>
          <Header
            onChatToggle={() => setShowChat(prev => !prev)}
            isChatOpen={showChat}
            onShowInstructions={() => setShowInstructions(true)}
            isPuzzleRoute={isPuzzleRoute}
          />

          <div className="flex-1 flex overflow-hidden relative">
            {/* Sidebar — only on non-puzzle routes */}
            {!isPuzzleRoute && <Sidebar />}

            <main id="main-content" className="flex-1 overflow-hidden relative">
              {/* Normal pages (gallery, profile, leaderboard) */}
              <div className={`absolute inset-0 transition-opacity duration-150 ease-out ${
                isPuzzleRoute ? 'opacity-0 z-0 pointer-events-none' : 'opacity-100 z-10'
              }`}>
                <div className="h-full overflow-y-auto">
                  <Outlet />
                </div>
              </div>

              {/* Puzzle shell — always mounted once visited, CSS-hidden on non-puzzle routes */}
              <PuzzleShell visible={isPuzzleRoute} />
            </main>
          </div>

          {/* Mobile bottom navigation — primary nav on phones (non-puzzle routes) */}
          {!isPuzzleRoute && <MobileNav />}

          <Toaster
            position="bottom-center"
            theme="dark"
            richColors
            // Lift toasts above the mobile bottom nav / home indicator.
            mobileOffset={{ bottom: 'calc(env(safe-area-inset-bottom) + 76px)' }}
            toastOptions={{
              className: 'font-sans',
              style: { background: 'var(--card)', border: '1px solid var(--border)' },
            }}
          />

          <Suspense fallback={null}>
            {showInstructions && <InstructionsModal isOpen={showInstructions} onClose={() => setShowInstructions(false)} />}
          </Suspense>
          <Suspense fallback={null}>
            {showChat && <ChatPanel isOpen={showChat} onClose={() => setShowChat(false)} />}
          </Suspense>
          <Suspense fallback={null}>
            {showLevelUp && <LevelUpPopup onDismiss={dismissLevelUp} />}
          </Suspense>
          <KeyboardShortcutsOverlay />
          <Analytics />
        </div>
      </Sentry.ErrorBoundary>
      </MotionConfig>
    </LazyMotion>
  );
}
