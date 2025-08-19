async function loadData() {
  const res = await fetch('data/reviews.json');
  return await res.json();
}

function brandColor(brand) {
  switch (brand) {
    case 'Guinness': return '#1a1a1a';
    case "Murphy's": return '#3b5';
    case 'Beamish': return '#b33';
    case 'Craft': return '#26c';
    default: return '#666';
  }
}

function makeMarker(lat, lng, color) {
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  return L.marker([lat, lng], { icon });
}

function initMap(elementId, items, filterBrands=null) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const map = L.map(el).setView([53.5, -7.7], 6); // Ireland centric
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const markers = [];

  items.forEach(it => {
    if (filterBrands && !filterBrands.has(it.brand)) return;
    const m = makeMarker(it.lat, it.lng, brandColor(it.brand)).addTo(map);
    const target = it.target_locked ? ' 🎯 Target locked' : '';
    const img = it.image_url ? `<img src="${it.image_url}" alt="${it.bar} ${it.brand}" style="width:100%;max-width:260px;border-radius:8px;margin-bottom:6px">` : '';
    m.bindPopup(`
      ${img}
      <strong>${it.bar}</strong><br>
      ${it.city}, ${it.country}<br>
      <span class="badge">${it.brand}</span> — <strong>${it.overall}/10</strong>${target}<br>
      <em>${it.one_liner}</em><br>
      <a href="reviews.html#${it.id}">Read review</a>
    `);
    markers.push(m);
  });

  if (markers.length) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }

  return map;
}

function renderFeatured(items) {
  const el = document.getElementById('featured');
  if (!el) return;
  const top = [...items].sort((a,b)=>b.overall - a.overall).slice(0,3);
  el.innerHTML = top.map(it => `
    <article class="card" id="card-${it.id}">
      <img src="${it.image_url}" alt="${it.bar} ${it.brand}">
      <div class="pad">
        <div class="small"><span class="badge">${it.brand}</span> • ${it.city}</div>
        <h3 style="margin:.4rem 0;">${it.bar}</h3>
        <p class="small">${it.one_liner}</p>
        <p><strong>${it.overall}/10</strong></p>
        <a class="btn secondary" href="reviews.html#${it.id}">Read review</a>
      </div>
    </article>
  `).join('');
}

function renderTargetLocked(items) {
  const el = document.getElementById('targetLocked');
  if (!el) return;
  const t = items.find(i => i.target_locked);
  if (!t) { el.innerHTML = '<p class="small">No target set yet.</p>'; return; }
  el.innerHTML = `
    <div class="grid">
      <article class="card">
        <img src="${t.image_url}" alt="${t.bar} ${t.brand}">
        <div class="pad">
          <div class="small"><span class="badge">${t.brand}</span> • ${t.city}</div>
          <h3 style="margin:.4rem 0;">${t.bar}</h3>
          <p class="small">${t.one_liner}</p>
          <p><strong>${t.overall}/10</strong> — 🎯 Target locked</p>
          <a class="btn secondary" href="reviews.html#${t.id}">Read review</a>
        </div>
      </article>
    </div>
  `;
}

function renderLeaderboard(items) {
  const el = document.getElementById('leaderboard');
  if (!el) return;

  const byBrand = {};
  items.forEach(i => {
    if (!byBrand[i.brand]) byBrand[i.brand] = [];
    byBrand[i.brand].push(i.overall);
  });

  const rows = Object.entries(byBrand).map(([brand, scores]) => {
    const avg = (scores.reduce((a,b)=>a+b,0) / scores.length).toFixed(1);
    return { brand, avg: Number(avg), count: scores.length };
  }).sort((a,b)=>b.avg - a.avg);

  el.innerHTML = `
    <table>
      <thead><tr><th>Brand</th><th>Average</th><th>Reviews</th></tr></thead>
      <tbody>
        ${rows.map(r => `<tr><td>${r.brand}</td><td>${r.avg}</td><td>${r.count}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

function renderReviewsGrid(items) {
  const el = document.getElementById('reviewsGrid');
  if (!el) return;

  const hash = window.location.hash.replace('#','');

  el.innerHTML = items.map(it => `
    <article class="card" id="${it.id}">
      <img src="${it.image_url}" alt="${it.bar} ${it.brand}">
      <div class="pad">
        <div class="small"><span class="badge">${it.brand}</span> • ${it.city}, ${it.country} • ${new Date(it.date).toLocaleDateString()}</div>
        <h3 style="margin:.4rem 0;">${it.bar}</h3>
        <p>${it.one_liner}</p>
        <p class="small">Appearance ${'★'.repeat(it.appearance)} &nbsp; Creaminess ${'★'.repeat(it.creaminess)} &nbsp; Mouthfeel ${'★'.repeat(it.mouthfeel)} &nbsp; Taste ${'★'.repeat(it.taste)}</p>
        <p><strong>Overall ${it.overall}/10</strong> ${it.target_locked ? ' — 🎯' : ''}</p>
      </div>
    </article>
  `).join('');

  if (hash) {
    const elTarget = document.getElementById(hash);
    if (elTarget) elTarget.scrollIntoView({ behavior: 'smooth' });
  }
}

async function bootstrap() {
  const data = await loadData();

  // Home
  renderFeatured(data);
  renderTargetLocked(data);
  renderLeaderboard(data);
  initMap('mapPreview', data);

  // Map
  const mapEl = document.getElementById('map');
  if (mapEl) {
    let active = new Set(['Guinness', "Murphy's", 'Beamish', 'Craft', 'Other']);
    const filters = document.querySelectorAll('.filter');
    filters.forEach(cb => cb.addEventListener('change', () => {
      active = new Set(Array.from(filters).filter(x=>x.checked).map(x=>x.value));
      initMap('map', data, active);
    }));
    initMap('map', data, active);
  }

  // Reviews
  renderReviewsGrid(data);
}
bootstrap();
