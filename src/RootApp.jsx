import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createHashRouter,
  RouterProvider,
  Navigate,
  useParams,
} from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import BillingPage from './pages/BillingPage';
import BillingSuccessPage from './pages/BillingSuccessPage';
import AdminPage from './pages/AdminPage';

const App = lazy(() => import('./App'));
const NovelGridView = lazy(() => import('./components/novel/NovelGridView'));

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AdminGuard({ children }) {
  const { user } = useAuth();
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return children;
}

const NovelEditorLayout = () => {
  const { novelId } = useParams();
  const { t } = useTranslation();

  if (!novelId) {
    return (
      <div>
        <p>{t('root_app_error_no_novel_id')}</p>
        <a href="/">{t('root_app_go_to_novels_link')}</a>
      </div>
    );
  }

  return (
    <DataProvider novelId={novelId}>
      <App novelId={novelId} />
    </DataProvider>
  );
};

const router = createHashRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    path: '/',
    element: <RequireAuth><NovelGridView /></RequireAuth>,
  },
  {
    path: '/novel/:novelId',
    element: <RequireAuth><NovelEditorLayout /></RequireAuth>,
  },
  {
    path: '/billing',
    element: <RequireAuth><BillingPage /></RequireAuth>,
  },
  {
    path: '/billing/success',
    element: <RequireAuth><BillingSuccessPage /></RequireAuth>,
  },
  {
    path: '/admin',
    element: <RequireAuth><AdminGuard><AdminPage /></AdminGuard></RequireAuth>,
  },
]);

function RootApp() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading…</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default RootApp;
