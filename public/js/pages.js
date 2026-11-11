import { S, t, tr, esc, L, api, store, docCard, pageHead, crumbs, fmtDate, fileUrl, toast, errorBox, demoTag, trBadge, M, fig, credit, commentsHtml, mountComments, years } from './core.js';
import { icon } from './icons.js';
import { renderAnswer, ask } from './assistant.js';
import { compareHtml, mountCompare } from './features.js';

const X = (o) => o[S.lang] ?? o.ru; // локальные тексты страниц {ru,kz,en}
const ext = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ${icon('ext', 'sr-hide')}<span aria-hidden="true">↗</span></a>`;

// ---------------------------------------------------------------- Календарь: ближайшая дата
const MONTHS = { ru: ['январ', 'феврал', 'март', 'апрел', 'ма', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'], kz: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'] };
export function parseCalDate(s) {
  const m = s.toLowerCase().match(/^(\d{1,2})?\s*-?\s*([а-яәғқңөұүһі]+)/);
  if (!m) return null;
  const word = m[2];
  let mi = MONTHS.ru.findIndex((p) => (p === 'ма' ? /^ма[йя]$/.test(word) : word.startsWith(p)));
  if (mi < 0) mi = MONTHS.kz.findIndex((p) => word.startsWith(p));
  return mi < 0 ? null : { m: mi, d: m[1] ? +m[1] : null };
}
export function upcoming(cal, n = 3) {
  const now = new Date(); const cur = now.getMonth() * 100 + now.getDate();
  const items = cal.items.map((it) => ({ ...it, p: parseCalDate(it.date.ru) })).filter((x) => x.p);
  const key = (x) => x.p.m * 100 + (x.p.d ?? 0);
  const sorted = items.sort((a, b) => key(a) - key(b));
  const next = sorted.filter((x) => key(x) >= cur);
  return next.concat(sorted.filter((x) => key(x) < cur)).slice(0, n); // по кругу: после декабря — январь
}

// ---------------------------------------------------------------- Главная
export async function home() {
  const [digital, news, cal] = await Promise.all([
    api(`/api/catalog/search?digital=1&per=48&lang=${S.lang}`, { cache: true }),
    api('/api/content/news', { cache: true }), api('/api/calendar', { cache: true }),
  ]);
  const X = (o) => o[S.lang] ?? o.ru;
  const m = S.meta || {};
  const photos = digital.items.filter((d) => d.doc_type === 'photo');
  const pick = ['Куленов', 'Волков', 'Аманжолов', 'Чистяков', 'Кырыкбаев', 'Белослюдов', 'Бердус', 'Горохов', 'Карбушев', 'Коншин'];
  const reel = pick.map((n) => photos.find((p) => p.title.ru.includes(n))).filter(Boolean).concat(photos).filter((v, i, a) => a.indexOf(v) === i).slice(0, 10);
  // Кадры «микрофильма» на экране монитора: старые гравюры и фото края → современный город
  const FR = ['uk-1891', 'zaisan-1875', 'zhemini-1875', 'uk-irtysh', 'uk-hpp', 'bukhtarma-sea', 'uk-panorama'].map((k) => ({ k, m: M(k) })).filter((f) => f.m);
  const scr = FR[0]?.m;
  const cap = (mm) => String(mm.title || '').split(/\.\s|,\s(?=Фото|фото|гравюр)/)[0].slice(0, 70);
  const days = upcoming(cal, 4);
  const lk = S.lang === 'kz' ? 'kz' : 'ru';
  const nm = (d) => tr(d.title).replace(/^[^:]+:\s*/, '');
  const CH = [X({ ru: 'Вход', kz: 'Кіру', en: 'Entry' }), X({ ru: 'Стол', kz: 'Үстел', en: 'Desk' }), X({ ru: 'Люди', kz: 'Адамдар', en: 'People' }), X({ ru: 'Время', kz: 'Уақыт', en: 'Time' }), X({ ru: 'Журнал', kz: 'Журнал', en: 'Log' })];
  const head = (i, title, extra = '') => `<div class="d-head"><div><span class="mlabel">${String(i + 1).padStart(2, '0')} / 05 — ${esc(CH[i])}</span><h2 data-split>${title}</h2></div>${extra}</div>`;
  const html = `
  <nav class="d-rail" aria-label="${esc(X({ ru: 'Главы страницы', kz: 'Бет тараулары', en: 'Page chapters' }))}">${CH.map((c, i) => `<a href="#ch${i + 1}" aria-label="${esc(c)}" ${i === 0 ? 'aria-current="true"' : ''}>${i + 1}</a>`).join('')}</nav>
  <div class="d-corner l" aria-hidden="true">${esc(t('orgShort'))} / ${esc(X({ ru: 'с 1940', kz: '1940 жылдан', en: 'since 1940' }))}</div>
  <div class="d-corner c"><a href="#ch2" data-next>${esc(X({ ru: 'Следующая глава', kz: 'Келесі тарау', en: 'Next chapter' }))} ↓</a></div>
  <div class="d-corner r" aria-hidden="true"><b data-count>01</b> / 05</div>

  <section class="d-intro d-ch" id="ch1" aria-labelledby="hero-title"><div class="crt" data-crt>
    <div class="crt-body"><div class="crt-screen" data-screen tabindex="-1">${scr ? `<img src="${esc(scr.url)}" alt="" data-frame-img><img class="crt-lens" src="${esc(scr.url)}" alt="" aria-hidden="true" data-frame-lens>` : ''}<span class="crt-glare" aria-hidden="true"></span><span class="crt-static" aria-hidden="true"></span>
      <div class="crt-off" aria-hidden="true"><span>${esc(X({ ru: 'НЕТ СИГНАЛА', kz: 'СИГНАЛ ЖОҚ', en: 'NO SIGNAL' }))}</span></div>
      <div class="crt-in">
        <div class="crt-top"><span class="mlabel">${esc(X({ ru: 'Госархив ВКО / открытый архив', kz: 'ШҚО мемархиві / ашық архив', en: 'State Archive EKR / open archive' }))}</span>${scr ? `<a class="crt-cap" data-frame-cap href="${esc(scr.sourceUrl || L('sources'))}" target="_blank" rel="noopener"><b data-frame-no>01 / ${String(FR.length).padStart(2, '0')}</b> <span data-frame-date>${esc(scr.date || '')}</span><span data-frame-title>${esc(cap(scr))}</span></a>` : ''}</div>
        <div><h1 id="hero-title" data-type="${esc(X({ ru: 'Память края — открыта', kz: 'Өлке жады — ашық', en: 'The region’s memory — open' }))}">${esc(X({ ru: 'Память края — открыта', kz: 'Өлке жады — ашық', en: 'The region’s memory — open' }))}<span class="caret" aria-hidden="true"></span></h1></div>
        <div style="display:grid;gap:14px">
          <form class="crt-search" role="search" data-home-search><span aria-hidden="true">&gt;</span><label class="sr-only" for="home-q">${esc(t('hero.ph'))}</label><input id="home-q" type="search" placeholder="${esc(X({ ru: 'фамилия, город, год или вопрос', kz: 'тегі, қала, жыл немесе сұрақ', en: 'surname, town, year or a question' }))}" autocomplete="off"><button>${esc(X({ ru: 'НАЙТИ', kz: 'ІЗДЕУ', en: 'SEARCH' }))} →</button></form>
          <div class="crt-out" data-crt-out aria-live="polite" hidden></div>
          <div class="crt-hint"><span class="mlabel" style="color:#BDB5A4">${esc(X({ ru: 'Например:', kz: 'Мысалы:', en: 'Try:' }))} <a href="${L('catalog?q=' + encodeURIComponent('Куленов'))}" style="display:inline">Куленов</a> · <a href="${L('catalog?q=' + encodeURIComponent('Ф.1466'))}" style="display:inline">Ф.1466</a></span><a href="#ch2">${esc(X({ ru: 'Листайте', kz: 'Төмен', en: 'Keep scrolling' }))} <i aria-hidden="true"></i></a></div>
        </div>
      </div></div>
      <div class="crt-bezel"><span class="grill" aria-hidden="true"></span>
        <div class="crt-ctl" role="group" aria-label="${esc(X({ ru: 'Кадры на экране', kz: 'Экрандағы кадрлар', en: 'Screen frames' }))}"><button type="button" data-frame="-1" aria-label="${esc(X({ ru: 'Предыдущий кадр', kz: 'Алдыңғы кадр', en: 'Previous frame' }))}">◀</button><span class="crt-dots" aria-hidden="true">${FR.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span><button type="button" data-frame="1" aria-label="${esc(X({ ru: 'Следующий кадр', kz: 'Келесі кадр', en: 'Next frame' }))}">▶</button></div>
        <span class="led" aria-hidden="true"></span></div>
    </div>
    <div class="crt-neck" aria-hidden="true"></div>
    <div class="crt-base"><button type="button" class="pw" data-power aria-pressed="true" aria-label="${esc(X({ ru: 'Питание монитора', kz: 'Монитор қуаты', en: 'Monitor power' }))}" title="${esc(X({ ru: 'Выключить / включить экран', kz: 'Экранды өшіру / қосу', en: 'Screen off / on' }))}"></button><span class="vents" aria-hidden="true"></span><button type="button" class="slot" data-film title="${esc(X({ ru: 'Показать случайный документ из архива', kz: 'Архивтен кездейсоқ құжат', en: 'Show a random archival record' }))}"><span>${esc(X({ ru: 'Микрофильм', kz: 'Микрофильм', en: 'Microfilm' }))}</span><em>${esc(X({ ru: 'случайный документ ⏏', kz: 'кездейсоқ құжат ⏏', en: 'random record ⏏' }))}</em></button></div>
  </div></section>

  <section class="d-ch" id="ch2"><div class="wrap">
    ${head(1, esc(X({ ru: 'Всё, что нужно — на одном столе', kz: 'Керегінің бәрі — бір үстелде', en: 'Everything you need, on one desk' })))}
    <div class="d-board" data-board>
      <a class="note dark b1" style="--tr:3deg" href="${L('catalog')}"><span class="n"><span>01</span><span>↗</span></span><h3>${esc(X({ ru: 'Найти документ.', kz: 'Құжат табу.', en: 'Find a record.' }))}</h3><p>${esc(X({ ru: 'Фонды, описи, фотографии. Можно просто спросить.', kz: 'Қорлар, тізімдемелер, суреттер.', en: 'Fonds, inventories, photos — or just ask.' }))}</p><span class="pill" style="background:var(--paper);color:var(--ink)">${esc(X({ ru: 'Каталог', kz: 'Каталог', en: 'Catalogue' }))}</span></a>
      <a class="note b2" href="${L('about')}"><span class="n"><span>02 / ${esc(t('orgShort'))}</span><span>↗</span></span><h3 style="font-size:clamp(2rem,2.6vw + 1rem,3.4rem);max-width:10ch">${esc(X({ ru: 'Память края с 1940 года.', kz: '1940 жылдан бергі өлке жады.', en: 'The region’s memory since 1940.' }))}</h3><p style="max-width:26ch">${esc(X({ ru: `Документы, фото и судьбы людей Восточного Казахстана. ${m.counts?.fund || 77} фондов уже онлайн.`, kz: `Шығыс Қазақстан адамдарының құжаттары мен суреттері. ${m.counts?.fund || 77} қор онлайн.`, en: `Records, photos and lives of East Kazakhstan. ${m.counts?.fund || 77} fonds online.` }))}</p>
        <span class="slip" aria-hidden="true"><b>${esc(X({ ru: 'Карточка фонда', kz: 'Қор карточкасы', en: 'Fonds card' }))}</b>Ф.1466 · Оп.3<br>Куленов А.С.<br>1956–2007</span></a>
      <a class="note grey b3" style="--tr:-3deg" href="${L('family')}"><span class="n"><span>03</span><span>↗</span></span><h3>${esc(X({ ru: 'Найти родственника.', kz: 'Туысқанды табу.', en: 'Find a relative.' }))}</h3><div class="ic" aria-hidden="true">${icon('user')}${icon('search')}${icon('file')}</div><p>${esc(X({ ru: 'Три вопроса — и памятка: куда идти и что взять.', kz: 'Үш сұрақ — және жадынама.', en: 'Three questions — and a checklist.' }))}</p></a>
      <a class="note grey b4" style="--tr:2deg" href="${L('branches')}"><span class="n"><span>04</span><span>↗</span></span><h3>${esc(X({ ru: 'Прийти в архив.', kz: 'Архивке келу.', en: 'Visit us.' }))}</h3><span class="pill">${esc(X({ ru: 'Пн–Пт 8:00–17:00', kz: 'Дс–Жм 8:00–17:00', en: 'Mon–Fri 8–17' }))}</span><p>${esc(X({ ru: `${(m.branches || []).length} зданий: адреса и маршрут.`, kz: `${(m.branches || []).length} ғимарат: мекенжай мен бағыт.`, en: `${(m.branches || []).length} locations with routes.` }))}</p></a>
      <a class="note b5" style="--tr:-1deg" href="${L('exhibitions')}"><span class="n"><span>05</span><span>↗</span></span><h3>${esc(X({ ru: 'Выставки.', kz: 'Көрмелер.', en: 'Exhibitions.' }))}</h3><p>${esc(X({ ru: 'Люди края, путешественники XIX века, ГЭС на Иртыше.', kz: 'Өлке адамдары, саяхатшылар, СЭС.', en: 'People, travellers, Irtysh dams.' }))}</p></a>
      <div class="note green b6" style="--tr:2.5deg"><span class="n"><span>06</span><span></span></span><h3>${esc(X({ ru: 'Есть вопрос?', kz: 'Сұрағыңыз бар ма?', en: 'Any questions?' }))}</h3><p style="font-family:var(--mono);font-size:.86rem"><a href="tel:+77232255976" style="color:inherit">${esc(m.org?.phoneReception || '')}</a><br><a href="mailto:${esc(m.org?.email || '')}" style="color:inherit">${esc(m.org?.email || '')}</a></p><button class="btn btn-sm" type="button" data-cta-ask style="justify-self:start;border-color:#EFE8DA;color:#EFE8DA">${esc(X({ ru: 'Спросить помощника', kz: 'Көмекшіден сұрау', en: 'Ask the assistant' }))} →</button></div>
    </div>
  </div></section>

  <section class="d-ch d-reel" id="ch3"><div class="wrap">
    ${head(2, esc(X({ ru: 'Лица из личных фондов', kz: 'Жеке қорлардағы тұлғалар', en: 'Faces from personal fonds' })), `<a class="btn btn-sm" href="${L('memory')}">${esc(X({ ru: 'Все люди', kz: 'Барлық тұлғалар', en: 'All people' }))} ↗</a>`)}
    <div class="reel-wrap" data-reel><div class="reel-track">${reel.map((d, i) => `<a class="poster" href="${L('catalog/' + d.id)}"><span class="mlabel"><span>${String(i + 1).padStart(2, '0')} / ${String(reel.length).padStart(2, '0')}</span><span>${esc(d.cipher)}</span></span><img src="${fileUrl(d.id, 1, true)}" alt="${esc(nm(d))}" loading="lazy"><h3>${esc(nm(d))}</h3><p>${esc((tr(d.descr).replace(/^Фотография из фонда личного происхождения\.\s*/, '').split(/[.–—]/)[1] || '').trim().slice(0, 70))}</p></a>`).join('')}</div></div>
    <div class="reel-ctrl"><button type="button" data-reel-prev aria-label="${esc(X({ ru: 'Назад', kz: 'Артқа', en: 'Previous' }))}">${icon('left')}</button><button type="button" data-reel-next aria-label="${esc(X({ ru: 'Дальше', kz: 'Әрі қарай', en: 'Next' }))}">${icon('right')}</button><span class="reel-count mlabel" data-reel-count>01 / ${String(reel.length).padStart(2, '0')}</span></div>
  </div></section>

  <section class="d-ch" id="ch4"><div class="wrap">
    <span class="mlabel">04 / 05 — ${esc(CH[3])}</span>
    <p class="d-statement" data-highlight>${esc(X({ ru: 'С 1940 года архив хранит память края: письма, фотографии, приказы и судьбы людей. Теперь они открыты каждому — с телефона и без очередей.', kz: '1940 жылдан бері архив өлке жадын сақтайды: хаттар, суреттер, бұйрықтар және адамдар тағдыры. Енді олар әркімге ашық.', en: 'Since 1940 the archive has kept the region’s memory: letters, photographs, orders and lives. Now they are open to everyone.' }))}</p>
    <div class="d-split2"><div data-clip>${compareHtml('uk-1891', 'uk-irtysh', '1891', X({ ru: 'сегодня', kz: 'бүгін', en: 'today' }))}</div>
      <div class="note grey" style="--r:1.2deg;min-height:0"><span class="n"><span>${esc(X({ ru: 'Тогда и сейчас', kz: 'Сол кезде және қазір', en: 'Then and now' }))}</span><span>↔</span></span><p>${esc(X({ ru: 'Усть-Каменогорск на гравюре 1891 года и сегодня. Сдвиньте шторку.', kz: 'Өскемен 1891 жылы және бүгін. Жылжытыңыз.', en: 'Ust-Kamenogorsk in 1891 and today. Drag to compare.' }))}</p><a class="btn btn-sm" href="${L('then-and-now')}">${esc(t('home.all'))} ↗</a></div></div>
  </div></section>

  <section class="d-ch" id="ch5"><div class="wrap">
    ${head(4, esc(X({ ru: 'Что нового в архиве', kz: 'Архивте не жаңалық', en: 'What’s new' })))}
    <div class="d-log">
      <div class="note" style="--r:-.6deg;--tr:1deg"><span class="n"><span>${esc(t('nav.news'))}</span><a href="${L('news')}" style="color:inherit">${esc(t('home.all'))} ↗</a></span><ul>${news.slice(0, 4).map((n) => `<li><a href="${L('news/' + n.slug)}"><time>${esc(fmtDate(n.date))}</time><b>${esc(tr(n.title))}</b></a></li>`).join('')}</ul></div>
      <div class="note grey" style="--r:.8deg;--tr:-2deg"><span class="n"><span>${esc(t('home.calTitle'))}</span><a href="${L('calendar')}" style="color:inherit">${esc(t('home.all'))} ↗</a></span><ul>${days.map((d) => `<li><span><time>${esc(d.date[lk])}</time><span>${esc(d.text[lk])}</span></span></li>`).join('')}</ul></div>
    </div>
  </div></section>`;
  return {
    title: '', html,
    after(root) {
      const cleanups = [];
      root.querySelectorAll('[data-home-search]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); const q = f.querySelector('input').value.trim(); S.navigate(L('catalog') + (q ? '?q=' + encodeURIComponent(q) : '')); }));
      root.querySelectorAll('[data-cta-ask]').forEach((b) => { b.onclick = () => S.openAssistant?.(); });
      mountCompare(root);
      cleanups.push(mountMonitor(root, FR, photos, cap));
      // Лента: кнопки «назад / дальше»
      const wrap = root.querySelector('[data-reel]'), track = wrap.querySelector('.reel-track'), count = root.querySelector('[data-reel-count]');
      const posters = [...track.children]; let idx = 0;
      const go = (d) => { idx = Math.max(0, Math.min(posters.length - 1, idx + d)); count.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(posters.length).padStart(2, '0')}`; if (window.__reelGoto) window.__reelGoto(idx); else posters[idx].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }); };
      root.querySelector('[data-reel-prev]').onclick = () => go(-1);
      root.querySelector('[data-reel-next]').onclick = () => go(1);
      return () => cleanups.forEach((f) => f?.());
    },
  };
}
// Интерактивный монитор на главной: кадры, питание, «микрофильм», живые подсказки поиска, блик за курсором
function mountMonitor(root, FR, photos, cap) {
  const crt = root.querySelector('[data-crt]'); if (!crt) return null;
  const screen = crt.querySelector('[data-screen]'), img = crt.querySelector('[data-frame-img]'), lens = crt.querySelector('[data-frame-lens]');
  const no = crt.querySelector('[data-frame-no]'), date = crt.querySelector('[data-frame-date]'), title = crt.querySelector('[data-frame-title]'), capA = crt.querySelector('[data-frame-cap]');
  const dots = [...crt.querySelectorAll('.crt-dots i')];
  const D = document.documentElement.dataset;
  // Эффекты выключает переключатель «Без анимации» / «Удобное чтение» в панели доступности
  const calm = () => !!(D.motion || D.reading);
  const timers = []; let i = 0, auto = null, film = null;
  const pad = (n) => String(n).padStart(2, '0');

  // Помехи при смене кадра
  const tune = (swap) => {
    if (calm()) { swap(); return; }
    screen.classList.add('is-tuning');
    timers.push(setTimeout(swap, 170), setTimeout(() => screen.classList.remove('is-tuning'), 380));
  };
  const show = (k) => {
    if (!img || !FR.length) return;
    film = null; screen.classList.remove('is-film');
    i = (k + FR.length) % FR.length; const m = FR[i].m;
    const pre = new Image(); pre.src = m.url;
    const swap = () => {
      img.src = m.url; img.alt = ''; if (lens) lens.src = m.url;
      if (no) no.textContent = `${pad(i + 1)} / ${pad(FR.length)}`;
      if (date) date.textContent = m.date || '';
      if (title) title.textContent = cap(m);
      if (capA) { capA.href = m.sourceUrl || L('sources'); capA.target = '_blank'; }
      dots.forEach((d, j) => d.classList.toggle('on', j === i));
    };
    (pre.complete ? tune(swap) : (pre.onload = pre.onerror = () => tune(swap)));
  };
  const step = (d) => { stopAuto(); show(i + d); };
  crt.querySelectorAll('[data-frame]').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.frame))));
  screen.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });

  // Кадры меняются сами каждые 7 секунд, пока посетитель ничего не трогает
  const stopAuto = () => { clearInterval(auto); auto = null; };
  const startAuto = () => { if (!calm() && !auto && FR.length > 1) auto = setInterval(() => { if (!crt.matches(':hover, :focus-within') && !crt.classList.contains('is-off')) show(i + 1); }, 7000); };
  startAuto();

  // Питание: экран гаснет в линию и включается обратно
  const pw = crt.querySelector('[data-power]');
  pw?.addEventListener('click', () => {
    const off = !crt.classList.contains('is-off');
    crt.classList.toggle('is-off', off); pw.setAttribute('aria-pressed', String(!off));
    crt.querySelectorAll('.crt-in a, .crt-in input, .crt-in button, [data-frame]').forEach((el) => { if (off) el.setAttribute('tabindex', '-1'); else el.removeAttribute('tabindex'); });
    if (off) stopAuto(); else startAuto();
  });

  // «Микрофильм»: на экран выводится случайный оцифрованный документ из каталога
  const filmBtn = crt.querySelector('[data-film]');
  filmBtn?.addEventListener('click', () => {
    if (!photos.length || !img) return;
    stopAuto(); if (crt.classList.contains('is-off')) pw?.click();
    let d; do { d = photos[Math.floor(Math.random() * photos.length)]; } while (photos.length > 1 && d === film);
    film = d;
    tune(() => {
      img.src = fileUrl(d.id, 1); if (lens) lens.src = img.src; screen.classList.add('is-film');
      if (no) no.textContent = d.cipher || ''; if (date) date.textContent = years(d);
      if (title) title.textContent = tr(d.title).replace(/^[^:]+:\s*/, '').slice(0, 70);
      if (capA) { capA.href = L('catalog/' + d.id); capA.removeAttribute('target'); }
      dots.forEach((x) => x.classList.remove('on'));
    });
    filmBtn.classList.remove('is-eject'); void filmBtn.offsetWidth; filmBtn.classList.add('is-eject');
  });

  // Живые подсказки: под строкой поиска печатаются первые находки каталога
  const input = crt.querySelector('#home-q'), out = crt.querySelector('[data-crt-out]');
  let tmr = null, seq = 0;
  input?.addEventListener('input', () => {
    clearTimeout(tmr); const q = input.value.trim();
    if (q.length < 2) { out.hidden = true; out.innerHTML = ''; return; }
    tmr = setTimeout(async () => {
      const my = ++seq;
      try {
        const r = await api(`/api/catalog/search?q=${encodeURIComponent(q)}&per=3&log=0&lang=${S.lang}`);
        if (my !== seq) return;
        const X = (o) => o[S.lang] || o.ru;
        out.innerHTML = r.total
          ? `<span class="crt-line muted">&gt; ${esc(X({ ru: 'найдено', kz: 'табылды', en: 'found' }))}: ${r.total}</span>${r.items.map((d) => `<a class="crt-line" href="${L('catalog/' + d.id)}"><b>${esc(d.cipher)}</b> ${esc(tr(d.title).slice(0, 60))}</a>`).join('')}${r.total > 3 ? `<a class="crt-line more" href="${L('catalog?q=' + encodeURIComponent(q))}">&gt; ${esc(X({ ru: 'показать все', kz: 'барлығын көрсету', en: 'show all' }))} →</a>` : ''}`
          : `<span class="crt-line muted">&gt; ${esc(X({ ru: 'ничего не найдено — спросите помощника', kz: 'ештеңе табылмады — көмекшіден сұраңыз', en: 'nothing found — ask the assistant' }))}</span>`;
        out.hidden = false;
      } catch { out.hidden = true; }
    }, 260);
  });
  input?.addEventListener('keydown', (e) => { if (e.key === 'Escape') { out.hidden = true; } });

  // Картинка на экране реагирует на курсор: сдвигается (параллакс), а под курсором «лупа» проявляет снимок в цвете
  let tx = 0.5, ty = 0.5;
  const paint = () => {
    screen.style.setProperty('--px', `${((tx - 0.5) * -5).toFixed(2)}%`); screen.style.setProperty('--py', `${((ty - 0.5) * -5).toFixed(2)}%`);
    screen.style.setProperty('--gx', `${(tx * 100).toFixed(1)}%`); screen.style.setProperty('--gy', `${(ty * 100).toFixed(1)}%`);
  };
  const move = (e) => {
    if (calm() || e.pointerType === 'touch' || crt.classList.contains('is-off')) return;
    const r = screen.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height;
    screen.classList.add('is-hover'); paint();
  };
  const leave = () => { screen.classList.remove('is-hover'); tx = ty = 0.5; paint(); };
  screen.addEventListener('pointermove', move); screen.addEventListener('pointerleave', leave);

  return () => { stopAuto(); timers.forEach(clearTimeout); clearTimeout(tmr); };
}
export const exTile = (e) => `<a class="tile" href="${L('exhibitions/' + e.slug)}"><div class="img">${e.cover ? `<img src="${esc(e.cover.url)}" alt="" loading="lazy">` : ''}</div><div class="body"><span class="tag tag-accent" style="justify-self:start">${esc(e.period)} · ${e.count} ${esc({ ru: 'экспонатов', kz: 'экспонат', en: 'exhibits' }[S.lang])}</span><h3>${esc(tr(e.title))}${trBadge(e.title)}</h3><p class="small muted" style="margin:0">${esc(tr(e.intro))}</p></div></a>`;
export const newsCard = (n) => `<a class="news-card" href="${L('news/' + n.slug)}">${n.coverMedia ? `<div class="ncover"><img src="${esc(n.coverMedia.thumb)}" alt="" loading="lazy"></div>` : ''}<span class="date">${icon('calendar')}${esc(fmtDate(n.date))}${n.demo ? ' ' + demoTag() : ''}</span><h3>${esc(tr(n.title))}${trBadge(n.title)}</h3><p class="small muted" style="margin:0">${esc(tr(n.lead))}</p></a>`;

