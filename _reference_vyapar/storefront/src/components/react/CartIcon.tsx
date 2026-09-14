import React from 'react';
import { useStore } from '@nanostores/react';
import { cartItems, toggleCart } from '../../store/cartStore';

export default function CartIcon() {
  const $cartItems = useStore(cartItems);
  const itemCount = $cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <button
      onClick={() => toggleCart()}
      id="cart-btn"
      aria-label="View cart"
      className="relative p-2 rounded-full text-secondary hover:text-primary hover:bg-primary/5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {itemCount > 0 && (
        <span 
          className="absolute -top-1 -right-1 bg-accent-warm text-surface text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in duration-300"
        >
          {itemCount}
        </span>
      )}
    </button>
  );
}
