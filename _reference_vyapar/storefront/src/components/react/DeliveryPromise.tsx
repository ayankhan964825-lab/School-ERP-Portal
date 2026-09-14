import React, { useState, useEffect } from 'react';

export default function DeliveryPromise({ variantId, isQCommerceOnly }: { variantId?: string, isQCommerceOnly?: boolean }) {
  const [eta, setEta] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeliveryPromise = async () => {
      try {
        const match = document.cookie.match(new RegExp('(^| )delivery_pincode=([^;]+)'));
        const pincode = match ? match[2] : null;

        const res = await fetch('/api/storefront/delivery-promise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pincode, variant_id: variantId, is_q_commerce_only: isQCommerceOnly })
        });
        
        if (res.ok) {
          const data = await res.json();
          setEta(data.eta);
          setType(data.type);
        }
      } catch (err) {
        console.error('Failed to fetch delivery promise', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryPromise();
  }, []);

  if (loading) {
    return <div className="h-10 w-full animate-pulse bg-gray-100 rounded-xl mt-4"></div>;
  }

  if (!eta || eta === 'Undeliverable') {
    return (
      <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-red-800">Not deliverable to your location</p>
          <p className="text-xs text-red-600 mt-0.5">Please try changing your pincode above.</p>
        </div>
      </div>
    );
  }

  const isQCommerce = type === 'q-commerce';

  return (
    <div className={`mt-4 p-3 rounded-xl border flex items-center gap-3 ${isQCommerce ? 'bg-purple-50 border-purple-100' : 'bg-green-50 border-green-100'}`}>
      {isQCommerce ? (
        <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
          <span className="text-xl">⚡</span>
        </div>
      ) : (
        <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0">
          <span className="text-xl">🚚</span>
        </div>
      )}
      
      <div>
        <p className={`text-sm font-bold ${isQCommerce ? 'text-purple-900' : 'text-green-900'}`}>
          {eta}
        </p>
        <p className={`text-xs ${isQCommerce ? 'text-purple-700' : 'text-green-700'}`}>
          {isQCommerce ? 'Lightning fast local delivery' : 'Standard Delivery'}
        </p>
      </div>
    </div>
  );
}
