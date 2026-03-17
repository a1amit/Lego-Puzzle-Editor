import React, { Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import { RootLayout } from './RootLayout';

const GalleryPage = React.lazy(() => import('./routes/GalleryPage'));
const ProfilePage = React.lazy(() => import('./routes/ProfilePage'));
const LeaderboardPage = React.lazy(() => import('./routes/LeaderboardPage'));
const MyPuzzlesPage = React.lazy(() => import('./routes/MyPuzzlesPage'));
const AdminPage = React.lazy(() => import('./routes/AdminPage'));

function PageSkeleton() {
  return <div className="flex-1 animate-pulse bg-background" />;
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Lazy><GalleryPage /></Lazy>,
      },
      {
        path: 'puzzle/:slug',
        element: null, // PuzzleShell handles rendering
      },
      {
        path: 'puzzle/:slug/edit',
        element: null, // PuzzleShell handles rendering
      },
      {
        path: 'create',
        element: null, // PuzzleShell handles (new puzzle)
      },
      {
        path: 'my-puzzles',
        element: <Lazy><MyPuzzlesPage /></Lazy>,
      },
      {
        path: 'admin',
        element: <Lazy><AdminPage /></Lazy>,
      },
      {
        path: 'profile/:userId',
        element: <Lazy><ProfilePage /></Lazy>,
      },
      {
        path: 'leaderboard',
        element: <Lazy><LeaderboardPage /></Lazy>,
      },
    ],
  },
]);
