import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../lib/api';

function useAdminFetch(path, deps = []) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, path, ...deps]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

const SUB_STATUS_COLORS = {
  free: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-500',
  free_grant: 'bg-purple-100 text-purple-700',
};

// ─── Users Tab ───────────────────────────────────────────────────────────────

function UsersTab() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState(null);
  const [actionError, setActionError] = useState(null);

  const path = `/api/v1/admin/users?page=${page}&q=${encodeURIComponent(query)}`;
  const { data: users, loading, reload } = useAdminFetch(path, [page, query]);

  async function doAction(userId, action) {
    setActing(userId + action);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/subscription`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await res.text());
      reload();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setActing(null);
    }
  }

  const statusLabel = (u) => {
    if (u.subscription_tier === 'free_grant') return 'free_grant';
    return u.subscription_status;
  };

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <input
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Search by email or name…"
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(1); }}
        />
      </div>

      {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && (!users || users.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No users found</td></tr>
            )}
            {(users || []).map(u => {
              const sl = statusLabel(u);
              const isBusy = (k) => acting === u.id + k;
              return (
                <tr key={u.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{u.name || '—'}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SUB_STATUS_COLORS[sl] || 'bg-gray-100 text-gray-600'}`}>
                      {sl}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_admin
                      ? <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">admin</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {sl !== 'free_grant' && sl !== 'active' && sl !== 'trialing' ? (
                        <ActionBtn label="Grant Free Pro" busy={isBusy('grant_free')} onClick={() => doAction(u.id, 'grant_free')} color="purple" />
                      ) : sl === 'free_grant' ? (
                        <ActionBtn label="Revoke Free Pro" busy={isBusy('revoke_free')} onClick={() => doAction(u.id, 'revoke_free')} color="gray" />
                      ) : null}
                      {!u.is_admin
                        ? <ActionBtn label="Make Admin" busy={isBusy('set_admin')} onClick={() => doAction(u.id, 'set_admin')} color="yellow" />
                        : <ActionBtn label="Revoke Admin" busy={isBusy('revoke_admin')} onClick={() => doAction(u.id, 'revoke_admin')} color="gray" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 mt-4 justify-end">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">← Prev</button>
        <span className="px-3 py-1.5 text-sm text-gray-500">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={!users || users.length < 50}
          className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}

function ActionBtn({ label, busy, onClick, color }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
    yellow: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200',
    gray: 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200',
    red: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`px-2 py-1 text-xs rounded-md border font-medium disabled:opacity-50 ${colors[color] || colors.gray}`}
    >
      {busy ? '…' : label}
    </button>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────

function TransactionsTab() {
  const [page, setPage] = useState(1);
  const { data: txns, loading } = useAdminFetch(`/api/v1/admin/transactions?page=${page}`, [page]);

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Event</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>}
            {(txns || []).map(t => (
              <tr key={t.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3">
                  <p className="font-mono text-xs text-gray-700 dark:text-gray-300">{t.event_type}</p>
                  <p className="text-xs text-gray-400 truncate max-w-xs">{t.stripe_event_id}</p>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{t.user_email || t.stripe_customer_id || '—'}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                  {t.amount_cents != null ? `${(t.amount_cents / 100).toFixed(2)} ${(t.currency || '').toUpperCase()}` : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{t.status || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">← Prev</button>
        <span className="px-3 py-1.5 text-sm text-gray-500">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={!txns || txns.length < 100}
          className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────

function LogsTab() {
  const [page, setPage] = useState(1);
  const { data: logs, loading } = useAdminFetch(`/api/v1/admin/logs?page=${page}`, [page]);

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Target</th>
              <th className="px-4 py-3 text-left">Details</th>
              <th className="px-4 py-3 text-left">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>}
            {(logs || []).map(l => (
              <tr key={l.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{l.action}</span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.admin_email}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{l.target_email || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400 max-w-xs">
                  <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(l.details, null, 2)}</pre>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 mt-4 justify-end">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">← Prev</button>
        <span className="px-3 py-1.5 text-sm text-gray-500">Page {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={!logs || logs.length < 100}
          className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40">Next →</button>
      </div>
    </div>
  );
}

// ─── Page Shell ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'logs', label: 'Admin Log' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
        </div>

        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
        {activeTab === 'logs' && <LogsTab />}
      </div>
    </div>
  );
}
