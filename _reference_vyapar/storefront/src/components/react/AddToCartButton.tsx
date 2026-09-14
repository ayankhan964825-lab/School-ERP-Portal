import React from 'react';
import { addCartItem } from '../../store/cartStore';

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    mrp?: number;
    image: string;
    weight: string;
  };
  className?: string;
  isMobileSticky?: boolean;
}

export default function AddToCartButton({ product, className = '', isMobileSticky = false }: AddToCartButtonProps) {
  const handleAddToCart = () => {
    addCartItem({
      id: product.id,
      product_id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp || product.price,
      image: product.image,
      weight: product.weight
    });
  };

  const baseClasses = isMobileSticky 
    ? "flex-1 btn-primary add-to-cart-btn" 
    : "w-full btn-primary !py-4 text-lg justify-center shadow-lg shadow-primary/25 add-to-cart-btn";

  return (
    <button 
      onClick={handleAddToCart}
      className={`${baseClasses} ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      Add to Cart
    </button>
  );
}
