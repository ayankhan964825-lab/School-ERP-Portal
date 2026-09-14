import fs from 'fs';
let code = fs.readFileSync('storefront/src/pages/admin/products/edit.astro', 'utf8');

// Replace HTML
const htmlOld = `<!-- ── VARIANTS & PRICING ── -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-lg font-bold text-secondary">Variants & Pricing</h2>
            <p class="text-sm text-secondary/60">Alag weights/sizes aur unki prices daalo.</p>
          </div>
          <button type="button" id="add-variant-btn" class="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Variant
          </button>
        </div>
        <div id="variants-container" class="space-y-4"></div>
      </div>`;

const htmlNew = `<!-- ── MULTI-DIMENSIONAL VARIANTS ── -->
      <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100" id="md-variant-builder">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 class="text-lg font-bold text-secondary">Variant Options (Multi-Dimensional)</h2>
            <p class="text-sm text-secondary/60">E.g. Group: "Size" → Values: "S, M, L". Use "@Color" or "@Image" to enable swatches.</p>
          </div>
          <button type="button" id="add-vgroup-btn" class="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Option Group
          </button>
        </div>
        <div id="vgroups-container" class="space-y-3 mb-6"></div>
        <button type="button" id="generate-combinations-btn" class="w-full py-2 bg-primary/10 border border-primary/20 rounded-lg text-sm font-bold text-primary hover:bg-primary/20 transition-colors mb-6 flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          Generate Combinations
        </button>
        
        <div class="flex justify-between items-center mb-4 border-t border-gray-100 pt-6">
          <div>
            <h2 class="text-lg font-bold text-secondary">Combinations & Pricing</h2>
            <p class="text-sm text-secondary/60">Set prices, stock, upload images. <strong class="text-red-500">Disable invalid combinations.</strong></p>
          </div>
          <button type="button" id="add-custom-variant-btn" class="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Custom Row
          </button>
        </div>
        <div id="variants-container" class="space-y-4"></div>
      </div>`;

code = code.replace(htmlOld, htmlNew);

// Replace JS variables
code = code.replace(/let variantCount = 0, specCount = 0, badgeCount = 0, bulletCount = 0;/g, 'let variantCount = 0, specCount = 0, badgeCount = 0, bulletCount = 0, vGroupCount = 0;\n  const vgroupsContainer = document.getElementById(\'vgroups-container\');');

// Add VGroup row function
const addVGroupScript = `
  function createVGroupRow(name = '', values = '') {
    const id = 'vg_' + (vGroupCount++);
    vgroupsContainer.insertAdjacentHTML('beforeend', "<div class='vgroup-row flex items-start gap-3' id='" + id + "'>" +
      "<input type='text' value='" + name + "' class='vgroup-name w-1/3 px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-primary outline-none' placeholder='Group (e.g. @Color, Size)' />" +
      "<input type='text' value='" + values + "' class='vgroup-vals flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:border-primary outline-none' placeholder='Comma separated (e.g. Red, Blue, Green)' />" +
      "<button type='button' class='p-2 text-red-500 hover:bg-red-50 rounded-md' onclick=\\"document.getElementById('" + id + "').remove()\\"><svg class='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M6 18L18 6M6 6l12 12'/></svg></button>" +
    "</div>");
  }

  function getVGroups() {
    const groups = [];
    document.querySelectorAll('.vgroup-row').forEach(row => {
      const name = row.querySelector('.vgroup-name').value.trim();
      const valsStr = row.querySelector('.vgroup-vals').value;
      const values = valsStr.split(',').map(v => v.trim()).filter(v => v);
      if (name && values.length > 0) {
        groups.push({ name, values });
      }
    });
    return groups;
  }

  document.getElementById('add-vgroup-btn')?.addEventListener('click', () => createVGroupRow());
  
  document.getElementById('generate-combinations-btn')?.addEventListener('click', () => {
    const groups = getVGroups();
    if (groups.length === 0) return alert('Add at least one option group with values.');
    
    // Cartesian product
    const cartesian = (a) => a.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    const valuesArrays = groups.map(g => g.values);
    let combinations = [];
    if (valuesArrays.length === 1) {
      combinations = valuesArrays[0].map(v => [v]);
    } else {
      combinations = cartesian(valuesArrays);
    }
    
    // Read existing variants to preserve data
    const existingVariants = {};
    document.querySelectorAll('.variant-row').forEach(row => {
      const weight = row.querySelector('.variant-weight')?.value?.trim();
      if (!weight) return;
      const isActive = row.querySelector('.variant-active')?.checked !== false;
      const price = row.querySelector('.variant-price')?.value;
      const mrp = row.querySelector('.variant-mrp')?.value;
      const stock = row.querySelector('.variant-stock')?.value;
      const varId = row.dataset.variantId || '';
      const images = Array.from(row.querySelectorAll('.scrollbar-hide img')).map(img => img.src).filter(src => !!src);
      existingVariants[weight] = { price, mrp, stock, varId, images, isActive };
    });

    // We do NOT clear everything automatically, instead we check which combinations are missing and add them.
    let added = 0;
    combinations.forEach(combo => {
      const comboName = combo.join(' / ');
      if (!existingVariants[comboName]) {
        createVariantRow(comboName, '', '', '', [], 0, true);
        added++;
      }
    });
    if (added === 0) alert('No new combinations to add. Existing rows preserved.');
    else alert('Generated ' + added + ' new combinations!');
  });
`;

