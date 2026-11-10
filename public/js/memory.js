import { S, t, tr, esc, L, api, docCard, pageHead, fileUrl, lightbox, share, years, demoTag, trBadge, errorBox } from './core.js';
import { icon } from './icons.js';

const X = (o) => o[S.lang] ?? o.ru;
const LF = () => window.L; // Leaflet (глобальное имя L занято помощником ссылок)

// ---------------------------------------------------------------- Большой архив памяти
export async function memory() {
  const [cols, persons, events] = await Promise.all([api('/api/content/collection', { cache: true }), api('/api/content/person', { cache: true }), api('/api/content/event', { cache: true })]);
  const R = S.lang;
  const html = `${pageHead(esc(t('menu.memory')[0]), esc({ ru: 'Цифровое пространство исторической памяти Восточного Казахстана: тематические коллекции, страницы личностей, хронология и историческая карта.', kz: 'Шығыс Қазақстанның тарихи жадының цифрлық кеңістігі.', en: 'A digital space for the historical memory of East Kazakhstan.' }[R]), [[t('menu.memory')[0]]])}
  <div class="wrap section" style="padding-top:28px">
    <form class="adv" data-ms style="grid-template-columns:2fr 1fr 1fr 1fr auto;margin:0 0 30px"><div class="field"><label for="ms-q">${esc({ ru: 'Тема или ключевые слова', kz: 'Тақырып немесе кілт сөздер', en: 'Topic or keywords' }[R])}</label><input id="ms-q" class="input" name="q" placeholder="${esc({ ru: 'например: школа, ГЭС, письма', kz: 'мысалы: мектеп, СЭС', en: 'e.g. school, dam, letters' }[R])}"></div>
      <div class="field"><label for="ms-p">${esc(t('cat.period'))}</label><select id="ms-p" class="input" name="p"><option value="">—</option><option value="1700-1916">${esc({ ru: 'до 1917', kz: '1917 дейін', en: 'before 1917' }[R])}</option><option value="1917-1940">1917–1940</option><option value="1941-1945">1941–1945</option><option value="1946-1991">1946–1991</option><option value="1991-2026">${esc({ ru: 'после 1991', kz: '1991 кейін', en: 'after 1991' }[R])}</option></select></div>
      <div class="field"><label for="ms-pl">${esc(t('cat.place'))}</label><select id="ms-pl" class="input" name="place"><option value="">—</option>${['Усть-Каменогорск', 'Риддер', 'Алтай', 'Зайсан', 'Шемонаиха', 'Катон-Карагай', 'Серебрянск'].map((p) => `<option>${p}</option>`).join('')}</select></div>
      <div class="field"><label>&nbsp;</label><label class="fopt"><input type="checkbox" name="gal"> ${esc({ ru: 'Галерея', kz: 'Галерея', en: 'Gallery' }[R])}</label></div>
      <div class="field" style="align-self:end"><button class="btn btn-accent">${icon('search')}${esc(t('cat.search'))}</button></div></form>
    <h2>${esc({ ru: 'Тематические коллекции', kz: 'Тақырыптық жинақтар', en: 'Thematic collections' }[R])}</h2>
    <div class="grid g3">${cols.map((c, i) => `<a class="card card-link" href="${L('memory/collection/' + c.slug)}" style="${i === 0 ? 'background:var(--green);color:#EFE6D2;border:0' : ''}"><span class="tag ${i === 0 ? 'tag-accent' : ''}">${c.count} ${esc({ ru: 'материалов', kz: 'материал', en: 'items' }[R])}</span><h3 style="margin-top:12px;${i === 0 ? 'color:#F5EEDF' : ''}">${esc(tr(c.title))}</h3><span class="small ${i === 0 ? '' : 'muted'}">${esc(c.topics.join(' · '))}</span></a>`).join('')}</div>
    <div class="grid g2" style="margin-top:40px">
      <a class="card card-link" href="${L('memory/timeline')}"><div class="eyebrow">${esc(t('menu.timeline')[0])}</div><h3>${esc({ ru: 'От крепости 1720 года до наших дней', kz: '1720 жылғы бекіністен бүгінге дейін', en: 'From the 1720 fortress to today' }[R])}</h3><div class="row" style="margin-top:10px;gap:6px">${events.slice(0, 8).map((e) => `<span class="tag">${e.year}</span>`).join('')}…</div></a>
      <a class="card card-link" href="${L('memory/map')}"><div class="eyebrow">${esc(t('menu.histmap')[0])}</div><h3>${esc({ ru: 'Места и объекты из архивных документов', kz: 'Архив құжаттарындағы орындар', en: 'Places mentioned in archival documents' }[R])}</h3><p class="small muted" style="margin:0">${esc({ ru: 'Крепости, ГЭС, рудники и места событий — отдельно от карты филиалов.', kz: 'Бекіністер, СЭС, кеніштер.', en: 'Fortresses, dams, mines — separate from the branches map.' }[R])}</p></a></div>
    <h2 style="margin-top:40px">${esc({ ru: 'Личности региона', kz: 'Өңір тұлғалары', en: 'People of the region' }[R])}</h2>
    <div class="grid g3">${persons.map((p) => `<a class="card card-link" href="${L('memory/person/' + p.slug)}"><div class="row" style="gap:14px"><span class="logo-mark" style="border-radius:50%;width:52px;height:52px;font-family:var(--serif);color:#E8DCC4;font-size:1.3rem">${esc(tr(p.name).split(' ').slice(0, 2).map((w) => w[0]).join(''))}</span><div><b>${esc(tr(p.name))}</b><div class="small muted">${esc(p.years)}</div></div></div><p class="small" style="margin:12px 0 0">${esc(tr(p.bio))}</p></a>`).join('')}</div>
    <div class="notice" style="margin-top:30px">${icon('info')}<div><p class="small">${esc({ ru: 'Каждая публикация содержит источник. Редакционные пояснения отделены от фактов с архивным источником; неподтверждённые датировки и авторство помечены. Пополнение раздела — через административную панель с согласованием.', kz: 'Әр жарияланымда дереккөз бар. Расталмаған деректер белгіленген.', en: 'Every entry cites a source; unconfirmed dates and authorship are flagged.' }[R])}</p></div></div>
  </div>`;
  return {
    title: t('menu.memory')[0], html,
    after(root) {
      root.querySelector('[data-ms]').onsubmit = (e) => {
        e.preventDefault(); const f = new FormData(e.target); const q = new URLSearchParams();
        if (f.get('q')) q.set('q', f.get('q')); if (f.get('place')) q.set('place', f.get('place'));
        if (f.get('p')) { const [a, b] = f.get('p').split('-'); q.set('from', a); q.set('to', b); }
        if (f.get('gal')) q.set('digital', '1');
        S.navigate(L('catalog') + '?' + q);
      };
      const mq = matchMedia('(max-width: 1000px)'); if (mq.matches) root.querySelector('[data-ms]').style.gridTemplateColumns = '1fr';
    },
  };
}
export async function collection(slug) {
  const c = await api('/api/content/collection/' + slug);
  const dig = c.items.filter((i) => i.access.digital);
  const rest = c.items.filter((i) => !i.access.digital);
  const html = `${pageHead(esc(tr(c.title)), esc(c.topics.join(' · ')), [[t('menu.memory')[0], L('memory')], [tr(c.title)]])}
  <div class="wrap section" style="padding-top:28px">
    ${dig.length ? `<h2 style="font-size:1.3rem">${esc({ ru: 'Галерея', kz: 'Галерея', en: 'Gallery' }[S.lang])}</h2><div class="grid g4" data-gal>${dig.map((d, i) => `<button class="tile" style="border:0;padding:0;text-align:left;cursor:zoom-in" data-i="${i}"><div class="img"><img src="${fileUrl(d.id)}" alt="${esc(tr(d.title))}" loading="lazy"></div><div class="body"><b class="small">${esc(tr(d.title))}</b><span class="small muted">${esc(years(d))} · ${esc(d.cipher)}</span></div></button>`).join('')}</div>` : ''}
    ${rest.length ? `<h2 style="font-size:1.3rem;margin-top:30px">${esc({ ru: 'Описания без цифровой копии', kz: 'Цифрлық көшірмесіз сипаттамалар', en: 'Descriptions without digital copy' }[S.lang])}</h2><div class="grid g2">${rest.map(docCard).join('')}</div>` : ''}
    ${!c.items.length ? `<div class="empty">${icon('folder')}<h3>${esc(t('cat.noResults'))}</h3></div>` : ''}
  </div>`;
  return { title: tr(c.title), html, after(r) { r.querySelector('[data-gal]')?.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) lightbox(dig.map((d) => ({ src: fileUrl(d.id), title: tr(d.title), caption: `<a href="${L('catalog/' + d.id)}" style="color:#D9CBFF">${esc(d.cipher)}</a> · ${esc(years(d))}` })), +b.dataset.i); }); } };
}
export async function person(slug) {
  const [persons, res] = await Promise.all([api('/api/content/person', { cache: true }), api(`/api/catalog/search?q=${encodeURIComponent('')}&per=6`, { cache: true })]);
  const p = persons.find((x) => x.slug === slug); if (!p) { const e = new Error(); e.status = 404; throw e; }
  const html = `${pageHead(esc(tr(p.name)), esc(p.years), [[t('menu.memory')[0], L('memory')], [tr(p.name)]])}
  <div class="wrap section" style="padding-top:28px"><div class="layout-side"><div class="card" style="text-align:center"><span class="logo-mark" style="margin:0 auto 12px;width:120px;height:120px;border-radius:50%;font-family:var(--serif);color:#E8DCC4;font-size:2.6rem">${esc(tr(p.name).split(' ').slice(0, 2).map((w) => w[0]).join(''))}</span><b>${esc(tr(p.name))}</b><div class="muted">${esc(p.years)}</div></div>
  <div class="prose"><h2 style="margin-top:0">${esc({ ru: 'Биографическая справка', kz: 'Өмірбаяндық анықтама', en: 'Biographical note' }[S.lang])}</h2><p>${esc(tr(p.bio))}</p>
  <p class="small muted">${esc(t('source'))}: ${esc(p.source)}</p>
  <div class="notice warn">${icon('alert')}<div><p class="small">${esc({ ru: 'Справка ограничена сведениями подтверждённого источника. Расширенная биография, фотографии и документы личного фонда (при наличии) публикуются после проверки специалистом.', kz: 'Анықтама расталған дереккөз мәліметтерімен шектелген.', en: 'The note is limited to confirmed source data.' }[S.lang])}</p></div></div>
  <a class="btn" href="${L('catalog?q=' + encodeURIComponent(tr(p.name).split(' ')[0]))}">${icon('search')}${esc({ ru: 'Искать упоминания в каталоге', kz: 'Каталогтан іздеу', en: 'Search the catalogue' }[S.lang])}</a></div></div></div>`;
  void res;
  return { title: tr(p.name), html };
}
export async function timelinePage() {
  const events = await api('/api/content/event', { cache: true });
  const topics = [...new Set(events.map((e) => e.topic))];
  const periods = [['all', { ru: 'Все', kz: 'Барлығы', en: 'All' }, 0, 3000], ['early', { ru: 'До 1917', kz: '1917 дейін', en: 'Before 1917' }, 0, 1916], ['soviet', { ru: '1917–1991', kz: '1917–1991', en: '1917–1991' }, 1917, 1990], ['ind', { ru: 'С 1991', kz: '1991 бастап', en: 'Since 1991' }, 1991, 3000]];
  const html = `${pageHead(esc(t('menu.timeline')[0]), esc({ ru: 'Интерактивная хронология истории Восточно-Казахстанской области и архива. Выберите период или тематику, откройте связанные документы.', kz: 'Интерактивті хронология.', en: 'An interactive timeline of the region and the archive.' }[S.lang]), [[t('menu.memory')[0], L('memory')], [t('menu.timeline')[0]]])}
  <div class="wrap section" style="padding-top:26px">
    <div class="row" style="margin-bottom:10px" data-per>${periods.map(([k, l], i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-p="${k}" aria-pressed="${i === 0}">${esc(X(l))}</button>`).join('')}</div>
    <div class="row" style="margin-bottom:24px" data-top><span class="small muted">${esc(t('cat.topic'))}:</span>${topics.map((tp) => `<button class="chip" data-t="${esc(tp)}" aria-pressed="false">${esc(tp)}</button>`).join('')}</div>
    <ol class="timeline" data-tl></ol>
    <p class="small muted">${esc({ ru: '«Редакционная справка» — пояснение редакции сайта без архивного источника.', kz: '«Редакциялық анықтама» — архивтік дереккөзсіз түсініктеме.', en: '"Editorial note" — explanation without an archival source.' }[S.lang])}</p>
  </div>`;
  return {
    title: t('menu.timeline')[0], html,
    after(root) {
      let per = 'all'; const tops = new Set();
      const draw = () => {
        const [, , a, b] = periods.find((p) => p[0] === per);
        const list = events.filter((e) => e.year >= a && e.year <= b && (!tops.size || tops.has(e.topic)));
        root.querySelector('[data-tl]').innerHTML = list.length ? list.map((e) => `<li class="tl-item"><div class="tl-year">${e.year}</div><div class="tl-dot"></div><div class="tl-body"><div class="row" style="gap:6px;margin-bottom:6px"><span class="tag">${esc(e.topic)}</span>${e.editorial ? `<span class="tag tag-warn">${esc({ ru: 'редакционная справка', kz: 'редакциялық анықтама', en: 'editorial note' }[S.lang])}</span>` : ''}</div><h3>${esc(tr(e.title))}${trBadge(e.title)}</h3>
          ${e.docRef ? `<a class="row" style="gap:10px;margin-top:8px;text-decoration:none" href="${L('catalog/' + e.docRef.id)}">${e.docRef.access.digital ? `<img src="${fileUrl(e.docRef.id)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px" loading="lazy">` : ''}<span class="small"><span class="cipher">${esc(e.docRef.cipher)}</span><br>${esc(tr(e.docRef.title))}</span></a>` : ''}
          <div class="small muted" style="margin-top:6px">${esc(t('source'))}: ${esc(e.source)}</div></div></li>`).join('') : `<div class="empty">${esc(t('cat.noResults'))}</div>`;
      };
      root.querySelector('[data-per]').onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; per = b.dataset.p; root.querySelectorAll('[data-p]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); draw(); };
      root.querySelector('[data-top]').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; tops.has(b.dataset.t) ? tops.delete(b.dataset.t) : tops.add(b.dataset.t); b.classList.toggle('on'); b.setAttribute('aria-pressed', tops.has(b.dataset.t)); draw(); };
      draw();
    },
  };
}

// ---------------------------------------------------------------- Карты
function baseMap(el, { sepia = false, center = [49.4, 83.6], zoom = 7, scroll = true } = {}) {
  const Lf = LF(); if (!Lf || !el) return null;
  const map = Lf.map(el, { scrollWheelZoom: scroll, zoomControl: true }).setView(center, zoom);
  const tiles = Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map);
  if (sepia) el.classList.add('map-sepia');
  let failed = 0; tiles.on('tileerror', () => { if (++failed === 6) el.insertAdjacentHTML('beforeend', `<div class="bcard" style="top:16px;bottom:auto">${icon('alert')} ${esc({ ru: 'Картографический сервис недоступен. Адреса и ссылки на маршрут доступны в списке.', kz: 'Карта қызметі қолжетімсіз. Мекенжайлар тізімде.', en: 'Map service unavailable. Addresses and route links remain in the list.' }[S.lang])}</div>`); });
  return map;
}
const pinIcon = (b, sel) => LF().divIcon({ className: '', html: `<div class="pin ${b.type === 'main' ? 'main' : ''} ${sel ? 'sel' : ''}"><i>${b.type === 'main' ? '★' : ''}</i></div>`, iconSize: [30, 30], iconAnchor: [15, 30] });

export function miniMap(el, branches) {
  const map = baseMap(el, { scroll: false, zoom: 6 });
  if (!map) { if (el) el.innerHTML = `<div class="map-fallback">${icon('map')}</div>`; return null; }
  const Lf = LF(); const pts = [];
  branches.forEach((b) => { pts.push([b.lat, b.lng]); Lf.marker([b.lat, b.lng], { icon: pinIcon(b), title: tr(b.name), keyboard: true }).addTo(map).on('click', () => S.navigate(L('branches?b=' + b.slug))); });
  if (pts.length) map.fitBounds(pts, { padding: [24, 24] });
  return () => map.remove();
}

const TYPES = { all: { ru: 'Все', kz: 'Барлығы', en: 'All' }, main: { ru: 'Главное здание', kz: 'Бас ғимарат', en: 'Main building' }, city: { ru: 'Городские', kz: 'Қалалық', en: 'City' }, district: { ru: 'Районные', kz: 'Аудандық', en: 'District' }, personnel: { ru: 'По личному составу', kz: 'Жеке құрам бойынша', en: 'Personnel records' } };
const hav = (a, b) => { const R = 6371, dLat = ((b[0] - a[0]) * Math.PI) / 180, dLng = ((b[1] - a[1]) * Math.PI) / 180; const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

export async function branches() {
  const list = S.meta?.branches || (await api('/api/meta')).branches;
  const sel0 = new URLSearchParams(location.search).get('b');
  const R = S.lang;
  const html = `${pageHead(esc({ ru: 'Филиалы и карта', kz: 'Филиалдар және карта', en: 'Branches & map' }[R]), esc({ ru: 'Главное здание архива и 13 филиалов. Выберите филиал, чтобы увидеть контакты, режим работы и построить маршрут.', kz: 'Бас ғимарат және 13 филиал.', en: 'The main building and 13 branches. Select one for contacts and routes.' }[R]), [[t('nav.branches')]])}
  <div class="wrap section" style="padding-top:26px">
    <div class="map-layout">
      <div class="map-list"><div class="head"><div class="sb" style="position:relative">${icon('search').replace('<svg', '<svg style="position:absolute;left:12px;top:50%;translate:0 -50%;width:17px;color:var(--muted)"')}<input class="input" data-bq placeholder="${esc({ ru: 'Название или населённый пункт', kz: 'Атауы немесе елді мекен', en: 'Name or town' }[R])}" aria-label="search" style="padding-left:38px"></div>
        <div class="row" style="gap:6px" data-bt>${Object.keys(TYPES).map((k, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-type="${k}" aria-pressed="${i === 0}">${esc(X(TYPES[k]))}</button>`).join('')}</div></div>
        <div class="items" data-items role="list"></div></div>
      <div style="position:relative"><div id="map" class="map" role="region" aria-label="${esc({ ru: 'Карта филиалов', kz: 'Филиалдар картасы', en: 'Branches map' }[R])}"></div><div data-card></div></div>
    </div>
    <p class="small muted" style="margin-top:12px">${icon('info', 'sr-hide')}${esc({ ru: 'Адреса, руководители и телефоны — по данным заказчика. Координаты на карте приблизительные (по населённому пункту) и требуют подтверждения; ориентируйтесь на текстовый адрес.', kz: 'Картадағы координаттар шамамен берілген; мәтіндік мекенжайға сүйеніңіз.', en: 'Coordinates are approximate and pending confirmation; rely on the text address.' }[R])}</p>
  </div>`;
  return {
    title: t('nav.branches'), html,
    after(root) {
      let type = 'all', q = '', sel = sel0, me = null, line = null;
      const map = baseMap(root.querySelector('#map'));
      if (!map) root.querySelector('#map').innerHTML = `<div class="map-fallback"><div>${icon('map')}<p>${esc({ ru: 'Карта недоступна. Воспользуйтесь списком и внешними ссылками на маршрут.', kz: 'Карта қолжетімсіз. Тізімді пайдаланыңыз.', en: 'Map unavailable. Use the list and external route links.' }[R])}</p></div></div>`;
      const markers = {};
      if (map) list.forEach((b) => { markers[b.slug] = LF().marker([b.lat, b.lng], { icon: pinIcon(b), title: tr(b.name), keyboard: true, alt: tr(b.name) }).addTo(map).on('click', () => select(b.slug)); });
      const filtered = () => list.filter((b) => (type === 'all' || b.type === type) && (!q || (tr(b.name) + ' ' + b.city + ' ' + b.address).toLowerCase().includes(q)));
      const drawList = () => {
        const f = filtered();
        root.querySelector('[data-items]').innerHTML = f.length ? f.map((b) => `<button class="bitem" role="listitem" data-b="${b.slug}" aria-pressed="${b.slug === sel}"><b>${esc(tr(b.name))}${trBadge(b.name)}</b><span>${esc(b.address)}</span>${me ? `<span class="tag" style="margin-top:4px">${hav(me, [b.lat, b.lng]).toFixed(0)} км</span>` : ''}</button>`).join('') : `<div class="empty small">${esc(t('cat.noResults'))}</div>`;
        Object.entries(markers).forEach(([slug, m]) => { const vis = f.some((b) => b.slug === slug); m.setOpacity(vis ? 1 : 0.25); });
      };
      const routeLinks = (b, origin, mode = 'driving') => {
        const dest = `${b.lat},${b.lng}`;
        const g = `https://www.google.com/maps/dir/?api=1${origin ? '&origin=' + encodeURIComponent(origin) : ''}&destination=${encodeURIComponent(dest)}&travelmode=${mode}`;
        const osm = `https://www.openstreetmap.org/directions?engine=${mode === 'walking' ? 'fossgis_osrm_foot' : 'fossgis_osrm_car'}&route=${origin && /^-?\d/.test(origin) ? encodeURIComponent(origin.replace(',', ',')) : ''}%3B${encodeURIComponent(dest)}`;
        const gis = `https://2gis.kz/search/${encodeURIComponent(b.address)}`;
        return `<div class="row" style="gap:6px"><a class="btn btn-sm btn-accent" href="${g}" target="_blank" rel="noopener">${icon('route')}Google Maps ↗</a><a class="btn btn-sm" href="${gis}" target="_blank" rel="noopener">2GIS ↗</a><a class="btn btn-sm" href="${osm}" target="_blank" rel="noopener">OSM ↗</a></div>`;
      };
      function select(slug, fly = true) {
        sel = slug; const b = list.find((x) => x.slug === slug); if (!b) return;
        history.replaceState(null, '', L('branches?b=' + slug));
        drawList();
        Object.entries(markers).forEach(([s, m]) => m.setIcon(pinIcon(list.find((x) => x.slug === s), s === slug)));
        if (map && fly) map.flyTo([b.lat, b.lng], 11, { duration: 0.6 });
        const dist = me ? hav(me, [b.lat, b.lng]) : null;
        root.querySelector('[data-card]').innerHTML = `<div class="bcard" role="dialog" aria-label="${esc(tr(b.name))}"><div class="row" style="justify-content:space-between;align-items:start;flex-wrap:nowrap"><div><span class="tag">${esc(X(TYPES[b.type]))}</span><h2 style="font-size:1.15rem;margin:8px 0 6px">${esc(tr(b.name))}</h2></div><button class="icon-btn" data-cx aria-label="${esc(t('close'))}" style="width:36px;height:36px">${icon('x')}</button></div>
          <div class="kv small"><div>${esc({ ru: 'Адрес', kz: 'Мекенжай', en: 'Address' }[R])}</div><div>${esc(b.address)}</div><div>${esc({ ru: 'Телефон', kz: 'Телефон', en: 'Phone' }[R])}</div><div>${b.phone.match(/\d/) ? `<a href="tel:${esc(b.phone.replace(/\D/g, ''))}">${esc(b.phone)}</a>` : esc(b.phone)}</div><div>E-mail</div><div><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></div><div>${esc({ ru: 'Руководитель', kz: 'Басшы', en: 'Head' }[R])}</div><div>${esc(b.director)}</div><div>${esc(t('footer.hours'))}</div><div>${esc(b.hours || tr(S.meta?.org?.hours))}</div><div>${esc({ ru: 'Координаты', kz: 'Координаттар', en: 'Coordinates' }[R])}</div><div class="mono">${b.lat.toFixed(4)}, ${b.lng.toFixed(4)} ${b.coordsVerified ? '' : `<span class="tag tag-warn">${esc({ ru: 'приблизительно', kz: 'шамамен', en: 'approx.' }[R])}</span>`}</div></div>
          ${b.about ? `<p class="small" style="margin:10px 0">${esc(tr(b.about))}</p>` : ''}
          <h3 style="font-family:var(--font);font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:14px 0 8px">${esc(t('route'))}</h3>
          ${dist != null ? `<p class="small" style="margin:0 0 8px"><b>${dist.toFixed(1)} км</b> ${esc({ ru: 'по прямой от вас', kz: 'сізден түзу сызық бойынша', en: 'as the crow flies' }[R])}</p>` : ''}
          <div class="row" style="gap:6px;margin-bottom:8px"><button class="btn btn-sm" data-geo>${icon('locate')}${esc({ ru: 'Моё местоположение', kz: 'Менің орным', en: 'My location' }[R])}</button><select class="input" data-mode style="width:auto;min-height:36px;padding:4px 8px" aria-label="mode"><option value="driving">${esc({ ru: 'Авто', kz: 'Көлік', en: 'Car' }[R])}</option><option value="transit">${esc({ ru: 'Транспорт', kz: 'Қоғамдық көлік', en: 'Transit' }[R])}</option><option value="walking">${esc({ ru: 'Пешком', kz: 'Жаяу', en: 'Walk' }[R])}</option></select></div>
          <form class="row" style="gap:6px;margin-bottom:10px;flex-wrap:nowrap" data-from><input class="input" name="from" placeholder="${esc({ ru: 'или введите адрес отправления', kz: 'немесе бастапқы мекенжай', en: 'or enter a start address' }[R])}" style="min-height:36px" aria-label="from"><button class="btn btn-sm">OK</button></form>
          <div data-links>${routeLinks(b, me ? me.join(',') : '')}</div><p class="small muted" data-geomsg style="margin:8px 0 0"></p></div>`;
        const card = root.querySelector('.bcard');
        card.querySelector('[data-cx]').onclick = () => { root.querySelector('[data-card]').innerHTML = ''; };
        const mode = () => card.querySelector('[data-mode]').value;
        card.querySelector('[data-mode]').onchange = () => { card.querySelector('[data-links]').innerHTML = routeLinks(b, card.querySelector('[name=from]').value || (me ? me.join(',') : ''), mode()); };
        card.querySelector('[data-from]').onsubmit = (e) => { e.preventDefault(); card.querySelector('[data-links]').innerHTML = routeLinks(b, e.target.from.value.trim(), mode()); };
        card.querySelector('[data-geo]').onclick = () => {
          const msg = card.querySelector('[data-geomsg]');
          if (!navigator.geolocation) { msg.textContent = { ru: 'Геолокация не поддерживается — введите адрес вручную.', kz: 'Геолокация қолдау көрсетілмейді.', en: 'Geolocation not supported — enter an address.' }[R]; return; }
          msg.textContent = '…';
          navigator.geolocation.getCurrentPosition((pos) => {
            me = [pos.coords.latitude, pos.coords.longitude];
            if (map) { line?.remove(); line = LF().polyline([me, [b.lat, b.lng]], { color: '#8B5CF6', dashArray: '6 8', weight: 3 }).addTo(map); LF().circleMarker(me, { radius: 7, color: '#1F3D2B', fillColor: '#8B5CF6', fillOpacity: 1 }).addTo(map); map.fitBounds([me, [b.lat, b.lng]], { padding: [40, 40] }); }
            select(b.slug, false);
          }, () => { msg.textContent = { ru: 'Доступ к геолокации не предоставлен. Укажите адрес отправления вручную — маршрут откроется во внешнем сервисе.', kz: 'Геолокацияға рұқсат берілмеді. Мекенжайды қолмен енгізіңіз.', en: 'Location access denied. Enter a start address manually.' }[R]; card.querySelector('[name=from]').focus(); }, { timeout: 8000 });
        };
      }
      root.querySelector('[data-items]').onclick = (e) => { const b = e.target.closest('[data-b]'); if (b) select(b.dataset.b); };
      root.querySelector('[data-bq]').oninput = (e) => { q = e.target.value.trim().toLowerCase(); drawList(); };
      root.querySelector('[data-bt]').onclick = (e) => { const b = e.target.closest('[data-type]'); if (!b) return; type = b.dataset.type; root.querySelectorAll('[data-type]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); drawList(); };
      drawList();
      if (map) map.fitBounds(list.map((b) => [b.lat, b.lng]), { padding: [30, 30] });
      if (sel) setTimeout(() => select(sel), 200);
      return () => map?.remove();
    },
  };
}

export async function histMap() {
  const places = await api('/api/content/place', { cache: true });
  const R = S.lang;
  const KIND = { heritage: { ru: 'Объекты наследия', kz: 'Мұра нысандары', en: 'Heritage' }, industry: { ru: 'Промышленность', kz: 'Өнеркәсіп', en: 'Industry' }, event: { ru: 'Места событий', kz: 'Оқиға орындары', en: 'Events' } };
  const html = `${pageHead(esc(t('menu.histmap')[0]), esc({ ru: 'Исторические объекты, предприятия и места событий, упоминаемые в архивных документах.', kz: 'Архив құжаттарында аталған тарихи нысандар.', en: 'Historical sites mentioned in archival documents.' }[R]), [[t('menu.memory')[0], L('memory')], [t('menu.histmap')[0]]])}
  <div class="wrap section" style="padding-top:26px"><div class="notice warn" style="margin-bottom:16px">${icon('history')}<div><p>${esc({ ru: 'Это историческая карта — она не показывает действующие филиалы архива. Адреса филиалов — на странице «Филиалы и карта».', kz: 'Бұл тарихи карта — филиалдар емес.', en: 'This is a historical map, not the branches map.' }[R])} <a href="${L('branches')}">${esc(t('nav.branches'))}</a></p></div></div>
  <div class="legend" style="margin-bottom:10px">${Object.keys(KIND).map((k) => `<span><i class="hpin" style="width:14px;height:14px;display:inline-block;background:${{ heritage: '#8A6A3A', industry: '#5B4636', event: '#7C3AED' }[k]}"></i>${esc(X(KIND[k]))}</span>`).join('')}</div>
  <div class="map-layout" style="grid-template-columns:minmax(0,1fr) 360px"><div id="hmap" class="map"></div><div class="map-list" style="border-right:0;border-left:1px solid var(--line)"><div class="items">${places.map((p, i) => `<button class="bitem" data-i="${i}"><b>${esc(tr(p.title))}</b><span>${esc(X(KIND[p.kind]))}</span></button>`).join('')}</div></div></div>
  <p class="small muted" style="margin-top:12px">${esc({ ru: 'Координаты объектов приблизительные, приведены для навигации по материалам.', kz: 'Координаттар шамамен берілген.', en: 'Coordinates are approximate.' }[R])}</p></div>`;
  return {
    title: t('menu.histmap')[0], html,
    after(root) {
      const map = baseMap(root.querySelector('#hmap'), { sepia: true });
      if (!map) { root.querySelector('#hmap').innerHTML = `<div class="map-fallback">${esc({ ru: 'Карта недоступна', kz: 'Карта қолжетімсіз', en: 'Map unavailable' }[R])}</div>`; return null; }
      const ms = places.map((p) => LF().marker([p.lat, p.lng], { icon: LF().divIcon({ className: '', html: `<div class="hpin" style="background:${{ heritage: '#8A6A3A', industry: '#5B4636', event: '#7C3AED' }[p.kind]}"></div>`, iconSize: [26, 26], iconAnchor: [13, 13] }), title: tr(p.title) }).addTo(map)
        .bindPopup(`<b>${esc(tr(p.title))}</b>${p.docRef ? `<div style="margin-top:6px">${p.docRef.access.digital ? `<img src="${fileUrl(p.docRef.id)}" alt="" style="width:180px;border-radius:6px;margin-bottom:6px">` : ''}<a href="${L('catalog/' + p.docRef.id)}">${esc(p.docRef.cipher)} — ${esc(tr(p.docRef.title))}</a></div>` : ''}`));
      map.fitBounds(places.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
      root.querySelector('.items').onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const p = places[+b.dataset.i]; map.flyTo([p.lat, p.lng], 10); ms[+b.dataset.i].openPopup(); };
      root.querySelector('#hmap').addEventListener('click', (e) => { const a = e.target.closest('a[href^="/"]'); if (a) { e.preventDefault(); S.navigate(a.getAttribute('href')); } });
      return () => map.remove();
    },
  };
}

// ---------------------------------------------------------------- Онлайн-выставки
export async function exhibitions() {
  const list = await api('/api/content/exhibition', { cache: true });
  const { exTile } = await import('./pages.js');
  const html = `${pageHead(esc(t('home.exTitle')), esc(t('home.exLead')), [[t('nav.exhibitions')]])}<div class="wrap section" style="padding-top:28px"><div class="grid g3">${list.map(exTile).join('')}</div></div>`;
  return { title: t('nav.exhibitions'), html };
}
export async function exhibition(slug) {
  const e = await api('/api/content/exhibition/' + slug);
  const items = e.items;
  const viewable = items.map((x, i) => ({ x, i })).filter(({ x }) => !x.unavailable && x.access?.digital);
  const html = `<section class="exh-hero"><div class="wrap">${crumbsLight([[t('nav.exhibitions'), L('exhibitions')], [tr(e.title)]])}<span class="tag tag-accent">${esc(e.period)} · ${items.length} ${esc({ ru: 'экспонатов', kz: 'экспонат', en: 'exhibits' }[S.lang])}</span><h1 style="margin-top:14px">${esc(tr(e.title))}${trBadge(e.title)}</h1><p>${esc(tr(e.intro))}</p>
    <div class="row"><a class="btn btn-accent" href="#ex-1">${icon('eye')}${esc({ ru: 'Начать просмотр', kz: 'Қарауды бастау', en: 'Start viewing' }[S.lang])}</a><button class="btn" style="background:transparent;color:#EFE6D2;border-color:rgba(232,220,196,.35)" data-share>${icon('share')}${esc(t('doc.share'))}</button>${demoTag()}</div></div></section>
  <div class="wrap">${items.map((x, i) => x.unavailable ? `<article class="exhibit" id="ex-${i + 1}"><div class="ex-img" style="cursor:default;display:grid;place-items:center;min-height:240px">${icon('lock').replace('<svg', '<svg style="width:50px;height:50px;opacity:.5"')}</div><div><div class="ex-num">${String(i + 1).padStart(2, '0')}</div><p>${esc({ ru: 'Экспонат временно недоступен.', kz: 'Экспонат уақытша қолжетімсіз.', en: 'Exhibit temporarily unavailable.' }[S.lang])}</p></div></article>`
    : `<article class="exhibit" id="ex-${i + 1}" aria-labelledby="ext-${i}">
      ${x.access.digital ? `<button class="ex-img" data-zoom="${i}" aria-label="${esc(t('doc.zoom'))}: ${esc(tr(x.title))}"><img src="${fileUrl(x.id)}" alt="${esc(tr(x.title))}" loading="lazy"></button>` : `<div class="ex-img" style="cursor:default;display:grid;place-items:center;min-height:260px;text-align:center"><div>${icon('lock').replace('<svg', '<svg style="width:46px;height:46px;margin:0 auto 10px;opacity:.6"')}<p class="small muted" style="max-width:300px">${esc(x.access.restriction || t('doc.lockedTitle'))}</p></div></div>`}
      <div><div class="ex-num">${String(i + 1).padStart(2, '0')}</div><h2 id="ext-${i}" style="margin-top:8px">${esc(tr(x.title))}${trBadge(x.title)}</h2>
        <div class="row" style="gap:8px;margin-bottom:12px"><span class="tag">${esc(years(x))}${x.date_uncertain ? ' · ' + esc(t('doc.uncertain')) : ''}</span><span class="tag">${esc(t('types.' + x.doc_type))}</span>${x.place ? `<span class="tag">${esc(x.place)}</span>` : ''}</div>
        <p>${esc(tr(x.descr))}</p>
        <div class="card" style="padding:14px;box-shadow:none"><div class="small"><b>${esc(t('source'))}:</b> ${esc(tr(S.meta?.org?.name))}, <a class="cipher" href="${L('catalog/' + x.id)}">${esc(x.cipher)}</a></div><div class="small muted" style="margin-top:4px">${esc({ ru: 'Происхождение: ', kz: 'Шығу тегі: ', en: 'Provenance: ' }[S.lang])}${esc(x.provenance || '')}</div></div>
        <div class="row" style="margin-top:14px">${i > 0 ? `<a class="btn btn-sm" href="#ex-${i}">${icon('left')}${esc(t('back'))}</a>` : ''}${i < items.length - 1 ? `<a class="btn btn-sm btn-brand" href="#ex-${i + 2}">${esc({ ru: 'Следующий экспонат', kz: 'Келесі экспонат', en: 'Next exhibit' }[S.lang])}${icon('right')}</a>` : ''}<a class="btn btn-sm" href="${L('catalog/' + x.id)}">${icon('archive')}${esc({ ru: 'Карточка в каталоге', kz: 'Каталогтағы карточка', en: 'Catalogue record' }[S.lang])}</a></div></div></article>`).join('')}
    <nav class="ex-nav" aria-label="exhibits"><div class="inner">${items.map((_, i) => `<a href="#ex-${i + 1}" data-dot="${i + 1}">${i + 1}</a>`).join('')}</div></nav>
    <div class="section" style="text-align:center"><a class="btn" href="${L('exhibitions')}">${icon('grid')}${esc({ ru: 'Все выставки', kz: 'Барлық көрмелер', en: 'All exhibitions' }[S.lang])}</a></div></div>`;
  return {
    title: tr(e.title), html,
    after(root) {
      root.querySelector('[data-share]').onclick = () => share(tr(e.title), location.href);
      root.addEventListener('click', (ev) => { const z = ev.target.closest('[data-zoom]'); if (!z) return; const start = viewable.findIndex(({ i }) => i === +z.dataset.zoom); lightbox(viewable.map(({ x }) => ({ src: fileUrl(x.id), title: tr(x.title), caption: `${esc(x.cipher)} · ${esc(years(x))}` })), start); });
      const dots = root.querySelectorAll('[data-dot]');
      const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) dots.forEach((d) => d.classList.toggle('on', d.dataset.dot === en.target.id.slice(3))); }), { rootMargin: '-45% 0px -45% 0px' });
      root.querySelectorAll('.exhibit').forEach((a) => io.observe(a));
      return () => io.disconnect();
    },
  };
}
const crumbsLight = (items) => `<ol class="crumbs" style="color:#CFC4AE"><li><a style="color:#CFC4AE" href="${L('')}">${esc(t('toHome'))}</a></li>${items.map(([l, h]) => `<li>${h ? `<a style="color:#CFC4AE" href="${h}">${esc(l)}</a>` : `<span aria-current="page">${esc(l)}</span>`}</li>`).join('')}</ol>`;
void errorBox;
