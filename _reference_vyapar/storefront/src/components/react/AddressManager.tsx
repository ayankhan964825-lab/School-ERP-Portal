import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Phone, MapPin } from 'lucide-react';

export default function AddressManager() {
  const [phone, setPhone] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Simple mock login via Phone Number (Before Twilio integration)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return alert('Enter a valid 10-digit phone number');
    
    setLoading(true);
    try {
      const res = await fetch(`/api/account/addresses?phone=${phone}`);
      const data = await res.json();
      setAddresses(data.addresses || []);
      setIsLoggedIn(true);
      // Save session in localStorage for demo
      localStorage.setItem('userPhone', phone);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const savedPhone = localStorage.getItem('userPhone');
    if (savedPhone) {
      setPhone(savedPhone);
      setLoading(true);
      fetch(`/api/account/addresses?phone=${savedPhone}`)
        .then(res => res.json())
        .then(data => {
          setAddresses(data.addresses || []);
          setIsLoggedIn(true);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    try {
      await fetch(`/api/account/addresses?id=${id}`, { method: 'DELETE' });
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      alert('Failed to delete address');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userPhone');
    setIsLoggedIn(false);
    setPhone('');
    setAddresses([]);
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-serif font-bold text-secondary text-center mb-6">Login to Manage Profile</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">Phone Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/50 font-medium">+91</span>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-medium"
                required
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary !py-3.5 !rounded-xl"
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
        <p className="text-xs text-center text-secondary/50 mt-4">
          Note: Twilio OTP will be connected here in Phase 2. Currently bypasses with phone lookup.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-serif font-bold text-secondary">Welcome back!</h2>
          <p className="text-secondary/60 flex items-center gap-2 mt-1">
            <Phone className="w-4 h-4" /> +91 {phone}
          </p>
        </div>
        <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-600 px-4 py-2 bg-red-50 rounded-lg transition-colors">
          Logout
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" /> Saved Addresses
          </h3>
        </div>

        {addresses.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-secondary/50 font-medium">No saved addresses found.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div key={addr.id} className="border border-gray-100 rounded-xl p-5 hover:border-primary/30 transition-colors relative group">
                <span className="absolute top-4 right-4 text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md uppercase">
                  {addr.label || 'Home'}
                </span>
                <p className="font-bold text-secondary text-sm mb-1">{addr.name}</p>
                <p className="text-sm text-secondary/70 leading-relaxed mb-4">
                  {addr.street_address},<br/>
                  {addr.city}, {addr.state} - {addr.pincode}
                </p>
                
                <div className="flex items-center gap-3 pt-4 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleDelete(addr.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
