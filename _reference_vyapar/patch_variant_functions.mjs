import { readFileSync, writeFileSync } from 'fs';

const file = 'storefront/src/pages/admin/products/edit.astro';
let code = readFileSync(file, 'utf8');

// Find the orphan "}" at line ~497 between the generate-combinations handler and createBadgeRow
// The pattern is: "  });\n\n  }\r\n\r\n  function createBadgeRow"
const orphanPattern = /(\s*else alert\('Generated ' \+ added \+ ' new combinations!'\);\s*\}\);)\s*\n\s*\}\r?\n\r?\n(\s*function createBadgeRow)/;

const createVariantRowFn = `

  function createVariantRow(weight = '', price = '', mrp = '', varId = '', images = [], stock = 0, isActive = true) {
    const id = 'var_' + (variantCount++);
    const variantNumber = variantCount;
    const escH = (s) => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const safeWeight = escH(weight), safePrice = escH(price), safeMrp = escH(mrp);
    const existingImagesHtml = (Array.isArray(images) ? images : []).map(imgSrc => '<div class="relative flex-shrink-0 group"><img src="' + escH(imgSrc) + '" class="w-14 h-14 object-cover rounded-md border-2 border-gray-300" /><button type="button" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow" onclick="this.parentElement.remove()" title="Remove image"><svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>').join('');
    const rowCls = isActive ? 'variant-row p-5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm relative group mt-4 transition-all hover:border-primary/30' : 'variant-row p-5 bg-gray-100 opacity-60 rounded-2xl border-2 border-dashed border-gray-300 shadow-sm relative group mt-4 transition-all hover:border-primary/30';
    const lblCls = isActive ? 'flex items-center gap-1 cursor-pointer text-xs font-semibold text-green-600' : 'flex items-center gap-1 cursor-pointer text-xs font-semibold text-gray-500';
    const toggleJs = "var r=document.getElementById('" + id + "');if(this.checked){r.className='variant-row p-5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm relative group mt-4 transition-all hover:border-primary/30';this.parentElement.className='flex items-center gap-1 cursor-pointer text-xs font-semibold text-green-600';this.parentElement.querySelector(\\'span\\').innerText='Enabled';}else{r.className='variant-row p-5 bg-gray-100 opacity-60 rounded-2xl border-2 border-dashed border-gray-300 shadow-sm relative group mt-4 transition-all hover:border-primary/30';this.parentElement.className='flex items-center gap-1 cursor-pointer text-xs font-semibold text-gray-500';this.parentElement.querySelector(\\'span\\').innerText='Disabled';}";
    variantsContainer?.insertAdjacentHTML('beforeend',
      '<div class="' + rowCls + '" id="' + id + '" data-variant-id="' + escH(varId) + '">' +
        '<div class="absolute -top-3 left-4 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">Variant ' + variantNumber + '</div>' +
        '<div class="absolute top-3 right-3 flex items-center gap-3">' +
          '<label class="' + lblCls + '"><input type="checkbox" class="variant-active" ' + (isActive ? 'checked' : '') + ' onchange="' + toggleJs + '" /><span>' + (isActive ? 'Enabled' : 'Disabled') + '</span></label>' +
          '<button type="button" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" onclick="document.getElementById(\\'' + id + '\\').remove()" title="Remove Variant"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>' +
        '</div>' +
        '<div class="grid grid-cols-1 md:grid-cols-4 gap-5 mt-2">' +
          '<div class="space-y-1.5"><label class="text-xs font-semibold text-secondary/70 uppercase tracking-wide">Weight / Size</label><input type="text" required value="' + safeWeight + '" class="variant-weight w-full px-3 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary outline-none transition-colors" placeholder="e.g. 100g, Large" /></div>' +
          '<div class="space-y-1.5"><label class="text-xs font-semibold text-secondary/70 uppercase tracking-wide">Selling Price (\\u20B9)</label><input type="number" required min="1" value="' + safePrice + '" class="variant-price w-full px-3 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary outline-none transition-colors" placeholder="150" /></div>' +
          '<div class="space-y-1.5"><label class="text-xs font-semibold text-secondary/70 uppercase tracking-wide">MRP (\\u20B9)</label><input type="number" required min="1" value="' + safeMrp + '" class="variant-mrp w-full px-3 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary outline-none transition-colors" placeholder="200" /></div>' +
          '<div class="space-y-1.5"><label class="text-xs font-semibold text-secondary/70 uppercase tracking-wide">Stock Quantity</label><input type="number" min="0" value="' + stock + '" class="variant-stock w-full px-3 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-lg focus:bg-white focus:border-primary outline-none transition-colors" placeholder="0" /></div>' +
        '</div>' +
        '<div class="mt-5 pt-4 border-t border-dashed border-gray-200">' +
          '<div class="flex items-center justify-between mb-3"><label class="text-xs font-semibold text-secondary/80 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Upload Images / Video</label><span class="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full tracking-wide">Auto WebP \\u2728</span></div>' +
          '<div class="flex flex-wrap items-center gap-3"><div class="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 hover:bg-primary/5 hover:border-primary/40 cursor-pointer transition-all relative flex-shrink-0 group"><svg class="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg><span class="text-[10px] font-medium text-gray-500 mt-1">Add File</span><input type="file" multiple accept="image/*,video/mp4,video/webm" class="absolute inset-0 opacity-0 cursor-pointer variant-img-upload" data-row-id="' + id + '" /></div>' +
          '<div class="flex-1 flex gap-3 overflow-x-auto pb-2 scrollbar-hide pt-2" id="preview_' + id + '">' + existingImagesHtml + '</div></div>' +
        '</div>' +
      '</div>'
    );
  }

  function createSpecRow(key = '', val = '') {
    const id = 'spec_' + (specCount++);
    specsContainer.insertAdjacentHTML('beforeend',
      '<div class="spec-row flex items-center gap-3" id="' + id + '">' +
        '<input type="text" value="' + (key||'') + '" class="spec-key flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-primary outline-none" placeholder="e.g. Shelf Life" />' +
        '<input type="text" value="' + (val||'') + '" class="spec-val flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-primary outline-none" placeholder="e.g. 12 Months" />' +
        '<button type="button" class="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors" onclick="document.getElementById(\\'' + id + '\\').remove()"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>' +
      '</div>'
    );
  }

`;

if (orphanPattern.test(code)) {
  code = code.replace(orphanPattern, '$1' + createVariantRowFn + '\n$2');
  writeFileSync(file, code, 'utf8');
  console.log('SUCCESS: Inserted createVariantRow + createSpecRow functions');
} else {
  console.log('Pattern not found. Dumping context around "new combinations"...');
  const idx = code.indexOf("new combinations!'");
  if (idx !== -1) {
    console.log(JSON.stringify(code.substring(idx, idx + 200)));
  }
}
