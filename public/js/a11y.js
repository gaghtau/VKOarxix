// Доступность: размер текста (обычный / крупный / очень крупный), фото на отдельной странице,
// высокий контраст, «удобное чтение» (интервалы, линейка чтения, без анимации) и озвучивание текста.
import { S, esc, L } from './core.js';
import { icon } from './icons.js';

const root = document.documentElement;
const get = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* приватный режим */ } };
const T = (o) => o[S.lang] ?? o.ru;

const TX = {
  title: { ru: 'Настройки доступности', kz: 'Қолжетімділік баптаулары', en: 'Accessibility settings' },
  open: { ru: 'Доступность', kz: 'Қолжетімділік', en: 'Accessibility' },
  size: { ru: 'Размер текста', kz: 'Мәтін өлшемі', en: 'Text size' },
  sizes: [{ ru: 'Обычный', kz: 'Қалыпты', en: 'Normal' }, { ru: 'Крупный', kz: 'Ірі', en: 'Large' }, { ru: 'Очень крупный', kz: 'Өте ірі', en: 'Extra large' }],
  photos: { ru: 'Фото на отдельной странице', kz: 'Суреттер бөлек бетте', en: 'Photos on a separate page' },
  photosHint: { ru: 'Вместо мелких картинок — кнопка «Открыть фото». Фото открывается во весь экран с кнопкой «Назад».', kz: 'Кішкентай суреттердің орнына «Суретті ашу» батырмасы.', en: 'Small images become an “Open photo” button that opens the photo full-screen.' },
  motion: { ru: 'Без анимации', kz: 'Анимациясыз', en: 'No animation' },
  motionHint: { ru: 'Отключить движение и эффекты на сайте — если они мешают или вызывают дискомфорт', kz: 'Сайттағы қозғалысты өшіру', en: 'Turn off motion and effects' },
  dark: { ru: 'Тёмная тема', kz: 'Қараңғы тақырып', en: 'Dark theme' },
  darkHint: { ru: 'Светлый текст на тёмном фоне — удобно вечером', kz: 'Қараңғы фондағы ашық мәтін', en: 'Light text on a dark background' },
  contrast: { ru: 'Высокий контраст', kz: 'Жоғары контраст', en: 'High contrast' },
  contrastHint: { ru: 'Чёрный текст на белом, подчёркнутые ссылки, яркая рамка фокуса', kz: 'Ақ фонда қара мәтін, сілтемелердің асты сызылған', en: 'Black on white, underlined links, strong focus ring' },
  reading: { ru: 'Удобное чтение', kz: 'Ыңғайлы оқу', en: 'Easy reading' },
  readingHint: { ru: 'Больше расстояние между буквами и строками, без курсива и анимаций, жёлтая линейка следует за пальцем или курсором — помогает при дислексии и усталости глаз', kz: 'Әріптер мен жолдар арасы үлкен, анимациясыз, оқу сызғышы', en: 'Wider letter and line spacing, no italics or motion, a reading ruler follows your pointer' },
  tts: { ru: 'Озвучивание', kz: 'Дауыстап оқу', en: 'Read aloud' },
  ttsPage: { ru: 'Прочитать страницу вслух', kz: 'Бетті дауыстап оқу', en: 'Read this page aloud' },
  ttsClick: { ru: 'Читать абзац по нажатию', kz: 'Басқанда абзацты оқу', en: 'Read a paragraph on tap' },
  ttsClickHint: { ru: 'Нажмите на любой абзац или заголовок — он будет прочитан', kz: 'Кез келген абзацты басыңыз — ол оқылады', en: 'Tap any paragraph or heading to hear it' },
  ttsNo: { ru: 'Ваш браузер не поддерживает озвучивание. Попробуйте Chrome, Edge или Safari.', kz: 'Браузер дауыстап оқуды қолдамайды.', en: 'Your browser does not support speech.' },
  ttsKz: { ru: 'Казахский голос не найден на устройстве — текст будет прочитан русским голосом.', kz: 'Құрылғыда қазақ дауысы табылмады — орыс дауысымен оқылады.', en: 'No Kazakh voice on this device — a Russian voice will be used.' },
  reset: { ru: 'Сбросить настройки', kz: 'Баптауларды қалпына келтіру', en: 'Reset settings' },
  close: { ru: 'Готово', kz: 'Дайын', en: 'Done' },
  openPhoto: { ru: 'Открыть фото', kz: 'Суретті ашу', en: 'Open photo' },
  back: { ru: 'Назад', kz: 'Артқа', en: 'Back' },
  bigger: { ru: 'Крупнее', kz: 'Үлкейту', en: 'Larger' },
  smaller: { ru: 'Мельче', kz: 'Кішірейту', en: 'Smaller' },
  reading2: { ru: 'Читаю…', kz: 'Оқып жатырмын…', en: 'Reading…' },
  speed: { ru: 'Скорость', kz: 'Жылдамдық', en: 'Speed' },
  pause: { ru: 'Пауза', kz: 'Кідірту', en: 'Pause' },
  stop: { ru: 'Стоп', kz: 'Тоқтату', en: 'Stop' },
};

