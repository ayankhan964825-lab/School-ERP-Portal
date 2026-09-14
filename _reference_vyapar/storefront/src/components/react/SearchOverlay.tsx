import React, { useState, useEffect, useRef } from 'react';

// We'll fetch catalog data from a static JSON endpoint
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  image?: string;
  variants: { id: string; weight: string; price: number; mrp: number }[];
  is_q_commerce_only?: boolean;
}

export default function SearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load catalog data
    fetch('/api/products')
      .then(r => r.json())
      .then(data => setAllProducts(data))
      .catch(() => {});

    // Listen for search button click
    const btn = document.getElementById('search-btn');
    btn?.addEventListener('click', () => setIsOpen(true));

    // Keyboard shortcut: Ctrl+K or Cmd+K
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400); // 400ms debounce
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    const q = debouncedQuery.toLowerCase();
    const filtered = allProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
    setResults(filtered.slice(0, 8));
  }, [debouncedQuery, allProducts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setIsOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Search Panel */}
      <div
        className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="flex-1 text-lg outline-none bg-transparent text-secondary placeholder-secondary/40"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-mono text-secondary/40 bg-gray-100 rounded border border-gray-200">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain pb-4">
          {!query.trim() && (
            <div className="px-5 py-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Trending Searches</h3>
              <div className="flex flex-wrap gap-2">
                {['Milk', 'Bread', 'Eggs', 'Chips', 'Cold Drink', 'Atta', 'Chocolate'].map(term => (
                  <button 
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-600 text-sm font-medium rounded-full transition-colors border border-transparent hover:border-rose-100"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {query.trim() && results.length === 0 && (
            <div className="px-5 py-8 text-center text-secondary/50 text-sm">
              No products found for "{query}"
            </div>
          )}

          {results.map(product => (
            <a
              key={product.id}
              href={`/products/${product.slug}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={product.image || `/products/${product.slug}.webp`}
                  alt={product.name}
                  className="w-full h-full object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-product.webp'; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-secondary text-sm truncate">{product.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="text-xs text-secondary/50 capitalize">{product.category} · From ₹{product.variants[0]?.price}</div>
                  {product.is_q_commerce_only && (
                    <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                      ⚡ Q-Commerce
                    </span>
                  )}
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-secondary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>

        {/* Footer hint */}
        {!query.trim() && (
          <div className="px-5 py-4 bg-gray-50 text-xs text-secondary/40 flex items-center justify-between">
            <span>Type to search products, categories...</span>
            <span className="hidden sm:inline">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Ctrl</kbd>
              <span className="mx-0.5">+</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">K</kbd>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
