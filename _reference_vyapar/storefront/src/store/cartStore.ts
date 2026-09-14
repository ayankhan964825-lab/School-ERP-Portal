import { atom } from 'nanostores';

export interface CartItem {
  id: string;
  product_id?: string;
  name: string;
  price: number;
  mrp?: number;
  image: string;
  quantity: number;
  weight?: string;
  custom_data?: Record<string, string>;
  is_digital?: boolean;
  is_q_commerce_only?: boolean;
  isFlashSale?: boolean;
}

function getCartKey() {
  if (typeof window === 'undefined') return 'vyaparpe-cart';
  // Use hostname to isolate carts per tenant (Audit #10)
  return `vyaparpe-cart-${window.location.hostname}`;
}

const CART_KEY = getCartKey();
// Load initial state from localStorage (runs only in browser)
function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export const isCartOpen = atom(false);
export const cartItems = atom<CartItem[]>(loadFromStorage());

export function addCartItem(item: Omit<CartItem, 'quantity'>, quantityToAdd: number = 1) {
  const existingItems = cartItems.get();
  
  // Ensure unique ID if custom data exists so they don't stack
  let finalId = item.id;
  if (item.custom_data && Object.keys(item.custom_data).length > 0) {
    // Avoid btoa() because it crashes on Emojis/Unicode characters
    const hash = JSON.stringify(item.custom_data).replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
    finalId = item.id + '-' + hash;
  }
  const finalItem = { ...item, id: finalId };

  const existingItemIndex = existingItems.findIndex(i => i.id === finalItem.id);

  let newItems: CartItem[];
  if (existingItemIndex > -1) {
    newItems = existingItems.map((i, idx) =>
      idx === existingItemIndex ? { ...i, quantity: i.quantity + quantityToAdd } : i
    );
  } else {
    newItems = [...existingItems, { ...finalItem, quantity: quantityToAdd }];
  }

  cartItems.set(newItems);
  saveToStorage(newItems);

  // ── dataLayer: AddToCart ──
  if (typeof window !== 'undefined') {
    const dl = (window as any);
    dl.dataLayer = dl.dataLayer || [];
    dl.dataLayer.push({ ecommerce: null });
    dl.dataLayer.push({
      event: 'add_to_cart',
      event_id: `atc_${item.id}_${Date.now()}`,
      ecommerce: { currency: 'INR', value: item.price * quantityToAdd, items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: quantityToAdd, item_variant: item.weight || '' }] },
      content_ids: [item.id], content_name: item.name, content_type: 'product', value: item.price * quantityToAdd, currency: 'INR',
    });
    if (typeof dl.fbq === 'function') dl.fbq('track', 'AddToCart', { content_ids: [item.id], content_name: item.name, content_type: 'product', value: item.price * quantityToAdd, currency: 'INR' });
  }
}

export function updateCartItemQuantity(id: string, quantity: number) {
  if (quantity <= 0) {
    removeCartItem(id);
    return;
  }
  const newItems = cartItems.get().map(item =>
    item.id === id ? { ...item, quantity } : item
  );
  cartItems.set(newItems);
  saveToStorage(newItems);
}

export function removeCartItem(id: string) {
  const newItems = cartItems.get().filter(item => item.id !== id);
  cartItems.set(newItems);
  saveToStorage(newItems);
}

export function toggleCart() {
  isCartOpen.set(!isCartOpen.get());
}

export function clearCart() {
  cartItems.set([]);
  saveToStorage([]);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CART_KEY);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('cartUpdated', () => {
    cartItems.set(loadFromStorage());
  });
}

