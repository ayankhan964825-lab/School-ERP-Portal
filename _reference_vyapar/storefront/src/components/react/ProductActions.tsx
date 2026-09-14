import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@nanostores/react';
import { addCartItem, isCartOpen } from '../../store/cartStore';

interface Variant {
  id: string;
  name?: string;
  weight?: string;
  variant_name?: string;
  price: number;
  mrp: number;
  stock?: number;
  is_out_of_stock?: boolean;
  images?: string[];
  isFlashSale?: boolean;
}

interface VariantOption {
  name: string;
  values: string[];
}

interface CustomInput {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'file';
  required: boolean;
  options?: string[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  image?: string;
  track_inventory?: boolean;
  variant_options?: VariantOption[];
  custom_inputs?: CustomInput[];
  variants: Variant[];
  is_q_commerce_only?: boolean;
  isFlashSale?: boolean;
}

interface ProductActionsProps {
  product: Product;
  globalTracking?: boolean;
}

export default function ProductActions({ product, globalTracking = true }: ProductActionsProps) {
  const isGlobalTrackingEnabled = globalTracking !== false;

  const hasVariantOptions = product.variant_options && product.variant_options.length > 0;

  const parsedOptions = useMemo(() => {
    if (hasVariantOptions) {
      return product.variant_options!;
    }
    // Fallback for old products
    const safeVariants = product.variants || [];
    return [{
      name: 'Options',
      values: safeVariants.length > 0 ? safeVariants.map(v => v.weight || v.variant_name || v.name || 'Default').filter((v, i, a) => a.indexOf(v) === i) : ['Default']
    }];
  }, [product.variant_options, product.variants, hasVariantOptions]);

  // Build structured attribute maps from variant strings for O(1) compatibility lookups
  const variantAttrMaps = useMemo(() => {
    return product.variants.map(v => {
      const parts = hasVariantOptions
        ? (v.weight || v.variant_name || v.name || 'Default').split(' / ')
        : [v.weight || v.variant_name || v.name || 'Default'];
      const attrs: Record<string, string> = {};
      parsedOptions.forEach((opt, i) => {
        attrs[opt.name] = parts[i] !== undefined ? parts[i] : (parts[0] || 'Default');
      });
      return { variant: v, attrs };
    });
  }, [product.variants, parsedOptions, hasVariantOptions]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    // Init from first variant's parsed values for guaranteed valid initial state
    const firstVariant = product.variants[0];
    const firstParts = hasVariantOptions
      ? (firstVariant?.weight || firstVariant?.variant_name || firstVariant?.name || 'Default').split(' / ')
      : [firstVariant?.weight || firstVariant?.variant_name || firstVariant?.name || 'Default'];
    const initial: Record<string, string> = {};
    parsedOptions.forEach((opt, i) => {
      initial[opt.name] = firstParts[i] !== undefined ? firstParts[i] : (opt.values[0] || 'Default');
    });
    return initial;
  });

