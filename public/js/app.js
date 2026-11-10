import { S, t, tr, esc, L, api, store, LANGS } from './core.js';
import { icon, logoMark } from './icons.js';
import { DICT } from './i18n.js';
import { initAssistant } from './assistant.js';
import * as P from './pages.js';
import * as C from './catalog.js';
import * as M from './memory.js';

// ---------------------------------------------------------------- Маршруты (ЧПУ)
const ROUTES = [
  [/^$/, P.home, 'home'],
  [/^catalog$/, C.catalog, 'catalog'], [/^catalog\/(\d+)$/, C.docPage, 'catalog'],
  [/^about$/, P.about, 'about'], [/^about\/structure$/, P.structure, 'about'], [/^contacts$/, P.contacts, 'about'],
  [/^guide$/, P.guide, 'guide'], [/^services$/, P.services, 'services'], [/^services\/paid$/, P.paid, 'services'],
  [/^reading-room$/, P.readingRoom, 'services'], [/^laws$/, P.laws, 'services'], [/^anticorruption$/, P.anticorruption, 'services'],
  [/^faq$/, P.faq, 'faq'], [/^feedback$/, P.feedback, 'feedback'], [/^symbols$/, P.symbols, 'symbols'], [/^links$/, P.links, 'links'],
  [/^calendar$/, P.calendarPage, 'memory'], [/^publications$/, P.publications, 'memory'], [/^privacy$/, P.privacy, 'about'],
  [/^news$/, P.newsList, 'news'], [/^news\/([\w-]+)$/, P.newsItem, 'news'],
  [/^memory$/, M.memory, 'memory'], [/^memory\/collection\/([\w-]+)$/, M.collection, 'memory'], [/^memory\/person\/([\w-]+)$/, M.person, 'memory'],
  [/^memory\/timeline$/, M.timelinePage, 'memory'], [/^memory\/map$/, M.histMap, 'memory'],
  [/^exhibitions$/, M.exhibitions, 'exhibitions'], [/^exhibitions\/([\w-]+)$/, M.exhibition, 'exhibitions'],
  [/^branches$/, M.branches, 'branches'], [/^assistant$/, P.assistantPage, 'assistant'],
];
const NAV_ACTIVE = { about: 'about', catalog: 'catalog', guide: 'info', services: 'info', faq: 'info', memory: 'history', exhibitions: 'exhibitions', news: 'news', branches: 'branches' };

function parseLoc() {
  const parts = location.pathname.split('/').filter(Boolean);
  const lang = LANGS.includes(parts[0]) ? parts[0] : 'ru';
  return { lang, rest: (LANGS.includes(parts[0]) ? parts.slice(1) : parts).join('/') };
}

let cleanup = null;
S.navigate = (...a) => navigate(...a);
async function render({ scroll = true } = {}) {
  const { lang, rest } = parseLoc();
  const langChanged = lang !== S.lang || !document.querySelector('.header');
  S.lang = lang; store.set('lang', lang);
  document.documentElement.lang = lang === 'kz' ? 'kk' : lang;
  if (!S.meta) S.meta = await api('/api/meta').catch(() => null);
  if (langChanged) chrome();
  const route = ROUTES.find(([re]) => re.test(rest));
  const app = document.getElementById('app');
  cleanup?.(); cleanup = null;
  let section = 'notfound', out;
  try {
    if (route) { section = route[2]; out = await route[1](...rest.match(route[0]).slice(1)); }
    else out = P.notFound();
  } catch (e) {
    out = e.status === 403 ? P.unavailable() : e.status === 404 ? P.notFound() : P.failure(e);
  }
  app.innerHTML = out.html;
  document.title = `${out.title ? out.title + ' | ' : ''}${t('orgShort')}`;
  document.querySelectorAll('.nav > li > a, .nav > li > button').forEach((a) => a.removeAttribute('aria-current'));
  document.querySelector(`.nav [data-nav="${NAV_ACTIVE[section] || ''}"]`)?.setAttribute('aria-current', 'page');
  document.querySelectorAll('.lang a').forEach((a) => { a.href = `/${a.dataset.l}/${rest}${location.search}${location.hash}`; });
  cleanup = out.after?.(app) || null;
  if (scroll) { if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView(); else window.scrollTo(0, 0); }
  if (!out.keepFocus) app.focus({ preventScroll: true });
  hit(section);
}

