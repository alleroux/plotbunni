import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../lib/api';

const STATUS_LABELS = {
  free: { label: 'Free', color: 'text-gray-500' },
  active: { label: 'Pro — Active', color: 'text-green-600' },
  trialing: { label: 'Pro — Trial', color: 'text-blue-600' },
  past_due: { label: 'Pro — Payment Failed', color: 'text-red-600' },
  canceled: { label: 'Canceled', color: 'text-gray-500' },
  free_grant: { label: 'Pro — Complimentary', color: 'text-purple-600' },
};

export default function BillingPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const status = user?.subscriptionStatus || 'free';
  const tier = user?.subscriptionTier;
  const isComplimentary = tier === 'free_grant';
  const isPro = status === 'active' || status === 'trialing' || isComplimentary;

  async function redirectToStripe(endpoint) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/billing/${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }

  const statusInfo = STATUS_LABELS[isComplimentary ? 'free_grant' : status] || STATUS_LABELS.free;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-lg mx-auto">
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
          ← Back
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Subscription</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{user?.email}</p>

          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Current plan</p>
            <p className={`text-lg font-semibold ${statusInfo.color}`}>{statusInfo.label}</p>
            {user?.subscriptionEndsAt && status === 'active' && (
              <p className="text-xs text-gray-400 mt-1">
                Renews {new Date(user.subscriptionEndsAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}

          {isComplimentary ? (
            <p className="text-sm text-gray-500">Your Pro access has been granted by an admin. No payment required.</p>
          ) : isPro ? (
            <button
              onClick={() => redirectToStripe('portal')}
              disabled={loading}
              className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Manage Subscription'}
            </button>
          ) : (
            <button
              onClick={() => redirectToStripe('checkout')}
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Upgrade to Pro'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