// ---------------------------------------------------------------- Об архиве
const ABOUT_NAV = () => [['aboutHistory', 'about'], ['structure', 'about/structure'], ['contacts', 'contacts'], ['symbols', 'symbols'], ['links', 'links']];
const sideLayout = (navItems, current, body) => `<div class="wrap section" style="padding-top:36px"><div class="layout-side"><nav class="sidenav" aria-label="section">${navItems.map(([k, h]) => `<a href="${L(h)}" ${h === current ? 'aria-current="page"' : ''}>${esc(t('menu.' + k)[0])}</a>`).join('')}</nav><div>${body}</div></div></div>`;
const MISSION = {
  ru: ['Сохранять документальную память Восточного Казахстана и делать её доступной каждому — в читальном зале и онлайн.', ['Хранение и обеспечение сохранности документов Национального архивного фонда', 'Комплектование архива документами организаций и граждан', 'Государственный учёт документов и контроль за ведомственными архивами', 'Создание научно-справочного аппарата и электронного каталога', 'Публикация документов, выставки, научное и образовательное использование', 'Экспертиза ценности документов', 'Информационное обеспечение граждан и организаций']],
  kz: ['Шығыс Қазақстанның құжаттық жадын сақтау және оны оқу залында да, онлайн да әркімге қолжетімді ету.', ['Ұлттық архив қоры құжаттарының сақталуын қамтамасыз ету', 'Ұйымдар мен азаматтардың құжаттарымен жасақтау', 'Құжаттарды мемлекеттік есепке алу және ведомстволық архивтерді бақылау', 'Ғылыми-анықтамалық аппарат пен электрондық каталог жасау', 'Құжаттарды жариялау, көрмелер, ғылыми және білім беру мақсатында пайдалану', 'Құжаттардың құндылығын сараптау']],
  en: ['To preserve the documentary memory of East Kazakhstan and make it accessible to everyone — in the reading room and online.', ['Preservation of National Archival Fund documents', 'Acquisition of records from organisations and individuals', 'State registration of records and supervision of departmental archives', 'Finding aids and the e-catalogue', 'Publications, exhibitions, research and education', 'Records appraisal']],
};
const HISTORY = [
  [1940, { ru: 'Образован государственный архив области в подчинении архивного отделения УНКВД Казахской ССР по ВКО.', kz: 'Облыстық мемлекеттік архив құрылды.', en: 'The regional state archive was established.' }],
  [1945, { ru: 'Государственные архивы СССР включены в число научно-исследовательских учреждений.', kz: 'Мемлекеттік архивтер ғылыми-зерттеу мекемелеріне жатқызылды.', en: 'State archives were classed as research institutions.' }],
  [1960, { ru: 'Архивный отдел стал функционировать при облисполкоме.', kz: 'Архив бөлімі облатком жанында жұмыс істей бастады.', en: 'The archival department moved under the regional executive committee.' }],
  [1963, { ru: 'Созданы Зайсанский и Зыряновский филиалы; в 1966 г. — Лениногорский.', kz: 'Зайсан және Зырян филиалдары құрылды; 1966 ж. — Лениногорск.', en: 'Zaisan and Zyryanovsk branches founded; Leninogorsk in 1966.' }],
  [1992, { ru: 'Архивный отдел реорганизован в управление архивами и документацией областной администрации.', kz: 'Архивтер және құжаттама басқармасы құрылды.', en: 'Reorganised into the Department of Archives and Documentation.' }],
  [1997, { ru: 'После упразднения Семипалатинской области в сеть вошли Аягозский и Жарминский филиалы.', kz: 'Аягөз және Жарма филиалдары қосылды.', en: 'Ayagoz and Zharma branches joined the network.' }],
  [2009, { ru: 'Госархив и филиалы выделены в самостоятельные юридические лица.', kz: 'Мемархив пен филиалдар дербес заңды тұлға болды.', en: 'The archive and branches became separate legal entities.' }],
  [2013, { ru: 'Вновь созданы филиалы, включая Усть-Каменогорский филиал по личному составу.', kz: 'Филиалдар, соның ішінде жеке құрам бойынша Өскемен филиалы қайта құрылды.', en: 'Branches re-established, incl. the personnel records branch.' }],
  [2019, { ru: 'Зыряновский филиал переименован в филиал Алтай.', kz: 'Зырян филиалы Алтай филиалы болып өзгертілді.', en: 'Zyryanovsk branch renamed Altai.' }],
  [2020, { ru: 'Архив перешёл в подчинение управления цифровизации и архивов ВКО (постановление № 188).', kz: 'Архив ШҚО цифрландыру және архивтер басқармасына берілді.', en: 'Transferred to the Department of Digitalization and Archives.' }],
  [2022, { ru: 'Образована область Абай; Аягозский и Жарминский филиалы переданы в её подчинение.', kz: 'Абай облысы құрылды; екі филиал жаңа облысқа берілді.', en: 'Abai Region formed; two branches transferred.' }],
  [2026, { ru: 'Постановление акимата ВКО № 142: созданы и переименованы филиалы.', kz: 'ШҚО әкімдігінің № 142 қаулысы: филиалдар құрылды және қайта аталды.', en: 'Akimat decree No. 142 created and renamed branches.' }],
];
export function about() {
  const mi = X(MISSION);
  const body = `${fig('building', { cls: 'cover', lazy: false })}<div class="prose" style="margin-top:28px"><h2 style="margin-top:0">${esc({ ru: 'Миссия', kz: 'Миссия', en: 'Mission' }[S.lang])}</h2><p style="font-size:1.2rem;font-family:var(--serif)">${esc(mi[0])}</p>
  <h2>${esc({ ru: 'Основные направления деятельности', kz: 'Негізгі қызмет бағыттары', en: 'Main activities' }[S.lang])}</h2><ul>${mi[1].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  <h2>${esc(t('menu.aboutHistory')[0])}</h2></div>
  <ol class="timeline" style="margin-top:20px">${HISTORY.map(([y, o]) => `<li class="tl-item"><div class="tl-year">${y}</div><div class="tl-dot"></div><div class="tl-body"><p style="margin:0">${esc(X(o))}</p></div></li>`).join('')}</ol>
  <h2 style="margin-top:32px">${esc({ ru: 'Архив в фотографиях', kz: 'Архив суреттерде', en: 'The archive in photographs' }[S.lang])}</h2><div class="gallery">${['building-krylova', 'building-1991', 'storage', 'reading-1', 'exhibition-astana', 'publications'].map((k) => fig(k, { thumb: true, zoom: true })).join('')}</div>
  <p class="small muted" style="margin-top:16px">${esc(t('source'))}: ${esc({ ru: '«История архива» — материалы, предоставленные заказчиком.', kz: '«Архив тарихы» — тапсырыс беруші материалдары.', en: '"History of the archive" — customer materials.' }[S.lang])}</p>
  <div class="grid g3" style="margin-top:28px">
    <a class="card card-link" href="${L('about/structure')}">${icon('users')}<h3 style="margin-top:10px">${esc(t('menu.structure')[0])}</h3><p class="small muted" style="margin:0">${esc(t('menu.structure')[1])}</p></a>
    <a class="card card-link" href="${L('laws')}">${icon('scale')}<h3 style="margin-top:10px">${esc(t('menu.laws')[0])}</h3><p class="small muted" style="margin:0">${esc(t('menu.laws')[1])}</p></a>
    <a class="card card-link" href="${L('publications')}">${icon('image')}<h3 style="margin-top:10px">${esc(t('menu.publications')[0])}</h3><p class="small muted" style="margin:0">${esc(t('menu.publications')[1])}</p></a>
  </div>
  <h2 style="margin-top:36px">${esc({ ru: 'Отчёты о деятельности', kz: 'Қызмет туралы есептер', en: 'Activity reports' }[S.lang])}</h2>
  <div class="notice">${icon('info')}<div><p>${esc({ ru: 'Раздел готов к публикации годовых отчётов через административную панель. Отчёты за 2025–2026 гг. будут размещены после предоставления заказчиком.', kz: 'Жылдық есептер әкімшілік панель арқылы жарияланады.', en: 'Annual reports will be published via the admin panel once provided.' }[S.lang])}</p></div></div>`;
  return { title: t('nav.about'), html: pageHead(esc(t('nav.about')), esc(tr(S.meta?.org?.legal)), [[t('nav.about')]]) + sideLayout(ABOUT_NAV(), 'about', body).replace(/<svg class="" /g, '<svg class="" style="width:26px;height:26px;color:var(--accent)" ') };
}
export function structure() {
  const m = S.meta || {};
  const body = `<h2 style="margin-top:0">${esc({ ru: 'Руководство', kz: 'Басшылық', en: 'Management' }[S.lang])}</h2>
  <div class="grid g2">${(m.org?.phones || []).slice(0, 2).map((p) => `<div class="card"><div class="row" style="gap:14px"><span class="logo-mark" style="width:52px;height:52px;border-radius:50%">${icon('user').replace('<svg', '<svg style="width:26px;height:26px;color:#E8DCC4"')}</span><div><b>${esc(tr(p.role))}</b><div class="small"><a href="tel:${esc(p.phone.replace(/\D/g, ''))}">${esc(p.phone)}</a> · <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></div></div></div></div>`).join('')}</div>
  <h2 style="margin-top:36px">${esc({ ru: 'Сотрудники архива', kz: 'Архив қызметкерлері', en: 'Archive staff' }[S.lang])}</h2>
  <div class="gallery" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">${['staff-kostina', 'staff-baelova', 'staff-shustova', 'staff-bekniyazkyzy', 'staff-uvalzhanova'].map((k) => fig(k, { cls: 'portrait', thumb: true })).join('')}</div>
  <h2 style="margin-top:36px">${esc({ ru: 'Организационная структура', kz: 'Ұйымдық құрылым', en: 'Organisational chart' }[S.lang])}</h2>
  <div class="org-chart card"><div class="org-node top">${esc({ ru: 'Директор', kz: 'Директор', en: 'Director' }[S.lang])}</div><div class="org-row"><div class="org-node">${esc({ ru: 'Заместитель директора', kz: 'Директордың орынбасары', en: 'Deputy Director' }[S.lang])}</div><div class="org-node">${esc({ ru: 'Заместитель директора', kz: 'Директордың орынбасары', en: 'Deputy Director' }[S.lang])}</div><div class="org-node">${esc(tr(m.departments?.[2]?.name))}</div></div>
  <div class="org-row">${(m.departments || []).filter((_, i) => i !== 2).map((d) => `<div class="org-node" style="font-weight:500;max-width:220px">${esc(tr(d.name))}</div>`).join('')}</div></div>
  <h2 style="margin-top:36px">${esc({ ru: 'Отделы и контактные лица', kz: 'Бөлімдер және байланыс тұлғалары', en: 'Departments and contacts' }[S.lang])}</h2>
  ${(m.departments || []).map((d) => `<div class="dept"><div><b>${esc(tr(d.name))}${trBadge(d.name)}</b><div class="small muted">${esc(d.head)}</div></div><div class="small" style="text-align:right">${d.phone ? `<a href="tel:${esc(d.phone.split(';')[0].replace(/\D/g, ''))}">${esc(d.phone)}</a>` : ''}${d.email ? `<br><a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ''}</div></div>`).join('')}`;
  return { title: t('menu.structure')[0], html: pageHead(esc(t('menu.structure')[0]), '', [[t('nav.about'), L('about')], [t('menu.structure')[0]]]) + sideLayout(ABOUT_NAV(), 'about/structure', body) };
}
export function contacts() {
  const o = S.meta?.org || {};
  const body = `<div class="grid g2">
    <div class="card"><h2 style="font-size:1.3rem">${esc({ ru: 'Главное здание', kz: 'Бас ғимарат', en: 'Main building' }[S.lang])}</h2><div class="kv">
      <div>${esc({ ru: 'Адрес', kz: 'Мекенжай', en: 'Address' }[S.lang])}</div><div>${esc(tr(o.address))}</div>
      <div>${esc({ ru: 'Приёмная', kz: 'Қабылдау', en: 'Reception' }[S.lang])}</div><div><a href="tel:+77232255976">${esc(o.phoneReception)}</a></div>
      <div>E-mail</div><div><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></div>
      <div>${esc(t('footer.hours'))}</div><div>${esc(tr(o.hours))}</div><div>${esc(t('footer.reading'))}</div><div>${esc(tr(o.readingHours))}</div></div>
      <div class="row" style="margin-top:16px"><a class="btn btn-brand" href="${L('branches?b=main')}">${icon('route')}${esc(t('route'))}</a>${(o.social || []).map((s) => `<a class="icon-btn" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.label)}">${icon(s.id)}</a>`).join('')}</div></div>
    <div class="card"><h2 style="font-size:1.3rem">${esc({ ru: 'Телефоны', kz: 'Телефондар', en: 'Phone numbers' }[S.lang])}</h2>${(o.phones || []).map((p) => `<div class="dept"><span>${esc(tr(p.role))}</span><a href="tel:${esc(p.phone.replace(/\D/g, ''))}">${esc(p.phone)}</a></div>`).join('')}</div></div>
  <div class="notice info" style="margin-top:20px">${icon('info')}<div><p>${esc({ ru: 'Сайт носит информационный характер. Официальные обращения направляются через ', kz: 'Ресми өтініштер мына арқылы жіберіледі: ', en: 'Official requests are submitted via ' }[S.lang])}${ext('https://eotinish.kz', 'e-Otinish')} ${esc({ ru: 'или', kz: 'немесе', en: 'or' }[S.lang])} ${ext('https://egov.kz', 'eGov.kz')}. ${esc({ ru: 'Отзывы о работе сайта — в разделе', kz: 'Сайт туралы пікірлер —', en: 'Site feedback —' }[S.lang])} <a href="${L('feedback')}">${esc(t('menu.feedback')[0])}</a>.</p></div></div>
  <h2 style="margin-top:32px">${esc(t('nav.branches'))}</h2><div class="table-wrap"><table class="table"><thead><tr><th>${esc(t('cat.branch'))}</th><th>${esc({ ru: 'Адрес', kz: 'Мекенжай', en: 'Address' }[S.lang])}</th><th>${esc({ ru: 'Телефон / e-mail', kz: 'Телефон / e-mail', en: 'Phone / e-mail' }[S.lang])}</th></tr></thead><tbody>
  ${(S.meta?.branches || []).filter((b) => b.slug !== 'main').map((b) => `<tr><td><a href="${L('branches?b=' + b.slug)}">${esc(tr(b.name))}</a><div class="small muted">${esc(b.director)}</div></td><td>${esc(b.address)}</td><td>${esc(b.phone)}<br><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></td></tr>`).join('')}</tbody></table></div>`;
  return { title: t('menu.contacts')[0], html: pageHead(esc(t('menu.contacts')[0]), '', [[t('nav.about'), L('about')], [t('menu.contacts')[0]]]) + sideLayout(ABOUT_NAV(), 'contacts', body) };
}

// ---------------------------------------------------------------- Справочная информация
const INFO_NAV = () => [['guide', 'guide'], ['services', 'services'], ['paid', 'services/paid'], ['reading', 'reading-room'], ['laws', 'laws'], ['anticorruption', 'anticorruption'], ['faq', 'faq']];
export function guide() {
  const R = S.lang;
  const levels = [['landmark', { ru: 'Архив', kz: 'Архив', en: 'Archive' }, { ru: 'Государственный архив ВКО и его филиалы — места хранения.', kz: 'Сақтау орны.', en: 'Where records are kept.' }], ['folder', { ru: 'Фонд (Ф.)', kz: 'Қор (Қ.)', en: 'Fonds (F.)' }, { ru: 'Все документы одного учреждения, предприятия или человека.', kz: 'Бір мекеменің немесе адамның барлық құжаттары.', en: 'All records of one body or person.' }], ['list', { ru: 'Опись (Оп.)', kz: 'Тізімдеме (Т.)', en: 'Inventory (Inv.)' }, { ru: 'Перечень дел фонда с заголовками и датами.', kz: 'Қор істерінің тізбесі.', en: 'List of files in a fonds.' }], ['archive', { ru: 'Дело (Д.)', kz: 'Іс (І.)', en: 'File' }, { ru: 'Папка с документами по одному вопросу; листы нумеруются.', kz: 'Бір мәселе бойынша құжаттар.', en: 'A folder on one matter; sheets are numbered.' }], ['file', { ru: 'Документ (Л.)', kz: 'Құжат (П.)', en: 'Item (L.)' }, { ru: 'Отдельный документ: протокол, письмо, фотография, карта.', kz: 'Жеке құжат.', en: 'A single document.' }]];
  const html = `<h2 id="about-site" style="margin-top:0">${esc({ ru: 'Назначение сайта', kz: 'Сайттың мақсаты', en: 'Purpose of the site' }[R])}</h2>
  <p>${esc({ ru: 'Это информационно-справочный ресурс: здесь публикуются сведения об архиве, его фондах, опубликованных документах, выставках и филиалах. На сайте не принимаются заявления, заказы и платежи — для официальных обращений предусмотрены внешние порталы.', kz: 'Бұл ақпараттық-анықтамалық ресурс. Сайтта өтініштер, тапсырыстар мен төлемдер қабылданбайды.', en: 'This is an information resource. Applications, orders and payments are not accepted here.' }[R])}</p>
  <h2 id="nav">${esc({ ru: 'Структура сайта', kz: 'Сайт құрылымы', en: 'Site structure' }[R])}</h2>
  <div class="grid g3">${[['archive', 'cat.title', 'catalog'], ['image', 'nav.exhibitions', 'exhibitions'], ['history', 'menu.memory', 'memory'], ['pin', 'nav.branches', 'branches'], ['file', 'menu.services', 'services'], ['sparkle', 'ai.title', 'assistant']].map(([ic, k, h]) => { const v = t(k); return `<a class="card card-link" href="${L(h)}">${icon(ic)}<b style="display:block;margin-top:8px">${esc(Array.isArray(v) ? v[0] : v)}</b></a>`; }).join('').replace(/<svg class="" /g, '<svg class="" style="width:24px;height:24px;color:var(--accent)" ')}</div>
  <h2 id="catalog">${esc({ ru: 'Структура электронного каталога', kz: 'Электрондық каталог құрылымы', en: 'Catalogue structure' }[R])}</h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">${levels.map(([ic, a, b], i) => `<div class="card" style="position:relative"><span class="tag tag-accent">${i + 1}</span>${icon(ic).replace('<svg', '<svg style="width:26px;height:26px;margin:10px 0;color:var(--brand-2)"')}<b>${esc(X(a))}</b><p class="small muted" style="margin:4px 0 0">${esc(X(b))}</p></div>`).join('')}</div>
  <h2 id="search">${esc({ ru: 'Как искать', kz: 'Қалай іздеу керек', en: 'How to search' }[R])}</h2>
  <ol class="prose"><li>${esc({ ru: 'Введите слова из названия, архивный шифр или обычный вопрос: «фотографии Усть-Каменогорска 1960-х».', kz: 'Атауынан сөз, шифр немесе сұрақ енгізіңіз.', en: 'Type words, a code or a plain question.' }[R])}</li><li>${esc({ ru: 'Поиск учитывает синонимы и варианты написания: Өскемен = Усть-Каменогорск, Лениногорск = Риддер, Зыряновск = Алтай.', kz: 'Синонимдер ескеріледі: Өскемен = Усть-Каменогорск.', en: 'Synonyms are handled: Oskemen = Ust-Kamenogorsk.' }[R])}</li><li>${esc({ ru: 'Уточните выдачу фильтрами: период, тип документа, населённый пункт, филиал, тематика, наличие цифровой копии.', kz: 'Сүзгілерді қолданыңыз.', en: 'Refine with filters.' }[R])}</li><li>${esc({ ru: 'Откройте карточку: в ней шифр, место хранения, статус доступа и — при наличии — цифровая копия.', kz: 'Карточканы ашыңыз.', en: 'Open the record card.' }[R])}</li></ol>
  <h2 id="cipher">${esc({ ru: 'Архивный шифр и поля карточки', kz: 'Архивтік шифр', en: 'Reference codes' }[R])}</h2>
  <div class="card"><p style="font-size:1.3rem;margin:0 0 10px"><span class="cipher" style="font-size:1.2rem">Ф.25. Оп.1. Д.7. Л.1–2</span></p><div class="kv"><div>Ф.25</div><div>${esc({ ru: 'фонд № 25 — облисполком ВКО', kz: '№ 25 қор', en: 'fonds 25' }[R])}</div><div>Оп.1</div><div>${esc({ ru: 'опись № 1 дел постоянного хранения', kz: '№ 1 тізімдеме', en: 'inventory 1' }[R])}</div><div>Д.7</div><div>${esc({ ru: 'дело № 7', kz: '№ 7 іс', en: 'file 7' }[R])}</div><div>Л.1–2</div><div>${esc({ ru: 'листы 1–2 в деле', kz: '1–2 парақтар', en: 'sheets 1–2' }[R])}</div><div>GAVKO-000123</div><div>${esc({ ru: 'устойчивый идентификатор записи (не меняется при правке названия)', kz: 'жазбаның тұрақты идентификаторы', en: 'stable record identifier' }[R])}</div></div></div>
  <h2 id="materials">${esc({ ru: 'Какие материалы опубликованы', kz: 'Қандай материалдар жарияланған', en: 'What is published' }[R])}</h2>
  <p>${esc({ ru: 'Описания фондов, описей, дел и документов; цифровые копии документов, прошедших экспертизу и не содержащих охраняемых персональных данных; фотодокументы, карты и планы; онлайн-выставки и тематические подборки «Большого архива памяти»; календарь памятных дат.', kz: 'Сипаттамалар, тексеруден өткен цифрлық көшірмелер, фотоқұжаттар, көрмелер.', en: 'Descriptions, cleared digital copies, photographs, maps, exhibitions and collections.' }[R])}</p>
  <h2 id="access">${esc({ ru: 'Статусы доступа к цифровым копиям', kz: 'Цифрлық көшірмелерге қол жеткізу мәртебелері', en: 'Digital copy access statuses' }[R])}</h2>
  <div class="table-wrap"><table class="table"><tbody>
    <tr><td><span class="tag tag-ok">${icon('eye')}${esc(t('doc.available'))}</span></td><td>${esc({ ru: 'Копия опубликована, её можно просматривать, увеличивать и перелистывать.', kz: 'Көшірме жарияланған.', en: 'The copy is published and viewable.' }[R])}</td></tr>
    <tr><td><span class="tag tag-danger">${icon('lock')}${esc(t('doc.restricted'))}</span></td><td>${esc({ ru: 'Документ содержит персональные данные или иные охраняемые сведения. Доступно только описание; ознакомление — в читальном зале по законодательству РК.', kz: 'Тек сипаттама қолжетімді.', en: 'Only the description is available.' }[R])}</td></tr>
    <tr><td><span class="tag tag-warn">${icon('alert')}${esc(t('doc.review'))}</span></td><td>${esc({ ru: 'Копия проходит экспертизу. До решения комиссии файл не выдаётся.', kz: 'Көшірме сараптамадан өтуде.', en: 'The copy is under review.' }[R])}</td></tr>
    <tr><td><span class="tag">${icon('file')}${esc(t('doc.none'))}</span></td><td>${esc({ ru: 'Документ ещё не оцифрован.', kz: 'Құжат әлі цифрланбаған.', en: 'Not yet digitised.' }[R])}</td></tr></tbody></table></div>
  <h2 id="contacts">${esc(t('menu.contacts')[0])}</h2><p><a href="${L('contacts')}">${esc(t('menu.contacts')[1])}</a> · <a href="${L('branches')}">${esc(t('nav.branches'))}</a> · <a href="${L('faq')}">${esc(t('menu.faq')[0])}</a></p>`;
  return { title: t('menu.guide')[0], html: pageHead(esc(t('menu.guide')[0]), esc(t('menu.guide')[1]), [[t('nav.info')], [t('menu.guide')[0]]]) + sideLayout(INFO_NAV(), 'guide', html) };
}

const NO_FORMS = () => `<div class="notice info">${icon('info')}<div><p><b>${esc({ ru: 'Информационный раздел.', kz: 'Ақпараттық бөлім.', en: 'Information only.' }[S.lang])}</b> ${esc({ ru: 'Заявления, заказы и оплата на этом сайте не принимаются. Для подачи заявления используйте официальные порталы или обратитесь в архив лично.', kz: 'Өтініштер, тапсырыстар мен төлемдер бұл сайтта қабылданбайды.', en: 'Applications, orders and payments are not accepted on this site.' }[S.lang])}</p></div></div>`;
export function services() {
  const R = S.lang;
  const list = [
    { t: { ru: 'Выдача архивных справок', kz: 'Архивтік анықтамалар беру', en: 'Issuing archival certificates' }, d: { ru: 'Справки о стаже работы, заработной плате, подтверждение фактов по документам архива.', kz: 'Еңбек өтілі, жалақы туралы анықтамалар.', en: 'Certificates of employment record, salary and other facts.' } },
    { t: { ru: 'Выдача копий архивных документов или архивных выписок', kz: 'Архивтік құжаттардың көшірмелерін немесе үзінділерін беру', en: 'Issuing copies or extracts of archival documents' }, d: { ru: 'Заверенные копии и выписки из документов, хранящихся в архиве.', kz: 'Куәландырылған көшірмелер мен үзінділер.', en: 'Certified copies and extracts.' } },
  ];
  const steps = { ru: ['Определите, в каком архиве или филиале могут храниться документы (раздел «Филиалы»).', 'Ознакомьтесь с правилами оказания услуги и перечнем документов.', 'Подайте заявление через портал eGov.kz или лично в архиве/филиале.', 'Получите результат в установленный правилами срок в выбранном канале.'], kz: ['Құжаттар қай филиалда сақталуы мүмкін екенін анықтаңыз.', 'Қызмет көрсету ережелерімен танысыңыз.', 'Өтінішті eGov.kz арқылы немесе архивке жеке беріңіз.', 'Нәтижені белгіленген мерзімде алыңыз.'], en: ['Find which archive or branch may hold the records.', 'Read the service rules and required documents.', 'Apply via eGov.kz or in person.', 'Receive the result within the statutory term.'] }[R];
  const html = `${NO_FORMS()}
  <h2>${esc({ ru: 'Перечень государственных услуг в области архивного дела', kz: 'Архив ісі саласындағы мемлекеттік қызметтер', en: 'State services in the archival sphere' }[R])}</h2>
  <div class="grid g2">${list.map((s) => `<div class="card"><h3>${esc(X(s.t))}</h3><p class="small muted">${esc(X(s.d))}</p><a class="btn btn-sm" href="https://egov.kz" target="_blank" rel="noopener">${icon('ext')}eGov.kz ↗</a></div>`).join('')}</div>
  <h2 style="margin-top:32px">${esc({ ru: 'Как получить архивную справку', kz: 'Архивтік анықтаманы қалай алуға болады', en: 'How to get an archival certificate' }[R])}</h2>
  <ol class="timeline tl-compact">${steps.map((s, i) => `<li class="tl-item"><div class="tl-year">${i + 1}</div><div class="tl-dot"></div><div class="tl-body"><p style="margin:0">${esc(s)}</p></div></li>`).join('')}</ol>
  <h2>${esc({ ru: 'Нормативная основа', kz: 'Нормативтік негіз', en: 'Legal basis' }[R])}</h2>
  <ul><li>${ext('https://adilet.zan.kz/rus/docs/Z1300000088', 'Закон РК «О государственных услугах» от 15.04.2013 № 88-V')}</li><li>${ext('https://adilet.zan.kz/rus/search/docs/fulltext=%D0%B3%D0%BE%D1%81%D1%83%D0%B4%D0%B0%D1%80%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D1%8B%D1%85%20%D1%83%D1%81%D0%BB%D1%83%D0%B3%20%D0%B0%D1%80%D1%85%D0%B8%D0%B2%D0%BD%D0%BE%D0%B3%D0%BE%20%D0%B4%D0%B5%D0%BB%D0%B0', 'Правила оказания государственных услуг в области архивного дела (приказ от 29.05.2020 № 159)')}</li></ul>
  <h2>${esc({ ru: 'Официальные каналы обращения', kz: 'Ресми өтініш арналары', en: 'Official channels' }[R])}</h2>
  <div class="grid g3"><a class="card card-link" href="https://egov.kz" target="_blank" rel="noopener"><b>eGov.kz ↗</b><p class="small muted" style="margin:4px 0 0">${esc({ ru: 'Портал электронного правительства — подача заявлений на госуслуги', kz: 'Электрондық үкімет порталы', en: 'E-government portal' }[R])}</p></a><a class="card card-link" href="https://eotinish.kz" target="_blank" rel="noopener"><b>e-Otinish ↗</b><p class="small muted" style="margin:4px 0 0">${esc({ ru: 'Обращения в государственные органы', kz: 'Мемлекеттік органдарға өтініштер', en: 'Appeals to state bodies' }[R])}</p></a><a class="card card-link" href="${L('contacts')}"><b>${esc({ ru: 'Канцелярия архива', kz: 'Архив кеңсесі', en: 'Archive office' }[R])}</b><p class="small muted" style="margin:4px 0 0">${esc(S.meta?.org?.phoneReception || '')} · ${esc(tr(S.meta?.org?.hours))}</p></a></div>
  <h2>${esc({ ru: 'Отчёты об оказанных государственных услугах', kz: 'Көрсетілген мемлекеттік қызметтер туралы есептер', en: 'Reports on services provided' }[R])}</h2>
  <div class="notice warn">${icon('alert')}<div><p>${esc({ ru: 'Утверждённые отчёты, сроки и стоимость (если применимо) публикуются после предоставления заказчиком. Раздел наполняется через административную панель. Дата актуализации: —', kz: 'Есептер тапсырыс беруші ұсынғаннан кейін жарияланады.', en: 'Approved reports will be published once provided by the customer.' }[R])}</p></div></div>`;
  return { title: t('menu.services')[0], html: pageHead(esc(t('menu.services')[0]), esc({ ru: 'Правила, порядок и официальные каналы получения государственных услуг в области архивного дела.', kz: 'Архив ісі саласындағы мемлекеттік қызметтерді алу тәртібі.', en: 'Rules, procedure and official channels for archival state services.' }[R]), [[t('nav.info')], [t('menu.services')[0]]]) + sideLayout(INFO_NAV(), 'services', html) };
}
export async function paid() {
  const R = S.lang; const P = await api('/api/prices', { cache: true }); const A = P.act;
  const T = (o) => esc(o[R] || o.ru);
  const depth = (idx) => idx.split('.').length;
  // Самые частые вопросы посетителей — отдельными карточками
  const pick = [
    ['6.6', { ru: 'Доп. экземпляр архивной справки', kz: 'Архивтік анықтаманың қосымша данасы', en: 'Extra copy of an archival certificate' }],
    ['8.1.1.1.5', { ru: 'Ксерокопия листа А4 (документ после 1991 г.)', kz: 'А4 парақ көшірмесі (1991 жылдан кейін)', en: 'A4 photocopy (record after 1991)' }],
    ['8.3.2', { ru: 'Цифровая копия А4, 300 dpi (1931 г. — наши дни)', kz: 'А4 цифрлық көшірме, 300 dpi', en: 'A4 digital copy, 300 dpi (1931–present)' }],
    ['8.5.3', { ru: 'Съёмка своим телефоном, за кадр (после 1946 г.)', kz: 'Өз телефоныңызбен түсіру, бір кадр', en: 'Photo with your own phone, per frame' }],
    ['6.2.1', { ru: 'Тематический / генеалогический запрос, просмотр дела', kz: 'Тақырыптық / генеалогиялық сұрау, істі қарау', en: 'Thematic / genealogical request, per file' }],
    ['6.1', { ru: 'Консультация историка, 1 час', kz: 'Тарихшы кеңесі, 1 сағат', en: 'Historian consultation, 1 hour' }],
  ];
  const all = P.sections.flatMap((s) => s.items);
  const find = (i) => all.find((x) => x[0] === i);
  const row = ([idx, name, unit, price]) => `<tr class="pl-d${Math.min(depth(idx), 4)}${price ? '' : ' pl-head'}" data-q="${esc((idx + ' ' + name).toLowerCase())}"><td class="mono">${esc(idx)}</td><td>${esc(name)}</td><td class="muted">${esc(unit)}</td><td class="pl-price">${price ? esc(price.replace(/,0(?=\b|$)/g, '')) : ''}</td></tr>`;
  const html = `${NO_FORMS()}
  <div class="card pl-act"><div class="mlabel">${esc({ ru: 'Действующий документ', kz: 'Қолданыстағы құжат', en: 'Current act' }[R])}</div>
    <h2 style="margin:6px 0 8px;font-size:1.25rem">${esc({ ru: 'Постановление', kz: 'Қаулы', en: 'Resolution' }[R])} ${T(A.issuer)} ${esc({ ru: 'от 15 декабря 2023 года', kz: '2023 жылғы 15 желтоқсандағы', en: 'of 15 December 2023' }[R])} № ${esc(A.no)}</h2>
    <p style="margin:0 0 10px">«${T(A.title)}»</p>
    <p class="small muted" style="margin:0 0 6px">${T(A.basis)}</p><p class="small muted" style="margin:0 0 14px">${T(A.effective)}</p>
    <div class="row" style="gap:8px;flex-wrap:wrap"><a class="btn btn-sm" href="${A.files.ru}" target="_blank" rel="noopener">${icon('file')}PDF · RU</a><a class="btn btn-sm" href="${A.files.kz}" target="_blank" rel="noopener">${icon('file')}PDF · KZ</a></div></div>

  <h2 style="margin-top:30px">${esc({ ru: 'Чаще всего спрашивают', kz: 'Жиі сұралатындар', en: 'Most asked' }[R])}</h2>
  <div class="pl-top">${pick.map(([i, label]) => { const it = find(i); return it ? `<div class="pl-tile"><span class="mono small muted">${esc(i)}</span><b>${esc(it[3].replace(/,0$/, ''))} ₸</b><span>${esc(label[R] || label.ru)}</span><small class="muted">${esc(it[2])}</small></div>` : ''; }).join('')}</div>

  <h2 style="margin-top:30px">${esc({ ru: 'Прейскурант полностью', kz: 'Толық прейскурант', en: 'Full price list' }[R])}</h2>
  ${R !== 'ru' ? `<p class="small muted">${esc({ kz: 'Позициялар атаулары орыс тілінде берілген; ресми қазақша мәтіні — PDF · KZ файлында.', en: 'Item names are given in Russian as in the act; the official Kazakh text is in the PDF · KZ file.' }[R])}</p>` : ''}
  <label class="pl-search"><span class="sr-only">${esc({ ru: 'Найти услугу', kz: 'Қызметті табу', en: 'Find a service' }[R])}</span>${icon('search')}<input class="input" type="search" data-pl-q placeholder="${esc({ ru: 'Найти: копия, справка, выставка, реставрация…', kz: 'Іздеу: көшірме, анықтама, көрме…', en: 'Find: copy, certificate, exhibition…' }[R])}"></label>
  <p class="small muted" data-pl-none hidden>${esc({ ru: 'Ничего не найдено — попробуйте другое слово.', kz: 'Ештеңе табылмады.', en: 'Nothing found.' }[R])}</p>
  <div class="pl-sections">${P.sections.map((s, k) => `<details class="pl-sec" ${k === 7 || k === 5 ? 'open' : ''}><summary><span class="mono">${esc(s.n)}</span><span>${T(s.title)}</span><small class="muted">${s.items.filter((x) => x[3]).length} ${esc({ ru: 'поз.', kz: 'тармақ', en: 'items' }[R])}</small></summary>
    <div class="table-wrap"><table class="table price-table"><thead><tr><th>${esc({ ru: 'Индекс', kz: 'Индекс', en: 'Index' }[R])}</th><th>${esc({ ru: 'Наименование работ и услуг', kz: 'Жұмыстар мен қызметтер атауы', en: 'Works and services' }[R])}</th><th>${esc({ ru: 'Ед. изм.', kz: 'Өлш. бірл.', en: 'Unit' }[R])}</th><th>${esc({ ru: 'Цена, ₸', kz: 'Бағасы, ₸', en: 'Price, ₸' }[R])}</th></tr></thead><tbody>${s.items.map(row).join('')}</tbody></table></div></details>`).join('')}</div>

  <div class="grid g2" style="margin-top:26px"><div class="card"><h3 style="margin-top:0">${esc({ ru: 'Льготы и бесплатные услуги', kz: 'Жеңілдіктер және тегін қызметтер', en: 'Discounts and free services' }[R])}</h3><ul class="prose" style="margin:0">${(P.benefits[R] || P.benefits.ru).map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="card"><h3 style="margin-top:0">${esc({ ru: 'Примечания', kz: 'Ескертпелер', en: 'Notes' }[R])}</h3>${(P.notes[R] || P.notes.ru).map((x) => `<p class="small">${esc(x)}</p>`).join('')}</div></div>
  <p class="small muted" style="margin-top:14px">${esc({ ru: 'Цены указаны в тенге. Сайт не рассчитывает стоимость и не принимает оплату — точную сумму назовут сотрудники архива.', kz: 'Бағалар теңгемен. Сайт төлем қабылдамайды.', en: 'Prices in tenge. The site takes no payments; archive staff will confirm the exact amount.' }[R])}</p>`;
  const after = (root) => {
    const q = root.querySelector('[data-pl-q]'), none = root.querySelector('[data-pl-none]');
    q.addEventListener('input', () => {
      const v = q.value.trim().toLowerCase(); let shown = 0;
      root.querySelectorAll('.pl-sec').forEach((d) => {
        let n = 0; d.querySelectorAll('tbody tr').forEach((tr) => { const ok = !v || tr.dataset.q.includes(v); tr.hidden = !ok; if (ok) n++; });
        d.hidden = !n; if (v && n) d.open = true; shown += n;
      });
      none.hidden = shown > 0;
    });
  };
  return { title: t('menu.paid')[0], html: pageHead(esc(t('menu.paid')[0]), esc(t('menu.paid')[1]), [[t('nav.info')], [t('menu.paid')[0]]]) + sideLayout(INFO_NAV(), 'services/paid', html), after };
}
export function readingRoom() {
  const R = S.lang; const o = S.meta?.org || {};
  const rules = { ru: ['Работа с документами проводится в читальном зале в часы его работы.', 'При посещении необходим документ, удостоверяющий личность.', 'Документы выдаются в соответствии с Правилами комплектования, хранения, учёта и использования документов НАФ.', 'Документы, содержащие персональные данные и иную охраняемую законом тайну, выдаются в порядке, установленном законодательством РК.', 'Запрещается вносить пометки в документы, менять порядок листов, выносить документы из зала.', 'Копирование документов собственными техническими средствами — по согласованию с сотрудником зала.'], kz: ['Құжаттармен жұмыс оқу залында жүргізіледі.', 'Жеке басын куәландыратын құжат қажет.', 'Құжаттар ҰАҚ құжаттарын пайдалану ережелеріне сәйкес беріледі.', 'Дербес деректер бар құжаттар заңнамада белгіленген тәртіппен беріледі.', 'Құжаттарға белгі қоюға, оларды залдан шығаруға тыйым салынады.'], en: ['Documents are consulted in the reading room during opening hours.', 'An identity document is required.', 'Documents are issued in accordance with the NAF rules.', 'Records containing personal data are issued as provided by law.', 'Do not mark documents or remove them from the room.'] }[R];
  const html = `<div class="grid g2"><div class="card"><div class="kv"><div>${esc(t('footer.reading'))}</div><div><b>${esc(tr(o.readingHours))}</b></div><div>${esc({ ru: 'Адрес', kz: 'Мекенжай', en: 'Address' }[R])}</div><div>${esc(tr(o.address))}</div><div>${esc({ ru: 'Телефон', kz: 'Телефон', en: 'Phone' }[R])}</div><div>${esc(o.phoneReception)}</div></div></div>
  <div class="notice info">${icon('info')}<div><p>${esc({ ru: 'Предварительная запись и заказ дел через сайт не производятся. Перед визитом найдите шифры нужных дел в электронном каталоге — это ускорит работу.', kz: 'Сайт арқылы жазылу жоқ. Келер алдында каталогтан шифрларды табыңыз.', en: 'No booking via the site. Find file codes in the e-catalogue before visiting.' }[R])}</p><a class="btn btn-sm btn-accent" href="${L('catalog')}">${icon('search')}${esc(t('toCatalog'))}</a></div></div></div>
  <div class="gallery" style="margin-top:24px">${['reading-1', 'reading-2', 'reading-3', 'reading-4'].map((k) => fig(k, { thumb: true, zoom: true })).join('')}</div>
  <h2 style="margin-top:28px">${esc({ ru: 'Правила работы читального зала', kz: 'Оқу залының ережелері', en: 'Reading room rules' }[R])}</h2><ol class="prose">${rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
  <p class="small muted">${esc({ ru: 'Действующий регламент читального зала размещается через административную панель после утверждения.', kz: 'Регламент бекітілгеннен кейін орналастырылады.', en: 'The current regulation is published via the admin panel.' }[R])}</p>`;
  return { title: t('menu.reading')[0], html: pageHead(esc(t('menu.reading')[0]), '', [[t('nav.info')], [t('menu.reading')[0]]]) + sideLayout(INFO_NAV(), 'reading-room', html) };
}
export async function laws() {
  const items = await api('/api/content/law', { cache: true });
  const G = { archive: { ru: 'Архивное дело', kz: 'Архив ісі', en: 'Archives' }, services: { ru: 'Государственные услуги', kz: 'Мемлекеттік қызметтер', en: 'State services' }, data: { ru: 'Персональные данные и ИКТ', kz: 'Дербес деректер және АКТ', en: 'Personal data & ICT' }, anticorruption: { ru: 'Противодействие коррупции', kz: 'Сыбайлас жемқорлыққа қарсы іс-қимыл', en: 'Anti-corruption' }, region: { ru: 'Акты акимата ВКО', kz: 'ШҚО әкімдігінің актілері', en: 'Regional acts' } };
  const html = `<p class="muted">${esc({ ru: 'Перед использованием проверяйте актуальную редакцию в информационно-правовой системе «Әділет».', kz: 'Өзекті редакцияны «Әділет» АҚЖ-да тексеріңіз.', en: 'Always check the current version in the Adilet legal system.' }[S.lang])}</p>
  ${Object.keys(G).map((g) => { const list = items.filter((i) => i.group === g); return list.length ? `<h2 style="font-size:1.3rem;margin-top:26px">${esc(X(G[g]))}</h2><div class="table-wrap"><table class="table"><tbody>${list.map((i) => `<tr><td>${icon('scale').replace('<svg', '<svg style="width:20px;height:20px;color:var(--accent)"')}</td><td><b>${esc(i.title)}</b><div class="small muted">${esc(i.req)}${i.searchLink ? ' · ' + esc({ ru: 'ссылка ведёт на поиск в «Әділет»', kz: '«Әділет» іздеуіне сілтеме', en: 'links to Adilet search' }[S.lang]) : ''}</div></td><td style="white-space:nowrap">${i.local ? `<a class="btn btn-sm" href="${esc(i.url)}" target="_blank" rel="noopener">${icon('file')}PDF</a>` : `<a class="btn btn-sm" href="${esc(i.url)}" target="_blank" rel="noopener">Әділет ↗</a>`}</td></tr>`).join('')}</tbody></table></div>` : ''; }).join('')}
  <p class="small muted" style="margin-top:16px">${esc({ ru: 'Дата актуализации перечня', kz: 'Тізбенің өзектендірілген күні', en: 'List updated' }[S.lang])}: ${esc(fmtDate(items[0]?.updated_at || new Date()))}</p>`;
  return { title: t('menu.laws')[0], html: pageHead(esc(t('menu.laws')[0]), esc(t('menu.laws')[1]), [[t('nav.info')], [t('menu.laws')[0]]]) + sideLayout(INFO_NAV(), 'laws', html) };
}
export async function anticorruption() {
  const R = S.lang;
  const news = (await api('/api/content/news', { cache: true })).filter((n) => n.cat === 'anticorruption');
  const docs = [['analytic', { ru: 'Аналитическая справка по итогам внутреннего анализа коррупционных рисков, 2026', kz: 'Сыбайлас жемқорлық тәуекелдеріне ішкі талдау бойынша талдау анықтамасы, 2026', en: 'Analytical report on internal corruption-risk analysis, 2026' }], ['positions', { ru: 'Перечень должностей, подверженных коррупционным рискам', kz: 'Сыбайлас жемқорлық тәуекелдеріне бейім лауазымдар тізбесі', en: 'Positions exposed to corruption risks' }], ['plan', { ru: 'План мероприятий по устранению причин и условий коррупционных правонарушений', kz: 'Іс-шаралар жоспары', en: 'Action plan' }], ['regulation', { ru: 'Положение об антикоррупционной комплаенс-службе', kz: 'Сыбайлас жемқорлыққа қарсы комплаенс қызметі туралы ереже', en: 'Regulation on the anti-corruption compliance service' }]];
  const html = `<h2 class="sr-only">${esc({ ru: 'Комплаенс-служба и документы', kz: 'Комплаенс қызметі және құжаттар', en: 'Compliance service and documents' }[R])}</h2><div class="grid g2"><div class="card"><div class="eyebrow">${esc({ ru: 'Комплаенс-служба', kz: 'Комплаенс қызметі', en: 'Compliance service' }[R])}</div><h3>${esc({ ru: 'Комплаенс-офицер', kz: 'Комплаенс-офицер', en: 'Compliance officer' }[R])}</h3><p style="margin:0"><b>Ешенгельдиев Тырек Молболович</b></p><p class="small muted">${esc({ ru: 'Контактный телефон: уточняется (будет указан после подтверждения заказчиком).', kz: 'Байланыс телефоны: нақтыланады.', en: 'Phone: to be confirmed.' }[R])}</p>
  <p class="small">${esc({ ru: 'Сообщить о фактах коррупции можно также по номеру 1424 (Call-центр Агентства по противодействию коррупции) или через', kz: 'Сыбайлас жемқорлық фактілері туралы 1424 нөміріне немесе мына арқылы хабарлауға болады:', en: 'Report corruption via 1424 hotline or' }[R])} ${ext('https://eotinish.kz', 'e-Otinish')}.</p></div>
  <div class="card"><h3>${esc({ ru: 'Документы', kz: 'Құжаттар', en: 'Documents' }[R])}</h3>${docs.map(([f, n]) => `<div class="dept"><span class="small">${esc(X(n))}</span><span class="row" style="gap:6px;flex-wrap:nowrap"><a class="btn btn-sm" href="/files/anticorruption/${f}-ru.pdf" target="_blank" rel="noopener">RU</a><a class="btn btn-sm" href="/files/anticorruption/${f}-kz.pdf" target="_blank" rel="noopener">KZ</a></span></div>`).join('')}</div></div>
  <h2 style="margin-top:28px">${esc({ ru: 'Новости комплаенс-службы', kz: 'Комплаенс қызметінің жаңалықтары', en: 'Compliance news' }[R])}</h2><div class="grid g2">${news.map(newsCard).join('')}</div>
  <h2 style="margin-top:28px">${esc({ ru: 'Официальные ресурсы', kz: 'Ресми ресурстар', en: 'Official resources' }[R])}</h2><ul><li>${ext('https://adilet.zan.kz/rus/docs/Z1500000410', 'Закон РК «О противодействии коррупции»')}</li><li>${esc({ ru: 'Агентство РК по противодействию коррупции — телефон доверия 1424', kz: 'ҚР Сыбайлас жемқорлыққа қарсы іс-қимыл агенттігі — сенім телефоны 1424', en: 'Anti-Corruption Agency — hotline 1424' }[R])}</li></ul>`;
  return { title: t('menu.anticorruption')[0], html: pageHead(esc(t('menu.anticorruption')[0]), esc(t('menu.anticorruption')[1]), [[t('nav.info')], [t('menu.anticorruption')[0]]]) + sideLayout(INFO_NAV(), 'anticorruption', html) };
}
export async function faq() {
  const items = await api('/api/content/faq', { cache: true });
  const G = { catalog: { ru: 'Электронный каталог', kz: 'Электрондық каталог', en: 'E-catalogue' }, visit: { ru: 'Посещение архива', kz: 'Архивке бару', en: 'Visiting' }, services: { ru: 'Услуги и справки', kz: 'Қызметтер', en: 'Services' }, site: { ru: 'О сайте и помощнике', kz: 'Сайт пен көмекші туралы', en: 'Site & assistant' } };
  const html = `<div class="row" style="margin-bottom:18px">${Object.keys(G).map((g) => `<a class="chip" href="#faq-${g}">${esc(X(G[g]))}</a>`).join('')}</div>
  ${Object.keys(G).map((g) => `<h2 id="faq-${g}" style="font-size:1.3rem;margin-top:24px">${esc(X(G[g]))}</h2>${items.filter((i) => i.group === g).map((i) => `<details class="faq"><summary>${esc(tr(i.q))}</summary><div>${esc(tr(i.a))}</div></details>`).join('')}`).join('')}
  <div class="card" style="margin-top:28px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="grow"><b>${esc({ ru: 'Не нашли ответ?', kz: 'Жауап таппадыңыз ба?', en: 'Didn’t find an answer?' }[S.lang])}</b><p class="small muted" style="margin:0">${esc({ ru: 'Спросите архивного помощника — он подскажет раздел или найдёт документы.', kz: 'Архив көмекшісінен сұраңыз.', en: 'Ask the archive assistant.' }[S.lang])}</p></div><button class="btn btn-accent" data-open-assist>${icon('sparkle')}${esc(t('ai.open'))}</button></div>`;
  return { title: t('menu.faq')[0], html: pageHead(esc(t('menu.faq')[0]), '', [[t('nav.info')], [t('menu.faq')[0]]]) + sideLayout(INFO_NAV(), 'faq', html), after: (r) => { r.querySelector('[data-open-assist]').onclick = () => S.openAssistant?.(); } };
}

// ---------------------------------------------------------------- Отзывы (разрешено ТЗ), символы, ссылки
function pollHtml() {
  const m = S.meta || {}; const voted = store.get('poll-voted', null); const total = (m.poll || []).reduce((a, p) => a + p.votes, 0) || 1;
  return (m.poll || []).map((p) => `<label class="fopt" style="display:grid;grid-template-columns:auto 1fr auto;gap:8px">${voted ? '<span></span>' : `<input type="radio" name="poll" value="${p.option}">`}<span>${esc(t('poll.' + p.option))}</span><span class="n">${voted ? Math.round((p.votes / total) * 100) + '%' : ''}</span>${voted ? `<span></span><div class="poll-bar" style="grid-column:2/4"><i style="width:${(p.votes / total) * 100}%"></i></div>` : ''}</label>`).join('') + (voted ? `<p class="small" style="margin-top:10px">${esc(t('home.voted'))}</p>` : `<button class="btn btn-sm btn-brand" style="margin-top:12px">${esc(t('home.vote'))}</button>`);
}
export function feedback() {
  const R = S.lang;
  const html = `<div class="wrap section" style="padding-top:32px;max-width:760px">
  <div class="notice">${icon('info')}<div><p>${esc({ ru: 'Это форма отзывов и предложений по работе сайта. Она не является официальным обращением и не регистрируется как заявление. Для официальных обращений используйте', kz: 'Бұл сайт туралы пікірлер формасы. Ресми өтініш емес. Ресми өтініштер үшін:', en: 'This is a feedback form about the site. It is not an official appeal. For official appeals use' }[R])} ${ext('https://eotinish.kz', 'e-Otinish')}.</p></div></div>
  <form class="card stack" style="margin-top:18px" data-fb novalidate>
    <div class="field"><label for="fb-kind">${esc({ ru: 'Тип сообщения', kz: 'Хабарлама түрі', en: 'Type' }[R])}</label><select id="fb-kind" class="input" name="kind"><option value="review">${esc({ ru: 'Отзыв', kz: 'Пікір', en: 'Review' }[R])}</option><option value="suggestion">${esc({ ru: 'Предложение', kz: 'Ұсыныс', en: 'Suggestion' }[R])}</option><option value="wish">${esc({ ru: 'Пожелание', kz: 'Тілек', en: 'Wish' }[R])}</option><option value="error">${esc({ ru: 'Ошибка на сайте', kz: 'Сайттағы қате', en: 'Site error' }[R])}</option></select></div>
    <div class="field"><label for="fb-text">${esc({ ru: 'Сообщение', kz: 'Хабарлама', en: 'Message' }[R])} *</label><textarea id="fb-text" class="input" name="text" minlength="10" maxlength="2000" required aria-describedby="fb-hint"></textarea><span id="fb-hint" class="small muted">${esc({ ru: 'От 10 до 2000 символов. Не указывайте персональные данные.', kz: '10–2000 таңба. Дербес деректерді көрсетпеңіз.', en: '10–2000 characters. Do not include personal data.' }[R])}</span></div>
    <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
    <div class="row"><button class="btn btn-accent">${icon('send')}${esc({ ru: 'Отправить отзыв', kz: 'Пікір жіберу', en: 'Send feedback' }[R])}</button><span data-fb-status role="status" class="small"></span></div>
  </form>
  <section class="card" style="margin-top:28px" aria-labelledby="poll-h"><h2 id="poll-h" style="font-size:1.3rem">${esc(t('home.pollTitle'))}</h2><p class="muted">${esc(t('home.pollQ'))}</p><form data-poll>${pollHtml()}</form></section></div>`;
  return {
    title: t('menu.feedback')[0], html: pageHead(esc(t('menu.feedback')[0]), esc(t('menu.feedback')[1]), [[t('nav.about'), L('about')], [t('menu.feedback')[0]]]) + html,
    after(root) {
      root.querySelector('[data-poll]').onsubmit = async (e) => {
        e.preventDefault(); const v = e.target.querySelector('input:checked')?.value; if (!v) return;
        try { const r = await api('/api/poll', { method: 'POST', body: { option: v } }); S.meta.poll = r.poll; store.set('poll-voted', v); toast(t('home.voted')); e.target.innerHTML = pollHtml(); } catch (err) { toast(err.message); }
      };
      root.querySelector('[data-fb]').onsubmit = async (e) => {
        e.preventDefault(); const f = e.target; const st = root.querySelector('[data-fb-status]');
        if (f.text.value.trim().length < 10) { st.textContent = '⚠ ' + ({ ru: 'Слишком короткое сообщение', kz: 'Хабарлама тым қысқа', en: 'Message too short' }[S.lang]); f.text.focus(); return; }
        f.querySelector('button').disabled = true; st.innerHTML = '<span class="spinner" style="display:inline-block;vertical-align:middle"></span>';
        try { await api('/api/feedback', { method: 'POST', body: { kind: f.kind.value, text: f.text.value, website: f.website.value, page: document.referrer } }); f.reset(); st.textContent = '✓ ' + ({ ru: 'Спасибо! Отзыв отправлен.', kz: 'Рақмет! Пікір жіберілді.', en: 'Thank you! Feedback sent.' }[S.lang]); }
        catch (err) { st.textContent = '⚠ ' + err.message; } finally { f.querySelector('button').disabled = false; }
      };
    },
  };
}
export function symbols() {
  const R = S.lang;
  const body = `<div class="grid g3">
  <div class="card">${fig('flag', { cls: 'cover', caption: false })}<h3 style="margin-top:14px">${esc({ ru: 'Государственный Флаг', kz: 'Мемлекеттік Ту', en: 'State Flag' }[R])}</h3><p class="small muted">${esc({ ru: 'Прямоугольное полотнище голубого цвета с изображением солнца, парящего степного орла и национального орнамента у древка.', kz: 'Ортасында күн, оның астында қалықтаған дала қыраны, сабына жақын жерде ұлттық ою-өрнек бейнеленген көк түсті тік бұрышты мата.', en: 'A sky-blue rectangular cloth with a sun, a soaring steppe eagle and a national ornament.' }[R])}</p></div>
  <div class="card">${fig('emblem', { cls: 'cover', caption: false })}<h3 style="margin-top:14px">${esc({ ru: 'Государственный Герб', kz: 'Мемлекеттік Елтаңба', en: 'State Emblem' }[R])}</h3><p class="small muted">${esc({ ru: 'Изображение шанырака на голубом фоне, от которого лучами расходятся уыки, с мифическими крылатыми конями.', kz: 'Көгілдір түс аясындағы шаңырақ бейнесі, оның айналасында қанатты пырақтар.', en: 'A shanyrak on a blue background flanked by winged horses.' }[R])}</p></div>
  <div class="card"><div class="flag" style="background:var(--surface-2)" aria-hidden="true">${icon('music').replace('<svg', '<svg style="width:64px;height:64px;color:var(--accent)"')}</div><h3 style="margin-top:14px">${esc({ ru: 'Государственный Гимн', kz: 'Мемлекеттік Әнұран', en: 'State Anthem' }[R])}</h3><p class="small muted">«Менің Қазақстаным». ${esc({ ru: 'Музыка Шамши Калдаякова, слова Жумекена Нажимеденова и Нурсултана Назарбаева.', kz: 'Әні Шәмші Қалдаяқовтікі, сөзі Жұмекен Нәжімеденов пен Нұрсұлтан Назарбаевтікі.', en: 'Music by Shamshi Kaldayakov.' }[R])}</p></div></div>
  <p class="small muted" style="margin-top:12px">${credit(M('flag'))}</p><div class="notice info" style="margin-top:20px">${icon('info')}<div><p>${esc({ ru: 'Официальные изображения, описание и порядок использования государственных символов — на сайте Президента РК:', kz: 'Мемлекеттік рәміздердің ресми бейнелері — ҚР Президентінің сайтында:', en: 'Official images and rules of use are on the President’s website:' }[R])} ${ext('https://www.akorda.kz', 'Akorda.kz')}. ${esc({ ru: 'Конституционный закон РК «О государственных символах Республики Казахстан»:', kz: '«ҚР мемлекеттік рәміздері туралы» Конституциялық заң:', en: 'Constitutional Law on State Symbols:' }[R])} ${ext('https://adilet.zan.kz/rus/docs/Z070000258_', 'Әділет')}</p></div></div>`;
  return { title: t('menu.symbols')[0], html: pageHead(esc(t('menu.symbols')[0]), '', [[t('nav.about'), L('about')], [t('menu.symbols')[0]]]) + sideLayout(ABOUT_NAV(), 'symbols', body) };
}
// Конвертер кириллица → латиница (алфавит 2021 г.) — вспомогательный инструмент
const LAT = { а: 'a', ә: 'ä', б: 'b', в: 'v', г: 'g', ғ: 'ğ', д: 'd', е: 'e', ё: 'io', ж: 'j', з: 'z', и: 'i', й: 'i', к: 'k', қ: 'q', л: 'l', м: 'm', н: 'n', ң: 'ñ', о: 'o', ө: 'ö', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ұ: 'ū', ү: 'ü', ф: 'f', х: 'h', һ: 'h', ц: 'ts', ч: 'ch', ш: 'ş', щ: 'şş', ъ: '', ы: 'y', і: 'ı', ь: '', э: 'e', ю: 'iu', я: 'ia' };
const toLat = (s) => s.replace(/[а-яёәғқңөұүһі]/gi, (c) => { const l = LAT[c.toLowerCase()] ?? c; return c === c.toLowerCase() ? l : l.charAt(0).toUpperCase() + l.slice(1); });
export function links() {
  const R = S.lang;
  const L1 = [['https://www.akorda.kz', 'Akorda.kz', { ru: 'Официальный сайт Президента РК', kz: 'ҚР Президентінің ресми сайты', en: 'Official website of the President' }], ['https://www.gov.kz/memleket/entities/akimvko?lang=ru', { ru: 'Акимат ВКО', kz: 'ШҚО әкімдігі', en: 'EKR Akimat' }, { ru: 'Официальный интернет-ресурс акимата области', kz: 'Облыс әкімдігінің ресми ресурсы', en: 'Regional akimat website' }], ['https://egov.kz', 'eGov.kz', { ru: 'Электронное правительство', kz: 'Электрондық үкімет', en: 'E-government' }], ['https://adilet.zan.kz', 'Әділет', { ru: 'Информационно-правовая система нормативных актов', kz: 'Нормативтік актілердің ақпараттық-құқықтық жүйесі', en: 'Legal information system' }], ['https://eotinish.kz', 'e-Otinish', { ru: 'Обращения в госорганы', kz: 'Мемлекеттік органдарға өтініштер', en: 'Appeals to state bodies' }], ['https://archive.president.kz', { ru: 'Архив Президента РК', kz: 'ҚР Президентінің Архиві', en: 'Archive of the President' }, { ru: 'Открытые архивные материалы', kz: 'Ашық архив материалдары', en: 'Open archival materials' }], ['https://e-history.kz', 'E-history.kz', { ru: 'Портал «История Казахстана», в т. ч. материалы о ветеранах ВОВ', kz: '«Қазақстан тарихы» порталы', en: 'History of Kazakhstan portal' }]];
  const body = `<div class="grid g2">${L1.map(([u, n, d]) => `<a class="card card-link" href="${u}" target="_blank" rel="noopener"><b>${esc(X(typeof n === 'string' ? { ru: n } : n))} ↗</b><p class="small muted" style="margin:4px 0 0">${esc(X(d))}</p><span class="small mono muted">${esc(new URL(u).host)}</span></a>`).join('')}</div>
  <p class="small muted" style="margin-top:10px">${esc({ ru: 'Перечень ссылок согласуется с заказчиком; каждая ссылка ведёт на общедоступный ресурс.', kz: 'Сілтемелер тізбесі тапсырыс берушімен келісіледі.', en: 'Links are agreed with the customer.' }[R])}</p>
  <h2 style="margin-top:32px" id="latin">${esc({ ru: 'Конвертер на латиницу', kz: 'Латын әліпбиіне түрлендіргіш', en: 'Latin script converter' }[R])}</h2>
  <div class="card"><div class="grid g2"><div class="field"><label for="cyr">${esc({ ru: 'Текст кириллицей', kz: 'Кирилл мәтіні', en: 'Cyrillic text' }[R])}</label><textarea id="cyr" class="input">Шығыс Қазақстан облысының мемлекеттік архиві</textarea></div><div class="field"><label for="lat">Latyn</label><textarea id="lat" class="input" readonly></textarea></div></div>
  <p class="small muted" style="margin:10px 0 0">${esc({ ru: 'Вспомогательный инструмент по алфавиту 2021 г. Официальным средством не является.', kz: '2021 жылғы әліпби бойынша көмекші құрал. Ресми құрал емес.', en: 'Helper tool (2021 alphabet). Not an official service.' }[R])}</p></div>`;
  return { title: t('menu.links')[0], html: pageHead(esc(t('menu.links')[0]), '', [[t('nav.about'), L('about')], [t('menu.links')[0]]]) + sideLayout(ABOUT_NAV(), 'links', body), after(r) { const a = r.querySelector('#cyr'), b = r.querySelector('#lat'); const u = () => { b.value = toLat(a.value); }; a.oninput = u; u(); } };
}

// ---------------------------------------------------------------- Календарь, публикации, политика
export async function calendarPage() {
  const cal = await api('/api/calendar', { cache: true });
  const up = upcoming(cal, 1)[0];
  const lang = S.lang === 'kz' ? 'kz' : 'ru';
  const html = `<div class="wrap section" style="padding-top:28px">${S.lang === 'en' ? `<div class="notice" style="margin-bottom:16px">${icon('info')}<div><p>${esc(t('translationMissing'))}</p></div></div>` : ''}
  <div class="card">${cal.items.map((i) => `<div class="cal-item ${up && i.date.ru === up.date.ru && i.text.ru === up.text.ru ? 'today' : ''}"><div class="d">${esc(i.date[lang])}</div><div>${esc(i.text[lang])}</div></div>`).join('')}</div>
  <p class="small muted" style="margin-top:12px">${esc(t('source'))}: ${esc(cal.source)}</p></div>`;
  return { title: t('menu.calendar')[0], html: pageHead(esc(t('menu.calendar')[0]) + ' — 2026', esc({ ru: 'Юбилейные и памятные даты Восточно-Казахстанской области. Подготовлено отделом научно-справочного аппарата.', kz: 'Шығыс Қазақстан облысының мерейтойлық және атаулы күндері.', en: 'Anniversaries and memorable dates of East Kazakhstan Region.' }[S.lang]), [[t('nav.history'), L('memory')], [t('menu.calendar')[0]]]) + html };
}
export async function publications() {
  const photos = await api(`/api/catalog/search?type=photo&digital=1&per=24&lang=${S.lang}`, { cache: true });
  const R = S.lang;
  const html = `<div class="wrap section" style="padding-top:28px">
  <div class="tabs" role="tablist"><a href="#pub" aria-current="page">${esc({ ru: 'Публицистика и сборники', kz: 'Публицистика және жинақтар', en: 'Articles & collections' }[R])}</a><a href="#gallery">${esc({ ru: 'Фотогалерея', kz: 'Фотогалерея', en: 'Photo gallery' }[R])}</a><a href="#video">${esc({ ru: 'Архивные видеоматериалы', kz: 'Архивтік бейнематериалдар', en: 'Archival video' }[R])}</a></div>
  <section id="pub"><div class="grid g3">${[['book', { ru: 'Сборник документов «Восточный Казахстан в годы войны»', kz: '«Соғыс жылдарындағы Шығыс Қазақстан» құжаттар жинағы', en: 'Document collection: EK in the war years' }], ['book', { ru: 'Путеводитель по фондам Государственного архива ВКО', kz: 'ШҚО мемлекеттік архиві қорларына жолсілтеме', en: 'Guide to the holdings' }], ['feather', { ru: 'Статьи сотрудников архива по истории края', kz: 'Архив қызметкерлерінің өлке тарихы туралы мақалалары', en: 'Staff articles on local history' }]].map(([ic, n]) => `<div class="card">${icon(ic).replace('<svg', '<svg style="width:28px;height:28px;color:var(--accent)"')}<h3 style="margin-top:12px;font-size:1.05rem">${esc(X(n))}</h3>${demoTag()} <span class="small muted">${esc({ ru: 'карточка-макет: PDF будет загружен через админ-панель', kz: 'макет', en: 'placeholder' }[R])}</span></div>`).join('')}</div></section>
  <section id="gallery" style="margin-top:40px"><h2>${esc({ ru: 'Фотогалерея', kz: 'Фотогалерея', en: 'Photo gallery' }[R])}</h2><div class="gallery" style="margin-bottom:28px">${['publications', 'exhibition-astana', 'exhibition-2', 'visitors-1', 'visitors-2', 'repressions'].map((k) => fig(k, { thumb: true, zoom: true })).join('')}</div><h3>${esc({ ru: 'Фотографии из личных фондов', kz: 'Жеке қорлардағы фотосуреттер', en: 'Photographs from personal fonds' }[R])}</h3><div class="grid g4" data-gal>${photos.items.map((p, i) => `<button class="tile" style="border:0;padding:0;text-align:left;cursor:zoom-in" data-i="${i}"><div class="img"><img src="${fileUrl(p.id, 1, true)}" alt="${esc(tr(p.title))}" loading="lazy"></div><div class="body"><b class="small">${esc(tr(p.title))}</b><span class="small muted">${esc(p.cipher)}</span></div></button>`).join('')}</div></section>
  <section id="video" style="margin-top:40px"><h2>${esc({ ru: 'Архивные видеоматериалы', kz: 'Архивтік бейнематериалдар', en: 'Archival video' }[R])}</h2><div class="notice">${icon('video')}<div><p>${esc({ ru: 'Видеоматериалы публикуются после реставрации и экспертизы. Описания доступны в каталоге:', kz: 'Бейнематериалдар қалпына келтірілгеннен кейін жарияланады.', en: 'Videos are published after restoration. Descriptions:' }[R])} <a href="${L('catalog?type=video')}">${esc(t('types.video'))}</a></p></div></div></section></div>`;
  return { title: t('menu.publications')[0], html: pageHead(esc(t('menu.publications')[0]), '', [[t('nav.history'), L('memory')], [t('menu.publications')[0]]]) + html, after(r) { r.querySelector('[data-gal]').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) import('./core.js').then((c) => c.lightbox(photos.items.map((p) => ({ src: fileUrl(p.id), title: tr(p.title), caption: esc(p.cipher) })), +b.dataset.i)); }; } };
}
export function privacy() {
  const R = S.lang;
  const html = `<div class="wrap section prose" style="padding-top:28px"><p>${esc({ ru: 'Сайт не требует регистрации и не собирает персональные данные посетителей. Для статистики учитываются только обезличенные агрегированные показатели: число просмотров разделов и текст поисковых запросов без привязки к посетителю, IP-адресу или устройству.', kz: 'Сайт тіркелуді талап етпейді және келушілердің дербес деректерін жинамайды.', en: 'The site requires no registration and collects no personal data. Only anonymous aggregate statistics are kept.' }[R])}</p>
  <p>${esc({ ru: 'В браузере сохраняются только настройки интерфейса (язык, тема, размер шрифта), список избранных карточек и история диалога с помощником — эти данные не передаются на сервер.', kz: 'Браузерде тек интерфейс баптаулары сақталады.', en: 'Only interface settings, favourites and assistant history are stored in your browser.' }[R])}</p>
  <p>${esc({ ru: 'Геолокация используется только по вашему явному разрешению для построения маршрута до филиала и не сохраняется. Запросы к архивному помощнику обрабатываются локально на сервере архива и не передаются внешним ИИ-сервисам.', kz: 'Геолокация тек сіздің рұқсатыңызбен қолданылады.', en: 'Geolocation is used only with your permission and is not stored.' }[R])}</p>
  <p>${esc({ ru: 'Обработка персональных данных осуществляется в соответствии с Законом РК «О персональных данных и их защите».', kz: 'ҚР «Дербес деректер және оларды қорғау туралы» Заңына сәйкес.', en: 'In accordance with the Law on Personal Data and Their Protection.' }[R])}</p></div>`;
  return { title: t('footer.privacy'), html: pageHead(esc(t('footer.privacy')), '', [[t('footer.privacy')]]) + html };
}

