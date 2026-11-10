import { DICT } from './i18n.js';
import { icon } from './icons.js';

export const LANGS = ['kz', 'ru', 'en'];
export const S = { lang: 'ru', meta: null, cache: new Map() };

export const esc = (s = '') => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const t = (path) => path.split('.').reduce((o, k) => o?.[k], DICT[S.lang]) ?? path.split('.').reduce((o, k) => o?.[k], DICT.ru) ?? path;
// Перевод значения {ru,kz,en}; при отсутствии перевода — оригинал (RU) и пометка
export const tr = (o) => (o == null ? '' : typeof o === 'string' ? o : o[S.lang] ?? o.ru ?? Object.values(o)[0] ?? '');
export const missing = (o) => o && typeof o === 'object' && S.lang !== 'ru' && !o[S.lang];
export const trBadge = (o) => (missing(o) ? ` <span class="tag" title="${esc(t('translationMissing'))}">RU</span>` : '');
export const L = (path = '') => `/${S.lang}/${path}`.replace(/\/+$/, '/').replace(/\/\//g, '/');
export const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } } };

export async function api(url, opts = {}) {
  const key = opts.method ? null : url;
  if (key && opts.cache && S.cache.has(key)) return S.cache.get(key);
  const { cache, ...fo } = opts;
  const res = await fetch(url, { ...fo, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body });
  let data = null; try { data = await res.json(); } catch { /* не JSON */ }
  if (!res.ok) { const e = new Error(data?.message || res.statusText); e.status = res.status; e.data = data; throw e; }
  if (key && opts.cache) S.cache.set(key, data);
  return data;
}

export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
}
export async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); } catch { const ta = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast(msg);
}
export async function share(title, url) {
  if (navigator.share) { try { await navigator.share({ title, url }); return; } catch { /* отмена */ } }
  copy(url, t('doc.linkCopied'));
}

export const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString({ ru: 'ru-RU', kz: 'kk-KZ', en: 'en-GB' }[S.lang], { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return iso; } };
export const years = (r) => (r.date_from ? (r.date_to && r.date_to !== r.date_from ? `${r.date_from}–${r.date_to}` : `${r.date_from}`) + (r.date_uncertain ? '?' : '') : '—');
export const fileUrl = (id, p = 1) => `/api/files/${id}/${p}?v=3`;
export const typeIcon = (tp) => ({ photo: 'image', map: 'map', personal: 'feather', audio: 'music', video: 'video', newspaper: 'news', org: 'folder' })[tp] || 'file';

