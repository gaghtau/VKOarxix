// Генератор демонстрационных «цифровых копий» (SVG). Реальных сканов у команды нет,
// поэтому копии синтезируются из метаданных записи и явно маркируются как демонстрационные.
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function rnd(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); }
function wrap(text, n) {
  const out = []; let line = '';
  for (const w of String(text).split(/\s+/)) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; }
  if (line.trim()) out.push(line.trim());
  return out;
}

const PAPER = `<defs>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0.09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<radialGradient id="age" cx="50%" cy="45%" r="75%"><stop offset="55%" stop-color="#efe3c8"/><stop offset="100%" stop-color="#cdb98f"/></radialGradient>
<linearGradient id="sepia" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9c7a3"/><stop offset="1" stop-color="#8a7350"/></linearGradient>
</defs>`;

function watermark(w, h) {
  return `<g opacity="0.16" transform="rotate(-28 ${w / 2} ${h / 2})"><text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="Arial" font-size="${w / 16}" font-weight="700" fill="#3b2a12">ГОСАРХИВ ВКО · ДЕМО-КОПИЯ</text></g>`;
}
function stamp(x, y, r) {
  return `<g opacity="0.55" fill="none" stroke="#5a3fbf" stroke-width="2.4"><circle cx="${x}" cy="${y}" r="${r}"/><circle cx="${x}" cy="${y}" r="${r - 8}"/>
  <text x="${x}" y="${y + 5}" text-anchor="middle" font-family="Arial" font-size="13" fill="#5a3fbf" stroke="none" font-weight="700">ГОСАРХИВ</text>
  <text x="${x}" y="${y + 22}" text-anchor="middle" font-family="Arial" font-size="10" fill="#5a3fbf" stroke="none">ВКО</text></g>`;
}

function textPage(r, page, pages) {
  const W = 800, H = 1100, R = rnd(r.id * 31 + page);
  const year = r.date_from || '';
  const head = page === 1 ? `<text x="400" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="2" fill="#2b2115">${esc(r.author || 'УЧРЕЖДЕНИЕ')}</text>
  <line x1="180" y1="140" x2="620" y2="140" stroke="#2b2115" stroke-width="1"/>
  <text x="400" y="190" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="700" fill="#2b2115">${esc((r.title.ru.split(' ')[0] || 'Документ').toUpperCase())}</text>
  <text x="400" y="222" text-anchor="middle" font-family="Georgia, serif" font-size="17" font-style="italic" fill="#3b2f1f">${year} г.</text>` : '';
  const body = page === 1 ? [r.title.ru + '.', r.descr?.ru || ''].join(' ') : (r.descr?.ru || '') + ' ' + 'Продолжение текста документа. Оборот листа содержит подписи, визы и отметки об исполнении.';
  let y = page === 1 ? 290 : 140;
  const lines = wrap(body, 52).slice(0, 8);
  let g = lines.map((l) => { const t = `<text x="110" y="${y}" font-family="'Courier New', monospace" font-size="21" fill="#2a2016">${esc(l)}</text>`; y += 38; return t; }).join('');
  // «Рукописные» строки-заглушки
  for (let i = 0; i < 9; i++) {
    y += 34; const len = 380 + R() * 220;
    g += `<path d="M110 ${y} q ${len / 4} ${-6 + R() * 12} ${len / 2} 0 t ${len / 2} 0" stroke="#3a2c1c" stroke-width="2" fill="none" opacity="${0.35 + R() * 0.3}"/>`;
  }
  const sign = page === pages ? `<text x="110" y="${H - 170}" font-family="Georgia, serif" font-size="18" fill="#2b2115">Председатель</text><path d="M260 ${H - 175} c 30 -30 50 20 80 -5 s 40 -10 70 5" stroke="#1d3a6b" stroke-width="2.4" fill="none"/>${stamp(560, H - 190, 56)}` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(r.title.ru)} — лист ${page}">${PAPER}