function hit(page) {
  const first = !store.get('visited', false);
  if (first) store.set('visited', true);
  fetch('/api/hit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page, first }) }).catch(() => {});
}

export function navigate(url, { replace = false, scroll = true } = {}) {
  S.navigate ||= navigate;
  if (replace) history.replaceState(null, '', url); else history.pushState(null, '', url);
  render({ scroll });
}
window.addEventListener('popstate', () => render({ scroll: false }));
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || /^\/(api|files|admin|vendor)/.test(url.pathname)) return;
  if (url.pathname === location.pathname && url.hash && url.search === location.search) return;
  e.preventDefault();
  closeMenus();
  if (a.closest('.lang')) { navigate(url.pathname + url.search + url.hash, { scroll: false }); return; } // смена языка сохраняет раздел
  navigate(url.pathname + url.search + url.hash);
});

// ---------------------------------------------------------------- Шапка, меню, подвал
const MENUS = {
  about: [['aboutHistory', 'about'], ['structure', 'about/structure'], ['contacts', 'contacts'], ['symbols', 'symbols'], ['links', 'links'], ['feedback', 'feedback']],
  info: [['guide', 'guide'], ['services', 'services'], ['paid', 'services/paid'], ['reading', 'reading-room'], ['laws', 'laws'], ['anticorruption', 'anticorruption'], ['faq', 'faq']],
  history: [['memory', 'memory'], ['timeline', 'memory/timeline'], ['histmap', 'memory/map'], ['calendar', 'calendar'], ['publications', 'publications']],
};
const dd = (key) => `<div class="dropdown" role="menu">${MENUS[key].map(([k, href]) => `<a role="menuitem" href="${L(href)}">${esc(t('menu.' + k)[0])}<small>${esc(t('menu.' + k)[1])}</small></a>`).join('')}</div>`;
const navItem = (key, href) => (MENUS[key] && !href
  ? `<li><button data-nav="${key}" aria-expanded="false" aria-haspopup="true">${esc(t('nav.' + key))}${icon('chev')}</button>${dd(key)}</li>`
  : `<li><a data-nav="${key}" href="${L(href)}">${esc(t('nav.' + key))}</a></li>`);