  const [quantity, setQuantity] = useState(1);
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const $isCartOpen = useStore(isCartOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Compatibility map: for each option value, is it compatible with current selections in other groups?
  const compatibilityMap = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {};
    parsedOptions.forEach(opt => {
      map[opt.name] = {};
      opt.values.forEach(val => {
        map[opt.name][val] = variantAttrMaps.some(({ attrs }) => {
          if (attrs[opt.name] !== val) return false;
          return parsedOptions.every(other => {
            if (other.name === opt.name) return true;
            return attrs[other.name] === selectedOptions[other.name];
          });
        });
      });
    });
    return map;
  }, [variantAttrMaps, parsedOptions, selectedOptions]);

  // Smart option selection: click any button (even faded) and auto-fix conflicts
  const handleOptionSelect = (optionName: string, value: string) => {
    const newSelections = { ...selectedOptions, [optionName]: value };

    // If direct combination is valid, just select it
    const isDirectlyValid = variantAttrMaps.some(({ attrs }) =>
      parsedOptions.every(opt => attrs[opt.name] === newSelections[opt.name])
    );

    if (isDirectlyValid) {
      setSelectedOptions(newSelections);
      return;
    }

    // Auto-fix: resolve each other group sequentially to find nearest valid combo
    const fixedSelections: Record<string, string> = { [optionName]: value };

    for (const opt of parsedOptions) {
      if (opt.name === optionName) continue;

      // Check if the user's current value for this group still works
      const candidate = { ...fixedSelections, [opt.name]: newSelections[opt.name] };
      const isCurrentValid = variantAttrMaps.some(({ attrs }) =>
        Object.entries(candidate).every(([k, v]) => attrs[k] === v)
      );

      if (isCurrentValid) {
        fixedSelections[opt.name] = newSelections[opt.name];
      } else {
        // Fallback to first compatible value in this group
        const fallback = opt.values.find(v => {
          const test = { ...fixedSelections, [opt.name]: v };
          return variantAttrMaps.some(({ attrs }) =>
            Object.entries(test).every(([k, val]) => attrs[k] === val)
          );
        });
        fixedSelections[opt.name] = fallback || opt.values[0];
      }
    }

    setSelectedOptions(fixedSelections);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [fieldId]: 'File exceeds 5MB limit.' }));
      return;
    }

    setUploadingFiles(prev => ({ ...prev, [fieldId]: true }));
    setErrors(prev => ({ ...prev, [fieldId]: '' }));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/store/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setCustomData(prev => ({ ...prev, [fieldId]: data.url }));
      } else {
        setErrors(prev => ({ ...prev, [fieldId]: data.error || 'Upload failed' }));
      }
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [fieldId]: err.message || 'Upload failed' }));
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  const selectedVariantString = parsedOptions.map(opt => selectedOptions[opt.name]).join(' / ');
  
  const selectedVariant = useMemo(() => {
    return product.variants.find(v => (v.weight || v.variant_name || v.name || 'Default') === selectedVariantString);
  }, [product.variants, selectedVariantString]);

  // Use the first variant as a fallback for price/image if the selected combination is unavailable
  const displayVariant = selectedVariant || product.variants[0];

  useEffect(() => {
    const weightEl = document.getElementById('pdp-info-weight');
    if (weightEl) {
      weightEl.textContent = selectedVariantString;
    }

    // Update gallery dynamically
    const newImages = (displayVariant.images && displayVariant.images.length > 0)
      ? displayVariant.images
      : [product.image || `/products/${product.slug}.webp`];

    const desktopGallery = document.getElementById('desktop-gallery');
    if (desktopGallery) {
      desktopGallery.innerHTML = newImages.map((img, i) => `
        <div class="aspect-[4/5] bg-background-alt rounded-2xl overflow-hidden border border-background-alt relative gallery-item">
          <img src="${img}" alt="${product.name} ${i+1}" class="w-full h-full object-cover absolute inset-0 desktop-gallery-img" />
        </div>
      `).join('');
    }

    const mobileCarousel = document.getElementById('mobile-carousel');
    if (mobileCarousel) {
      mobileCarousel.innerHTML = newImages.map((img, i) => `
        <div class="min-w-[85vw] sm:min-w-full snap-center snap-always bg-background-alt aspect-square relative mobile-gallery-item rounded-xl sm:rounded-none overflow-hidden border border-gray-100 sm:border-none">
          <img src="${img}" alt="${product.name} ${i+1}" class="w-full h-full object-cover absolute inset-0 mobile-gallery-img" />
        </div>
      `).join('');
      // Reset scroll position to the first image when switching variants
      mobileCarousel.scrollLeft = 0;
    }

    const dots = document.getElementById('carousel-dots');
    if (dots) {
      dots.innerHTML = newImages.map((_, i) => `
        <span class="w-2 h-2 rounded-full transition-all duration-300 ${i===0?'bg-primary':'bg-primary/20'}"></span>
      `).join('');
    }

    // Attach IntersectionObserver for mobile carousel dots
    let observer: IntersectionObserver | null = null;
    if (mobileCarousel && dots) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = Array.from(mobileCarousel.children).indexOf(entry.target);
            if (index !== -1 && dots.children[index]) {
              Array.from(dots.children).forEach((dot, i) => {
                if (i === index) {
                  dot.classList.add('bg-primary');
                  dot.classList.remove('bg-primary/20');
                } else {
                  dot.classList.remove('bg-primary');
                  dot.classList.add('bg-primary/20');
                }
              });
            }
          }
        });
      }, { root: mobileCarousel, threshold: 0.5 });
      
      Array.from(mobileCarousel.children).forEach(child => observer.observe(child));
    }

    // Attach Share Button listener
    const shareBtn = document.getElementById('share-btn');
    const handleShareClick = (e: Event) => {
      e.preventDefault();
      const productUrl = window.location.origin + '/products/' + product.slug;
      if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
        navigator.share({
          title: product.name,
          text: `Check out ${product.name}!`,
          url: productUrl
        }).catch((err) => {
          if (err.name !== 'AbortError') {
             const modal = document.getElementById('share-modal');
             if (modal) {
               modal.classList.remove('hidden');
               document.body.style.overflow = 'hidden';
               setTimeout(() => document.getElementById('share-sheet')?.classList.remove('translate-y-full'), 10);
             }
          }
        });
      } else {
        const modal = document.getElementById('share-modal');
        if (modal) {
          modal.classList.remove('hidden');
          document.body.style.overflow = 'hidden';
          setTimeout(() => document.getElementById('share-sheet')?.classList.remove('translate-y-full'), 10);
        }
      }
    };

    if (shareBtn) {
      shareBtn.addEventListener('click', handleShareClick);
    }

    return () => {
      if (observer) observer.disconnect();
      if (shareBtn) shareBtn.removeEventListener('click', handleShareClick);
    };

  }, [displayVariant, product.slug, product.image, product.name, selectedVariantString]);

  const discount = Math.round(((displayVariant.mrp - displayVariant.price) / displayVariant.mrp) * 100);

  const isCombinationUnavailable = !selectedVariant;
  const computedOutOfStock = isCombinationUnavailable || displayVariant.is_out_of_stock || (isGlobalTrackingEnabled && product.track_inventory && (displayVariant.stock || 0) <= 0);

  const handleAddToCart = (openCart = true) => {
    if (computedOutOfStock || !selectedVariant) return;

    let hasError = false;
    const newErrors: Record<string, string> = {};
    if (product.custom_inputs) {
      for (const field of product.custom_inputs) {
        if (field.required && !customData[field.id]) {
          newErrors[field.id] = 'This field is required.';
          hasError = true;
        }
      }
    }
    
    if (hasError) {
      setErrors(newErrors);
      return;
    }

    const mappedCustomData: Record<string, string> = {};
    if (product.custom_inputs) {
      product.custom_inputs.forEach(field => {
        if (customData[field.id]) {
          mappedCustomData[field.label] = customData[field.id];
        }
      });
    } else {
      Object.assign(mappedCustomData, customData);
    }
    
    addCartItem({
      id: (selectedVariant && selectedVariant.id !== 'default') ? `${product.id}-${selectedVariant.id}` : product.id,
      product_id: product.id,
      name: product.name,
      price: selectedVariant ? selectedVariant.price : (product.variants?.[0]?.price || 0),
      mrp: selectedVariant ? (selectedVariant.mrp || selectedVariant.price) : (product.variants?.[0]?.mrp || 0),
      image: selectedVariant?.images?.[0] || product.image || `/products/${product.slug}.webp`,
      weight: selectedVariantString,
      isFlashSale: selectedVariant ? !!selectedVariant.isFlashSale : !!product.variants?.[0]?.isFlashSale,
      is_q_commerce_only: product.is_q_commerce_only,
      custom_data: Object.keys(mappedCustomData).length > 0 ? mappedCustomData : undefined
    }, quantity);
    
    if (openCart) {
      isCartOpen.set(true);
    }
  };

  const handleBuyNow = () => {
    if (computedOutOfStock || !selectedVariant) return;

    let hasError = false;
    const newErrors: Record<string, string> = {};
    if (product.custom_inputs) {
      for (const field of product.custom_inputs) {
        if (field.required && !customData[field.id]) {
          newErrors[field.id] = 'This field is required.';
          hasError = true;
        }
      }
    }
    
    if (hasError) {
      setErrors(newErrors);
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    const mappedCustomData: Record<string, string> = {};
    if (product.custom_inputs) {
      product.custom_inputs.forEach(field => {
        if (customData[field.id]) {
          mappedCustomData[field.label] = customData[field.id];
        }
      });
    } else {
      Object.assign(mappedCustomData, customData);
    }

    sessionStorage.setItem('buy-now-item', JSON.stringify({
      id: (selectedVariant && selectedVariant.id !== 'default') ? `${product.id}-${selectedVariant.id}` : product.id,
      product_id: product.id,
      name: product.name,
      price: selectedVariant ? selectedVariant.price : (product.variants?.[0]?.price || 0),
      mrp: selectedVariant ? (selectedVariant.mrp || selectedVariant.price) : (product.variants?.[0]?.mrp || 0),
      image: selectedVariant?.images?.[0] || product.image || `/products/${product.slug}.webp`,
      weight: selectedVariantString,
      quantity: quantity,
      isFlashSale: selectedVariant ? !!selectedVariant.isFlashSale : !!product.variants?.[0]?.isFlashSale,
      is_q_commerce_only: product.is_q_commerce_only,
      custom_data: Object.keys(mappedCustomData).length > 0 ? mappedCustomData : undefined
    }));
    window.location.href = '/checkout?buyNow=true';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Price & Badge */}
      <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8">
        <div className="flex items-baseline gap-1.5 md:gap-2">
          <span className="text-2xl md:text-4xl font-bold text-secondary">
            ₹{displayVariant.price}
          </span>
          <span className="text-sm md:text-xl text-secondary/40 line-through font-medium">
            ₹{displayVariant.mrp}
          </span>
        </div>
        {!isNaN(discount) && discount > 0 && (
          <span className="bg-accent-orange/10 text-accent-orange px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-bold tracking-wide">
            {discount}% OFF
          </span>
        )}
        {computedOutOfStock && !isCombinationUnavailable && (
          <span className="bg-red-100 text-red-600 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-bold tracking-wide">
            OUT OF STOCK
          </span>
        )}
      </div>

      {/* Multi-Dimensional Variant Selection */}
      <div className="mb-6 md:mb-10 space-y-4 md:space-y-6">
        {parsedOptions.map((opt, groupIndex) => {
          const isColor = opt.name.startsWith('@Color');
          const isImage = opt.name.startsWith('@Image');
          const cleanName = opt.name.replace(/^@/, '');
          
          return (
            <div key={opt.name || `opt-${groupIndex}`}>
              {cleanName && (
                <div className="flex justify-between items-center mb-2 md:mb-3">
                  <h3 className="font-semibold text-sm md:text-base text-secondary">{cleanName}</h3>
                  <span className="text-xs md:text-sm font-medium text-secondary/60">
                    {selectedOptions[opt.name]} selected
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-2 md:gap-3">
                {opt.values.map((val) => {
                  const isSelected = selectedOptions[opt.name] === val;
                  const isCompatible = compatibilityMap[opt.name]?.[val] !== false;
                  
                  if (isColor) {
                    return (
                      <button
                        key={val}
                        onClick={() => handleOptionSelect(opt.name, val)}
                        title={val}
                        className={`relative w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all duration-200 ${
                          isSelected 
                            ? 'border-primary scale-110 shadow-md' 
                            : isCompatible
                              ? 'border-gray-200 hover:border-gray-400'
                              : 'border-gray-200 opacity-40'
                        }`}
                        style={{ backgroundColor: val }}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 md:w-4 md:h-4 bg-white/30 rounded-full"></div>
                          </div>
                        )}
                      </button>
                    );
                  }

                  if (isImage) {
                     // Try to find the image for this value
                     // We look for a variant that HAS this value and HAS images
                     let swatchImg = `/placeholder-product.webp`;
                     const vMatch = product.variants.find(v => (v.weight || v.variant_name || v.name || '').includes(val) && v.images && v.images.length > 0);
                     if (vMatch && vMatch.images) swatchImg = vMatch.images[0];

                     return (
                      <button
                        key={val}
                        onClick={() => handleOptionSelect(opt.name, val)}
                        title={val}
                        className={`relative w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                          isSelected 
                            ? 'border-primary shadow-md' 
                            : isCompatible
                              ? 'border-transparent hover:border-gray-300'
                              : 'border-transparent opacity-70 hover:border-gray-200 border-dashed'
                        }`}
                      >
                        <img src={swatchImg} alt={val} className="w-full h-full object-cover" />
                      </button>
                     );
                  }

                  // Default text button
                  return (
                    <button
                      key={val}
                      onClick={() => handleOptionSelect(opt.name, val)}
                      className={`relative px-4 py-2 md:px-5 md:py-2.5 rounded-xl border-2 font-medium text-xs md:text-base transition-all duration-200 ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : isCompatible
                            ? 'border-background-alt text-secondary hover:border-primary/50'
                            : 'border-gray-200 text-secondary/60 hover:border-primary/30 border-dashed'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custom Inputs UI */}
      {product.custom_inputs && product.custom_inputs.length > 0 && (
        <div className="mb-8 space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <h3 className="font-semibold text-secondary">Customize Your Order</h3>
          {product.custom_inputs.map(field => (
            <div key={field.id} className="space-y-1">
              <label className="text-sm font-medium text-secondary">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              
              {field.type === 'text' && (
                <input 
                  type="text" 
                  className={`w-full px-4 py-2 border rounded-lg focus:border-primary outline-none ${errors[field.id] ? 'border-red-500' : 'border-gray-200'}`}
                  value={customData[field.id] || ''}
                  onChange={(e) => setCustomData(prev => ({ ...prev, [field.id]: e.target.value }))}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              )}
              
              {field.type === 'textarea' && (
                <textarea 
                  className={`w-full px-4 py-2 border rounded-lg focus:border-primary outline-none resize-none ${errors[field.id] ? 'border-red-500' : 'border-gray-200'}`}
                  rows={3}
                  value={customData[field.id] || ''}
                  onChange={(e) => setCustomData(prev => ({ ...prev, [field.id]: e.target.value }))}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                />
              )}

              {field.type === 'select' && field.options && (
                <select 
                  className={`w-full px-4 py-2 border rounded-lg focus:border-primary outline-none bg-white ${errors[field.id] ? 'border-red-500' : 'border-gray-200'}`}
                  value={customData[field.id] || ''}
                  onChange={(e) => setCustomData(prev => ({ ...prev, [field.id]: e.target.value }))}
                >
                  <option value="" disabled>Select {field.label}</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.type === 'file' && (
                <div className="relative">
                  {customData[field.id] ? (
                    <div className="flex flex-col gap-2 bg-green-50/50 border border-green-200 p-3 rounded-xl">
                      <div className="flex items-center justify-between">
                         <span className="text-sm font-medium text-green-800 flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            File Uploaded
                         </span>
                         <button 
                           onClick={() => setCustomData(prev => { const n={...prev}; delete n[field.id]; return n; })} 
                           className="text-xs font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-3 py-1 rounded-lg transition-colors shadow-sm"
                         >
                           Remove & Replace
                         </button>
                      </div>
                      {customData[field.id].match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                        <div className="mt-1 relative w-20 h-20 rounded-lg overflow-hidden border border-green-200/50 bg-white">
                           <img src={customData[field.id]} alt="Uploaded preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <a href={customData[field.id]} target="_blank" className="text-xs text-primary underline truncate max-w-full block">View Uploaded File</a>
                      )}
                    </div>
                  ) : (
                    <input 
                      type="file" 
                      className={`w-full px-4 py-2 border rounded-lg focus:border-primary outline-none bg-white ${errors[field.id] ? 'border-red-500' : 'border-gray-200'}`}
                      onChange={(e) => handleFileUpload(e, field.id)}
                      disabled={uploadingFiles[field.id]}
                    />
                  )}
                  {uploadingFiles[field.id] && <p className="text-xs text-primary mt-1 animate-pulse">Uploading file...</p>}
                </div>
              )}

              {errors[field.id] && <p className="text-xs text-red-500 mt-1">{errors[field.id]}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Desktop Inline Actions */}
      <div className="hidden sm:flex flex-col gap-4 mb-10 mt-4">
        {/* Quantity */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-secondary">Quantity:</span>
          <div className="flex items-center border border-gray-200 rounded-lg bg-white h-9">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 h-full text-secondary hover:text-primary transition-colors disabled:opacity-50 text-lg"
              disabled={computedOutOfStock}
            >
              −
            </button>
            <span className="w-8 text-center font-bold text-secondary text-sm">
              {quantity}
            </span>
            <button 
              onClick={() => {
                if (product.track_inventory && quantity >= (displayVariant.stock || 0)) return;
                setQuantity(quantity + 1);
              }}
              className="px-3 h-full text-secondary hover:text-primary transition-colors disabled:opacity-50 text-lg"
              disabled={computedOutOfStock || (product.track_inventory && quantity >= (displayVariant.stock || 0))}
            >
              +
            </button>
          </div>
        </div>

        {/* Buttons (Side by Side) */}
        <div className="flex flex-row gap-3 w-full">
          <button 
            onClick={() => handleAddToCart(true)}
            disabled={computedOutOfStock}
            className="flex-1 btn-secondary bg-white border border-primary text-primary hover:bg-primary/5 text-base py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm"
          >
            {computedOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
          
          <button 
            onClick={handleBuyNow}
            disabled={computedOutOfStock}
            className="flex-1 btn-primary text-white text-base py-3.5 rounded-xl shadow-md shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            {computedOutOfStock ? 'Out of Stock' : 'Buy Now'}
          </button>
        </div>
      </div>

      {/* Mobile Fixed Actions */}
      {mounted && typeof document !== 'undefined' && !$isCartOpen && createPortal(
        <div className="flex sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3 flex-row items-center gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.12)]" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          
          {/* Mobile Quantity */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-gray-200 rounded-lg bg-white h-11">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 h-full text-secondary hover:text-primary transition-colors disabled:opacity-50 text-xl"
                disabled={computedOutOfStock}
              >
                −
              </button>
              <span className="w-6 text-center font-bold text-secondary text-sm">
                {quantity}
              </span>
              <button 
                onClick={() => {
                  if (product.track_inventory && quantity >= (displayVariant.stock || 0)) return;
                  setQuantity(quantity + 1);
                }}
                className="px-3 h-full text-secondary hover:text-primary transition-colors disabled:opacity-50 text-xl"
                disabled={computedOutOfStock || (product.track_inventory && quantity >= (displayVariant.stock || 0))}
              >
                +
              </button>
            </div>
          </div>

          {/* Mobile Buttons */}
          <div className="flex flex-row gap-2 w-full flex-1">
            <button 
              onClick={() => handleAddToCart(true)}
              disabled={computedOutOfStock}
              className="flex-1 btn-secondary bg-white border border-primary text-primary hover:bg-primary/5 text-[12px] py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-sm px-1"
            >
              {computedOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            
            <button 
              onClick={handleBuyNow}
              disabled={computedOutOfStock}
              className="flex-1 btn-primary text-white text-[12px] py-3 rounded-xl shadow-md shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed font-bold px-1"
            >
              {computedOutOfStock ? 'Out of Stock' : 'Buy Now'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