// ---------------------------------------------------------------- Новости
const NEWS_CATS = { official: { ru: 'Официально', kz: 'Ресми', en: 'Official' }, exhibitions: { ru: 'Выставки', kz: 'Көрмелер', en: 'Exhibitions' }, events: { ru: 'Мероприятия', kz: 'Іс-шаралар', en: 'Events' }, research: { ru: 'Исследования', kz: 'Зерттеулер', en: 'Research' }, branches: { ru: 'Филиалы', kz: 'Филиалдар', en: 'Branches' }, publications: { ru: 'Публикации', kz: 'Басылымдар', en: 'Publications' }, anticorruption: { ru: 'Антикоррупция', kz: 'Сыбайлас жемқорлыққа қарсы', en: 'Anti-corruption' } };
export async function newsList() {
  const p = new URLSearchParams(location.search);
  const q = p.get('q') || '', cat = p.get('cat') || '', sort = p.get('sort') || 'desc';
  const items = await api(`/api/content/news?q=${encodeURIComponent(q)}&cat=${cat}&sort=${sort}`);
  const html = `<div class="wrap section" style="padding-top:28px">
  <form class="row" data-nf style="margin-bottom:16px"><div class="sb grow" style="position:relative">${icon('search').replace('<svg', '<svg style="position:absolute;left:14px;top:50%;translate:0 -50%;width:18px;color:var(--muted)"')}<input class="input" name="q" value="${esc(q)}" placeholder="${esc({ ru: 'Поиск по новостям', kz: 'Жаңалықтар бойынша іздеу', en: 'Search news' }[S.lang])}" style="padding-left:42px" aria-label="search"></div>
  <select class="input" name="sort" style="width:auto" aria-label="${esc(t('cat.sort'))}"><option value="desc" ${sort === 'desc' ? 'selected' : ''}>${esc(t('cat.sortDateDesc'))}</option><option value="asc" ${sort === 'asc' ? 'selected' : ''}>${esc(t('cat.sortDate'))}</option></select><button class="btn btn-brand">${esc(t('cat.search'))}</button></form>
  <div class="row" style="margin-bottom:22px"><a class="chip ${!cat ? 'on' : ''}" href="${L('news')}">${esc({ ru: 'Все', kz: 'Барлығы', en: 'All' }[S.lang])}</a>${Object.keys(NEWS_CATS).map((c) => `<a class="chip ${cat === c ? 'on' : ''}" href="${L('news?cat=' + c)}">${esc(X(NEWS_CATS[c]))}</a>`).join('')}</div>
  ${items.length ? `<div class="grid g3">${items.map(newsCard).join('')}</div>` : `<div class="empty">${icon('news')}<h3>${esc(t('cat.noResults'))}</h3></div>`}</div>`;
  return { title: t('nav.news'), html: pageHead(esc(t('home.newsTitle')), '', [[t('nav.news')]]) + html, after(r) { r.querySelector('[data-nf]').onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.target); S.navigate(L('news') + '?' + new URLSearchParams({ q: f.get('q'), sort: f.get('sort'), ...(cat ? { cat } : {}) })); }; } };
}
export async function newsItem(slug) {
  const n = await api('/api/content/news/' + slug);
  const html = `<article class="wrap section" style="padding-top:28px"><div class="prose">${missing(n.body) ? `<div class="notice" style="margin-bottom:16px">${icon('info')}<div><p>${esc(t('translationMissing'))}</p></div></div>` : ''}
  ${n.coverMedia ? fig(n.coverMedia, { cls: 'cover', lazy: false }) : ''}<p class="lead" style="font-size:1.2rem;font-family:var(--serif);margin-top:20px">${esc(tr(n.lead))}</p>${tr(n.body).split('\n').filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}
  ${n.slug === 'decree-142-branches' ? `<p><a class="btn" href="/files/postanovlenie-142.pdf" target="_blank" rel="noopener">${icon('file')}${esc({ ru: 'Постановление № 142 (PDF)', kz: '№ 142 қаулы (PDF)', en: 'Decree No. 142 (PDF)' }[S.lang])}</a></p>` : ''}
  <div class="row" style="margin-top:24px"><button class="btn btn-sm" data-share>${icon('share')}${esc(t('doc.share'))}</button>${n.demo ? demoTag() : ''}</div></div>
  ${commentsHtml('news', n.slug)}
  ${n.related?.length ? `<h2 style="margin-top:40px">${esc(t('doc.related'))}</h2><div class="grid g3">${n.related.map(newsCard).join('')}</div>` : ''}</article>`;
  return { title: tr(n.title), html: pageHead(esc(tr(n.title)) + trBadge(n.title), `<span class="date">${icon('calendar')}${esc(fmtDate(n.date))} · ${esc(X(NEWS_CATS[n.cat] || { ru: '' }))}</span>`, [[t('nav.news'), L('news')], [tr(n.title)]]) + html, after(r) { r.querySelector('[data-share]').onclick = () => import('./core.js').then((c) => c.share(tr(n.title), location.href)); mountComments(r); } };
}
const missing = (o) => o && S.lang !== 'ru' && !o[S.lang];

