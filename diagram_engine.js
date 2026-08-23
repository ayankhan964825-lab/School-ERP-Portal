/**
 * ERP Portal — Interactive System Architecture Rendering Engine
 * Features: expand/collapse tree, zoom, search, breadcrumbs, minimap, tooltips, print
 */

(function () {
  "use strict";

  // ── Configuration ──
  const NODE_W = 220, NODE_H_BASE = 42, GAP_X = 60, GAP_Y = 14;
  const ANIM_MS = 280;
  let zoom = 1, totalNodes = 0, visibleNodes = 0;

  const canvas = document.getElementById("canvas");
  const container = document.getElementById("tree-container");
  const breadcrumbEl = document.getElementById("breadcrumb");
  const statsEl = document.getElementById("stats");
  const searchBox = document.getElementById("searchBox");
  const zoomLabel = document.getElementById("zl");

  // ── Flatten & prepare data ──
  let nodeId = 0;
  function prepare(node, depth, parent) {
    node._id = nodeId++;
    node._depth = depth;
    node._parent = parent;
    node._expanded = depth < 1;
    node._visible = depth < 1;
    node._childCount = 0;
    node._edgeCount = 0;
    if (node.children) {
      node.children.forEach(c => {
        prepare(c, depth + 1, node);
        if (c.edge) node._edgeCount++;
      });
      node._childCount = countAll(node) - 1;
    }
    totalNodes++;
  }

  function countAll(n) {
    let c = 1;
    if (n.children) n.children.forEach(ch => c += countAll(ch));
    return c;
  }

  prepare(TREE_DATA, 0, null);

  // ── Node height calculation ──
  function nodeH(n) {
    let h = NODE_H_BASE;
    if (n.desc) h += 0;
    if (n.edge) h += 2;
    if (n._edgeCount > 0) h += 14;
    return h;
  }

  // ── Layout (recursive) ──
  function layout(node, x, y) {
    node._x = x;
    node._y = y;
    let subtreeH = nodeH(node) + GAP_Y;

    if (node._expanded && node.children) {
      let childX = x + NODE_W + GAP_X;
      let childY = y;
      node.children.forEach(child => {
        child._visible = true;
        let ch = layout(child, childX, childY);
        childY += ch;
        subtreeH = Math.max(subtreeH, childY - y);
      });
    } else if (node.children) {
      hideAll(node);
    }

    node._subtreeH = subtreeH;
    return subtreeH;
  }

  function hideAll(node) {
    if (node.children) node.children.forEach(c => { c._visible = false; c._expanded = false; hideAll(c); });
  }

  // ── Render ──
  function render() {
    layout(TREE_DATA, 30, 30);
    container.innerHTML = "";
    visibleNodes = 0;

    // SVG for connectors
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "connector");
    svg.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;";
    container.appendChild(svg);

    let maxX = 0, maxY = 0;
    renderNode(TREE_DATA, svg);

    // Collect bounds
    collectBounds(TREE_DATA, b => { maxX = Math.max(maxX, b.x); maxY = Math.max(maxY, b.y); });

    container.style.width = (maxX + NODE_W + 80) + "px";
    container.style.height = (maxY + 120) + "px";
    container.style.transform = `scale(${zoom})`;

    updateStats();
    updateMinimap();
  }

  function collectBounds(node, cb) {
    if (node._visible) { cb({ x: node._x, y: node._y }); visibleNodes++; }
    if (node._expanded && node.children) node.children.forEach(c => collectBounds(c, cb));
  }

  function renderNode(node, svg) {
    if (!node._visible) return;

    const colors = COLORS[node.color] || COLORS.general;
    const el = document.createElement("div");
    el.className = "node" + (node._expanded ? " expanded" : "");
    el.style.cssText = `left:${node._x}px;top:${node._y}px;background:${colors.bg};border-color:${colors.border};color:${colors.text};` +
      (colors.dashed ? "border-style:dashed;" : "");

    // Title row
    let titleHTML = `<div class="node-title"><span class="node-icon">${node.icon || "📂"}</span><span>${node.name}</span>`;
    if (node.children && node._childCount > 0) {
      titleHTML += `<span class="node-children-badge">${node._childCount}</span>`;
      titleHTML += `<span class="node-expand-icon">${node._expanded ? "▼" : "▶"}</span>`;
    }
    titleHTML += `</div>`;

    // Description
    if (node.desc) titleHTML += `<div class="node-desc">${node.desc}</div>`;

    // Edge case info
    if (node._edgeCount > 0) {
      titleHTML += `<div class="node-edge">⚠️ ${node._edgeCount} edge case${node._edgeCount > 1 ? "s" : ""}</div>`;
    }

    el.innerHTML = titleHTML;

    // Click handler
    if (node.children && node.children.length > 0) {
      el.addEventListener("click", () => {
        node._expanded = !node._expanded;
        render();
        updateBreadcrumb(node);
      });
    }

    // Hover tooltip
    el.addEventListener("mouseenter", (e) => showTooltip(node, e));
    el.addEventListener("mouseleave", hideTooltip);

    container.appendChild(el);

    // Draw connectors
    if (node._expanded && node.children) {
      node.children.forEach(child => {
        if (child._visible) {
          drawConnector(svg, node, child);
          renderNode(child, svg);
        }
      });
    }
  }

  function drawConnector(svg, parent, child) {
    const colors = COLORS[child.color] || COLORS.general;
    const x1 = parent._x + NODE_W;
    const y1 = parent._y + nodeH(parent) / 2;
    const x2 = child._x;
    const y2 = child._y + nodeH(child) / 2;
    const midX = (x1 + x2) / 2;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", colors.border);
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("opacity", "0.4");
    if (child.edge) path.setAttribute("stroke-dasharray", "4,3");
    svg.appendChild(path);
  }

  // ── Tooltip ──
  let tooltipEl;
  function showTooltip(node, e) {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.id = "tooltip";
      tooltipEl.style.cssText = "position:fixed;z-index:200;background:rgba(15,15,26,.95);border:1px solid #4c1d95;border-radius:8px;padding:10px 14px;font-size:11px;color:#e2e8f0;max-width:280px;pointer-events:none;backdrop-filter:blur(8px);box-shadow:0 8px 32px rgba(0,0,0,.5);";
      document.body.appendChild(tooltipEl);
    }
    let html = `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${node.icon} ${node.name}</div>`;
    if (node.desc) html += `<div style="opacity:.7;margin-bottom:6px">${node.desc}</div>`;
    if (node.children) {
      html += `<div style="color:#a78bfa">📂 ${node.children.length} children`;
      if (node._edgeCount > 0) html += ` • ⚠️ ${node._edgeCount} edge case${node._edgeCount > 1 ? "s" : ""}`;
      html += `</div>`;
    }
    if (node.edge) html += `<div style="color:#fca5a5;margin-top:4px">⚠️ This is an edge case scenario</div>`;
    tooltipEl.innerHTML = html;
    tooltipEl.style.display = "block";

    const rect = tooltipEl.getBoundingClientRect();
    let tx = e.clientX + 16, ty = e.clientY + 16;
    if (tx + rect.width > window.innerWidth) tx = e.clientX - rect.width - 8;
    if (ty + rect.height > window.innerHeight) ty = e.clientY - rect.height - 8;
    tooltipEl.style.left = tx + "px";
    tooltipEl.style.top = ty + "px";
  }

  function hideTooltip() { if (tooltipEl) tooltipEl.style.display = "none"; }

  // ── Breadcrumb ──
  function updateBreadcrumb(node) {
    const path = [];
    let n = node;
    while (n) { path.unshift(n); n = n._parent; }

    breadcrumbEl.innerHTML = path.map((p, i) => {
      const isLast = i === path.length - 1;
      const cls = isLast ? "bread-active" : "bread-item";
      return (i > 0 ? '<span class="bread-sep"> › </span>' : "") +
        `<span class="${cls}" data-id="${p._id}">${p.icon} ${p.name}</span>`;
    }).join("");

    breadcrumbEl.querySelectorAll(".bread-item").forEach(el => {
      el.addEventListener("click", () => {
        const id = parseInt(el.dataset.id);
        const target = findById(TREE_DATA, id);
        if (target) { expandTo(target); render(); updateBreadcrumb(target); scrollToNode(target); }
      });
    });
  }

  function findById(node, id) {
    if (node._id === id) return node;
    if (node.children) for (const c of node.children) { const f = findById(c, id); if (f) return f; }
    return null;
  }

  function expandTo(node) {
    const path = [];
    let n = node;
    while (n) { path.unshift(n); n = n._parent; }
    path.forEach(p => p._expanded = true);
  }

  function scrollToNode(node) {
    setTimeout(() => {
      canvas.scrollTo({
        left: Math.max(0, node._x * zoom - canvas.clientWidth / 3),
        top: Math.max(0, node._y * zoom - canvas.clientHeight / 3),
        behavior: "smooth"
      });
    }, 50);
  }

  // ── Stats ──
  function updateStats() {
    statsEl.innerHTML = `<span>${visibleNodes}</span> / <span>${totalNodes}</span> nodes`;
  }

  // ── Search ──
  let searchTimeout;
  window.searchNodes = function (query) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const q = query.trim().toLowerCase();
      if (!q) { render(); return; }

      // Find matching nodes and expand their parents
      const matches = [];
      findMatches(TREE_DATA, q, matches);

      // Collapse all first
      collapseAllSilent(TREE_DATA);

      // Expand paths to matches
      matches.forEach(m => expandTo(m));

      render();

      // Highlight matching nodes
      setTimeout(() => {
        document.querySelectorAll(".node").forEach(el => {
          const text = el.textContent.toLowerCase();
          if (text.includes(q)) {
            el.style.boxShadow = "0 0 20px rgba(124, 58, 237, .8), 0 0 40px rgba(124, 58, 237, .3)";
            el.style.transform = "scale(1.02)";
          }
        });
      }, 50);

      // If matches found, scroll to first
      if (matches.length > 0) scrollToNode(matches[0]);
    }, 200);
  };

  function findMatches(node, q, results) {
    if ((node.name && node.name.toLowerCase().includes(q)) ||
        (node.desc && node.desc.toLowerCase().includes(q))) {
      results.push(node);
    }
    if (node.children) node.children.forEach(c => findMatches(c, q, results));
  }

  // ── Zoom ──
  window.zoomIn = function () { zoom = Math.min(2, zoom + 0.1); applyZoom(); };
  window.zoomOut = function () { zoom = Math.max(0.15, zoom - 0.1); applyZoom(); };
  window.resetZoom = function () { zoom = 1; applyZoom(); };

  function applyZoom() {
    container.style.transform = `scale(${zoom})`;
    zoomLabel.textContent = Math.round(zoom * 100) + "%";
    updateMinimap();
  }

  // ── Expand / Collapse All ──
  window.expandAll = function () {
    expandAllSilent(TREE_DATA);
    render();
    updateBreadcrumb(TREE_DATA);
  };

  window.collapseAll = function () {
    collapseAllSilent(TREE_DATA);
    TREE_DATA._expanded = true;
    render();
    updateBreadcrumb(TREE_DATA);
  };

  function expandAllSilent(node) {
    if (node.children) { node._expanded = true; node.children.forEach(c => expandAllSilent(c)); }
  }

  function collapseAllSilent(node) {
    node._expanded = false;
    if (node.children) node.children.forEach(c => collapseAllSilent(c));
  }

  // ── Minimap ──
  let minimapCanvas;
  function createMinimap() {
    const wrap = document.createElement("div");
    wrap.id = "minimap";
    wrap.style.cssText = "position:fixed;bottom:8px;right:8px;width:160px;height:110px;background:rgba(10,10,20,.9);border:1px solid #312e81;border-radius:8px;z-index:99;overflow:hidden;backdrop-filter:blur(6px);";
    minimapCanvas = document.createElement("canvas");
    minimapCanvas.width = 160;
    minimapCanvas.height = 110;
    wrap.appendChild(minimapCanvas);
    document.body.appendChild(wrap);
  }
  createMinimap();

  function updateMinimap() {
    if (!minimapCanvas) return;
    const ctx = minimapCanvas.getContext("2d");
    ctx.clearRect(0, 0, 160, 110);

    const cw = parseInt(container.style.width) || 2000;
    const ch = parseInt(container.style.height) || 2000;
    const scaleX = 155 / cw, scaleY = 105 / ch;
    const s = Math.min(scaleX, scaleY);

    // Draw nodes
    drawMinimapNode(TREE_DATA, ctx, s);

    // Draw viewport rectangle
    const vx = canvas.scrollLeft / zoom * s;
    const vy = canvas.scrollTop / zoom * s;
    const vw = canvas.clientWidth / zoom * s;
    const vh = canvas.clientHeight / zoom * s;

    ctx.strokeStyle = "#c4b5fd";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx + 2, vy + 2, vw, vh);
  }

  function drawMinimapNode(node, ctx, s) {
    if (!node._visible) return;
    const colors = COLORS[node.color] || COLORS.general;
    ctx.fillStyle = colors.border;
    ctx.globalAlpha = node.edge ? 0.4 : 0.7;
    ctx.fillRect(node._x * s + 2, node._y * s + 2, Math.max(4, NODE_W * s), Math.max(2, nodeH(node) * s));
    ctx.globalAlpha = 1;
    if (node._expanded && node.children) node.children.forEach(c => drawMinimapNode(c, ctx, s));
  }

  canvas.addEventListener("scroll", updateMinimap);

  // ── Ctrl+Wheel Zoom ──
  canvas.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) window.zoomIn();
      else window.zoomOut();
    }
  }, { passive: false });

  // ── Keyboard shortcuts ──
  document.addEventListener("keydown", (e) => {
    if (e.key === "0" && !e.ctrlKey) window.resetZoom();
    if (e.key === "+" || e.key === "=") window.zoomIn();
    if (e.key === "-") window.zoomOut();
    if (e.ctrlKey && e.key === "f") { e.preventDefault(); searchBox.focus(); }
  });

  // ── Initial render ──
  TREE_DATA._expanded = true;
  render();
  updateBreadcrumb(TREE_DATA);

  // Set search placeholder
  searchBox.placeholder = `🔍 Search ${totalNodes} nodes...`;

})();
