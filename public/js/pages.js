import { S, t, tr, esc, L, api, store, docCard, pageHead, crumbs, fmtDate, fileUrl, toast, errorBox, demoTag, trBadge, M, fig, credit, commentsHtml, mountComments } from './core.js';
import { icon } from './icons.js';
import { renderAnswer, ask } from './assistant.js';
import { miniMap } from './memory.js';

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
  const [digital, ex, news, cal] = await Promise.all([
    api(`/api/catalog/search?digital=1&per=24&lang=${S.lang}`, { cache: true }),
    api('/api/content/exhibition', { cache: true }), api('/api/content/news', { cache: true }), api('/api/calendar', { cache: true }),
  ]);
  const m = S.meta || {}; const counts = m.counts || {};
  const photos = digital.items.filter((d) => d.doc_type === 'photo');
  const heroA = M('uk-1891'), heroB = M('building');
  const day = upcoming(cal, 1)[0];
  const total = (counts.document || 0) + (counts.case || 0) + (counts.inventory || 0) + (counts.fund || 0);
  const pollVoted = store.get('poll-voted', null);
  const pollTotal = (m.poll || []).reduce((s, p) => s + p.votes, 0) || 1;
  const pollHtml = (m.poll || []).map((p) => `<label class="fopt" style="display:grid;grid-template-columns:auto 1fr auto;gap:8px">${pollVoted ? '<span></span>' : `<input type="radio" name="poll" value="${p.option}">`}<span>${esc(t('poll.' + p.option))}</span><span class="n">${pollVoted ? Math.round((p.votes / pollTotal) * 100) + '%' : ''}</span>${pollVoted ? `<span></span><div class="poll-bar" style="grid-column:2/4"><i style="width:${(p.votes / pollTotal) * 100}%"></i></div>` : ''}</label>`).join('');
  const html = `
  <section class="hero" aria-labelledby="hero-title"><div class="wrap">
    <div>
      <div class="eyebrow">${esc(t('hero.eyebrow'))}</div>
      <h1 id="hero-title">${t('hero.title')}</h1>
      <p class="lead">${esc(t('hero.lead'))}</p>
      <form class="hero-search" role="search" data-home-search><label class="sr-only" for="home-q">${esc(t('hero.ph'))}</label>
        <input id="home-q" type="search" placeholder="${esc(t('hero.ph'))}" autocomplete="off">
        <button class="btn btn-accent">${icon('search')}${esc(t('hero.go'))}</button></form>
      <div class="hero-chips">${t('ai.examples').slice(0, 3).map((e, i) => `<a class="chip" href="${L('catalog?q=' + encodeURIComponent(i === 0 ? e : e))}">${icon('sparkle', 'sr-hide')}${esc(e)}</a>`).join('')}</div>
      <div class="hero-actions"><a class="btn" href="${L('exhibitions')}">${icon('image')}${esc(t('hero.exhibitions'))}</a><a class="btn" href="${L('branches')}">${icon('pin')}${esc(t('hero.branches'))}</a></div>
    </div>
    <div class="hero-visual" aria-hidden="true">
      ${heroB ? `<div class="hv-doc"><img src="${heroB.url}" alt="" width="${heroB.w}" height="${heroB.h}"></div>` : ''}
      ${heroA ? `<div class="hv-photo"><img src="${heroA.url}" alt="" width="${heroA.w}" height="${heroA.h}"></div>` : ''}
      <div class="hv-badge">${esc(t('hero.newBadge'))}</div>
      <div class="hv-card hv-stat"><b>${total}</b>${esc(t('hero.statLabel'))}<div class="small" style="color:#55645A;margin-top:4px">${m.digital || 0} ${esc({ ru: 'цифровых копий', kz: 'цифрлық көшірме', en: 'digital copies' }[S.lang])}</div></div>
      ${day ? `<div class="hv-card hv-day"><div class="d">${esc(t('hero.dayLabel'))} · ${esc(day.date[S.lang === 'kz' ? 'kz' : 'ru'])}</div><div style="margin-top:4px;line-height:1.35">${esc(day.text[S.lang === 'kz' ? 'kz' : 'ru'].slice(0, 110))}${day.text.ru.length > 110 ? '…' : ''}</div></div>` : ''}
    </div>
  </div></section>

  <div class="quick"><div class="wrap"><div class="grid">
    ${[['catalog', 'archive', 'catalog'], ['cert', 'file', 'services'], ['branches', 'pin', 'branches'], ['ask', 'sparkle', '#ask']].map(([k, ic, href]) => `<a class="qtile" href="${href[0] === '#' ? '#' : L(href)}" ${href === '#ask' ? 'data-open-assist' : ''}><span class="ic">${icon(ic)}</span><span><b>${esc(t('quick.' + k)[0])}</b><span>${esc(t('quick.' + k)[1])}</span></span></a>`).join('')}
  </div></div></div>

  <section class="section" aria-labelledby="cat-h"><div class="wrap">
    <div class="grid g2" style="align-items:center;gap:40px">
      <div><div class="eyebrow">${esc(t('nav.catalog'))}</div><h2 id="cat-h">${esc(t('home.catalogTitle'))}</h2><p class="muted">${esc(t('home.catalogLead'))}</p>
        <form class="searchbar" data-home-search style="margin:18px 0 12px"><div class="sb">${icon('search')}<input class="input" type="search" placeholder="${esc(t('cat.ph'))}" aria-label="${esc(t('cat.ph'))}"></div><button class="btn btn-accent">${esc(t('cat.search'))}</button></form>
        <div class="row"><a class="chip" href="${L('catalog?type=photo')}">${icon('image', 'sr-hide')}${esc(t('types.photo'))}</a><a class="chip" href="${L('catalog?type=map')}">${esc(t('types.map'))}</a><a class="chip" href="${L('catalog?level=fund&kind=personal')}">${esc(t('cat.personalFunds'))}</a><a class="chip" href="${L('catalog?topic=' + encodeURIComponent('ВОВ'))}">1941–1945</a><a class="chip" href="${L('catalog?digital=1')}">${esc(t('cat.digital'))}</a><a href="${L('catalog#advanced')}" class="chip">${icon('filter', 'sr-hide')}${esc(t('home.advanced'))}</a></div>
      </div>
      <div class="grid g2">
        ${[['fund', 'landmark'], ['inventory', 'list'], ['case', 'folder'], ['document', 'file']].map(([k, ic]) => `<a class="card card-link" href="${L('catalog?level=' + k)}"><div class="row" style="justify-content:space-between"><span class="stat-num">${counts[k] || 0}</span>${icon(ic)}</div><div class="muted" style="margin-top:6px">${esc(t('cat.level.' + k))}</div></a>`).join('').replace(/<svg /g, '<svg style="width:26px;height:26px;opacity:.5" ')}
      </div>
    </div>
  </div></section>

  <section class="section section-alt" aria-labelledby="hist-h"><div class="wrap">
    <div class="section-head"><div><div class="eyebrow">${esc(t('nav.history'))}</div><h2 id="hist-h">${esc(t('home.historyTitle'))}</h2><p>${esc(t('home.historyLead'))}</p></div><a class="btn" href="${L('catalog?digital=1')}">${esc(t('home.all'))}${icon('arrow')}</a></div>
    <div class="grid g4">${photos.slice(0, 8).map((d) => `<a class="tile" href="${L('catalog/' + d.id)}"><div class="img"><img src="${fileUrl(d.id, 1, true)}" alt="${esc(tr(d.title))}" loading="lazy"></div><div class="body"><span class="cipher" style="justify-self:start">${esc(d.cipher)}</span><h3 style="font-family:var(--font);font-size:1rem">${esc(tr(d.title))}${trBadge(d.title)}</h3><span class="small muted">${esc(t('kinds.personal'))}</span></div></a>`).join('')}</div>
  </div></section>

  <section class="section" aria-labelledby="ex-h"><div class="wrap">
    <div class="section-head"><div><div class="eyebrow">${esc(t('nav.exhibitions'))}</div><h2 id="ex-h">${esc(t('home.exTitle'))}</h2><p>${esc(t('home.exLead'))}</p></div><a class="btn" href="${L('exhibitions')}">${esc(t('home.all'))}${icon('arrow')}</a></div>
    <div class="grid g3">${ex.map(exTile).join('')}</div>
  </div></section>

  <section class="section section-alt" aria-labelledby="br-h"><div class="wrap">
    <div class="section-head"><div><div class="eyebrow">${esc(t('nav.branches'))}</div><h2 id="br-h">${esc(t('home.brTitle'))}</h2><p>${esc(t('home.brLead'))}</p></div><a class="btn btn-brand" href="${L('branches')}">${icon('route')}${esc({ ru: 'Карта и маршруты', kz: 'Карта және бағыттар', en: 'Map & routes' }[S.lang])}</a></div>
    <div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:20px" data-br-grid>
      <div class="card" style="padding:0;overflow:hidden;min-height:380px"><div id="mini-map" class="map" style="min-height:380px"></div></div>
      <div class="card" style="padding:8px 0;max-height:420px;overflow:auto">${(m.branches || []).map((b) => `<a href="${L('branches?b=' + b.slug)}" class="bitem" style="display:block;text-decoration:none"><b>${esc(tr(b.name))}</b><span>${esc(b.address)} · ${esc(b.phone)}</span></a>`).join('')}</div>
    </div>
  </div></section>

  <section class="section" aria-labelledby="news-h"><div class="wrap">
    <div class="section-head"><div><div class="eyebrow">${esc(t('nav.news'))}</div><h2 id="news-h">${esc(t('home.newsTitle'))}</h2></div><a class="btn" href="${L('news')}">${esc(t('home.all'))}${icon('arrow')}</a></div>
    <div class="grid g3">${news.slice(0, 3).map(newsCard).join('')}</div>
  </div></section>

  <section class="section section-alt"><div class="wrap grid g3" style="align-items:start">
    <div class="card"><h2 style="font-size:1.35rem">${esc(t('home.usefulTitle'))}</h2><ul style="padding:0;margin:0;list-style:none;display:grid;gap:4px">${t('useful').map(([l, h]) => `<li><a class="row" style="gap:8px;padding:7px 0;text-decoration:none;color:var(--text)" href="${L(h)}">${icon('right', 'ul-ic')}<span>${esc(l)}</span></a></li>`).join('')}</ul></div>
    <div class="card"><h2 style="font-size:1.35rem">${esc(t('home.calTitle'))}</h2>${upcoming(cal, 4).map((d) => `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="small" style="color:var(--accent-ink);font-weight:700">${esc(d.date[S.lang === 'kz' ? 'kz' : 'ru'])}</div><div class="small">${esc(d.text[S.lang === 'kz' ? 'kz' : 'ru'])}</div></div>`).join('')}<a class="btn btn-sm" style="margin-top:14px" href="${L('calendar')}">${esc(t('home.all'))}</a></div>
    <div class="card"><h2 style="font-size:1.35rem">${esc(t('home.pollTitle'))}</h2><p class="small muted">${esc(t('home.pollQ'))}</p><form data-poll>${pollHtml}${pollVoted ? `<p class="small" style="margin-top:10px">${esc(t('home.voted'))}</p>` : `<button class="btn btn-sm btn-brand" style="margin-top:12px">${esc(t('home.vote'))}</button>`}</form>
      <hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><h3 style="font-family:var(--font);font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">${esc(t('home.statsTitle'))}</h3>
      <div class="row" style="gap:28px"><div><div class="stat-num" style="font-size:1.7rem">${(m.stats?.views || 0).toLocaleString('ru-RU')}</div><span class="small muted">${esc(t('home.views'))}</span></div><div><div class="stat-num" style="font-size:1.7rem">${(m.stats?.visitors || 0).toLocaleString('ru-RU')}</div><span class="small muted">${esc(t('home.visitors'))}</span></div></div>
      <p class="small muted" style="margin-top:8px">${esc({ ru: 'Обезличенные агрегированные показатели.', kz: 'Жинақталған көрсеткіштер.', en: 'Anonymous aggregate figures.' }[S.lang])}</p></div>
  </div></section>

  <section class="section"><div class="wrap"><div class="card" style="display:flex;gap:24px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:var(--green);color:#EFE6D2;border:0">
    <div><h2 style="color:#F5EEDF;margin:0">${esc(t('home.socialTitle'))}</h2><p style="margin:6px 0 0;color:#D8CCB4">${esc(t('home.socialLead'))}</p></div>
    <div class="row">${(m.org?.social || []).map((s) => `<a class="btn" style="background:transparent;color:#EFE6D2;border-color:rgba(232,220,196,.35)" href="${esc(s.url)}" target="_blank" rel="noopener">${icon(s.id)}${esc(s.label)}</a>`).join('')}</div>
    <p class="small" style="width:100%;margin:0;color:#B9AE97">${esc({ ru: 'Лента публикаций будет подключена при наличии официального API платформы; сейчас — прямые ссылки на аккаунты.', kz: 'Жарияланымдар таспасы платформаның ресми API болған кезде қосылады.', en: 'A post feed will be connected when an official platform API is available.' }[S.lang])}</p>
  </div></div></section>`;
  return {
    title: '', html,
    after(root) {
      root.querySelectorAll('[data-home-search]').forEach((f) => f.addEventListener('submit', (e) => { e.preventDefault(); const q = f.querySelector('input').value.trim(); S.navigate(L('catalog') + (q ? '?q=' + encodeURIComponent(q) : '')); }));
      root.querySelector('[data-open-assist]')?.addEventListener('click', (e) => { e.preventDefault(); S.openAssistant?.(); });
      root.querySelector('[data-poll]')?.addEventListener('submit', async (e) => {
        e.preventDefault(); const v = e.target.querySelector('input:checked')?.value; if (!v) return toast('—');
        try { const r = await api('/api/poll', { method: 'POST', body: { option: v } }); S.meta.poll = r.poll; store.set('poll-voted', v); toast(t('home.voted')); S.navigate(location.pathname, { replace: true, scroll: false }); } catch (err) { toast(err.message); }
      });
      const mq = matchMedia('(max-width: 1000px)'); const g = root.querySelector('[data-br-grid]'); if (mq.matches && g) g.style.gridTemplateColumns = '1fr';
      return miniMap(root.querySelector('#mini-map'), S.meta?.branches || []);
    },
  };
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
export function paid() {
  const R = S.lang;
  const kinds = { ru: ['Тематические запросы (поиск по теме, событию, факту)', 'Генеалогические запросы', 'Изготовление копий документов (ксерокопирование, сканирование)', 'Консультации по вопросам архивного дела', 'Упорядочение документов организаций', 'Экспертиза ценности документов организаций'], kz: ['Тақырыптық сұраулар', 'Генеалогиялық сұраулар', 'Құжаттардың көшірмелерін жасау', 'Архив ісі бойынша кеңестер', 'Ұйымдардың құжаттарын ретке келтіру', 'Құжаттардың құндылығын сараптау'], en: ['Thematic research', 'Genealogical research', 'Copies (photocopy, scan)', 'Consultations', 'Arrangement of organisational records', 'Records appraisal'] }[R];
  const html = `${NO_FORMS()}
  <h2>${esc({ ru: 'Постановление об утверждении прейскуранта', kz: 'Прейскурантты бекіту туралы қаулы', en: 'Decree approving the price list' }[R])}</h2>
  <div class="card"><b>«Об утверждении прейскуранта цен на товары (работы, услуги), реализуемые государственными архивами управления цифровизации и архивов Восточно-Казахстанской области»</b>
  <p class="small muted" style="margin:8px 0 0">${esc({ ru: 'Реквизиты и текст будут размещены после предоставления заказчиком утверждённой редакции.', kz: 'Деректемелер тапсырыс беруші ұсынғаннан кейін орналастырылады.', en: 'Details will be published once the approved version is provided.' }[R])}</p></div>
  <h2 style="margin-top:28px">${esc({ ru: 'Прейскурант', kz: 'Прейскурант', en: 'Price list' }[R])}</h2>
  <div class="table-wrap"><table class="table price-table"><thead><tr><th>№</th><th>${esc({ ru: 'Наименование работы (услуги)', kz: 'Жұмыстың (қызметтің) атауы', en: 'Service' }[R])}</th><th>${esc({ ru: 'Ед. изм.', kz: 'Өлш. бірл.', en: 'Unit' }[R])}</th><th>${esc({ ru: 'Цена, тенге', kz: 'Бағасы, теңге', en: 'Price, KZT' }[R])}</th></tr></thead>
  <tbody>${kinds.map((k, i) => `<tr><td>${i + 1}</td><td>${esc(k)}</td><td class="muted">—</td><td class="muted">${esc({ ru: 'не заполнено', kz: 'толтырылмаған', en: 'not filled' }[R])}</td></tr>`).join('')}</tbody></table></div>
  <div class="notice warn" style="margin-top:14px">${icon('alert')}<div><p>${esc({ ru: 'Демонстрационный макет таблицы: перечень видов работ приведён для примера, цены не публикуются до получения утверждённого прейскуранта. Сайт не рассчитывает стоимость и не принимает оплату.', kz: 'Демо-кесте: бағалар бекітілген прейскурант алынғанға дейін жарияланбайды.', en: 'Demo layout: prices are not published until the approved price list is received.' }[R])}</p></div></div>`;
  return { title: t('menu.paid')[0], html: pageHead(esc(t('menu.paid')[0]), esc(t('menu.paid')[1]), [[t('nav.info')], [t('menu.paid')[0]]]) + sideLayout(INFO_NAV(), 'services/paid', html) };
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
  const html = `<div class="grid g2"><div class="card"><div class="eyebrow">${esc({ ru: 'Комплаенс-служба', kz: 'Комплаенс қызметі', en: 'Compliance service' }[R])}</div><h3>${esc({ ru: 'Комплаенс-офицер', kz: 'Комплаенс-офицер', en: 'Compliance officer' }[R])}</h3><p style="margin:0"><b>Ешенгельдиев Тырек Молболович</b></p><p class="small muted">${esc({ ru: 'Контактный телефон: уточняется (будет указан после подтверждения заказчиком).', kz: 'Байланыс телефоны: нақтыланады.', en: 'Phone: to be confirmed.' }[R])}</p>
  <p class="small">${esc({ ru: 'Сообщить о фактах коррупции можно также по номеру 1424 (Call-центр Агентства по противодействию коррупции) или через', kz: 'Сыбайлас жемқорлық фактілері туралы 1424 нөміріне немесе мына арқылы хабарлауға болады:', en: 'Report corruption via 1424 hotline or' }[R])} ${ext('https://eotinish.kz', 'e-Otinish')}.</p></div>
  <div class="card"><h3>${esc({ ru: 'Документы', kz: 'Құжаттар', en: 'Documents' }[R])}</h3>${docs.map(([f, n]) => `<div class="dept"><span class="small">${esc(X(n))}</span><span class="row" style="gap:6px;flex-wrap:nowrap"><a class="btn btn-sm" href="/files/anticorruption/${f}-ru.pdf" target="_blank" rel="noopener">RU</a><a class="btn btn-sm" href="/files/anticorruption/${f}-kz.pdf" target="_blank" rel="noopener">KZ</a></span></div>`).join('')}</div></div>
  <h2 style="margin-top:28px">${esc({ ru: 'Новости комплаенс-службы', kz: 'Комплаенс қызметінің жаңалықтары', en: 'Compliance news' }[R])}</h2><div class="grid g2">${news.map(newsCard).join('')}</div>
  <h2 style="margin-top:28px">${esc({ ru: 'Официальные ресурсы', kz: 'Ресми ресурстар', en: 'Official resources' }[R])}</h2><ul><li>${ext('https://adilet.zan.kz/rus/docs/Z1500000410', 'Закон РК «О противодействии коррупции»')}</li><li>${ext('https://www.gov.kz/memleket/entities/anticorruption', 'Агентство РК по противодействию коррупции')}</li></ul>`;
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
export function feedback() {
  const R = S.lang;
  const html = `<div class="wrap section" style="padding-top:32px;max-width:760px">
  <div class="notice">${icon('info')}<div><p>${esc({ ru: 'Это форма отзывов и предложений по работе сайта. Она не является официальным обращением и не регистрируется как заявление. Для официальных обращений используйте', kz: 'Бұл сайт туралы пікірлер формасы. Ресми өтініш емес. Ресми өтініштер үшін:', en: 'This is a feedback form about the site. It is not an official appeal. For official appeals use' }[R])} ${ext('https://eotinish.kz', 'e-Otinish')}.</p></div></div>
  <form class="card stack" style="margin-top:18px" data-fb novalidate>
    <div class="field"><label for="fb-kind">${esc({ ru: 'Тип сообщения', kz: 'Хабарлама түрі', en: 'Type' }[R])}</label><select id="fb-kind" class="input" name="kind"><option value="review">${esc({ ru: 'Отзыв', kz: 'Пікір', en: 'Review' }[R])}</option><option value="suggestion">${esc({ ru: 'Предложение', kz: 'Ұсыныс', en: 'Suggestion' }[R])}</option><option value="wish">${esc({ ru: 'Пожелание', kz: 'Тілек', en: 'Wish' }[R])}</option><option value="error">${esc({ ru: 'Ошибка на сайте', kz: 'Сайттағы қате', en: 'Site error' }[R])}</option></select></div>
    <div class="field"><label for="fb-text">${esc({ ru: 'Сообщение', kz: 'Хабарлама', en: 'Message' }[R])} *</label><textarea id="fb-text" class="input" name="text" minlength="10" maxlength="2000" required aria-describedby="fb-hint"></textarea><span id="fb-hint" class="small muted">${esc({ ru: 'От 10 до 2000 символов. Не указывайте персональные данные.', kz: '10–2000 таңба. Дербес деректерді көрсетпеңіз.', en: '10–2000 characters. Do not include personal data.' }[R])}</span></div>
    <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
    <div class="row"><button class="btn btn-accent">${icon('send')}${esc({ ru: 'Отправить отзыв', kz: 'Пікір жіберу', en: 'Send feedback' }[R])}</button><span data-fb-status role="status" class="small"></span></div>
  </form></div>`;
  return {
    title: t('menu.feedback')[0], html: pageHead(esc(t('menu.feedback')[0]), esc(t('menu.feedback')[1]), [[t('nav.about'), L('about')], [t('menu.feedback')[0]]]) + html,
    after(root) {
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
  const L1 = [['https://www.akorda.kz', 'Akorda.kz', { ru: 'Официальный сайт Президента РК', kz: 'ҚР Президентінің ресми сайты', en: 'Official website of the President' }], ['https://www.gov.kz/memleket/entities/vko', { ru: 'Акимат ВКО', kz: 'ШҚО әкімдігі', en: 'EKR Akimat' }, { ru: 'Официальный интернет-ресурс акимата области', kz: 'Облыс әкімдігінің ресми ресурсы', en: 'Regional akimat website' }], ['https://www.gov.kz/memleket/entities/vko-cifr', { ru: 'Управление цифровизации и архивов ВКО', kz: 'ШҚО цифрландыру және архивтер басқармасы', en: 'EKR Department of Digitalization and Archives' }, { ru: 'Уполномоченный орган (ссылка требует подтверждения)', kz: 'Уәкілетті орган (сілтеме расталуы керек)', en: 'Authorised body (link to be confirmed)' }], ['https://egov.kz', 'eGov.kz', { ru: 'Электронное правительство', kz: 'Электрондық үкімет', en: 'E-government' }], ['https://adilet.zan.kz', 'Әділет', { ru: 'Информационно-правовая система нормативных актов', kz: 'Нормативтік актілердің ақпараттық-құқықтық жүйесі', en: 'Legal information system' }], ['https://eotinish.kz', 'e-Otinish', { ru: 'Обращения в госорганы', kz: 'Мемлекеттік органдарға өтініштер', en: 'Appeals to state bodies' }], ['https://archive.president.kz', { ru: 'Архив Президента РК', kz: 'ҚР Президентінің Архиві', en: 'Archive of the President' }, { ru: 'Открытые архивные материалы', kz: 'Ашық архив материалдары', en: 'Open archival materials' }], ['https://e-history.kz', 'E-history.kz', { ru: 'Портал «История Казахстана», в т. ч. материалы о ветеранах ВОВ', kz: '«Қазақстан тарихы» порталы', en: 'History of Kazakhstan portal' }]];
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