function chrome() {
  const m = S.meta?.org;
  const theme = document.documentElement.dataset.theme;
  document.querySelector('.skip').textContent = t('skip');
  document.getElementById('chrome-top').innerHTML = `
  <div class="topbar"><div class="wrap">
    <span class="ti">${icon('phone')}<a href="tel:+77232255976">${esc(m?.phoneReception || '8 (7232) 25-59-76')}</a></span>
    <span class="ti hide-xs">${icon('clock')}${esc(tr(m?.hours) || '')}</span>
    <span class="ti hide-xs">${icon('mail')}<a href="mailto:${esc(m?.email || '')}">${esc(m?.email || '')}</a></span>
    <span class="sep"></span>
    <span class="ti hide-xs" id="weather" aria-live="polite"></span>
    <button type="button" data-a11y="fs" aria-pressed="${document.documentElement.dataset.fs === 'lg'}" title="${esc(t('fontBigger'))}">A+</button>
    <button type="button" data-a11y="contrast" aria-pressed="${document.documentElement.dataset.contrast === 'high'}" title="${esc(t('contrast'))}">${icon('accessibility')}<span class="sr-only">${esc(t('a11y'))}</span></button>
    ${(m?.social || []).map((s) => `<a class="ti" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.label)}">${icon(s.id)}</a>`).join('')}
  </div></div>
  <header class="header"><div class="wrap">
    <a class="logo" href="${L('')}" aria-label="${esc(t('orgSub'))}"><span class="logo-mark">${logoMark}</span><span class="logo-text"><b>${esc(t('orgShort'))}</b><span>${esc(t('orgSub'))}</span></span></a>
    <nav aria-label="Main"><ul class="nav">${navItem('about')}${navItem('catalog', 'catalog')}${navItem('info')}${navItem('history')}${navItem('exhibitions', 'exhibitions')}${navItem('news', 'news')}${navItem('branches', 'branches')}</ul></nav>
    <div class="hdr-tools">
      <form class="hsearch" role="search" data-hsearch><label class="sr-only" for="hs">${esc(t('searchPh'))}</label>${icon('search')}<input id="hs" class="input" type="search" placeholder="${esc(t('searchPh'))}" autocomplete="off"></form>
      <a class="btn btn-accent hide-sm" href="${L('catalog')}" style="min-height:42px">${icon('archive')}<span>${esc(t('toCatalog'))}</span></a>
      <div class="lang" role="group" aria-label="${esc(t('lang'))}">${LANGS.map((l) => `<a data-l="${l}" href="/${l}/" hreflang="${l === 'kz' ? 'kk' : l}" aria-current="${l === S.lang}" lang="${l === 'kz' ? 'kk' : l}">${l.toUpperCase()}</a>`).join('')}</div>
      <button class="icon-btn" type="button" data-theme-toggle aria-label="${esc(theme === 'dark' ? t('themeLight') : t('themeDark'))}" title="${esc(t('theme'))}">${icon(theme === 'dark' ? 'sun' : 'moon')}</button>
      <button class="icon-btn burger" type="button" data-burger aria-label="${esc(t('openMenu'))}" aria-expanded="false" aria-controls="drawer">${icon('menu')}</button>
    </div>
  </div></header>
  <div class="drawer" id="drawer"><div class="scrim" data-close-drawer></div><div class="panel" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="row" style="justify-content:space-between"><b>${esc(t('orgShort'))}</b><button class="icon-btn" data-close-drawer aria-label="${esc(t('close'))}">${icon('x')}</button></div>
    <form class="searchbar" style="margin:14px 0" data-hsearch><div class="sb">${icon('search')}<input class="input" type="search" placeholder="${esc(t('searchPh'))}" aria-label="${esc(t('searchPh'))}"></div></form>
    <a class="btn btn-accent" style="width:100%" href="${L('catalog')}">${icon('archive')}${esc(t('toCatalog'))}</a>
    <h4>${esc(t('nav.catalog'))}</h4><a href="${L('catalog')}">${esc(t('cat.title'))}</a><a href="${L('exhibitions')}">${esc(t('nav.exhibitions'))}</a><a href="${L('news')}">${esc(t('nav.news'))}</a><a href="${L('branches')}">${esc(t('nav.branches'))}</a>
    ${Object.keys(MENUS).map((k) => `<h4>${esc(t('nav.' + k))}</h4>${MENUS[k].map(([kk, href]) => `<a href="${L(href)}">${esc(t('menu.' + kk)[0])}</a>`).join('')}`).join('')}
  </div></div>`;

  const o = S.meta?.org || {};
  document.getElementById('chrome-bottom').innerHTML = `
  <footer class="footer"><div class="wrap">
    <div class="cols">
      <div><div class="row" style="gap:12px;margin-bottom:14px"><span class="logo-mark">${logoMark}</span><b style="color:#F3EBDB;font-family:var(--serif);font-size:1.05rem">${esc(tr(o.name))}</b></div>
        <p class="small">${esc(tr(o.legal))}</p><p class="small">${esc(t('footer.about'))}</p>
        <div class="social">${(o.social || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.label)}">${icon(s.id)}</a>`).join('')}</div></div>
      <div><h4>${esc(t('footer.sections'))}</h4><ul>${[['cat.title', 'catalog'], ['nav.exhibitions', 'exhibitions'], ['menu.memory', 'memory'], ['nav.news', 'news'], ['nav.branches', 'branches'], ['menu.calendar', 'calendar']].map(([k, h]) => { const v = t(k); return `<li><a href="${L(h)}">${esc(Array.isArray(v) ? v[0] : v)}</a></li>`; }).join('')}</ul></div>
      <div><h4>${esc(t('footer.visitors'))}</h4><ul>${MENUS.info.map(([k, h]) => `<li><a href="${L(h)}">${esc(t('menu.' + k)[0])}</a></li>`).join('')}</ul>
        <h4 style="margin-top:22px">${esc(t('footer.gov'))}</h4><ul><li><a href="https://www.akorda.kz" target="_blank" rel="noopener">Akorda.kz</a></li><li><a href="https://egov.kz" target="_blank" rel="noopener">eGov.kz</a></li><li><a href="https://adilet.zan.kz" target="_blank" rel="noopener">Adilet.zan.kz</a></li><li><a href="https://www.gov.kz/memleket/entities/vko" target="_blank" rel="noopener">${esc({ ru: 'Акимат ВКО', kz: 'ШҚО әкімдігі', en: 'EKR Akimat' }[S.lang])}</a></li></ul></div>
      <div><h4>${esc(t('footer.contacts'))}</h4><ul class="small">
        <li>${icon('pin', 'sr-hide')}${esc(tr(o.address))}</li><li><a href="tel:+77232255976">${esc(o.phoneReception || '')}</a></li><li><a href="mailto:${esc(o.email || '')}">${esc(o.email || '')}</a></li>
        <li><b style="color:#F3EBDB">${esc(t('footer.hours'))}:</b> ${esc(tr(o.hours))}</li><li><b style="color:#F3EBDB">${esc(t('footer.reading'))}:</b> ${esc(tr(o.readingHours))}</li></ul></div>
    </div>
    <div class="bottom"><span>© 1940–${new Date().getFullYear()} ${esc(tr(o.name))}. ${esc(t('footer.rights'))}</span>
      <span><a href="${L('privacy')}">${esc(t('footer.privacy'))}</a> · <a href="/admin">${esc(t('footer.admin'))}</a></span></div>
    <p class="small" style="margin-top:12px;color:#8E8572">${esc(t('footer.proto'))}</p>
  </div></footer>`;
  initAssistant();
  weather();
}

function closeMenus() {
  document.querySelectorAll('.nav li.open').forEach((li) => { li.classList.remove('open'); li.querySelector('button')?.setAttribute('aria-expanded', 'false'); });
  const d = document.getElementById('drawer'); if (d?.classList.contains('open')) { d.classList.remove('open'); document.querySelector('[data-burger]')?.setAttribute('aria-expanded', 'false'); }
}
document.addEventListener('click', (e) => {
  const navBtn = e.target.closest('.nav > li > button');
  if (navBtn) { const li = navBtn.parentElement; const open = !li.classList.contains('open'); closeMenus(); li.classList.toggle('open', open); navBtn.setAttribute('aria-expanded', open); return; }
  if (!e.target.closest('.dropdown')) document.querySelectorAll('.nav li.open').forEach((li) => li.classList.remove('open'));
  if (e.target.closest('[data-burger]')) { document.getElementById('drawer').classList.add('open'); e.target.closest('[data-burger]').setAttribute('aria-expanded', 'true'); document.querySelector('#drawer input')?.focus(); }
  if (e.target.closest('[data-close-drawer]')) closeMenus();
  if (e.target.closest('[data-theme-toggle]')) {
    // Без перезагрузки: страница, поисковый запрос и фильтры сохраняются
    const d = document.documentElement; const next = d.dataset.theme === 'dark' ? 'light' : 'dark';
    d.dataset.theme = next; store.set('theme', next); try { localStorage.setItem('theme', next); } catch { /* */ }
    const b = e.target.closest('[data-theme-toggle]'); b.innerHTML = icon(next === 'dark' ? 'sun' : 'moon'); b.setAttribute('aria-label', next === 'dark' ? t('themeLight') : t('themeDark'));
  }
  const a11y = e.target.closest('[data-a11y]')?.dataset.a11y;
  if (a11y) {
    const d = document.documentElement; const attr = a11y === 'fs' ? 'fs' : 'contrast'; const val = a11y === 'fs' ? 'lg' : 'high';
    const on = d.dataset[attr] !== val; if (on) d.dataset[attr] = val; else delete d.dataset[attr];
    try { localStorage.setItem(attr, on ? val : ''); } catch { /* */ }
    e.target.closest('[data-a11y]').setAttribute('aria-pressed', on);
  }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-hsearch]'); if (!f) return;
  e.preventDefault(); const q = f.querySelector('input').value.trim(); closeMenus();
  navigate(L('catalog') + (q ? '?q=' + encodeURIComponent(q) : ''));
});

// Погода (Open-Meteo, без ключа; передаются только координаты города). При сбое — ссылка.
async function weather() {
  const el = document.getElementById('weather'); if (!el) return;
  const day = new Date().toLocaleDateString({ ru: 'ru-RU', kz: 'kk-KZ', en: 'en-GB' }[S.lang], { weekday: 'short', day: 'numeric', month: 'short' });
  el.innerHTML = `${icon('calendar')}${esc(day)}`;
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 4000);
    const w = await fetch('https://api.open-meteo.com/v1/forecast?latitude=49.95&longitude=82.62&current=temperature_2m&timezone=Asia%2FAlmaty', { signal: ctl.signal }).then((r) => r.json());
    const temp = Math.round(w.current.temperature_2m);
    el.innerHTML = `${icon('calendar')}${esc(day)} · ${icon('cloud')}${{ ru: 'Усть-Каменогорск', kz: 'Өскемен', en: 'Ust-Kamenogorsk' }[S.lang]} ${temp > 0 ? '+' : ''}${temp}°C`;
  } catch { /* резервный вариант — только дата */ }
}

if (!LANGS.includes(location.pathname.split('/')[1])) history.replaceState(null, '', `/${store.get('lang', 'ru')}/`);
render();
export { DICT };
