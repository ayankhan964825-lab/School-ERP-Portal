import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { cartItems } from '../../store/cartStore';

type PaymentMethod = 'cod' | 'razorpay' | 'phonepe';

interface Address {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  addressType?: 'home' | 'work' | 'other';
}

export default function Checkout() {
  const defaultCart = useStore(cartItems);
  const [cart, setCart] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('cod');
  
  // Address Book State
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('buyNow') === 'true') {
      try {
        const itemStr = sessionStorage.getItem('buy-now-item');
        if (itemStr) {
          setCart([JSON.parse(itemStr)]);
          setIsLoaded(true);
          return;
        }
      } catch (e) {}
    }
    setCart(defaultCart);
    setIsLoaded(true);
  }, [defaultCart]);
  
  const [formData, setFormData] = useState<Address>({
    id: 'new', name: '', email: '', phone: '', address: '', landmark: '', city: '', state: '', pincode: '', addressType: 'home'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState('');
  const [appliedCouponCodes, setAppliedCouponCodes] = useState<string[]>([]);
  const [validatedData, setValidatedData] = useState<any>(null);
  
  const [acceptedDowngrade, setAcceptedDowngrade] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);

  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded || cart.length === 0) return;
    
    // Auto-recalculate whenever cart, payment method, state or coupon changes
    const timer = setTimeout(() => {
      fetch('/api/checkout/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          couponCodes: appliedCouponCodes,
          paymentMethod: method,
          state: formData.state,
          customerPhone: formData.phone,
          pincode: formData.pincode,
          latitude,
          longitude
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setValidatedData(data);
          // Only clear cart errors, not pincode status which is managed separately
          if (pincodeStatus === 'invalid' && pincodeMessage.includes('Quick-Commerce')) {
             setPincodeStatus('valid');
             setPincodeMessage('Delivery available');
          }
        } else {
          setValidatedData(null);
          setPincodeStatus('invalid');
          setPincodeMessage(data.error || 'Cart items cannot be delivered to this location.');
        }
      })
      .catch(() => {});
    }, 400); // small debounce

    return () => clearTimeout(timer);
  }, [cart, appliedCouponCodes, method, formData.state, formData.phone, formData.pincode, latitude, longitude, isLoaded]);

  // Pincode Verification State
  const [pincodeStatus, setPincodeStatus] = useState<'idle'|'loading'|'valid'|'invalid'>('idle');
  const [pincodeMessage, setPincodeMessage] = useState('');
  const [allowCOD, setAllowCOD] = useState(true);

  useEffect(() => {
    if (formData.pincode.length === 6) {
      setPincodeStatus('loading');
      
      // Auto-fetch City and State
      fetch(`https://api.postalpincode.in/pincode/${formData.pincode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0] && data[0].Status === 'Success') {
            const po = data[0].PostOffice[0];
            setFormData(prev => ({
              ...prev,
              city: po.District,
              state: po.State
            }));
          }
        })
        .catch(err => console.error('Pincode fetch error:', err));

      // Attempt to geocode pincode for Radius zones
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${formData.pincode}+India&limit=1&email=admin@vyaparpe.com`)
        .then(res => res.json())
        .then(geoData => {
          let lat = undefined;
          let lng = undefined;
          if (geoData && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat);
            lng = parseFloat(geoData[0].lon);
            setLatitude(lat);
            setLongitude(lng);
          } else {
            setLatitude(undefined);
            setLongitude(undefined);
          }
          // Check COD availability via our API
          return fetch('/api/checkout/verify-pincode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pincode: formData.pincode, latitude: lat, longitude: lng })
          });
        })
        .catch(() => {
          // Fallback if geocoding fails
          return fetch('/api/checkout/verify-pincode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pincode: formData.pincode })
          });
        })
        .then(res => res.json())
        .then(data => {
          setPincodeStatus(data.valid ? 'valid' : 'invalid');
          setPincodeMessage(data.message);
          setAllowCOD(data.allowCOD);
          if (!data.allowCOD && method === 'cod') {
            setMethod('razorpay');
          }
        })
        .catch(() => setPincodeStatus('idle'));
    } else {
      setPincodeStatus('idle');
      setPincodeMessage('');
      setAllowCOD(true);
    }
  }, [formData.pincode]);

  useEffect(() => {
    // Load saved addresses from localStorage on mount
    let hasSavedAddress = false;
    try {
      const stored = localStorage.getItem(`vyaparpe-addresses-${window.location.hostname}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedAddresses(parsed);
          setSelectedAddressId(parsed[0].id);
          setFormData(parsed[0]);
          hasSavedAddress = true;
        }
      }
    } catch (e) {}

    // Fallback to location cookies if no saved address is found
    if (!hasSavedAddress && typeof document !== 'undefined') {
      const pinMatch = document.cookie.match(new RegExp('(^| )delivery_pincode=([^;]+)'));
      const cityMatch = document.cookie.match(new RegExp('(^| )delivery_city=([^;]+)'));
      const latMatch = document.cookie.match(new RegExp('(^| )delivery_lat=([^;]+)'));
      const lngMatch = document.cookie.match(new RegExp('(^| )delivery_lng=([^;]+)'));
      
      if (latMatch && lngMatch) {
        setLatitude(parseFloat(latMatch[2]));
        setLongitude(parseFloat(lngMatch[2]));
      }

      if (pinMatch || cityMatch) {
        setFormData(prev => ({
          ...prev,
          pincode: pinMatch ? pinMatch[2].trim() : prev.pincode,
          city: cityMatch ? decodeURIComponent(cityMatch[2].trim()) : prev.city
        }));
      }
    }

    // Also load coupons saved by CartDrawer
    try {
      const savedCoupons = localStorage.getItem(`vyaparpe-coupons-${window.location.hostname}`);
      if (savedCoupons) {
        const codes = JSON.parse(savedCoupons);
        if (Array.isArray(codes) && codes.length > 0) {
          setAppliedCouponCodes(codes);
          setCouponApplied(codes.join(', '));
        }
      }
    } catch (e) {}

    // Auto-apply affiliate code if present
    try {
      const affiliateRef = localStorage.getItem('vyaparpe_affiliate_ref');
      if (affiliateRef) {
        // Calculate subtotal from defaultCart (since it might be right at mount)
        // Wait for subtotal to be ready, but here cart is empty initially. Let's do it in a separate effect that watches cart!
      }
    } catch (e) {}
  }, []);

  // Effect for affiliate coupon application once cart is loaded
  useEffect(() => {
    if (isLoaded && cart.length > 0 && !couponApplied) {
      try {
        const affiliateRef = localStorage.getItem('vyaparpe_affiliate_ref');
        if (affiliateRef) {
          const currentSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          fetch('/api/checkout/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart, couponCodes: [affiliateRef], paymentMethod: method, state: formData.state, customerPhone: formData.phone })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.couponResult && data.couponResult.valid) {
              setAppliedCouponCodes([affiliateRef]);
              setCouponApplied(affiliateRef.toUpperCase());
              setCouponCode(affiliateRef.toUpperCase());
              setValidatedData(data);
            }
          })
          .catch(() => {});
        }
      } catch (e) {}
    }
  }, [isLoaded, cart]);

  const handleAddressSelect = (id: string) => {
    setSelectedAddressId(id);
    if (id === 'new') {
      setFormData({ id: 'new', name: '', email: '', phone: '', address: '', landmark: '', city: '', state: '', pincode: '', addressType: 'home' });
    } else {
      const addr = savedAddresses.find(a => a.id === id);
      if (addr) setFormData(addr);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 499 ? 0 : 50;
  const total = subtotal + shipping - couponDiscount;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    try {
      const currentCodes = appliedCouponCodes.includes(couponCode.trim().toUpperCase()) 
        ? appliedCouponCodes 
        : [...appliedCouponCodes, couponCode.trim().toUpperCase()];

      const res = await fetch('/api/checkout/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          couponCodes: currentCodes,
          paymentMethod: method,
          state: formData.state,
          customerPhone: formData.phone,
          pincode: formData.pincode
        })
      });
      const data = await res.json();
      if (data.success && data.couponResult && data.couponResult.valid) {
        setAppliedCouponCodes(currentCodes);
        setCouponApplied(currentCodes.join(', '));
        setCouponError('');
        setValidatedData(data);
      } else {
        setCouponError(data?.couponResult?.error || 'Invalid coupon');
      }
    } catch {
      setCouponError('Failed to validate coupon');
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponApplied('');
    setAppliedCouponCodes([]);
    setCouponError('');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return alert('Your cart is empty');
    if (pincodeStatus === 'invalid') return alert(pincodeMessage || 'Delivery is not available for this pincode.');
    
    if (validatedData?.qcDowngraded && !acceptedDowngrade) {
      setShowDowngradeModal(true);
      return;
    }
    
    setIsSubmitting(true);
    
    // Save address if it's new
    if (selectedAddressId === 'new') {
      const newAddress = { ...formData, id: Date.now().toString() };
      const updatedAddresses = [...savedAddresses, newAddress];
      setSavedAddresses(updatedAddresses);
      localStorage.setItem(`vyaparpe-addresses-${window.location.hostname}`, JSON.stringify(updatedAddresses));
    }

    // Geocode address using OpenStreetMap Nominatim for Radius-based QC Routing
    let lat = undefined;
    let lng = undefined;
    try {
      const q = encodeURIComponent(`${formData.address}, ${formData.city}, ${formData.state} ${formData.pincode} India`);
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1&email=admin@vyaparpe.com`);
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
      } else {
        // Fallback to just pincode and city
        const q2 = encodeURIComponent(`${formData.city}, ${formData.pincode} India`);
        const geoRes2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q2}&limit=1&email=admin@vyaparpe.com`);
        const geoData2 = await geoRes2.json();
        if (geoData2 && geoData2.length > 0) {
          lat = parseFloat(geoData2[0].lat);
          lng = parseFloat(geoData2[0].lon);
        }
      }
    } catch (e) {
      console.warn("Geocoding failed, using cached coordinates", e);
      // Fix #5: Fallback to cached coordinates from LocationPrompt
      const latCookie = document.cookie.match(/delivery_lat=([^;]+)/);
      const lngCookie = document.cookie.match(/delivery_lng=([^;]+)/);
      if (latCookie) lat = parseFloat(latCookie[1]);
      if (lngCookie) lng = parseFloat(lngCookie[1]);
    }

    const enrichedFormData = {
      ...formData,
      street_address: formData.address,
      addressLine: formData.address,
      latitude: lat,
      longitude: lng
    };

    const orderPayload = {
      customer: enrichedFormData,
      rawAddress: enrichedFormData,
      items: cart,
      paymentMethod: method,
      amount: validatedData ? validatedData.finalAmount : total,
      couponCode: couponApplied || undefined,
      couponCodes: appliedCouponCodes.length > 0 ? appliedCouponCodes : (couponApplied ? [couponApplied] : []),
      state: formData.state
    };

    try {
      if (method === 'cod') {
        const res = await fetch('/api/checkout/cod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        });
        const data = await res.json();
        if (data.success) {
          // Save order snapshot for success page
          const params = new URLSearchParams(window.location.search);
          localStorage.setItem(`vyaparpe-last-order-${window.location.hostname}`, JSON.stringify({
            items: cart.map(i => ({ name: i.name, weight: i.weight, quantity: i.quantity, price: i.price, image: i.image })),
            total,
            paymentMethod: method,
            isBuyNow: params.get('buyNow') === 'true'
          }));
          window.location.href = `/order-success?id=${data.orderId}`;
        } else {
          alert('Error placing COD order: ' + data.error);
        }
      } else if (method === 'phonepe') {
        // ── PhonePe redirect flow ──────────────────────────────
        const res = await fetch('/api/checkout/phonepe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        });
        const data = await res.json();
        if (data.success && data.redirectUrl) {
          const params = new URLSearchParams(window.location.search);
          localStorage.setItem('Store Name-pending-order', JSON.stringify({...orderPayload, isBuyNow: params.get('buyNow') === 'true'}));
          window.location.href = data.redirectUrl;
        } else {
          alert('Failed to initiate PhonePe payment. Please try again.');
        }
      } else {
        // ── Razorpay SDK popup ─────────────────────────────────
        const res = await fetch('/api/checkout/razorpay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        });
        const orderData = await res.json();

        if (!orderData.success) {
          alert('Failed to initiate payment. Please try again.');
          setIsSubmitting(false);
          return;
        }

        // Load Razorpay script dynamically
        await new Promise<void>((resolve, reject) => {
          if ((window as any).Razorpay) { resolve(); return; }
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
          document.head.appendChild(script);
        });

        const rzp = new (window as any).Razorpay({
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          order_id: orderData.id,
          name: 'Store Name',
          description: 'Order Payment',
          image: '/logo-Store Name.webp', // Static: Razorpay popup only — dynamic logo would need API fetch in client
          prefill: {
            name: formData.name,
            email: formData.email,
            contact: formData.phone,
          },
          theme: { color: '#2D5A27' },
          handler: async (response: any) => {
            const verifyRes = await fetch('/api/checkout/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...orderPayload,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              const params = new URLSearchParams(window.location.search);
              localStorage.setItem(`vyaparpe-last-order-${window.location.hostname}`, JSON.stringify({
                items: cart.map(i => ({ name: i.name, weight: i.weight, quantity: i.quantity, price: i.price, image: i.image })),
                total,
                paymentMethod: method,
                isBuyNow: params.get('buyNow') === 'true'
              }));
              window.location.href = `/order-success?id=${verifyData.orderId}`;
            } else {
              alert('Payment verification failed. Contact support with Order ID: ' + response.razorpay_order_id);
            }
          },
          modal: {
            ondismiss: () => setIsSubmitting(false),
          },
        });
        rzp.open();
        // Don't set isSubmitting false here — Razorpay modal is open
        return;
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;
    
    if (name === 'phone') {
      newValue = newValue.replace(/\D/g, ''); // strip non-numeric
      if (newValue.length > 10 && newValue.startsWith('91')) {
        newValue = newValue.slice(-10); // Keep last 10 digits
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  if (!isLoaded) return null;

  if (cart.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-serif text-secondary mb-4">Your Cart is Empty</h2>
        <a href="/products" className="btn-primary inline-flex">Return to Shop</a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl sm:text-4xl font-serif font-bold text-secondary mb-10">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Form Column */}
        <div className="lg:col-span-7">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Delivery Details */}
            <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-serif font-semibold text-secondary mb-6">1. Delivery Address</h2>
              
              {savedAddresses.length > 0 && (
                <div className="mb-6 space-y-3">
                  <p className="text-sm font-medium text-secondary/70">Select a saved address</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedAddresses.map(addr => (
                      <div 
                        key={addr.id}
                        onClick={() => handleAddressSelect(addr.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedAddressId === addr.id ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        <div className="font-semibold text-secondary mb-1 flex items-center justify-between">
                          {addr.name}
                          {selectedAddressId === addr.id && (
                            <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          )}
                        </div>
                        <p className="text-xs text-secondary/70 line-clamp-2">{addr.address}, {addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="text-xs text-secondary/70 mt-1">{addr.phone}</p>
                      </div>
                    ))}
                    <div 
                      onClick={() => handleAddressSelect('new')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center ${selectedAddressId === 'new' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 hover:border-gray-200 text-secondary/60'}`}
                    >
                      <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      <span className="text-sm font-medium">Add New Address</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedAddressId === 'new' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-secondary/70 mb-1">Full Name</label>
                    <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary/70 mb-1">Phone Number</label>
                    <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary/70 mb-1">Email Address</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-secondary/70 mb-1">Street Address</label>
                    <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-secondary/70 mb-1">Landmark (Optional)</label>
                    <input type="text" name="landmark" value={formData.landmark || ''} onChange={handleChange} placeholder="e.g. Near Apollo Hospital" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-secondary/70 mb-1">PIN Code</label>
                    <input required type="text" maxLength={6} name="pincode" value={formData.pincode} onChange={handleChange} className={`w-full px-4 py-2.5 rounded-xl border focus:ring-1 outline-none transition-all ${pincodeStatus === 'invalid' ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 focus:border-primary focus:ring-primary'}`} />
                    {pincodeStatus === 'loading' && <p className="text-xs text-secondary/60 mt-1.5 animate-pulse">Fetching city & state...</p>}
                    {pincodeMessage && <p className={`text-xs mt-1.5 font-medium ${pincodeStatus === 'valid' ? 'text-green-600' : 'text-red-500'}`}>{pincodeMessage}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary/70 mb-1">City</label>
                    <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-gray-50/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-secondary/70 mb-1">State</label>
                    <input required type="text" name="state" value={formData.state} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-gray-50/50" />
                  </div>
                  <div className="sm:col-span-2 mt-2">
                    <label className="block text-sm font-medium text-secondary/70 mb-3">Address Type</label>
                    <div className="flex gap-4">
                      <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-all ${formData.addressType === 'home' ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-gray-200 text-secondary/70 hover:border-gray-300'}`}>
                        <input type="radio" name="addressType" value="home" checked={formData.addressType === 'home'} onChange={handleChange} className="hidden" />
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        Home
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-all ${formData.addressType === 'work' ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-gray-200 text-secondary/70 hover:border-gray-300'}`}>
                        <input type="radio" name="addressType" value="work" checked={formData.addressType === 'work'} onChange={handleChange} className="hidden" />
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        Work
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer transition-all ${formData.addressType === 'other' ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-gray-200 text-secondary/70 hover:border-gray-300'}`}>
                        <input type="radio" name="addressType" value="other" checked={formData.addressType === 'other'} onChange={handleChange} className="hidden" />
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Other
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Payment Method */}
            <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-serif font-semibold text-secondary mb-6">2. Payment Method</h2>
              <div className="space-y-4">
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'razorpay' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input type="radio" name="payment" value="razorpay" checked={method === 'razorpay'} onChange={() => setMethod('razorpay')} className="w-5 h-5 text-primary accent-primary" />
                  <div className="flex-1">
                    <div className="font-semibold text-secondary">Razorpay (Cards, UPI, NetBanking)</div>
                    <div className="text-sm text-secondary/60">Secure online payment via Razorpay.</div>
                  </div>
                </label>
                
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${method === 'phonepe' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'}`}>
                  <input type="radio" name="payment" value="phonepe" checked={method === 'phonepe'} onChange={() => setMethod('phonepe')} className="w-5 h-5 text-primary accent-primary" />
                  <div className="flex-1">
                    <div className="font-semibold text-secondary">PhonePe</div>
                    <div className="text-sm text-secondary/60">Pay instantly using PhonePe UPI or Wallets.</div>
                  </div>
                </label>

                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${!allowCOD ? 'opacity-50 cursor-not-allowed bg-gray-50' : method === 'cod' ? 'border-primary bg-primary/5 cursor-pointer' : 'border-gray-100 hover:border-gray-200 cursor-pointer'}`}>
                  <input type="radio" name="payment" value="cod" checked={method === 'cod'} disabled={!allowCOD} onChange={() => setMethod('cod')} className="w-5 h-5 text-primary accent-primary" />
                  <div className="flex-1">
                    <div className="font-semibold text-secondary">Cash on Delivery (COD)</div>
                    <div className="text-sm text-secondary/60">{!allowCOD ? 'COD is not available for your pincode.' : 'Pay when your order arrives.'}</div>
                  </div>
                </label>
              </div>
            </section>
          </form>
        </div>

        {/* Order Summary Column */}
        <div className="lg:col-span-5">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
            <h2 className="text-xl font-serif font-semibold text-secondary mb-6">Order Summary</h2>
            
            {validatedData && validatedData.validatedItems ? (
              <>
                {/* Q-Commerce Group */}
                {validatedData.validatedItems.filter((i: any) => i.q_commerce_enabled).length > 0 && (
                  <div className="mb-4 bg-primary/5 rounded-xl p-4 border border-primary/10">
                    <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                      <span>⚡</span> {validatedData.validatedItems.find((i: any) => i.q_commerce_enabled)?.eta_override || 'Delivery in 10-30 mins'}
                    </h3>
                    <div className="space-y-4 max-h-[25vh] overflow-y-auto pr-2">
                      {validatedData.validatedItems.filter((i: any) => i.q_commerce_enabled).map((item: any, idx: number) => (
                        <div key={`${item.id}_${idx}`} className="flex items-center gap-4">
                          <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-lg bg-white mix-blend-multiply border border-gray-100" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-secondary text-sm truncate">{item.name}</h4>
                            <p className="text-xs text-secondary/60">{item.weight} × {item.quantity}</p>
                          </div>
                          <div className="font-medium text-secondary text-sm">
                            ₹{item.price * item.quantity}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Standard Group */}
                {validatedData.validatedItems.filter((i: any) => !i.q_commerce_enabled).length > 0 && (
                  <div className="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h3 className="text-sm font-bold text-secondary mb-3 flex items-center gap-2">
                      <span>🚚</span> Delivery in 2-3 days
                    </h3>
                    <div className="space-y-4 max-h-[25vh] overflow-y-auto pr-2">
                      {validatedData.validatedItems.filter((i: any) => !i.q_commerce_enabled).map((item: any, idx: number) => (
                        <div key={`${item.id}_${idx}`} className="flex items-center gap-4">
                          <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-lg bg-white mix-blend-multiply border border-gray-100" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-secondary text-sm truncate">{item.name}</h4>
                            <p className="text-xs text-secondary/60">{item.weight} × {item.quantity}</p>
                          </div>
                          <div className="font-medium text-secondary text-sm">
                            ₹{item.price * item.quantity}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-4">
                    <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg bg-gray-50 mix-blend-multiply" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-secondary text-sm truncate">{item.name}</h4>
                      <p className="text-xs text-secondary/60">{item.weight} × {item.quantity}</p>
                      {item.custom_data && Object.keys(item.custom_data).length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {Object.entries(item.custom_data).map(([k, v]) => (
                            <p key={k} className="text-[10px] text-secondary/50 leading-tight">
                              <span className="font-semibold uppercase tracking-wider">{k}:</span>{' '}
                              {String(v).startsWith('http') ? (
                                <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-primary underline">View File</a>
                              ) : (
                                <span className="italic">{String(v).substring(0, 30)}{String(v).length > 30 ? '...' : ''}</span>
                              )}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="font-medium text-secondary">
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 pt-4 space-y-3 mb-6">

              {/* Coupon Input */}
              <div className="mb-4">
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div>
                      <span className="text-xs text-green-700 font-medium">Coupon Applied</span>
                      <span className="ml-2 font-mono font-bold text-green-800">{couponApplied}</span>
                    </div>
                    <button onClick={removeCoupon} className="text-xs text-red-500 hover:underline font-medium">Remove</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono uppercase focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                      />
                      <button type="button" onClick={applyCoupon} className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-accent transition-colors">
                        Apply
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
                  </div>
                )}
              </div>

              {validatedData ? (
                <>
                  <div className="flex justify-between text-sm text-secondary/70">
                    <span>Subtotal</span>
                    <span>₹{validatedData.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary/70">
                    <span>Shipping</span>
                    <span>{validatedData.shipping === 0 ? <span className="text-primary font-medium">FREE</span> : `₹${validatedData.shipping}`}</span>
                  </div>
                  {validatedData.couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>Coupon Discount</span>
                      <span>-₹{validatedData.couponDiscount}</span>
                    </div>
                  )}
                  {validatedData.milestoneDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>Milestone Offer</span>
                      <span>-₹{validatedData.milestoneDiscount}</span>
                    </div>
                  )}
                  {validatedData.prepaidDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>Online Payment Offer</span>
                      <span>-₹{validatedData.prepaidDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-secondary pt-3 border-t border-gray-100">
                    <span>Total</span>
                    <span>₹{validatedData.finalAmount}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm text-secondary/70">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary/70">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? <span className="text-primary font-medium">FREE</span> : `₹${shipping}`}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span>Coupon Discount</span>
                      <span>-₹{couponDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-secondary pt-3 border-t border-gray-100">
                    <span>Total</span>
                    <span>₹{total}</span>
                  </div>
                </>
              )}
            </div>

            <button 
              type="submit" 
              form="checkout-form"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center text-lg py-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSubmitting ? 'Processing...' : `Place Order (₹${validatedData ? validatedData.finalAmount : total})`}
            </button>
            <p className="text-xs text-center text-secondary/50 mt-4 flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure 256-bit SSL Encryption
            </p>
          </div>
        </div>
      </div>

      {/* Downgrade Intent Modal */}
      {showDowngradeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-serif font-bold text-secondary mb-2">Delivery Partners Unavailable</h3>
            <p className="text-secondary/80 text-sm mb-6 leading-relaxed">
              Our delivery partners are currently fully occupied or offline. Your order will be prepared and delivered <span className="font-bold text-secondary">tomorrow</span> from our local store. Do you want to continue?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDowngradeModal(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-secondary font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setAcceptedDowngrade(true);
                  setShowDowngradeModal(false);
                  setTimeout(() => handleSubmit(), 100);
                }}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
