import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BillingSuccessPage() {
  const navigate = useNavigate();
  useEffect(() => { setTimeout(() => navigate('/billing'), 3000); }, [navigate]);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-2xl font-bold text-green-600">Payment successful!</p>
      <p className="text-gray-500">Redirecting to your subscription…</p>
    </div>
  );
}
