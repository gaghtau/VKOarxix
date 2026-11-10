import { S, t, tr, esc, L, api, store, LANGS } from './core.js';
import { icon, logoMark } from './icons.js';
import { DICT } from './i18n.js';
import { initAssistant } from './assistant.js';
import * as P from './pages.js';
import * as C from './catalog.js';
import * as M from './memory.js';
import * as F from './features.js';
import { initA11y, openPanel, applyImageMode, photoPage, stopTts } from './a11y.js';

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
  [/^branches$/, M.branches, 'branches'], [/^assistant$/, P.assistantPage, 'assistant'], [/^sources$/, P.sources, 'about'], [/^photo$/, photoPage, 'photo'], [/^family$/, F.family, 'family'], [/^then-and-now$/, F.thenNow, 'memory'],
];
const NAV_ACTIVE = { about: 'about', catalog: 'catalog', guide: 'info', services: 'info', faq: 'info', family: 'info', branches: 'info', memory: 'history', exhibitions: 'exhibitions', news: 'about', feedback: 'about' };

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
  cleanup?.(); cleanup = null; stopTts();
  let section = 'notfound', out;
  try {
    if (route) { section = route[2]; out = await route[1](...rest.match(route[0]).slice(1)); }
    else out = P.notFound();
  } catch (e) {
    out = e.status === 403 ? P.unavailable() : e.status === 404 ? P.notFound() : P.failure(e);
  }
  app.innerHTML = out.html;
  app.classList.remove('page-in'); void app.offsetWidth; app.classList.add('page-in');
  document.title = `${out.title ? out.title + ' | ' : ''}${t('orgShort')}`;
  document.querySelectorAll('.nav > li > a, .nav > li > button').forEach((a) => a.removeAttribute('aria-current'));
  document.querySelector(`.nav [data-nav="${NAV_ACTIVE[section] || ''}"]`)?.setAttribute('aria-current', 'page');
  document.querySelectorAll('.lang a').forEach((a) => { a.href = `/${a.dataset.l}/${rest}${location.search}${location.hash}`; });
  cleanup = out.after?.(app) || null;
  applyImageMode(app);
  observeReveal(app);
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
  history: [['memory', 'memory'], ['thennow', 'then-and-now'], ['timeline', 'memory/timeline'], ['histmap', 'memory/map'], ['calendar', 'calendar'], ['publications', 'publications']],
  info: [['family', 'family'], ['branches', 'branches'], ['services', 'services'], ['reading', 'reading-room'], ['faq', 'faq'], ['guide', 'guide'], ['paid', 'services/paid'], ['laws', 'laws'], ['anticorruption', 'anticorruption']],
  about: [['aboutHistory', 'about'], ['news', 'news'], ['contacts', 'contacts'], ['structure', 'about/structure'], ['feedback', 'feedback'], ['symbols', 'symbols'], ['links', 'links']],
};
const dd = (key) => `<div class="dropdown" role="menu">${MENUS[key].map(([k, href]) => `<a role="menuitem" href="${L(href)}">${esc(t('menu.' + k)[0])}<small>${esc(t('menu.' + k)[1])}</small></a>`).join('')}</div>`;
const navItem = (key, href) => (MENUS[key] && !href
  ? `<li><button data-nav="${key}" aria-expanded="false" aria-haspopup="true">${esc(t('nav.' + key))}${icon('chev')}</button>${dd(key)}</li>`
  : `<li><a data-nav="${key}" href="${L(href)}">${esc(t('nav.' + key))}</a></li>`);
const loginLabel = () => ({ ru: 'Войти', kz: 'Кіру', en: 'Sign in' }[S.lang]);

