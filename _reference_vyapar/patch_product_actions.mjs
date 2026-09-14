import fs from 'fs';

const code = `import React, { useState, useEffect, useMemo } from 'react';
import { addCartItem, isCartOpen } from '../../store/cartStore';

interface Variant {
  id: string;
  weight?: string;
  variant_name?: string;
  price: number;
  mrp: number;
  stock?: number;
  is_out_of_stock?: boolean;
  images?: string[];
}

interface VariantOption {
  name: string;
  values: string[];
}

interface Product {
  id: string;
  name: string;
  slug: string;
  image?: string;
  track_inventory?: boolean;
  variant_options?: VariantOption[];
  variants: Variant[];
}

interface ProductActionsProps {
  product: Product;
  globalTracking?: boolean;
}

export default function ProductActions({ product, globalTracking = true }: ProductActionsProps) {
  const isGlobalTrackingEnabled = globalTracking !== false;

  const parsedOptions = useMemo(() => {
    if (product.variant_options && product.variant_options.length > 0) {
      return product.variant_options;
    }
    // Fallback for old products
    return [{
      name: 'Variant',
      values: product.variants.map(v => v.weight || v.variant_name || 'Default').filter((v, i, a) => a.indexOf(v) === i)
    }];
  }, [product.variant_options, product.variants]);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    parsedOptions.forEach(opt => {
      initial[opt.name] = opt.values[0];
    });
    return initial;
  });

  const [quantity, setQuantity] = useState(1);

  const selectedVariantString = parsedOptions.map(opt => selectedOptions[opt.name]).join(' / ');
  
  const selectedVariant = useMemo(() => {
    return product.variants.find(v => (v.weight || v.variant_name || 'Default') === selectedVariantString);
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
      : [product.image || \`/products/\${product.slug}.webp\`];

    const desktopGallery = document.getElementById('desktop-gallery');
    if (desktopGallery) {
      desktopGallery.innerHTML = newImages.map((img, i) => \`
        <div class="aspect-[4/5] bg-background-alt rounded-2xl overflow-hidden border border-background-alt relative gallery-item">
          <img src="\${img}" alt="\${product.name} \${i+1}" class="w-full h-full object-cover absolute inset-0 desktop-gallery-img" />
        </div>
      \`).join('');
    }

    const mobileCarousel = document.getElementById('mobile-carousel');
    if (mobileCarousel) {
      mobileCarousel.innerHTML = newImages.map((img, i) => \`
        <div class="min-w-full snap-center bg-background-alt aspect-square relative mobile-gallery-item">
          <img src="\${img}" alt="\${product.name} \${i+1}" class="w-full h-full object-cover absolute inset-0 mobile-gallery-img" />
        </div>
      \`).join('');
    }

    const dots = document.getElementById('carousel-dots');
    if (dots) {
      dots.innerHTML = newImages.map((_, i) => \`
        <span class="w-2 h-2 rounded-full transition-all duration-300 \${i===0?'bg-primary':'bg-primary/20'}"></span>
      \`).join('');
    }

  }, [displayVariant, product.slug, product.image, product.name, selectedVariantString]);

  const discount = Math.round(((displayVariant.mrp - displayVariant.price) / displayVariant.mrp) * 100);

  const isCombinationUnavailable = !selectedVariant;
  const computedOutOfStock = isCombinationUnavailable || displayVariant.is_out_of_stock || (isGlobalTrackingEnabled && product.track_inventory && (displayVariant.stock || 0) <= 0);

  const handleAddToCart = (openCart = true) => {
    if (computedOutOfStock || !selectedVariant) return;
    
    addCartItem({
      id: \`\${product.id}-\${selectedVariant.id}\`,
      name: product.name,
      price: selectedVariant.price,
      mrp: selectedVariant.mrp || selectedVariant.price,
      image: selectedVariant.images?.[0] || product.image || \`/products/\${product.slug}.webp\`,
      weight: selectedVariantString
    }, quantity);
    
    if (openCart) {
      isCartOpen.set(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Price & Badge */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-secondary">
            ₹{displayVariant.price}
          </span>
          <span className="text-xl text-secondary/40 line-through font-medium">
            ₹{displayVariant.mrp}
          </span>
        </div>
        {!isNaN(discount) && discount > 0 && (
          <span className="bg-accent-orange/10 text-accent-orange px-3 py-1 rounded-full text-sm font-bold tracking-wide">
            {discount}% OFF
          </span>
        )}
        {computedOutOfStock && (
          <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold tracking-wide">
            {isCombinationUnavailable ? 'UNAVAILABLE' : 'OUT OF STOCK'}
          </span>
        )}
      </div>

      {/* Multi-Dimensional Variant Selection */}
      <div className="mb-10 space-y-6">
        {parsedOptions.map((opt) => {
          const isColor = opt.name.startsWith('@Color');
          const isImage = opt.name.startsWith('@Image');
          const cleanName = opt.name.replace(/^@/, '');
          
          return (
            <div key={opt.name}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-secondary">{cleanName}</h3>
                <span className="text-sm font-medium text-secondary/60">
                  {selectedOptions[opt.name]} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {opt.values.map((val) => {
                  const isSelected = selectedOptions[opt.name] === val;
                  
                  // For Color/Image, we could check if there is an image in the corresponding variant
                  // Here we just render a color swatch if it's a valid hex/color name
                  if (isColor) {
                    return (
                      <button
                        key={val}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.name]: val }))}
                        title={val}
                        className={\`relative w-10 h-10 rounded-full border-2 transition-all duration-200 \${
                          isSelected ? 'border-primary scale-110 shadow-md' : 'border-gray-200 hover:border-gray-400'
                        }\`}
                        style={{ backgroundColor: val }}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 bg-white/30 rounded-full"></div>
                          </div>
                        )}
                      </button>
                    );
                  }

                  if (isImage) {
                     // Try to find the image for this value
                     // We look for a variant that HAS this value and HAS images
                     let swatchImg = \`/placeholder-product.webp\`;
                     const vMatch = product.variants.find(v => (v.weight || v.variant_name || '').includes(val) && v.images && v.images.length > 0);
                     if (vMatch && vMatch.images) swatchImg = vMatch.images[0];

                     return (
                      <button
                        key={val}
                        onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.name]: val }))}
                        title={val}
                        className={\`relative w-14 h-14 rounded-xl border-2 overflow-hidden transition-all duration-200 \${
                          isSelected ? 'border-primary shadow-md' : 'border-transparent hover:border-gray-300'
                        }\`}
                      >
                        <img src={swatchImg} alt={val} className="w-full h-full object-cover" />
                      </button>
                     );
                  }

                  // Default text button
                  return (
                    <button
                      key={val}
                      onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.name]: val }))}
                      className={\`relative px-5 py-2.5 rounded-xl border-2 font-medium transition-all duration-200 \${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-background-alt text-secondary hover:border-primary/50'
                      }\`}
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

      {/* Actions (Responsive, Inline) */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10 mt-4">
        <div className="flex items-center border-2 border-background-alt rounded-xl bg-white w-full sm:w-auto justify-between sm:justify-start">
          <button 
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-6 py-4 text-secondary hover:text-primary transition-colors disabled:opacity-50 text-xl"
            disabled={computedOutOfStock}
          >
            −
          </button>
          <span className="w-12 text-center font-bold text-secondary text-lg">
            {quantity}
          </span>
          <button 
            onClick={() => {
              if (product.track_inventory && quantity >= (displayVariant.stock || 0)) return;
              setQuantity(quantity + 1);
            }}
            className="px-6 py-4 text-secondary hover:text-primary transition-colors disabled:opacity-50 text-xl"
            disabled={computedOutOfStock || (product.track_inventory && quantity >= (displayVariant.stock || 0))}
          >
            +
          </button>
        </div>
        
        <div className="flex flex-col sm:hidden items-center justify-center py-2">
          <span className="text-sm text-secondary/60 font-medium">Total Price</span>
          <span className="text-xl font-bold text-secondary">₹{displayVariant.price * quantity}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full flex-1">
          <button 
            onClick={() => handleAddToCart(true)}
            disabled={computedOutOfStock}
            className="flex-1 btn-secondary bg-white border-2 border-primary text-primary hover:bg-primary/5 text-lg !py-4 !rounded-xl disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {isCombinationUnavailable ? 'Unavailable' : (computedOutOfStock ? 'Out of Stock' : 'Add to Cart')}
          </button>
          
          <button 
            onClick={() => {
              if (!selectedVariant) return;
              sessionStorage.setItem('buy-now-item', JSON.stringify({
                id: \`\${product.id}-\${selectedVariant.id}\`,
                name: product.name,
                price: selectedVariant.price,
                image: \`/products/\${product.slug}.webp\`,
                weight: selectedVariantString,
                quantity: quantity
              }));
              window.location.href = '/checkout?buyNow=true';
            }}
            disabled={computedOutOfStock}
            className="flex-1 btn-primary text-lg !py-4 !rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {isCombinationUnavailable ? 'Unavailable' : (computedOutOfStock ? 'Out of Stock' : \`Buy It Now - ₹\${displayVariant.price * quantity}\`)}
          </button>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('storefront/src/components/react/ProductActions.tsx', code);