// ---------------------------------------------------------------- Применение настроек
function apply() {
  const fs = get('fs');
  if (fs === 'lg' || fs === 'xl') root.dataset.fs = fs; else delete root.dataset.fs;
  if (get('contrast') === 'high') root.dataset.contrast = 'high'; else delete root.dataset.contrast;
  if (get('reading') === 'on') root.dataset.reading = 'on'; else delete root.dataset.reading;
  const im = get('imgmode');
  if (im === 'page' || (fs === 'xl' && im !== 'inline')) root.dataset.imgmode = 'page'; else delete root.dataset.imgmode;
  if (get('ttsclick') === 'on') root.dataset.ttsClick = 'on'; else delete root.dataset.ttsClick;
  if (get('motion') === 'off') root.dataset.motion = 'off'; else delete root.dataset.motion;
}
export const photoMode = () => root.dataset.imgmode === 'page';

// ---------------------------------------------------------------- Панель
let panel = null, opener = null;
export function initA11y() {
  apply();
  if (!document.querySelector('.reading-guide')) {
    const g = document.createElement('div'); g.className = 'reading-guide'; g.setAttribute('aria-hidden', 'true'); document.body.append(g);
    const move = (y) => { if (root.dataset.reading === 'on') g.style.top = `${y - g.offsetHeight / 2}px`; };
    addEventListener('pointermove', (e) => move(e.clientY), { passive: true });
    addEventListener('touchmove', (e) => move(e.touches[0].clientY), { passive: true });
  }
}
export function openPanel(btn) {
  opener = btn || document.activeElement;
  panel?.remove();
  panel = document.createElement('div');
  panel.className = 'a11y-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'a11y-h');
  const fs = get('fs') || 'md';
  const hasTts = 'speechSynthesis' in window;
  panel.innerHTML = `<div class="row" style="justify-content:space-between;flex-wrap:nowrap"><h2 id="a11y-h">${esc(T(TX.title))}</h2><button class="icon-btn" data-x aria-label="${esc(T(TX.close))}">${icon('x')}</button></div>
    <fieldset><legend>${esc(T(TX.size))}</legend><div class="seg" role="radiogroup">
      ${['md', 'lg', 'xl'].map((k, i) => `<label><input type="radio" name="fs" value="${k}" ${fs === k ? 'checked' : ''}><span class="sample" style="font-size:${[18, 24, 30][i]}px">Аа</span><span>${esc(T(TX.sizes[i]))}</span></label>`).join('')}
    </div></fieldset>
    <fieldset><legend class="sr-only">${esc(T(TX.photos))}</legend>
      <label class="switch"><span><b>${esc(T(TX.photos))}</b><small>${esc(T(TX.photosHint))}</small></span><input type="checkbox" data-k="imgmode" ${photoMode() ? 'checked' : ''}></label>
      <label class="switch"><span><b>${esc(T(TX.dark))}</b><small>${esc(T(TX.darkHint))}</small></span><input type="checkbox" data-k="theme" ${root.dataset.theme === 'dark' ? 'checked' : ''}></label>
      <label class="switch"><span><b>${esc(T(TX.contrast))}</b><small>${esc(T(TX.contrastHint))}</small></span><input type="checkbox" data-k="contrast" ${root.dataset.contrast ? 'checked' : ''}></label>
      <label class="switch"><span><b>${esc(T(TX.motion))}</b><small>${esc(T(TX.motionHint))}</small></span><input type="checkbox" data-k="motion" ${root.dataset.motion ? 'checked' : ''}></label>
      <label class="switch"><span><b>${esc(T(TX.reading))}</b><small>${esc(T(TX.readingHint))}</small></span><input type="checkbox" data-k="reading" ${root.dataset.reading ? 'checked' : ''}></label>
    </fieldset>
    <fieldset><legend>${esc(T(TX.tts))}</legend>
      ${hasTts ? `<button class="btn btn-brand" style="width:100%" data-read>${icon('music')}${esc(T(TX.ttsPage))}</button>
      <label class="switch"><span><b>${esc(T(TX.ttsClick))}</b><small>${esc(T(TX.ttsClickHint))}</small></span><input type="checkbox" data-k="ttsclick" ${root.dataset.ttsClick ? 'checked' : ''}></label>
      ${S.lang === 'kz' && !voiceFor('kz') ? `<p class="small muted" style="margin:0">${esc(T(TX.ttsKz))}</p>` : ''}` : `<p class="muted">${esc(T(TX.ttsNo))}</p>`}
    </fieldset>
    <div class="row" style="justify-content:space-between;margin-top:18px"><button class="btn" data-reset>${icon('reset')}${esc(T(TX.reset))}</button><button class="btn btn-brand" data-x>${esc(T(TX.close))}</button></div>`;
  document.body.append(panel);
  document.querySelectorAll('[data-a11y-open]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
  panel.querySelector('input:checked, input')?.focus();
  const rerender = () => S.navigate?.(location.pathname + location.search, { replace: true, scroll: false });
  panel.addEventListener('change', (e) => {
    const i = e.target;
    if (i.name === 'fs') { set('fs', i.value === 'md' ? null : i.value); if (i.value === 'xl' && get('imgmode') !== 'inline') panel.querySelector('[data-k="imgmode"]').checked = true; }
    if (i.dataset.k === 'imgmode') set('imgmode', i.checked ? 'page' : 'inline');
    if (i.dataset.k === 'theme') { set('site-theme', i.checked ? 'dark' : 'light'); root.dataset.theme = i.checked ? 'dark' : 'light'; }
    if (i.dataset.k === 'contrast') set('contrast', i.checked ? 'high' : null);
    if (i.dataset.k === 'reading') set('reading', i.checked ? 'on' : null);
    if (i.dataset.k === 'ttsclick') set('ttsclick', i.checked ? 'on' : null);
    if (i.dataset.k === 'motion') set('motion', i.checked ? 'off' : null);
    apply();
    // Эти настройки меняют раскладку или включают/выключают анимации — перерисовываем страницу
    if (i.name === 'fs' || ['imgmode', 'motion', 'contrast', 'reading'].includes(i.dataset.k)) rerender();
  });
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-x]')) closePanel();
    if (e.target.closest('[data-read]')) { closePanel(); readPage(); }
    if (e.target.closest('[data-reset]')) { ['fs', 'contrast', 'reading', 'imgmode', 'ttsclick', 'motion'].forEach((k) => set(k, null)); apply(); closePanel(); rerender(); }
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
    if (e.key === 'Tab') { // удерживаем фокус внутри окна
      const f = [...panel.querySelectorAll('button, input')]; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}
export function closePanel() {
  panel?.remove(); panel = null;
  document.querySelectorAll('[data-a11y-open]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  opener?.focus?.();
}

// ---------------------------------------------------------------- Фото на отдельной странице
export const photoHref = (src, title) => `${L('photo')}?src=${encodeURIComponent(String(src).replace('?s=t', '').replace('_t.jpg', '.jpg'))}&t=${encodeURIComponent(title || '')}`;
const photoLink = (src, title) => {
  const a = document.createElement('a');
  a.className = 'photo-link'; a.href = photoHref(src, title);
  a.innerHTML = `${icon('image')}<span>${esc(T(TX.openPhoto))}${title ? ': ' + esc(title.length > 70 ? title.slice(0, 70) + '…' : title) : ''}</span>`;
  return a;
};
export function applyImageMode(scope) {
  if (!photoMode() || !scope) return;
  scope.querySelectorAll('img').forEach((img) => {
    // декоративные копии (например, «лупа» на мониторе главной) не превращаем во вторую ссылку «Открыть фото»
    if (img.getAttribute('aria-hidden') === 'true' || img.closest('.photo-page, .leaflet-container, .logo-mark, .compare')) return;
    const src = img.closest('[data-zoom-src]')?.dataset.zoomSrc || img.getAttribute('src');
    const title = img.alt || img.closest('[data-zoom-title]')?.dataset.zoomTitle || '';
    const inLink = img.closest('a');
    if (inLink) { (img.closest('.img, .thumb, .ncover') || img).style.display = 'none'; return; }
    const btn = img.closest('button');
    (btn || img).replaceWith(photoLink(src, title));
  });
  scope.querySelectorAll('.compare').forEach((c) => {
    const imgs = [...c.querySelectorAll('img')];
    const box = document.createElement('div'); box.className = 'row';
    imgs.forEach((i) => box.append(photoLink(i.getAttribute('src'), i.alt)));
    c.replaceWith(box);
  });
}
export function photoPage() {
  const p = new URLSearchParams(location.search);
  const src = p.get('src') || '';
  const title = p.get('t') || '';
  const safe = /^\/(img|api\/files)\/[\w\-./?=&%]+$/.test(src) && !src.includes('..');
  const html = `<div class="photo-page">
    <div class="bar"><button class="btn btn-brand" data-back>${icon('left')}${esc(T(TX.back))}</button><button class="btn" data-z="1">${icon('zoomin')}${esc(T(TX.bigger))}</button><button class="btn" data-z="-1">${icon('zoomout')}${esc(T(TX.smaller))}</button></div>
    ${title ? `<h1 style="font-size:1.5rem">${esc(title)}</h1>` : ''}
    ${safe ? `<div class="zoomwrap"><img src="${esc(src)}" alt="${esc(title)}" data-photo></div>` : `<p class="notice warn">${icon('alert')} ${esc({ ru: 'Изображение не найдено', kz: 'Сурет табылмады', en: 'Image not found' }[S.lang])}</p>`}
  </div>`;
  return {
    title: title || T(TX.openPhoto), html,
    after(r) {
      let z = 1; const img = r.querySelector('[data-photo]');
      r.querySelector('[data-back]').onclick = () => (history.length > 1 ? history.back() : S.navigate(L('')));
      r.querySelectorAll('[data-z]').forEach((b) => { b.onclick = () => { z = Math.min(3, Math.max(1, z + 0.5 * +b.dataset.z)); if (img) img.style.width = `${z * 100}%`; }; });
    },
  };
}

// ---------------------------------------------------------------- Озвучивание (Web Speech API, работает офлайн в браузере)
const LANG = { ru: 'ru-RU', kz: 'kk-KZ', en: 'en-US' };
function voiceFor(lang) {
  const vs = speechSynthesis.getVoices();
  return vs.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(lang === 'kz' ? 'kk' : lang)) || null;
}
let queue = [], bar = null, rate = Number(get('ttsrate')) || 1, current = null;
function showBar(text) {
  if (!bar) {
    bar = document.createElement('div'); bar.className = 'tts-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', T(TX.tts));
    bar.innerHTML = `<button data-p aria-label="${esc(T(TX.pause))}">${icon('clock')}</button><button data-s aria-label="${esc(T(TX.stop))}">${icon('x')}</button><label class="sr-only" for="tts-rate">${esc(T(TX.speed))}</label><select id="tts-rate" data-r>${[0.7, 0.85, 1, 1.2].map((r) => `<option value="${r}" ${r === rate ? 'selected' : ''}>${r}×</option>`).join('')}</select><span class="st" aria-live="polite"></span>`;
    document.body.append(bar);
    bar.querySelector('[data-s]').onclick = stopTts;
    bar.querySelector('[data-p]').onclick = () => { if (speechSynthesis.paused) speechSynthesis.resume(); else speechSynthesis.pause(); };
    bar.querySelector('[data-r]').onchange = (e) => { rate = Number(e.target.value); set('ttsrate', String(rate)); };
  }
  bar.querySelector('.st').textContent = text;
}
function speakNext() {
  current?.classList.remove('tts-reading');
  const el = queue.shift();
  if (!el) { stopTts(); return; }
  const text = el.innerText.replace(/\s+/g, ' ').trim();
  if (!text) return speakNext();
  current = el; el.classList.add('tts-reading');
  el.scrollIntoView({ block: 'center', behavior: root.dataset.reading ? 'auto' : 'smooth' });
  const u = new SpeechSynthesisUtterance(text);
  const v = voiceFor(S.lang) || voiceFor('ru');
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = LANG[S.lang];
  u.rate = rate;
  u.onend = speakNext; u.onerror = speakNext;
  showBar(`${T(TX.reading2)} ${text.slice(0, 60)}`);
  speechSynthesis.speak(u);
}
const READABLE = 'h1, h2, h3, p, li, figcaption, td, dd, .lead, .cm p';
export function readPage() {
  if (!('speechSynthesis' in window)) return;
  stopTts();
  queue = [...document.querySelectorAll(`#app ${READABLE.split(', ').join(', #app ')}`)].filter((el) => el.offsetParent !== null && !el.closest('form, nav, .assist, .tts-bar') && !el.querySelector('p, li'));
  speakNext();
}
export function readElement(el) { stopTts(); queue = [el]; speakNext(); }
export function stopTts() {
  queue = []; if ('speechSynthesis' in window) speechSynthesis.cancel();
  current?.classList.remove('tts-reading'); current = null;
  bar?.remove(); bar = null;
}
document.addEventListener('click', (e) => {
  if (root.dataset.ttsClick !== 'on' || !('speechSynthesis' in window)) return;
  if (e.target.closest('a, button, input, select, textarea, label, .tts-bar, .a11y-panel, .assist')) return;
  const el = e.target.closest(READABLE);
  if (el && el.closest('#app')) readElement(el);
});