function chrome() {
  const m = S.meta?.org;
  document.querySelector('.skip').textContent = t('skip');
  const langs = `<div class="lang" role="group" aria-label="${esc(t('lang'))}">${LANGS.map((l) => `<a data-l="${l}" href="/${l}/" hreflang="${l === 'kz' ? 'kk' : l}" aria-current="${l === S.lang}" lang="${l === 'kz' ? 'kk' : l}">${l.toUpperCase()}</a>`).join('')}</div>`;
  document.getElementById('chrome-top').innerHTML = `
  <div class="topbar"><div class="wrap">
    <span class="ti">${icon('phone')}<a href="tel:+77232255976">${esc(m?.phoneReception || '8 (7232) 25-59-76')}</a></span>
    <a class="ann" href="${L('family')}"><b>${esc({ ru: 'Новое', kz: 'Жаңа', en: 'New' }[S.lang])}</b><span>${esc({ ru: 'Как найти документы о родственнике — пошаговая памятка', kz: 'Туысқан туралы құжаттарды қалай табуға болады', en: 'How to find records about a relative' }[S.lang])}</span> →</a>
    <span class="tools"><button type="button" class="a11y-btn" data-a11y-open aria-haspopup="dialog" aria-expanded="false">${icon('eye')}<span>${esc({ ru: 'Для слабовидящих', kz: 'Нашар көретіндерге', en: 'Accessibility' }[S.lang])}</span></button>${langs}</span>
  </div></div>
  <header class="header"><div class="wrap">
    <a class="logo" href="${L('')}" aria-label="${esc(t('orgSub'))}"><span class="logo-mark">${logoMark}</span><span class="logo-text"><b>${esc(t('orgShort'))}</b><span>${esc(t('orgSub'))}</span></span></a>
    <nav aria-label="Main"><ul class="nav">${navItem('catalog', 'catalog')}${navItem('history')}${navItem('exhibitions', 'exhibitions')}${navItem('info')}${navItem('about')}</ul></nav>
    <div class="hdr-tools">
      <a class="search-pill" href="${L('catalog')}" aria-label="${esc(t('searchPh'))}">${icon('search')}<span>${esc({ ru: 'Поиск по архиву', kz: 'Архивтен іздеу', en: 'Search the archive' }[S.lang])}</span></a>
      <a class="btn btn-sm login-btn" href="/cabinet" target="_blank" rel="noopener" title="${esc({ ru: 'Кабинет редактора', kz: 'Редактор кабинеті', en: 'Editor workspace' }[S.lang])}">${icon('user')}<span>${esc(loginLabel())}</span></a>
      <button class="icon-btn burger" type="button" data-burger aria-label="${esc(t('openMenu'))}" aria-expanded="false" aria-controls="drawer">${icon('menu')}</button>
    </div>
  </div></header>
  <div class="drawer" id="drawer"><div class="scrim" data-close-drawer></div><div class="panel" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="row" style="justify-content:space-between"><b>${esc(t('orgShort'))}</b><button class="icon-btn" data-close-drawer aria-label="${esc(t('close'))}">${icon('x')}</button></div>
    <form class="searchbar" style="margin:14px 0" data-hsearch><div class="sb">${icon('search')}<input class="input" type="search" placeholder="${esc(t('searchPh'))}" aria-label="${esc(t('searchPh'))}"></div></form>
    <a href="${L('catalog')}"><b>${esc(t('cat.title'))}</b></a><a href="${L('exhibitions')}"><b>${esc(t('nav.exhibitions'))}</b></a>
    ${Object.keys(MENUS).map((k) => `<h4>${esc(t('nav.' + k))}</h4>${MENUS[k].map(([kk, href]) => `<a href="${L(href)}">${esc(t('menu.' + kk)[0])}</a>`).join('')}`).join('')}
    <h4>${esc(t('lang'))}</h4>${langs}
    <a class="btn" style="width:100%;margin-top:16px" href="/cabinet" target="_blank" rel="noopener">${icon('user')}${esc({ ru: 'Войти в кабинет редактора', kz: 'Редактор кабинетіне кіру', en: 'Editor sign-in' }[S.lang])}</a>
  </div></div>`;

  const o = S.meta?.org || {};
  const X = (o) => o[S.lang] ?? o.ru;
  document.getElementById('chrome-bottom').innerHTML = `
  <section class="cta-band" aria-labelledby="cta-h"><div class="wrap">
    <div><p class="cta-kicker">${esc(X({ ru: 'Не нашли нужное?', kz: 'Керегін таппадыңыз ба?', en: 'Didn’t find it?' }))}</p>
      <h2 id="cta-h">${esc(X({ ru: 'Спросите архив — мы поможем найти документ', kz: 'Архивтен сұраңыз — құжатты табуға көмектесеміз', en: 'Ask the archive — we will help you find it' }))}</h2>
      <p>${esc(X({ ru: 'Помощник ответит сразу, а в читальном зале покажут подлинники.', kz: 'Көмекші бірден жауап береді, оқу залында түпнұсқаларды көрсетеді.', en: 'The assistant answers instantly; the reading room shows the originals.' }))}</p></div>
    <div class="cta-actions"><button class="btn btn-accent" type="button" data-cta-ask>${icon('sparkle')}${esc(X({ ru: 'Спросить помощника', kz: 'Көмекшіден сұрау', en: 'Ask the assistant' }))}</button>
      <a class="btn cta-ghost" href="${L('reading-room')}">${esc(X({ ru: 'Как попасть в читальный зал', kz: 'Оқу залына қалай келу', en: 'Visit the reading room' }))} →</a></div>
  </div></section>
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
      <span><a href="${L('privacy')}">${esc(t('footer.privacy'))}</a> · <a href="${L('sources')}">${esc(t('src.title'))}</a> · <a href="/cabinet" target="_blank" rel="noopener">${esc({ ru: 'Кабинет редактора', kz: 'Редактор кабинеті', en: 'Editor workspace' }[S.lang])}</a> · <a href="/admin">${esc(t('footer.admin'))}</a></span></div>
    <div class="wordmark" aria-hidden="true">${esc(X({ ru: 'Госархив ВКО', kz: 'ШҚО мемархиві', en: 'State Archive EKR' }))}</div>
    <p class="small" style="margin-top:12px;color:#8E8572">${esc(t('footer.proto'))} ${esc(t('home.statsTitle'))}: ${(S.meta?.stats?.views || 0).toLocaleString('ru-RU')} ${esc(t('home.views'))}, ${(S.meta?.stats?.visitors || 0).toLocaleString('ru-RU')} ${esc(t('home.visitors'))}.</p>
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
  const a11yBtn = e.target.closest('[data-a11y-open]');
  if (a11yBtn) { closeMenus(); openPanel(a11yBtn); return; }
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
// Появление блоков при прокрутке (без JS всё видно сразу)
document.documentElement.classList.add('js-anim');
// Проверка по прокрутке (надёжнее IntersectionObserver во встроенных и фоновых окнах)
function revealCheck() { const lim = innerHeight * 0.94; document.querySelectorAll('.reveal:not(.in)').forEach((el) => { if (el.getBoundingClientRect().top < lim) el.classList.add('in'); }); }
function observeReveal() { revealCheck(); setTimeout(revealCheck, 350); }
addEventListener('scroll', revealCheck, { passive: true });
addEventListener('resize', revealCheck);
// Страховка: если что-то пошло не так, через 3 секунды показываем всё, что уже выше экрана
setInterval(() => document.querySelectorAll('.reveal:not(.in)').forEach((el) => { if (el.getBoundingClientRect().bottom < innerHeight) el.classList.add('in'); }), 3000);
const bar = Object.assign(document.createElement('div'), { className: 'scroll-progress' });
bar.setAttribute('aria-hidden', 'true');
const up = Object.assign(document.createElement('button'), { className: 'to-top', type: 'button', innerHTML: icon('chev') });
up.setAttribute('aria-label', 'Наверх');
up.onclick = () => window.scrollTo({ top: 0, behavior: document.documentElement.dataset.reading ? 'auto' : 'smooth' });
document.body.append(bar, up);
let ticking = false;
addEventListener('scroll', () => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.classList.toggle('scrolled', y > 40);
    bar.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
    up.classList.toggle('show', y > 900);
    ticking = false;
  });
}, { passive: true });
document.addEventListener('click', (e) => { if (e.target.closest('[data-cta-ask]')) S.openAssistant?.(); });
// Плавающее подчёркивание под пунктом меню
function navInk() {
  const nav = document.querySelector('.nav'); if (!nav) return;
  let ink = nav.querySelector('.nav-ink'); if (!ink) { ink = document.createElement('span'); ink.className = 'nav-ink'; ink.setAttribute('aria-hidden', 'true'); nav.append(ink); }
  const place = (el) => { if (!el) { ink.style.opacity = 0; return; } const a = el.getBoundingClientRect(), b = nav.getBoundingClientRect(); ink.style.opacity = 1; ink.style.transform = `translateX(${a.left - b.left + 8}px)`; ink.style.width = `${Math.max(0, a.width - 16)}px`; };
  const current = () => nav.querySelector('[aria-current="page"]');
  nav.onmouseover = (e) => { const it = e.target.closest('.nav > li > a, .nav > li > button'); if (it) place(it); };
  nav.onmouseleave = () => place(current());
  place(current());
}
new MutationObserver(() => navInk()).observe(document.getElementById('app'), { childList: true });
// Лёгкий 3D-наклон карточек к курсору (только мышь; отключается при «уменьшении движения» и «удобном чтении»)
const TILT = '.icard, .pcard, .tile, .news-card, .card-link, .cm-card';
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest(TILT);
    if (!el || document.documentElement.dataset.reading || document.documentElement.dataset.contrast || document.documentElement.dataset.motion) return;
    if (!el.classList.contains('tilt')) { el.classList.add('tilt'); if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; el.insertAdjacentHTML('beforeend', '<span class="tilt-glare" aria-hidden="true"></span>'); }
    const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    const k = (el.classList.contains('pcard') ? 8 : 5) * (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.5 : 1);
    el.classList.add('tilting');
    el.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * k).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * k).toFixed(2) + 'deg) translateY(-6px)';
    el.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest('.tilt'); if (!el || el.contains(e.relatedTarget)) return;
    el.classList.remove('tilting'); el.style.transform = '';
  });
}
initA11y();
render();
export { DICT };
