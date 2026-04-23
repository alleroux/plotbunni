import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createHashRouter,
  RouterProvider,
  Navigate,
  useParams,
  useRouteError,
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

// ─── Error UI ────────────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ErrorScreen error={this.state.error} />;
    }
    return this.props.children;
  }
}

function ErrorScreen({ error }) {
  const isChunkError =
    error?.message?.includes('dynamically imported module') ||
    error?.message?.includes('Failed to fetch dynamically imported module') ||
    error?.message?.includes('Importing a module script failed');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6 text-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow p-8 flex flex-col gap-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Something went wrong</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isChunkError
            ? 'A page failed to load, possibly because the app was updated. Reloading should fix it.'
            : 'An unexpected error occurred.'}
        </p>
        {!isChunkError && error?.message && (
          <pre className="text-xs text-left bg-gray-100 dark:bg-gray-700 rounded-lg p-3 overflow-auto text-red-600 dark:text-red-400">
            {error.message}
          </pre>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}

// Used by React Router's errorElement — reads the error thrown during routing.
function RouteErrorPage() {
  const error = useRouteError();
  return <ErrorScreen error={error instanceof Error ? error : new Error(String(error?.statusText ?? error))} />;
}

// ─── Auth guards ─────────────────────────────────────────────────────────────

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

// ─── Novel editor layout ──────────────────────────────────────────────────────

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

// ─── Router ───────────────────────────────────────────────────────────────────

const router = createHashRouter([
  {
    // Root error boundary for route-level errors (bad routes, loader failures, etc.)
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      { path: '/', element: <RequireAuth><NovelGridView /></RequireAuth> },
      { path: '/novel/:novelId', element: <RequireAuth><NovelEditorLayout /></RequireAuth> },
      { path: '/billing', element: <RequireAuth><BillingPage /></RequireAuth> },
      { path: '/billing/success', element: <RequireAuth><BillingSuccessPage /></RequireAuth> },
      { path: '/admin', element: <RequireAuth><AdminGuard><AdminPage /></AdminGuard></RequireAuth> },
    ],
  },
]);

// ─── App root ─────────────────────────────────────────────────────────────────

function RootApp() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>}>
            <RouterProvider router={router} />
          </Suspense>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default RootApp;