// ---------------------------------------------------------------- Помощник (полная страница) с тремя сценариями проверки
export function assistantPage() {
  const R = S.lang;
  const demos = [[{ ru: 'Ответ с архивным источником', kz: 'Архивтік дереккөзі бар жауап', en: 'Answer with a source' }, t('ai.examples')[0]], [{ ru: 'Нет релевантного материала', kz: 'Сәйкес материал жоқ', en: 'No relevant material' }, { ru: 'Метрические книги 1910 года', kz: 'Метрикалық кітаптар 1910', en: 'Parish registers 1910' }[R]], [{ ru: 'Данные с ограниченным доступом', kz: 'Шектеулі деректер', en: 'Restricted data' }, { ru: 'Личные дела работников облисполкома', kz: 'Облатком қызметкерлерінің жеке істері', en: 'Personnel files of the regional committee' }[R]]];
  const html = `<div class="wrap section" style="padding-top:28px;max-width:900px">
  <div class="notice info">${icon('info')}<div><p>${esc(t('ai.engine'))} ${esc(t('ai.auto'))}</p></div></div>
  <h2 style="margin-top:24px;font-size:1.2rem">${esc({ ru: 'Проверочные сценарии', kz: 'Тексеру сценарийлері', en: 'Test scenarios' }[R])}</h2>
  <div class="grid g3">${demos.map(([l, q]) => `<button class="card card-link" style="text-align:left;cursor:pointer" data-q="${esc(q)}"><span class="tag tag-accent">${esc(X(l))}</span><p style="margin:10px 0 0;font-weight:600">«${esc(q)}»</p></button>`).join('')}</div>
  <form class="searchbar" style="margin-top:24px" data-af><div class="sb">${icon('sparkle')}<input class="input" placeholder="${esc(t('ai.ph'))}" aria-label="${esc(t('ai.ph'))}" maxlength="400"></div><button class="btn btn-accent">${icon('send')}${esc(t('ai.send'))}</button></form>
  <div data-out style="margin-top:20px" aria-live="polite"></div></div>`;
  return {
    title: t('ai.title'), html: pageHead(esc(t('ai.title')), esc(t('ai.sub')), [[t('ai.title')]]),
    get html2() { return html; },
    after(root) {
      root.insertAdjacentHTML('beforeend', html);
      const out = root.querySelector('[data-out]');
      const run = async (q) => { out.innerHTML = `<div class="card"><span class="typing"><i></i><i></i><i></i></span></div>`; try { out.innerHTML = `<div class="card msg bot" style="max-width:none">${renderAnswer(await ask(q))}</div>`; } catch { out.innerHTML = errorBox(t('ai.error'), false); } };
      root.querySelectorAll('[data-q]').forEach((b) => { b.onclick = () => { root.querySelector('[data-af] input').value = b.dataset.q; run(b.dataset.q); }; });
      root.querySelector('[data-af]').onsubmit = (e) => { e.preventDefault(); const q = e.target.querySelector('input').value.trim(); if (q) run(q); };
    },
  };
}