<rect width="${W}" height="${H}" fill="url(#age)"/>
<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="#b39d73" stroke-dasharray="2 6" opacity=".5"/>
${head}${g}${sign}
<text x="${W - 60}" y="${H - 50}" text-anchor="end" font-family="Arial" font-size="15" fill="#5b4a33">${esc(r.cipher || '')} · л. ${page}</text>
${watermark(W, H)}</svg>`;
}

function scene(motif, R) {
  const hills = (y, c, amp) => { let d = `M0 ${y}`; for (let x = 0; x <= 1000; x += 100) d += ` Q ${x + 50} ${y - amp * R()} ${x + 100} ${y - amp * 0.3 * R()}`; return `<path d="${d} L1000 700 L0 700Z" fill="${c}"/>`; };
  const building = (x, w, h, base = 520) => { let s = `<rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="#4d3b25"/>`; for (let yy = base - h + 14; yy < base - 14; yy += 22) for (let xx = x + 8; xx < x + w - 10; xx += 18) s += `<rect x="${xx}" y="${yy}" width="9" height="12" fill="#c9b38a" opacity=".7"/>`; return s; };
  const crowd = (y, n) => { let s = ''; for (let i = 0; i < n; i++) { const x = R() * 1000, yy = y + R() * 120; s += `<circle cx="${x}" cy="${yy}" r="${9 + R() * 4}" fill="#2e2316"/><rect x="${x - 10}" y="${yy + 9}" width="20" height="40" rx="7" fill="#3a2c1c"/>`; } return s; };
  switch (motif) {
    case 'river': return hills(330, '#a68d66', 80) + `<rect y="430" width="1000" height="270" fill="#7d6a4d"/><path d="M0 470 C 300 450 600 500 1000 460" stroke="#d8c7a5" stroke-width="3" opacity=".6"/>` + building(80, 120, 90, 430) + building(230, 70, 60, 430) + `<rect x="600" y="410" width="160" height="20" fill="#3a2c1c"/>`;
    case 'street': return building(30, 180, 230) + building(240, 140, 170) + building(620, 200, 260) + building(850, 120, 150) + `<rect y="520" width="1000" height="180" fill="#6e5b40"/><path d="M500 520 L 380 700 M500 520 L 620 700" stroke="#d6c39d" stroke-width="3"/>` + crowd(540, 10);
    case 'crowd': return building(0, 260, 220, 420) + building(740, 260, 240, 420) + `<rect y="420" width="1000" height="280" fill="#7a6648"/><rect x="420" y="260" width="160" height="40" fill="#5c1f1f" opacity=".8"/>` + crowd(430, 70);
    case 'building': return hills(380, '#b19a72', 40) + building(80, 160, 300) + building(300, 160, 300) + building(520, 160, 260) + `<path d="M760 520 V120 M700 140 H900" stroke="#2e2316" stroke-width="10"/><rect y="520" width="1000" height="180" fill="#6e5b40"/>`;
    case 'factory': return `<rect width="1000" height="700" fill="#5a4730"/><rect x="0" y="380" width="1000" height="320" fill="#3a2c1c"/><circle cx="520" cy="420" r="120" fill="#f0d79a" opacity=".85"/><circle cx="520" cy="420" r="200" fill="#f0d79a" opacity=".2"/>` + crowd(470, 6) + `<path d="M100 100 V380 M900 60 V380" stroke="#221a10" stroke-width="40"/>`;
    case 'dam': return hills(300, '#9d855e', 160) + `<rect x="300" y="300" width="400" height="260" fill="#5a4730"/><path d="M300 300 H700" stroke="#2a2016" stroke-width="12"/>` + `<rect y="560" width="1000" height="140" fill="#8a7656"/>` + `<path d="M760 120 V300 M720 140 H880 M880 140 V200" stroke="#2a2016" stroke-width="8" fill="none"/>`;
    case 'mountains': return `<path d="M0 450 L 220 140 L 380 360 L 560 90 L 780 380 L 1000 200 V700 H0Z" fill="#7b6646"/><path d="M520 140 L560 90 L600 140Z" fill="#efe3c8"/>` + hills(520, '#9a845f', 50) + Array.from({ length: 8 }, (_, i) => `<rect x="${120 + i * 95}" y="${560 + (i % 2) * 20}" width="44" height="38" fill="#3a2c1c"/>`).join('');
    case 'fortress': return hills(360, '#a68d66', 60) + `<rect y="470" width="1000" height="230" fill="#7d6a4d"/><path d="M200 470 V330 H300 V300 H340 V330 H700 V300 H740 V330 H820 V470Z" fill="#4d3b25"/><path d="M500 330 V230 L 520 200 L 540 230 V330" fill="#3a2c1c"/>`;
    case 'map': default: return '';
  }
}

function photoPage(r) {
  const R = rnd(r.id * 17);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="860" viewBox="0 0 1100 860" role="img" aria-label="${esc(r.title.ru)}">${PAPER}
<rect width="1100" height="860" fill="#efe6d2"/><rect x="50" y="50" width="1000" height="700" fill="url(#sepia)"/>
<g transform="translate(50 50)"><svg viewBox="0 0 1000 700" width="1000" height="700"><rect width="1000" height="700" fill="url(#sepia)"/>${scene(r.motif, R)}</svg></g>
<text x="550" y="800" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-style="italic" fill="#3b2f1f">${esc(r.title.ru)}${r.date_from ? ', ' + (r.date_uncertain ? 'ок. ' : '') + r.date_from : ''}</text>
<text x="1040" y="835" text-anchor="end" font-family="Arial" font-size="15" fill="#6b5a40">${esc(r.cipher || '')}</text>${watermark(1100, 860)}</svg>`;
}

