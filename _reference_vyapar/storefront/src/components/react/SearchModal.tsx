import React, { useState, useEffect, useRef } from 'react';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  image?: string;
  is_q_commerce_only?: boolean;
  variants: { price: number; mrp: number; weight: string }[];
}

interface SearchModalProps {
  products: Product[];
}

export default function SearchModal({ products }: SearchModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [query]);

  const results = debouncedQuery.trim().length < 2 ? [] : products.filter(p =>
    p.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  // Open on search-btn click and Cmd+K / Ctrl+K
  useEffect(() => {
    const btn = document.getElementById('search-btn');
    const handleOpen = () => setIsOpen(true);
    btn?.addEventListener('click', handleOpen);

    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      btn?.removeEventListener('click', handleOpen);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      setQuery('');
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  const formatCategory = (cat: string) => {
    if (!cat) return '';
    return cat.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <svg className="h-5 w-5 text-secondary/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products..."
            className="flex-1 text-secondary placeholder-secondary/40 outline-none text-base bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className="text-secondary/30 hover:text-secondary/60">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 text-xs text-secondary/30 border border-gray-200 rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length >= 2 && results.length === 0 && (
            <div className="py-12 text-center text-secondary/50">
              <p className="text-4xl mb-3"><svg xmlns="http://www.w3.org/2000/svg" className="inline" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></p>
              <p className="font-medium">No results for "{query}"</p>
            </div>
          )}

          {results.length > 0 && (
            <ul>
              {results.map(product => (
                <li key={product.id}>
                  <a
                    href={`/products/${product.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                      <img
                        src={product.image || `/products/${product.slug}.webp`}
                        alt={product.name}
                        className="w-full h-full object-cover mix-blend-multiply"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-secondary group-hover:text-primary transition-colors text-sm leading-tight">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-secondary/50">{formatCategory(product.category)}</p>
                        {product.is_q_commerce_only && (
                          <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                            ⚡ Q-Commerce
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-primary text-sm">₹{product.variants[0].price}</p>
                      <p className="text-xs text-secondary/40 line-through">₹{product.variants[0].mrp}</p>
                    </div>
                    <svg className="h-4 w-4 text-secondary/30 group-hover:text-primary transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {/* Empty state removed as requested */}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-secondary/40">
          <span>Press <kbd className="border border-gray-200 rounded px-1">↵</kbd> to open</span>
          <span><kbd className="border border-gray-200 rounded px-1">Ctrl+K</kbd> to search</span>
        </div>
      </div>
    </div>
  );
}
