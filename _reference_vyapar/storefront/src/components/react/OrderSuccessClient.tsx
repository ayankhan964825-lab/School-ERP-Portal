import React, { useEffect, useState, useRef } from 'react';
import { cartItems } from '../../store/cartStore';

interface OrderItem {
  id?: string;
  product_id?: string;
  name: string;
  weight: string;
  quantity: number;
  price: number;
  image?: string;
  is_digital?: boolean;
  digital_delivery_url?: string | null;
}

interface OrderSuccessProps {
  contactPhone?: string;
}

export default function OrderSuccessClient({ contactPhone = '919876543211' }: OrderSuccessProps) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [total, setTotal] = useState(0);
  const [confettiFired, setConfettiFired] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Read saved order from localStorage (set by checkout flow)
    const savedOrder = localStorage.getItem(`vyaparpe-last-order-${window.location.hostname}`);
    let parsedItems: OrderItem[] = [];
    let parsedTotal = 0;
    let parsedMethod = '';

    let parsedIsBuyNow = false;

    if (savedOrder) {
      try {
        const o = JSON.parse(savedOrder);
        parsedItems = o.items || [];
        parsedTotal = o.total || 0;
        parsedMethod = o.paymentMethod || 'COD';
        parsedIsBuyNow = !!o.isBuyNow;
      } catch {}
    }

    // Fallback: read from current cart before clearing
    if (parsedItems.length === 0) {
      const currentCart = cartItems.get();
      parsedItems = currentCart.map(ci => ({
        id: ci.id,
        name: ci.name,
        weight: ci.weight || '',
        quantity: ci.quantity,
        price: ci.price,
        image: ci.image,
      }));
      parsedTotal = currentCart.reduce((s, i) => s + i.price * i.quantity, 0);
    }

    setItems(parsedItems);
    setTotal(parsedTotal);
    setPaymentMethod(parsedMethod || 'COD');

    // Clear cart properly ONLY if this wasn't a Buy It Now purchase
    if (!parsedIsBuyNow) {
      import('../../store/cartStore').then(({ clearCart }) => {
        clearCart();
      });
    }
    // We intentionally do NOT remove `vyaparpe-last-order-${window.location.hostname}` here.
    // In React Strict Mode (dev), useEffect runs twice, which would clear it on the 2nd run 
    // and result in 0 items being shown. It will be overwritten on the next checkout anyway.


    // Get order ID from URL — redirect home if missing (direct access guard)
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) {
      window.location.href = '/';
      return;
    }
    setOrderId(id);

    // ── dataLayer: Purchase (GTM → Meta Pixel + Google Ads) ──
    const dl = (window as any);
    dl.dataLayer = dl.dataLayer || [];
    
    // Hash function for Advanced Matching
    const sha256 = async (message: string) => {
      if (!message) return undefined;
      const msgBuffer = new TextEncoder().encode(message.trim().toLowerCase());
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    (async () => {
      let customerData: any = {};
      let hashedData: any = {};
      let plainData: any = {};
      
      try {
        if (savedOrder) {
          const o = JSON.parse(savedOrder);
          if (o.customer) customerData = o.customer;
        }
        
        if (customerData.email) {
          hashedData.em = await sha256(customerData.email);
          plainData.email = customerData.email;
        }
        if (customerData.phone) {
          hashedData.ph = await sha256(customerData.phone);
          plainData.phone_number = customerData.phone;
        }
        if (customerData.name) {
          const parts = customerData.name.split(' ');
          hashedData.fn = await sha256(parts[0]);
          if (parts.length > 1) hashedData.ln = await sha256(parts.slice(1).join(' '));
          
          plainData.first_name = parts[0];
          plainData.last_name = parts.slice(1).join(' ');
        }
        if (customerData.city) {
          hashedData.ct = await sha256(customerData.city);
          plainData.city = customerData.city;
        }
        if (customerData.state) {
          hashedData.st = await sha256(customerData.state);
          plainData.region = customerData.state;
        }
        if (customerData.pincode) {
          hashedData.zp = await sha256(customerData.pincode);
          plainData.postal_code = customerData.pincode;
        }
      } catch (e) {}

      dl.dataLayer.push({ ecommerce: null });
      dl.dataLayer.push({
        event: 'purchase',
        ecommerce: {
          transaction_id: id,
          value: parsedTotal,
          currency: 'INR',
          payment_type: parsedMethod,
          items: parsedItems.map((item, idx) => ({
            item_id: item.id || `item_${idx}`,
            item_name: item.name,
            item_variant: item.weight,
            price: item.price,
            quantity: item.quantity,
          })),
        },
        user_data: Object.keys(plainData).length > 0 ? {
          email_address: plainData.email,
          phone_number: plainData.phone_number,
          address: {
            first_name: plainData.first_name,
            last_name: plainData.last_name,
            city: plainData.city,
            region: plainData.region,
            postal_code: plainData.postal_code,
            country: 'IN'
          }
        } : undefined,
        content_ids: parsedItems.map((item) => item.id),
        content_type: 'product',
        value: parsedTotal,
        currency: 'INR',
        num_items: parsedItems.reduce((s, i) => s + i.quantity, 0),
      });

      if (typeof dl.fbq === 'function') {
        const advancedMatching = Object.keys(hashedData).length > 0 ? hashedData : undefined;
        // Optionally re-init with advanced matching
        if (advancedMatching) dl.fbq('init', dl.META_PIXEL_ID, advancedMatching);
        
        dl.fbq('track', 'Purchase', {
          value: parsedTotal,
          currency: 'INR',
          content_ids: parsedItems.map((item) => item.id),
          content_type: 'product',
          num_items: parsedItems.reduce((s, i) => s + i.quantity, 0),
        }, { eventID: id }); // Pass eventID for CAPI deduplication
      }
    })();

    // Fire confetti
    setTimeout(() => setConfettiFired(true), 300);
  }, []);

  // Confetti animation
  useEffect(() => {
    if (!confettiFired || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces: any[] = [];
    const colors = ['#4CAF50', '#FF9800', '#2196F3', '#E91E63', '#9C27B0', '#F6A623'];

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        w: Math.random() * 12 + 4,
        h: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        speed: Math.random() * 3 + 1.5,
        rotSpeed: (Math.random() - 0.5) * 6,
        opacity: 1,
      });
    }

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allDone = true;
      pieces.forEach(p => {
        p.y += p.speed;
        p.rotation += p.rotSpeed;
        if (p.y < canvas.height + 20) {
          allDone = false;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      });
      if (!allDone) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [confettiFired]);

  // ── 5-second auto-redirect countdown ──
  const [countdown, setCountdown] = useState(5);
  useEffect(() => {
    if (!orderId) return; // wait until order ID is set
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [orderId]);

  // COD check — WhatsApp button only shown for COD
  const isCOD = paymentMethod?.toLowerCase() === 'cod';

  const waMessage = encodeURIComponent(
    `Hello! I placed an order on Store Name.\nOrder ID: *${orderId}*\nPlease confirm my order. Thank you!`
  );

  const steps = [
    { icon: '📦', title: 'Order Confirmed', desc: 'We\'ve received your order and it\'s being packed.' },
    { icon: '🚚', title: 'Dispatch in 24hrs', desc: 'Your order will be dispatched within 24 working hours.' },
    { icon: '📍', title: 'Track Order', desc: 'You can track your order from the Track Order page.' },
  ];

  const digitalItems = items.filter(i => i.is_digital);
  const digitalTotal = digitalItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const generateUnifiedWhatsAppMsg = () => {
    let msg = `Hello! I placed an order with digital products:\n\n`;
    digitalItems.forEach((item, index) => {
      msg += `${index + 1}. *${item.name}*${item.weight && item.weight !== 'Default' ? ` (${item.weight})` : ''} - Qty: ${item.quantity}\n`;
    });
    msg += `\nOrder ID: *${orderId}*\nTotal to Pay for Digital Items: *₹${digitalTotal}*\n\nI want to pay and access my digital products.`;
    return encodeURIComponent(msg);
  };

  return (
    <div className="relative min-h-screen">
      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        style={{ opacity: confettiFired ? 1 : 0 }}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Success Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md ring-4 ring-green-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-serif font-bold text-secondary mb-3">Order Placed! 🎉</h1>
          <p className="text-secondary/70 text-lg mb-2">
            Thank you for choosing Store Name. Your order is confirmed!
          </p>
          <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/20 px-5 py-2.5 rounded-full mt-2">
            <span className="text-sm text-secondary/60 font-medium">Order ID:</span>
            <span className="text-lg font-mono font-bold text-primary">{orderId}</span>
          </div>

          {/* Auto-redirect countdown */}
          {orderId && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-secondary/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Redirecting to home in <strong className="text-primary">{countdown}s</strong></span>
              <button
                onClick={() => window.location.href = '/'}
                className="ml-1 text-xs text-primary underline underline-offset-2 hover:text-primary/70 transition-colors"
              >
                Go now
              </button>
            </div>
          )}
        </div>

        {/* Order Summary */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-secondary font-serif">Order Summary</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-secondary text-sm truncate">{item.name}</p>
                    <p className="text-xs text-secondary/50">{item.weight} · Qty: {item.quantity}</p>
                    
                    {item.is_digital && paymentMethod !== 'cod' && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                         {item.digital_delivery_url ? (
                           <a href={item.digital_delivery_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-lg hover:bg-primary/20 transition-colors">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                             Download / Access
                           </a>
                         ) : (
                           <a href={`https://wa.me/${contactPhone}?text=${encodeURIComponent(`Hello! I placed an order for *${item.name}*${item.weight && item.weight !== 'Default' ? ` (${item.weight})` : ''} - Qty: ${item.quantity}.\nOrder ID: *${orderId}*\nI need help accessing my digital product.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors border border-green-200">
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                             Contact on WhatsApp
                           </a>
                         )}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-bold text-secondary whitespace-nowrap">₹{item.price * item.quantity}</span>
                </div>
              ))}
              {paymentMethod === 'cod' && digitalItems.length > 0 && (
                <div className="px-5 py-4 border-t border-gray-100 bg-blue-50/50 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-blue-800 mb-3 font-medium">To access your digital products, please complete the payment directly on WhatsApp.</p>
                  <a href={`https://wa.me/${contactPhone}?text=${generateUnifiedWhatsAppMsg()}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-2.5 bg-[#25D366] text-white text-sm font-bold rounded-xl hover:bg-[#128C7E] transition-colors shadow-sm">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Pay ₹{digitalTotal} via WhatsApp
                  </a>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-primary/3">
              <div className="text-sm text-secondary/70">
                Payment: <span className="font-semibold text-secondary">{paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'razorpay' ? 'Online (Razorpay)' : paymentMethod === 'phonepe' ? 'PhonePe' : paymentMethod.toUpperCase()}</span>
              </div>
              {total > 0 && (
                <div className="text-right">
                  <p className="text-xs text-secondary/50">Total</p>
                  <p className="text-lg font-bold text-secondary">₹{total}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* What happens next */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="font-bold text-secondary font-serif">What happens next?</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <span className="text-2xl flex-shrink-0">{step.icon}</span>
                <div>
                  <p className="font-semibold text-secondary text-sm">{step.title}</p>
                  <p className="text-xs text-secondary/60 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* WhatsApp — only for COD orders */}
          {isCOD && (
            <a
              href={`https://wa.me/${contactPhone}?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors shadow-md shadow-green-500/25"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Confirm on WhatsApp
            </a>
          )}
          <a
            href={`/track-order?id=${orderId}`}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-white border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Track Order
          </a>
        </div>

        <div className="text-center">
          <a href="/products" className="text-sm text-secondary/60 hover:text-primary transition-colors underline underline-offset-2">
            Continue Shopping →
          </a>
        </div>
      </div>
    </div>
  );
}