code = code.replace(/function createVariantRow\(weight = '', price = '', mrp = '', varId = '', images = \[\]/g, addVGroupScript + '\n\n  function createVariantRow(weight = \'\', price = \'\', mrp = \'\', varId = \'\', images = [], stock = 0, isActive = true');

// Update createVariantRow signature
code = code.replace(/function createVariantRow\(weight = '', price = '', mrp = '', varId = '', images = \[\], stock = 0\)/g, 'function createVariantRow(weight = \'\', price = \'\', mrp = \'\', varId = \'\', images = [], stock = 0, isActive = true)');

// Update Variant HTML to include Toggle
const oldVariantRowHTML = `<div class="variant-row p-5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm relative group mt-4 transition-all hover:border-primary/30" id="\${id}" data-variant-id="\${varId}">
        <div class="absolute -top-3 left-4 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
          Variant \${variantNumber}
        </div>
        <button type="button" class="absolute top-3 right-3 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" onclick="document.getElementById('\${id}').remove()" title="Remove Variant">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>`;

const newVariantRowHTML = `<div class="variant-row p-5 \${isActive ? 'bg-white' : 'bg-gray-100 opacity-60'} rounded-2xl border-2 \${isActive ? 'border-gray-100' : 'border-dashed border-gray-300'} shadow-sm relative group mt-4 transition-all hover:border-primary/30" id="\${id}" data-variant-id="\${varId}">
        <div class="absolute -top-3 left-4 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
          Variant \${variantNumber}
        </div>
        <div class="absolute top-3 right-3 flex items-center gap-3">
          <label class="flex items-center gap-1 cursor-pointer text-xs font-semibold \${isActive ? 'text-green-600' : 'text-gray-500'}">
            <input type="checkbox" class="variant-active" \${isActive ? 'checked' : ''} onchange="
              var row = document.getElementById('\${id}');
              if(this.checked) {
                 row.className = 'variant-row p-5 bg-white rounded-2xl border-2 border-gray-100 shadow-sm relative group mt-4 transition-all hover:border-primary/30';
                 this.parentElement.className = 'flex items-center gap-1 cursor-pointer text-xs font-semibold text-green-600';
                 this.parentElement.querySelector('span').innerText = 'Enabled';
              } else {
                 row.className = 'variant-row p-5 bg-gray-100 opacity-60 rounded-2xl border-2 border-dashed border-gray-300 shadow-sm relative group mt-4 transition-all hover:border-primary/30';
                 this.parentElement.className = 'flex items-center gap-1 cursor-pointer text-xs font-semibold text-gray-500';
                 this.parentElement.querySelector('span').innerText = 'Disabled';
              }
            " />
            <span>\${isActive ? 'Enabled' : 'Disabled'}</span>
          </label>
          <button type="button" class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" onclick="document.getElementById('\${id}').remove()" title="Remove Variant">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>`;

code = code.replace(oldVariantRowHTML, newVariantRowHTML);

// Hook add-variant-btn to add-custom-variant-btn
code = code.replace(/document.getElementById\('add-variant-btn'\)\?\.addEventListener/g, 'document.getElementById(\'add-custom-variant-btn\')?.addEventListener');

// Initial load variants and vgroups
const initScriptOld = `    try {
      const vRaw = initialProduct.variants;
      const variants = Array.isArray(vRaw) ? vRaw : (typeof vRaw === 'string' && vRaw.trim() ? JSON.parse(vRaw) : []);
      if (variants.length > 0) variants.forEach(v => createVariantRow(v.weight || '', v.price || '', v.mrp || '', v.id || '', v.images || [], v.stock || 0));
      else createVariantRow();
    } catch (e) { console.error('variants error', e); createVariantRow(); }`;

const initScriptNew = `    try {
      const vGroupsRaw = initialProduct.variant_options;
      const vGroups = Array.isArray(vGroupsRaw) ? vGroupsRaw : (typeof vGroupsRaw === 'string' && vGroupsRaw.trim() ? JSON.parse(vGroupsRaw) : []);
      if (vGroups.length > 0) {
        vGroups.forEach(g => createVGroupRow(g.name, (g.values || []).join(', ')));
      } else {
        createVGroupRow('', '');
      }

      const vRaw = initialProduct.variants;
      const variants = Array.isArray(vRaw) ? vRaw : (typeof vRaw === 'string' && vRaw.trim() ? JSON.parse(vRaw) : []);
      if (variants.length > 0) variants.forEach(v => createVariantRow(v.weight || v.variant_name || '', v.price || '', v.mrp || '', v.id || '', v.images || [], v.stock || 0, !v.is_hidden));
      else createVariantRow();
    } catch (e) { console.error('variants error', e); createVariantRow(); createVGroupRow('', ''); }`;

code = code.replace(initScriptOld, initScriptNew);

// Update collectFormData
const collectOld = `    const variants = [];
    document.querySelectorAll('.variant-row').forEach((row, i) => {
      const weight = row.querySelector('.variant-weight')?.value?.trim();
      const price = parseFloat(row.querySelector('.variant-price')?.value) || 0;
      const mrp = parseFloat(row.querySelector('.variant-mrp')?.value) || 0;
      const stock = parseInt(row.querySelector('.variant-stock')?.value) || 0;
      // Gather all images in this variant's preview box
      const images = Array.from(row.querySelectorAll('.scrollbar-hide img')).map(img => img.src).filter(src => !!src);
      
      if (weight) variants.push({ id: row.dataset.variantId || \`v\${i+1}\`, weight, price, mrp, stock, images });
    });`;

const collectNew = `    const variant_options = getVGroups();
    const variants = [];
    document.querySelectorAll('.variant-row').forEach((row, i) => {
      const weight = row.querySelector('.variant-weight')?.value?.trim();
      const isActive = row.querySelector('.variant-active')?.checked !== false;
      const price = parseFloat(row.querySelector('.variant-price')?.value) || 0;
      const mrp = parseFloat(row.querySelector('.variant-mrp')?.value) || 0;
      const stock = parseInt(row.querySelector('.variant-stock')?.value) || 0;
      // Gather all images in this variant's preview box
      const images = Array.from(row.querySelectorAll('.scrollbar-hide img')).map(img => img.src).filter(src => !!src);
      
      // ONLY SAVE ACTIVE COMBINATIONS!
      if (weight && isActive) {
         variants.push({ id: row.dataset.variantId || \`v\${i+1}\`, weight, price, mrp, stock, images, is_hidden: false });
      }
    });`;

code = code.replace(collectOld, collectNew);

// Also add variant_options to returned data in collectFormData
code = code.replace(/variants,\n      specifications,/g, 'variants,\n      variant_options,\n      specifications,');

// Also update the oldData comparison logic in submit handler
code = code.replace(/variants: parseJsonSafe\(initialProduct.variants\) \|\| \[\],/g, 'variant_options: parseJsonSafe(initialProduct.variant_options) || [],\n        variants: parseJsonSafe(initialProduct.variants) || [],');

fs.writeFileSync('storefront/src/pages/admin/products/edit.astro', code);