// ---------------------------------------------------------------- Состояния ошибок
export const notFound = () => ({ title: t('notFound')[0], html: `<div class="wrap err-page"><div class="code">404</div><h1>${esc(t('notFound')[0])}</h1><p class="muted">${esc(t('notFound')[1])}</p><form class="searchbar" data-hsearch style="max-width:560px;margin:24px auto"><div class="sb">${icon('search')}<input class="input" placeholder="${esc(t('searchPh'))}" aria-label="search"></div><button class="btn btn-accent">${esc(t('cat.search'))}</button></form><a class="btn" href="${L('')}">${icon('home')}${esc(t('toHome'))}</a></div>` });
export const unavailable = () => ({ title: t('unavailable')[0], html: `<div class="wrap err-page"><div class="code" style="font-size:5rem">${icon('lock').replace('<svg', '<svg style="width:90px;height:90px;margin:auto"')}</div><h1>${esc(t('unavailable')[0])}</h1><p class="muted">${esc(t('unavailable')[1])}</p><a class="btn" href="${L('catalog')}">${esc(t('toCatalog'))}</a></div>` });
export const failure = (e) => ({ title: 'Error', html: `<div class="wrap section">${errorBox(t('cat.error'))}</div>`, after(r) { r.querySelector('[data-act="retry"]')?.addEventListener('click', () => S.navigate(location.pathname + location.search, { replace: true })); } });