function mapPage(r) {
  const R = rnd(r.id * 13);
  let grid = ''; for (let i = 1; i < 10; i++) grid += `<path d="M${i * 110} 40 V820 M40 ${i * 82} H1060" stroke="#8c7550" stroke-width=".6" opacity=".5"/>`;
  let blocks = ''; for (let i = 0; i < 40; i++) { const x = 200 + R() * 600, y = 200 + R() * 400; blocks += `<rect x="${x}" y="${y}" width="${20 + R() * 40}" height="${16 + R() * 30}" fill="#9c7f55" opacity=".55" transform="rotate(${R() * 20 - 10} ${x} ${y})"/>`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="860" viewBox="0 0 1100 860" role="img" aria-label="${esc(r.title.ru)}">${PAPER}
<rect width="1100" height="860" fill="url(#age)"/>${grid}
<path d="M40 300 C 300 260 420 420 640 380 S 950 300 1060 340" stroke="#4f6b88" stroke-width="26" fill="none" opacity=".7"/>
<path d="M640 380 C 700 500 780 620 820 820" stroke="#4f6b88" stroke-width="14" fill="none" opacity=".7"/>${blocks}
<text x="560" y="110" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="700" fill="#2b2115">${esc(r.title.ru)}</text>
<text x="300" y="250" font-family="Georgia, serif" font-style="italic" font-size="20" fill="#2f4760">р. Иртышъ</text>
<g transform="translate(960 720)"><circle r="40" fill="none" stroke="#2b2115"/><path d="M0 -36 L8 0 L0 36 L-8 0Z" fill="#2b2115"/><text y="-46" text-anchor="middle" font-family="Georgia" font-size="16">С</text></g>
<rect x="40" y="40" width="1020" height="780" fill="none" stroke="#2b2115" stroke-width="3"/>

<text x="1040" y="845" text-anchor="end" font-family="Arial" font-size="15" fill="#5b4a33">${esc(r.cipher || '')}</text>${watermark(1100, 860)}</svg>`;
}

export function renderScan(r, page = 1) {
  if (r.doc_type === 'photo') return photoPage(r);
  if (r.doc_type === 'map') return mapPage(r);
  return textPage(r, page, r.pages || 1);
}

export function restrictedSvg(msg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#1F3D2B"/><text x="400" y="230" text-anchor="middle" font-family="Arial" font-size="30" fill="#E8DCC4">Доступ ограничен</text><text x="400" y="275" text-anchor="middle" font-family="Arial" font-size="18" fill="#E8DCC4" opacity=".8">${esc(msg)}</text></svg>`;
}
