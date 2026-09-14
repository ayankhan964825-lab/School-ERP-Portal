import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface LocationPromptProps {
  googleMapsApiKey?: string | null;
  initialPincode?: string;
  initialCity?: string;
  initialEta?: string;
}

export default function LocationPrompt({ googleMapsApiKey, initialPincode = '', initialCity = '', initialEta = '' }: LocationPromptProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pincode, setPincode] = useState(initialPincode);
  const [cityName, setCityName] = useState(initialCity);
  const [eta, setEta] = useState(initialEta);
  const [inputPincode, setInputPincode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const pinMatch = document.cookie.match(new RegExp('(^| )delivery_pincode=([^;]+)'));
    const cityMatch = document.cookie.match(new RegExp('(^| )delivery_city=([^;]+)'));
    const etaMatch = document.cookie.match(new RegExp('(^| )delivery_eta=([^;]+)'));
    
    let currentPin = '';
    
    if (pinMatch) {
      currentPin = pinMatch[2];
      setPincode(currentPin);
    }
    
    if (cityMatch) {
      setCityName(decodeURIComponent(cityMatch[2]));
    }
    
    if (etaMatch) {
      setEta(decodeURIComponent(etaMatch[2]));
    }

    if (currentPin && initialPincode && currentPin !== initialPincode) {
      // Hydration mismatch: SSR was rendered with a different/stale cookie.
      // Force a soft reload to sync SSR with client cookies.
      const hasReloaded = sessionStorage.getItem('reloaded_for_location');
      if (hasReloaded !== currentPin) {
        sessionStorage.setItem('reloaded_for_location', currentPin);
        window.location.reload();
        return;
      }
    }

    if (currentPin) {
      // Silently refresh ETA in background to keep it updated with latest settings
      fetch('/api/checkout/verify-pincode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: currentPin })
      })
      .then(res => res.json())
      .then(data => {
        if (data.eta && data.eta !== decodeURIComponent(etaMatch?.[2] || '')) {
          setEta(data.eta);
          document.cookie = `delivery_eta=${encodeURIComponent(data.eta)}; path=/; max-age=${30 * 24 * 60 * 60}`;
        }
        // Fix #8: Also refresh QC eligibility to prevent stale cookies
        const newQc = data.isQCommerce ? '1' : '0';
        document.cookie = `qc_eligible=${newQc}; path=/; max-age=${30 * 24 * 60 * 60}`;
      })
      .catch(() => {});
    }
  }, []);

  const saveLocation = async (code: string, city: string, lat?: number, lng?: number) => {
    let finalEta = 'Delivery In 3-4 Days';
    let qcEligible = '0';
    try {
      const verifyRes = await fetch('/api/checkout/verify-pincode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: code, latitude: lat, longitude: lng })
      });
      const verifyData = await verifyRes.json();
      if (verifyData.eta) {
        finalEta = verifyData.eta;
      }
      if (verifyData.isQCommerce) {
        qcEligible = '1';
      }
    } catch (err) {
      console.warn("Could not verify ETA", err);
    }

    // Save to cookie for 30 days
    document.cookie = `delivery_pincode=${code}; path=/; max-age=${30 * 24 * 60 * 60}`;
    document.cookie = `delivery_city=${encodeURIComponent(city)}; path=/; max-age=${30 * 24 * 60 * 60}`;
    document.cookie = `delivery_eta=${encodeURIComponent(finalEta)}; path=/; max-age=${30 * 24 * 60 * 60}`;
    document.cookie = `qc_eligible=${qcEligible}; path=/; max-age=${30 * 24 * 60 * 60}`;
    
    if (lat && lng) {
      document.cookie = `delivery_lat=${lat}; path=/; max-age=${30 * 24 * 60 * 60}`;
      document.cookie = `delivery_lng=${lng}; path=/; max-age=${30 * 24 * 60 * 60}`;
    }
    
    // Update the Q-Commerce product filter immediately if the function is available
    if (typeof (window as any).__qcoReevaluate === 'function') {
      (window as any).__qcoReevaluate(code, qcEligible);
    }
    setPincode(code);
    setCityName(city);
    setEta(finalEta);
    setIsOpen(false);
    // Reload page to reflect new delivery options
    window.location.reload();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleaned = inputPincode.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      setError('Please enter a valid 6-digit Pincode');
      return;
    }
    
    setIsLoading(true);
    try {
      if (googleMapsApiKey) {
        // Use Google Maps Geocoding API for Pincode
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${cleaned}+India&key=${googleMapsApiKey}`);
        const data = await res.json();
        if (data && data.status === 'OK' && data.results.length > 0) {
          const result = data.results[0];
          const lat = result.geometry.location.lat;
          const lng = result.geometry.location.lng;
          
          let city = 'Saved Location';
          for (let component of result.address_components) {
            if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
              city = component.long_name;
              break;
            }
          }
          saveLocation(cleaned, city, lat, lng);
        } else {
          saveLocation(cleaned, 'Saved Location');
        }
      } else {
        // Fetch city for manual pincode (Fallback)
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await res.json();
        let city = 'Saved Location';
        if (data && data[0] && data[0].Status === 'Success') {
          city = data[0].PostOffice[0].District || data[0].PostOffice[0].Name;
        }

        let lat = undefined;
        let lng = undefined;
        try {
          const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cleaned}+India&limit=1&email=admin@vyaparpe.com`);
          const nomData = await nomRes.json();
          if (nomData && nomData.length > 0) {
            lat = parseFloat(nomData[0].lat);
            lng = parseFloat(nomData[0].lon);
          }
        } catch(e) {
          console.warn("Nominatim pincode fallback failed", e);
        }

        saveLocation(cleaned, city, lat, lng);
      }
    } catch (err) {
      saveLocation(cleaned, 'Saved Location');
    }
  };

  const handleCurrentLocation = (silent = false) => {
    if (!silent) {
      setError('');
      setIsLoading(true);
    }

    if (!navigator.geolocation) {
      if (!silent) {
        setError('Geolocation is not supported by your browser');
        setIsLoading(false);
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          let foundPincode = null;
          let foundCity = null;

          if (googleMapsApiKey) {
            try {
              const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${googleMapsApiKey}`);
              const data = await res.json();
              if (data && data.status === 'OK' && data.results.length > 0) {
                const result = data.results[0];
                for (let component of result.address_components) {
                  if (component.types.includes('postal_code')) {
                    foundPincode = component.long_name;
                  }
                  if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                    if (!foundCity) foundCity = component.long_name;
                  }
                }
              }
            } catch (err) {
              console.warn("Google Geocoding failed", err);
            }
          }

          if (!foundPincode) {
            try {
              const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
              const bdcData = await bdcRes.json();
              if (bdcData && bdcData.postcode) {
                foundPincode = bdcData.postcode;
                foundCity = bdcData.locality || bdcData.city || bdcData.principalSubdivision;
              }
            } catch (err) {
              console.warn("BDC failed", err);
            }
          }

          if (!foundPincode) {
            try {
              // Use OpenStreetMap Nominatim as fallback
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&email=admin@vyaparpe.com`);
              const data = await response.json();
              if (data && data.address && data.address.postcode) {
                foundPincode = data.address.postcode;
                foundCity = data.address.city || data.address.town || data.address.state_district || data.address.county;
              }
            } catch (err) {
              console.warn("Nominatim failed", err);
            }
          }

          if (foundPincode) {
            saveLocation(foundPincode, foundCity || 'Current Location', lat, lon);
          } else {
            if (!silent) setError('Could not detect pincode from your location. Please enter manually.');
          }
        } catch (err) {
          if (!silent) setError('Failed to fetch location data');
        } finally {
          if (!silent) setIsLoading(false);
        }
      },
      (error) => {
        if (!silent) {
          let msg = 'Location permission denied or unavailable';
          if (error.code === 1) msg = 'Location access denied. Check site settings & device GPS.';
          else if (error.code === 2) msg = 'Location unavailable. Please turn on device GPS.';
          else if (error.code === 3) msg = 'Location request timed out. Please try again.';
          setError(msg);
          setIsLoading(false);
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (mounted) {
      const pinMatch = document.cookie.match(new RegExp('(^| )delivery_pincode=([^;]+)'));
      // Only auto-prompt once if location is not set and hasn't been denied in this session
      const hasPrompted = sessionStorage.getItem('location_prompted');
      if (!pinMatch && !hasPrompted) {
        sessionStorage.setItem('location_prompted', 'true');
        // Silently request location in background without showing custom popup
        handleCurrentLocation(true);
      }
    }
  }, [mounted]);



  return (
    <>
      <button 
        onClick={() => {
          setIsOpen(true);
          if (!pincode) {
            handleCurrentLocation(false);
          }
        }}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
        <div className="flex flex-col text-left max-w-[160px] sm:max-w-[200px] justify-center">
          <span className="text-[11px] sm:text-sm font-bold text-primary leading-tight truncate">
            {pincode ? (eta || 'Delivery In 3-4 Days') : 'Select Location'}
          </span>
          <span className="text-[10px] sm:text-xs text-gray-900 font-medium leading-tight truncate">
            {pincode ? `${cityName} - ${pincode}` : 'Waiting for location...'}
          </span>
        </div>
      </button>

      {isOpen && mounted && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle (Mobile Only) */}
            <div className="w-full flex justify-center pt-3 pb-2 sm:hidden cursor-pointer" onClick={() => setIsOpen(false)}>
              <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
            </div>

            <div className="px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-2xl text-gray-900 tracking-tight">Select Location</h3>
                <p className="text-sm text-gray-500 mt-1 font-medium">To see delivery options & time</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="hidden sm:flex text-gray-400 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="px-6 pb-8">
              <button 
                onClick={() => handleCurrentLocation(false)}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold py-4 px-4 rounded-2xl transition-all duration-300 mb-6 disabled:opacity-50"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
                <span className="text-[15px]">{isLoading ? 'Detecting Location...' : 'Use Current Location'}</span>
              </button>

              <div className="relative flex items-center py-2 mb-6">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">Or Enter Pincode</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <form onSubmit={handleManualSubmit}>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <input 
                      type="text" 
                      value={inputPincode}
                      onChange={(e) => setInputPincode(e.target.value)}
                      placeholder="e.g. 110001"
                      maxLength={6}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none transition text-base font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-medium"
                    />
                  </div>
                  <button type="submit" className="bg-gray-900 text-white px-6 font-bold text-[15px] rounded-2xl hover:bg-black transition-colors disabled:opacity-70" disabled={isLoading}>
                    Apply
                  </button>
                </div>
                {error && <p className="text-red-500 text-sm mt-3 text-center font-semibold">{error}</p>}
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
