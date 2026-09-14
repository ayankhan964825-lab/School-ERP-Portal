
  // == Status Update ==
  document.querySelectorAll('.order-status-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const target = e.target;
      const orderId = target.dataset.orderId;
      const newStatus = target.value;
      target.style.background = '#fef08a';
      try {
        const res = await fetch('/api/admin/update-order-status', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: newStatus })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Unknown API error');
        }
        target.style.background = '#bbf7d0';
        // Update the status badge in same row
        const row = target.closest('tr');
        const badge = row?.querySelector('[class*="rounded-full"]');
        if (badge) badge.textContent = newStatus;
        setTimeout(() => { target.style.background = ''; }, 1000);
      } catch (err) {
        target.style.background = '#fecdd3';
        setTimeout(() => { target.style.background = ''; }, 1000);
        alert('Failed to update status');
      }
    });
  });

  // == Save AWB (with all dispatch fields) ==
  document.querySelectorAll('.save-awb-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const row = this.closest('tr');
      const orderId   = this.dataset.orderId;
      const awb       = row?.querySelector('.awb-input')?.value.trim();
      const courier   = row?.querySelector('.courier-select')?.value.trim();
      const routing   = row?.querySelector('.routing-input')?.value.trim();
      const weight    = row?.querySelector('.weight-input')?.value.trim();
      const dims      = row?.querySelector('.dimensions-input')?.value.trim();
      const riderId   = row?.querySelector('.rider-select')?.value.trim();

      if (!awb && !riderId) { alert('Please enter an AWB number or Assign a Rider.'); return; }
      if (!courier && !riderId){ alert('Please select a Courier Partner or Assign a Rider.'); return; }

      const originalHTML = this.innerHTML;
      this.textContent = 'Saving...';
      this.disabled = true;

      try {
        const res = await fetch('/api/admin/update-order-awb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            awb:                awb || null,
            courier_partner:    courier || null,
            routing_code:       routing  || null,
            package_weight:     weight   || '0.50 KG',
            package_dimensions: dims     || '13*13*13 CM',
            rider_id:           riderId  || null,
            mark_shipped: true,
          })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Unknown API error');
        }

        this.innerHTML = '✅ Saved!';
        // Update status badge to shipped
        const statusSelect = row?.querySelector('.order-status-select');
        if (statusSelect) {
          statusSelect.value = 'shipped';
          const badge = row?.querySelector('[class*="rounded-full"]');
          if (badge) badge.textContent = 'shipped';
        }
        setTimeout(() => { this.innerHTML = originalHTML; this.disabled = false; }, 2000);
      } catch (err) {
        alert("DEBUG ERROR: " + (err.message || "empty message"));
        this.innerHTML = originalHTML;
        this.disabled = false;
      }
    });
  });

  // == Auto-Generate Waybill (iCarry API) ==
  document.querySelectorAll('.generate-awb-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const row     = this.closest('tr');
      const orderId = this.dataset.orderId;
      const originalHTML = this.innerHTML;
      this.textContent = '...';

      try {
        const res  = await fetch('/api/admin/shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate_waybill', orderId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed');

        // Auto-fill ALL fields from API response
        const awbInput     = row?.querySelector('.awb-input');
        const courierSel   = row?.querySelector('.courier-select');
        const routingInput = row?.querySelector('.routing-input');
        const weightInput  = row?.querySelector('.weight-input');

        if (awbInput)     awbInput.value     = data.awb      || '';
        if (routingInput) routingInput.value  = data.routing_code || '';
        if (weightInput)  weightInput.value   = data.weight ? `${data.weight} KG` : '0.50 KG';
        // Set courier dropdown — find matching option or fallback to first
        if (courierSel && data.courier) {
          const opts = Array.from(courierSel.options);
          const match = opts.find(o => o.value.toLowerCase().includes(data.courier.toLowerCase()));
          if (match) courierSel.value = match.value;
          else {
            // Add dynamic option if courier not in list
            const opt = document.createElement('option');
            opt.value = data.courier; opt.textContent = data.courier; opt.selected = true;
            courierSel.appendChild(opt);
          }
        }

        // Highlight filled fields
        [awbInput, routingInput, weightInput].forEach(el => {
          if (el) { el.classList.add('border-green-400','bg-green-50'); setTimeout(() => el.classList.remove('border-green-400','bg-green-50'), 2000); }
        });

        // Update status to shipped
        const statusSelect = row?.querySelector('.order-status-select');
        if (statusSelect) {
          statusSelect.value = 'shipped';
          const badge = row?.querySelector('[class*="rounded-full"]');
          if (badge) badge.textContent = 'shipped';
        }

        this.innerHTML = '✅';
        setTimeout(() => { this.innerHTML = originalHTML; }, 2000);

        if (data.label_url && data.label_url !== '#') window.open(data.label_url, '_blank');

      } catch (err) {
        alert(err.message || 'Auto-generate failed. Check iCarry API key in Settings.');
        this.innerHTML = originalHTML;
      }
    });
  });

  // == Status Filter ==
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.className = 'filter-btn px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors border-gray-200 text-secondary/60 bg-white hover:border-primary hover:text-primary';
      });
      this.className = 'filter-btn px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors border-primary bg-primary text-white';
      const status = this.dataset.status;
      document.querySelectorAll('.order-row').forEach(row => {
        let rs = row.dataset.status;
        if (rs === 'placed') rs = 'pending';
        if (rs === 'processing') rs = 'confirmed';
        if (rs === 'dispatched') rs = 'shipped';
        if (rs === 'returned') rs = 'cancelled';
        
        if (status === 'all' || rs === status) {
          (row).style.display = '';
        } else {
          (row).style.display = 'none';
        }
      });
    });
  });
  // Set "All" active by default
  (document.querySelector('.filter-btn[data-status="all"]'))?.click();

  // == Order Detail Modal ==
  const modal = document.getElementById('order-detail-modal');
  const modalBody = document.getElementById('modal-order-body');
  const modalTitle = document.getElementById('modal-order-title');

  document.querySelectorAll('.view-order-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const order = JSON.parse(decodeURIComponent(this.dataset.order || '%7B%7D'));
      if (modalTitle) modalTitle.textContent = `Order #${order.orderId}`;

      const statusBadge = (s) => {
        const c = { pending:'bg-yellow-100 text-yellow-800', confirmed:'bg-blue-100 text-blue-800', shipped:'bg-purple-100 text-purple-800', delivered:'bg-green-100 text-green-800', cancelled:'bg-red-100 text-red-800' };
        return `<span class="text-xs font-bold px-2.5 py-1 rounded-full capitalize ${c[s] || 'bg-gray-100 text-gray-600'}">${s}</span>`;
      };

      if (modalBody) modalBody.innerHTML = `
        <div class="flex items-center gap-3 pb-4 border-b border-gray-100">
          ${statusBadge(order.status)}
          <span class="text-xs text-secondary/50">${new Date(order.createdAt).toLocaleString('en-IN')}</span>
          <span class="ml-auto font-bold text-secondary text-base">₹${(order.amount||0).toLocaleString('en-IN')}</span>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-1.5">Customer</p>
            <p class="font-semibold text-secondary">${order.customer?.name || '—'}</p>
            <p class="text-xs text-secondary/60 mt-0.5">${order.customer?.phone || ''}</p>
            <p class="text-xs text-secondary/60">${order.customer?.email || ''}</p>
          </div>
          <div>
            <p class="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-1.5">Delivery Address</p>
            <p class="text-xs text-secondary/70 leading-relaxed">${order.customer?.addressLine || order.customer?.street_address || order.customer?.address || '—'}, ${order.customer?.city || ''}, ${order.customer?.state || ''} — ${order.customer?.pincode || ''}</p>
          </div>
        </div>

        <div>
          <p class="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2">Order Items</p>
          <div class="space-y-2 border border-gray-100 rounded-xl overflow-hidden">
            ${(order.items||[]).map((item) => `
              <div class="flex justify-between items-center px-4 py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p class="font-medium text-secondary text-xs">${item.name}</p>
                  <p class="text-xs text-secondary/40">${item.weight || item.variant || ''}</p>
                  ${item.custom_data ? Object.entries(item.custom_data).map(([k, v]) => `
                    <div class="mt-1 text-[10px] text-secondary/60 flex items-start gap-1">
                      <span class="font-bold uppercase tracking-wider mt-0.5">${k}:</span> 
                      ${String(v).startsWith('http') 
                        ? `<a href="${v}" target="_blank" class="text-primary bg-primary/10 hover:bg-primary/20 px-1.5 py-0.5 rounded transition-colors inline-block break-all max-w-[200px]">View Attachment</a>` 
                        : `<span class="italic text-secondary">${String(v).replace(/</g, '&lt;')}</span>`}
                    </div>
                  `).join('') : ''}
                </div>
                <div class="text-right">
                  <p class="text-xs text-secondary/60">${item.quantity}× ₹${item.price || 0}</p>
                  <p class="font-bold text-secondary text-xs">₹${((item.price||0) * (item.quantity||1)).toLocaleString('en-IN')}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-xl p-3">
            <p class="text-xs text-secondary/40 font-bold uppercase tracking-wider mb-1">Payment</p>
            <p class="text-sm font-semibold text-secondary capitalize">${order.paymentMethod || 'COD'}</p>
            <p class="text-xs text-secondary/60">${order.paymentStatus || 'Pending'}</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-3">
            <p class="text-xs text-secondary/40 font-bold uppercase tracking-wider mb-1">Global Status</p>
            <p class="text-sm font-semibold text-secondary capitalize">${order.status}</p>
          </div>
        </div>

        ${order.fulfillments && order.fulfillments.length > 0 ? `
        <div>
          <p class="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-2 mt-4">Fulfillments / Shipments</p>
          ${order.fulfillments.map((f, i) => `
          <div class="mb-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div class="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
              <div>
                <span class="font-bold text-secondary text-sm">Shipment #${i+1}</span>
                <span class="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-2 font-bold">${f.locations?.name || 'Warehouse'}</span>
              </div>
              <div>
                <select class="text-xs border border-gray-300 rounded px-2 py-1 fulfillment-status-select font-semibold outline-none" data-fid="${f.id}" onchange="updateFulfillmentStatus('${f.id}', this.value)">
                  <option value="pending" ${f.status==='pending'?'selected':''}>Pending</option>
                  <option value="shipped" ${f.status==='shipped'?'selected':''}>Shipped</option>
                  <option value="delivered" ${f.status==='delivered'?'selected':''}>Delivered</option>
                  <option value="cancelled" ${f.status==='cancelled'?'selected':''}>Cancelled</option>
                  <option value="rto" ${f.status==='rto'?'selected':''}>RTO</option>
                </select>
              </div>
            </div>
            
            <div class="px-4 py-2 text-xs text-secondary/80 border-b border-gray-100 bg-white">
              <span class="font-bold">Items:</span> ${(f.items||[]).map((it) => `${it.quantity}x ${it.product_name || it.variant || it.id}`).join(', ')}
            </div>

            <div class="p-4 bg-white grid grid-cols-2 gap-4">
              <!-- Dispatch Details -->
              <div>
                <p class="text-[10px] font-bold text-secondary/50 uppercase mb-2">Courier Dispatch</p>
                <div class="space-y-2">
                  <input type="text" id="awb_${f.id}" class="w-full text-xs border border-gray-200 rounded p-1.5 focus:border-primary outline-none" placeholder="AWB Number" value="${f.awb_number || ''}">
                  <input type="text" id="courier_${f.id}" class="w-full text-xs border border-gray-200 rounded p-1.5 focus:border-primary outline-none" placeholder="Courier Name (e.g. Delhivery)" value="${f.courier_name || ''}">
                  <div class="flex gap-2">
                    <button class="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] font-bold py-1.5 rounded transition-colors" onclick="updateFulfillmentAwb('${f.id}')">💾 Save</button>
                    <button class="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white text-[10px] font-bold py-1.5 rounded transition-colors flex items-center justify-center gap-1" onclick="autoGenerateAwb('${order.orderId}', '${f.id}')">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Auto API
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Q-Commerce Local Rider -->
              ${f.locations?.q_commerce_enabled ? `
              <div class="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <p class="text-[10px] font-bold text-purple-700 uppercase mb-2">🛵 Local Rider / 3PL Assignment</p>
                <div class="space-y-2">
                  <input type="text" id="rider_name_${f.id}" class="w-full text-xs border border-purple-200 rounded p-1.5 focus:border-purple-500 outline-none" placeholder="Rider Name (Manual)" value="${f.rider_name || ''}">
                  <input type="text" id="rider_phone_${f.id}" class="w-full text-xs border border-purple-200 rounded p-1.5 focus:border-purple-500 outline-none" placeholder="Rider Phone (Manual)" value="${f.rider_phone || ''}">
                  <button class="w-full bg-purple-600 text-white text-[10px] font-bold py-1.5 rounded hover:bg-purple-700 transition-colors shadow-sm" onclick="assignRider('${f.id}')">Assign Manual Rider</button>
                  
                  <div class="flex items-center gap-2 my-1">
                    <div class="h-px bg-purple-200 flex-1"></div>
                    <span class="text-[9px] text-purple-400 font-bold uppercase tracking-wider">OR</span>
                    <div class="h-px bg-purple-200 flex-1"></div>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-2">
                    <button class="w-full bg-green-500 text-white text-[10px] font-bold py-1.5 rounded hover:bg-green-600 transition-colors shadow-sm" onclick="dispatch3PL('${order.orderId}', '${f.id}', 'dunzo')">Send via Dunzo</button>
                    <button class="w-full bg-orange-500 text-white text-[10px] font-bold py-1.5 rounded hover:bg-orange-600 transition-colors shadow-sm" onclick="dispatch3PL('${order.orderId}', '${f.id}', 'shadowfax')">Send via Shadowfax</button>
                  </div>
                </div>
              </div>
              ` : `
              <div class="bg-gray-50 flex items-center justify-center rounded-lg border border-gray-100 p-3">
                <span class="text-[10px] text-gray-400 font-medium">Q-Commerce Disabled for this Hub</span>
              </div>
              `}
            </div>
          </div>
          `).join('')}
        </div>
        ` : `
        <div class="bg-yellow-50 text-yellow-800 p-3 rounded-xl text-xs">
          Legacy Order (No multi-warehouse fulfillments). Use the main table rows to manage dispatch.
        </div>
        `}

        <div class="flex gap-3 pt-2">
          <a href="/admin/invoice/${order.orderId}" target="_blank"
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print Invoice
          </a>
        </div>
      `;

      modal?.classList.remove('hidden');
      modal?.classList.add('flex');
    });
  });

  document.getElementById('close-order-modal')?.addEventListener('click', () => {
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  });
  modal?.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); } });

  // ── AI Command Bar Handlers ──────────────────────────────────────────
  // Called directly (not inside DOMContentLoaded) since AiCommandBar defines
  // window.registerAiHandlers synchronously before this script runs.
  if (window.registerAiHandlers) {
    window.registerAiHandlers({
      context: 'Orders Management Page',
      suggestions: [
        'show pending orders',
        'show shipped orders',
        'show all orders',
        'filter delivered orders',
        'show cancelled orders',
      ],
      patterns: [
        {
          key: 'filter_status',
          keywords: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'all orders', 'show all'],
          example: 'show pending orders',
          extract: '(pending|confirmed|shipped|delivered|cancelled|all)',
          match: (q) => {
            const statuses = ['pending','confirmed','shipped','delivered','cancelled'];
            const found = statuses.find(s => q.includes(s));
            if (found) return found;
            if (q.includes('all')) return 'all';
            return false;
          }
        },
      ],
      actions: {
        filter_status: (status) => {
          const btn = document.querySelector(`.filter-btn[data-status="${status || 'all'}"]`);
          if (btn) { btn.click(); return `Showing ${status || 'all'} orders ✓`; }
          return 'Filter button not found';
        }
      }
    });
  }

  // ── AI Action Handler (from PageAiPanel) ──────────────────────────────
  window.assignRider = async function(fulfillmentId) {
    try {
      const btn = event.currentTarget;
      const name = document.getElementById(`rider_name_${fulfillmentId}`)?.value;
      const phone = document.getElementById(`rider_phone_${fulfillmentId}`)?.value;

      if (!name || !phone) return alert('Please enter rider name and phone');
      
      btn.innerHTML = '...';
      const res = await fetch(`/api/admin/fulfillments/${fulfillmentId}/assign-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_name: name, rider_phone: phone })
      });
      
      if (res.ok) {
        btn.innerHTML = '✅ Assigned';
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to assign rider");
        btn.innerHTML = 'Assign Manual Rider';
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred");
      event.currentTarget.innerHTML = 'Assign Manual Rider';
    }
  };

  window.dispatch3PL = async function(orderId, fulfillmentId, partner) {
    try {
      const btn = event.currentTarget;
      const originalText = btn.innerHTML;
      btn.innerHTML = '...';
      
      const res = await fetch(`/api/admin/fulfillments/${fulfillmentId}/dispatch-3pl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, partner })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to dispatch via ${partner}`);
      
      btn.innerHTML = '✅ Dispatched';
      setTimeout(() => window.location.reload(), 1500);
      
    } catch (err) {
      alert(err.message || 'Dispatch failed.');
      event.currentTarget.innerHTML = partner === 'dunzo' ? 'Send via Dunzo' : 'Send via Shadowfax';
    }
  };

  window.updateFulfillmentAwb = async function(fulfillmentId) {
    const awb = document.getElementById(`awb_${fulfillmentId}`)?.value;
    const courier = document.getElementById(`courier_${fulfillmentId}`)?.value;
    
    if (!awb || !courier) {
      alert("Please enter AWB and Courier name.");
      return;
    }
    
    try {
      const res = await fetch(`/api/admin/fulfillments/${fulfillmentId}/update-awb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awb_number: awb, courier_name: courier })
      });
      if (res.ok) {
        alert("Dispatch details saved!");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save details");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred");
    }
  };

  window.updateFulfillmentStatus = async function(fulfillmentId, status) {
    try {
      const res = await fetch(`/api/admin/fulfillments/${fulfillmentId}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update status");
      } else {
        // success
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred");
    }
  };

  window.autoGenerateAwb = async function(orderId, fulfillmentId) {
    try {
      const btn = event.currentTarget;
      const originalText = btn.innerHTML;
      btn.innerHTML = '...';
      
      const res = await fetch('/api/admin/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_waybill', orderId, fulfillmentId })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to auto-generate');
      
      const awbInput = document.getElementById(`awb_${fulfillmentId}`);
      const courierInput = document.getElementById(`courier_${fulfillmentId}`);
      
      if (awbInput) awbInput.value = data.awb || '';
      if (courierInput) courierInput.value = data.courier || '';
      
      btn.innerHTML = '✅ Generated';
      setTimeout(() => { btn.innerHTML = originalText; window.location.reload(); }, 2000);
      
      if (data.label_url && data.label_url !== '#') window.open(data.label_url, '_blank');
      
    } catch (err) {
      alert(err.message || 'Auto-generate failed.');
      btn.innerHTML = originalText;
    }
  };

  document.addEventListener('ai-action', function(e) {
    var action = e.detail.action;
    var params = e.detail.params || {};

    if (action === 'filter_status') {
      var status = params.status || 'all';
      var btn = document.querySelector('.filter-btn[data-status="' + status + '"]');
      if (btn) btn.click();
    }
    else if (action === 'filter_date') {
      // Highlight rows matching the date
      var dateStr = params.date || '';
      var rows = document.querySelectorAll('.order-row');
      rows.forEach(function(row) {
        var rowDate = row.getAttribute('data-date') || '';
        var match = rowDate.startsWith(dateStr);
        row.style.display = match ? '' : 'none';
      });
    }
    else if (action === 'search_order') {
      var search = document.getElementById('order-search');
      if (search) { search.value = params.query || ''; search.dispatchEvent(new Event('input')); }
    }
    else if (action === 'navigate') {
      if (params.url) window.location.href = params.url;
    }
    else if (action === 'update_awb') {
      var input = document.querySelector('.awb-input[data-order-id="' + params.order_id + '"]');
      var btn = document.querySelector('.save-awb-btn[data-order-id="' + params.order_id + '"]');
      if (input && btn) {
        input.value = params.awb;
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.classList.add('ring-2', 'ring-violet-500', 'ring-offset-2');
        btn.innerHTML = '✨ Review & Save';
        setTimeout(() => {
          input.classList.remove('ring-2', 'ring-violet-500', 'ring-offset-2');
          btn.innerHTML = 'Save AWB';
        }, 3000);
      }
    }
    else if (action === 'update_status') {
      var select = document.querySelector('.order-status-select[data-order-id="' + params.order_id + '"]');
      if (select) {
        select.value = params.status;
        select.scrollIntoView({ behavior: 'smooth', block: 'center' });
        select.classList.add('ring-2', 'ring-violet-500', 'ring-offset-2');
        
        // Create a temporary save button since select auto-saves on change
        var tempBtn = document.createElement('button');
        tempBtn.innerHTML = '✨ Save Status';
        tempBtn.className = 'ml-2 text-xs font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded hover:bg-violet-100 transition-colors';
        tempBtn.onclick = function() {
          select.dispatchEvent(new Event('change'));
          tempBtn.remove();
        };
        select.parentNode.insertBefore(tempBtn, select.nextSibling);

        setTimeout(() => {
          select.classList.remove('ring-2', 'ring-violet-500', 'ring-offset-2');
        }, 3000);
      }
    }
    else if (action === 'bulk_print') {
      window.location.href = '/admin/batch-invoice';
    }
  });