export function sources() {
  const all = Object.entries(S.meta?.media || {});
  const block = (title, list) => `<h2 style="margin-top:28px">${esc(title)}</h2><div class="table-wrap"><table class="table"><thead><tr><th></th><th>${esc({ ru: 'Изображение', kz: 'Сурет', en: 'Image' }[S.lang])}</th><th>${esc(t('source'))}</th><th>${esc({ ru: 'Лицензия', kz: 'Лицензия', en: 'Licence' }[S.lang])}</th></tr></thead><tbody>${list.map(([, m]) => `<tr><td style="width:96px"><img src="${esc(m.thumb)}" alt="" loading="lazy" style="width:80px;height:60px;object-fit:cover;border-radius:6px"></td><td>${esc(m.title)}${m.date ? `<div class="small muted">${esc(m.date)}</div>` : ''}</td><td class="small"><a href="${esc(m.sourceUrl)}" target="_blank" rel="noopener">${esc(m.source)}</a></td><td class="small">${esc(m.license)}</td></tr>`).join('')}</tbody></table></div>`;
  const html = `<div class="wrap section" style="padding-top:28px">
    <div class="notice">${icon('info')}<div><p>${esc({ ru: 'Фотографии из личных фондов и фото архива взяты с официального сайта e-arhiv.vko.gov.kz. Исторические и современные виды региона — из Wikimedia Commons; лицензии CC BY / CC BY-SA требуют указывать автора и лицензию, что и сделано здесь и в подписях.', kz: 'Жеке қорлардағы фотосуреттер — архивтің ресми сайтынан; өңір көріністері — Wikimedia Commons-тан.', en: 'Personal-fonds photographs and archive photos come from the official website; regional views come from Wikimedia Commons with authors and licences credited.' }[S.lang])}</p></div></div>
    ${block(t('src.archive'), all.filter(([, m]) => !m.source.startsWith('Wikimedia')))}
    ${block(t('src.open'), all.filter(([, m]) => m.source.startsWith('Wikimedia')))}</div>`;
  return { title: t('src.title'), html: pageHead(esc(t('src.title')), esc(t('src.lead')), [[t('src.title')]]) + html };
}