export function accessTag(a) {
  if (!a) return '';
  if (a.digital) return `<span class="tag tag-ok">${icon('eye')}${esc(t('doc.available'))}</span>`;
  if (a.file === 'restricted') return `<span class="tag tag-danger">${icon('lock')}${esc(t('doc.restricted'))}</span>`;
  if (a.file === 'review') return `<span class="tag tag-warn">${icon('alert')}${esc(t('doc.review'))}</span>`;
  return `<span class="tag">${icon('file')}${esc(t('doc.none'))}</span>`;
}
export function docCard(r) {
  const thumb = r.access?.digital ? `<img src="${fileUrl(r.id)}" alt="" loading="lazy" decoding="async">` : icon(typeIcon(r.doc_type));
  return `<a class="doc-card" href="${L('catalog/' + r.id)}">
    <div class="thumb">${thumb}</div>
    <div><div class="meta" style="margin-bottom:6px"><span class="cipher">${esc(r.cipher || '')}</span>${accessTag(r.access)}</div>
    <h3>${esc(tr(r.title))}${trBadge(r.title)}</h3>
    <div class="meta"><span>${esc(years(r))}</span><span>·</span><span>${esc(t('types.' + r.doc_type) || '')}</span>${r.place ? `<span>·</span><span>${esc(r.place)}</span>` : ''}</div></div></a>`;
}
export const crumbs = (items) => `<nav aria-label="breadcrumbs"><ol class="crumbs"><li><a href="${L('')}">${esc(t('toHome'))}</a></li>${items.map(([label, href]) => `<li>${href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`}</li>`).join('')}</ol></nav>`;
export const pageHead = (title, lead, cr = [[title]]) => `<header class="page-head"><div class="wrap">${crumbs(cr)}<h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}</div></header>`;
export const errorBox = (msg, retry = true) => `<div class="notice warn" role="alert">${icon('alert')}<div><p>${esc(msg || t('cat.error'))}</p>${retry ? `<button class="btn btn-sm" data-act="retry">${icon('reset')}${esc(t('cat.retry'))}</button>` : ''}</div></div>`;
export const demoTag = (on = true) => (on ? `<span class="tag tag-demo" title="Демонстрационные данные прототипа">${esc(t('demo'))}</span>` : '');

// ---------------------------------------------------------------- Лайтбокс с масштабированием и перелистыванием
export function lightbox(items, start = 0) {
  let i = start, z = 1, x = 0, y = 0, rot = 0;
  let el = document.querySelector('.lightbox');
  if (!el) { el = document.createElement('div'); el.className = 'lightbox'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); }
  const prevFocus = document.activeElement;
  const draw = () => {
    const it = items[i];
    el.innerHTML = `<div class="lb-top"><span class="grow">${esc(it.title || '')}</span><span class="small" style="opacity:.7">${items.length > 1 ? `${i + 1} / ${items.length}` : ''}</span>
      <button data-lb="out" aria-label="−">${icon('zoomout')}</button><button data-lb="in" aria-label="+">${icon('zoomin')}</button><button data-lb="rot" aria-label="rotate">${icon('rotate')}</button><button data-lb="close" aria-label="${esc(t('close'))}">${icon('x')}</button></div>
      <div class="lb-stage"><img src="${it.src}" alt="${esc(it.title || '')}" draggable="false"></div>
      <div class="lb-bottom">${items.length > 1 ? `<button data-lb="prev" aria-label="prev">${icon('left')}</button>` : ''}<span class="grow small" style="opacity:.8">${it.caption || ''}</span>${items.length > 1 ? `<button data-lb="next" aria-label="next">${icon('right')}</button>` : ''}</div>`;
    apply(); el.querySelector('[data-lb="close"]').focus();
  };
  const apply = () => { const img = el.querySelector('.lb-stage img'); if (img) img.style.transform = `translate(${x}px, ${y}px) scale(${z}) rotate(${rot}deg)`; };
  const go = (d) => { i = (i + d + items.length) % items.length; z = 1; x = y = rot = 0; draw(); };
  const close = () => { el.classList.remove('open'); document.removeEventListener('keydown', key); prevFocus?.focus?.(); };
  const key = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); if (e.key === '+' || e.key === '=') { z = Math.min(6, z * 1.25); apply(); } if (e.key === '-') { z = Math.max(1, z / 1.25); apply(); } };
  el.onclick = (e) => { const b = e.target.closest('[data-lb]')?.dataset.lb; if (!b) { if (e.target === el) close(); return; } if (b === 'close') close(); if (b === 'next') go(1); if (b === 'prev') go(-1); if (b === 'in') { z = Math.min(6, z * 1.4); apply(); } if (b === 'out') { z = Math.max(1, z / 1.4); if (z === 1) x = y = 0; apply(); } if (b === 'rot') { rot = (rot + 90) % 360; apply(); } };
  el.onwheel = (e) => { e.preventDefault(); z = Math.min(6, Math.max(1, z * (e.deltaY < 0 ? 1.12 : 0.89))); if (z === 1) x = y = 0; apply(); };
  let drag = null;
  el.onpointerdown = (e) => { if (e.target.tagName === 'IMG' && z > 1) { drag = { sx: e.clientX - x, sy: e.clientY - y }; e.target.setPointerCapture(e.pointerId); } };
  el.onpointermove = (e) => { if (drag) { x = e.clientX - drag.sx; y = e.clientY - drag.sy; apply(); } };
  el.onpointerup = () => { drag = null; };
  el.ondblclick = (e) => { if (e.target.tagName === 'IMG') { z = z > 1 ? 1 : 2.5; x = y = 0; apply(); } };
  document.addEventListener('keydown', key);
  el.classList.add('open'); draw();
}
