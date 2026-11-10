import { S, t, tr, esc, L, api, store, docCard, pageHead, fileUrl, copy, share, lightbox, accessTag, years, typeIcon, errorBox, demoTag, trBadge, missing, commentsHtml, mountComments } from './core.js';
import { icon } from './icons.js';

const PARAMS = ['q', 'level', 'type', 'place', 'branch', 'topic', 'kind', 'from', 'to', 'digital', 'fund', 'inv', 'case', 'author', 'sort', 'page', 'fav'];
const branchName = (slug) => tr((S.meta?.branches || []).find((b) => b.slug === slug)?.name) || slug;

export function catalog() {
  const p = new URLSearchParams(location.search);
  const st = Object.fromEntries(PARAMS.map((k) => [k, p.get(k) || '']));
  st.level ||= 'all';
  const html = `${pageHead(esc(t('cat.title')), esc(t('cat.lead')), [[t('cat.title')]])}
  <div class="wrap section" style="padding-top:26px">
    <form class="searchbar" data-cs role="search"><div class="sb">${icon('search')}<input class="input" name="q" type="search" value="${esc(st.q)}" placeholder="${esc(t('cat.ph'))}" aria-label="${esc(t('cat.ph'))}" autocomplete="off"></div><button class="btn btn-accent">${esc(t('cat.search'))}</button></form>
    <div class="row" style="margin-top:14px;justify-content:space-between">
      <div class="levels" role="group" aria-label="level">${['all', 'document', 'case', 'inventory', 'fund'].map((l) => `<button type="button" data-level="${l}" aria-pressed="${st.level === l}">${esc(t('cat.level.' + l))}</button>`).join('')}</div>
      <div class="row"><button type="button" class="chip" data-fav aria-pressed="${st.fav === '1'}">${icon('star', 'sr-hide')}★ ${esc(t('doc.faved'))} (${store.get('favs', []).length})</button><button type="button" class="chip" data-adv aria-expanded="${!!(st.fund || st.inv || st.case || st.author)}" aria-controls="advanced">${esc(t('cat.advanced'))}</button><button type="button" class="chip show-sm" data-ftoggle aria-controls="filters">${esc(t('cat.filters'))}</button></div>
    </div>
    <form class="adv" id="advanced" data-advform ${st.fund || st.inv || st.case || st.author || location.hash === '#advanced' ? '' : 'hidden'}>
      <div class="field"><label for="a-fund">${esc(t('cat.fund'))}</label><input id="a-fund" class="input" name="fund" value="${esc(st.fund)}" placeholder="25"></div>
      <div class="field"><label for="a-inv">${esc(t('cat.inv'))}</label><input id="a-inv" class="input" name="inv" value="${esc(st.inv)}" placeholder="1"></div>
      <div class="field"><label for="a-case">${esc(t('cat.case'))}</label><input id="a-case" class="input" name="case" value="${esc(st.case)}" placeholder="6"></div>
      <div class="field"><label for="a-author">${esc(t('cat.author'))}</label><input id="a-author" class="input" name="author" value="${esc(st.author)}"></div>
      <div class="field"><label for="a-from">${esc(t('cat.period'))}: ${esc(t('cat.from'))}</label><input id="a-from" class="input" name="from" type="number" min="1700" max="2100" value="${esc(st.from)}" placeholder="1900"></div>
      <div class="field"><label for="a-to">${esc(t('cat.to'))}</label><input id="a-to" class="input" name="to" type="number" min="1700" max="2100" value="${esc(st.to)}" placeholder="2000"></div>
      <div class="field" style="align-self:end"><button class="btn btn-brand">${esc(t('cat.apply'))}</button></div>
    </form>
    <div data-understood></div>
    <div class="cat-layout" style="margin-top:22px">
      <aside class="filters" id="filters" aria-label="${esc(t('cat.filters'))}" data-filters><div class="skeleton" style="height:400px"></div></aside>
      <section aria-live="polite" aria-busy="true" data-results><div class="grid" style="gap:12px">${'<div class="skeleton" style="height:130px"></div>'.repeat(4)}</div></section>
    </div>
    <div class="notice" style="margin-top:28px">${icon('info')}<div><p class="small">${esc(t('cat.demoNote'))}</p></div></div>
  </div>`;

  const after = (root) => {
    let ctl = null;
    const state = { ...st };
    const toUrl = () => { const q = new URLSearchParams(); for (const k of PARAMS) if (state[k] && !(k === 'level' && state[k] === 'all') && !(k === 'page' && state[k] === '1')) q.set(k, state[k]); return L('catalog') + (q.toString() ? '?' + q : ''); };
    const set = (patch, { push = true } = {}) => { Object.assign(state, patch); if (!('page' in patch)) state.page = ''; history[push ? 'pushState' : 'replaceState'](null, '', toUrl()); load(); };
    const res = root.querySelector('[data-results]'); const fl = root.querySelector('[data-filters]'); const und = root.querySelector('[data-understood]');

    async function load() {
      ctl?.abort(); ctl = new AbortController();
      res.setAttribute('aria-busy', 'true');
      res.style.opacity = '.55';
      try {
        let data;
        if (state.fav === '1') {
          const ids = store.get('favs', []);
          const items = (await Promise.all(ids.map((id) => api('/api/catalog/' + id).catch(() => null)))).filter(Boolean);
          data = { total: items.length, page: 1, pages: 1, items, facets: {}, understood: null, suggestions: [] };
        } else {
          const q = new URLSearchParams({ lang: S.lang, per: 10 }); for (const k of PARAMS) if (state[k]) q.set(k, state[k]);
          const r = await fetch('/api/catalog/search?' + q, { signal: ctl.signal }); if (!r.ok) throw new Error(); data = await r.json();
        }
        draw(data);
      } catch (e) { if (e.name === 'AbortError') return; res.innerHTML = errorBox(t('cat.error')); res.querySelector('[data-act="retry"]').onclick = load; }
      finally { res.setAttribute('aria-busy', 'false'); res.style.opacity = ''; }
    }

    function facetBlock(key, title, data, label) {
      const entries = Object.entries(data || {}).sort((a, b) => (key === 'decade' ? a[0] - b[0] : b[1] - a[1]));
      if (!entries.length) return '';
      const sel = (state[key] || '').split(',').filter(Boolean);
      return `<h3>${esc(title)}</h3>${entries.map(([v, n]) => `<label class="fopt"><input type="checkbox" data-facet="${key}" value="${esc(v)}" ${sel.includes(v) ? 'checked' : ''}><span>${esc(label ? label(v) : v)}</span><span class="n">${n}</span></label>`).join('')}`;
    }
    function draw(d) {
      // Что понял «интеллектуальный поиск»
      const u = d.understood; const chips = [];
      if (u?.period) chips.push(`${t('cat.period')}: ${u.period.label}`);
      u?.types?.forEach((x) => chips.push(t('types.' + x)));
      u?.places?.forEach((x) => chips.push(x));
      u?.topics?.forEach((x) => chips.push(x));
      if (u?.cipher) chips.push(`Ф.${u.cipher.fund}${u.cipher.inv ? '. Оп.' + u.cipher.inv : ''}${u.cipher.case ? '. Д.' + u.cipher.case : ''}`);
      und.innerHTML = chips.length ? `<div class="understood">${icon('sparkle').replace('<svg', '<svg style="width:16px;height:16px;color:var(--accent)"')}<span class="muted">${esc(t('cat.understood'))}</span>${chips.map((c) => `<span class="tag tag-accent">${esc(c)}</span>`).join('')}</div>` : '';

      const f = d.facets || {};
      const active = PARAMS.filter((k) => !['q', 'level', 'sort', 'page'].includes(k) && state[k]);
      fl.innerHTML = `${active.length ? `<button class="btn btn-sm" style="width:100%;margin-bottom:12px" data-reset>${icon('reset')}${esc(t('cat.reset'))}</button>` : ''}
        <label class="fopt"><input type="checkbox" data-digital ${state.digital === '1' ? 'checked' : ''}><span>${esc(t('cat.digital'))}</span></label>
        ${facetBlock('type', t('cat.type'), f.type, (v) => t('types.' + v))}
        <h3>${esc(t('cat.period'))}</h3><div class="row" style="gap:6px">${Object.keys(f.decade || {}).sort().map((dec) => `<button type="button" class="chip ${state.from === dec && state.to === String(+dec + 9) ? 'on' : ''}" data-decade="${dec}">${dec}-е</button>`).join('')}</div>
        ${facetBlock('place', t('cat.place'), f.place)}
        ${facetBlock('topic', t('cat.topic'), f.topic)}
        ${facetBlock('branch', t('cat.branch'), f.branch, branchName)}
        ${facetBlock('kind', t('cat.kind'), f.kind, (v) => t('kinds.' + v))}`;

      const sortSel = `<label class="row small" style="gap:8px">${esc(t('cat.sort'))}<select class="input" data-sort style="width:auto;min-height:38px;padding:6px 10px">${[['relevance', 'sortRel'], ['date', 'sortDate'], ['-date', 'sortDateDesc'], ['title', 'sortTitle'], ['cipher', 'sortCipher']].filter(([v]) => v !== 'relevance' || state.q).map(([v, k]) => `<option value="${v}" ${(state.sort || d.sort) === v ? 'selected' : ''}>${esc(t('cat.' + k))}</option>`).join('')}</select></label>`;
      if (!d.total) {
        res.innerHTML = `<div class="results-head"><b>${esc(t('cat.found'))}: 0</b></div><div class="empty card">${icon('search')}<h3>${esc(t('cat.noResults'))}</h3><p style="max-width:520px;margin:0 auto 16px">${esc(t('cat.noResultsHint'))}</p>
          ${d.suggestions?.length ? `<p class="small">${esc(t('cat.try'))}</p><div class="row" style="justify-content:center">${d.suggestions.map((s) => `<button class="chip" data-sugg="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : ''}
          <div class="row" style="justify-content:center;margin-top:16px">${active.length ? `<button class="btn btn-sm" data-reset>${icon('reset')}${esc(t('cat.reset'))}</button>` : ''}<button class="btn btn-sm btn-accent" data-ask>${icon('sparkle')}${esc(t('ai.open'))}</button></div></div>`;
      } else {
        res.innerHTML = `<div class="results-head"><span><b>${esc(t('cat.found'))}: ${d.total}</b> <span class="muted small">· ${esc(t('cat.level.' + state.level))}</span></span>${sortSel}</div>
        <div class="grid" style="gap:12px">${d.items.map((r) => (r.level === 'document' ? docCard(r) : groupCard(r))).join('')}</div>
        ${d.pages > 1 ? `<nav class="pager" aria-label="${esc(t('cat.page'))}">${d.page > 1 ? `<button data-page="${d.page - 1}" aria-label="prev">${icon('left').replace('<svg', '<svg style="width:16px;margin:auto"')}</button>` : ''}${Array.from({ length: d.pages }, (_, i) => i + 1).filter((n) => n === 1 || n === d.pages || Math.abs(n - d.page) <= 2).map((n) => `<button data-page="${n}" aria-current="${n === d.page}">${n}</button>`).join('')}${d.page < d.pages ? `<button data-page="${d.page + 1}" aria-label="next">${icon('right').replace('<svg', '<svg style="width:16px;margin:auto"')}</button>` : ''}</nav>` : ''}
        ${d.suggestions?.length && state.q ? `<p class="small muted" style="margin-top:20px">${esc(t('cat.try'))} ${d.suggestions.map((s) => `<button class="chip" data-sugg="${esc(s)}">${esc(s)}</button>`).join(' ')}</p>` : ''}`;
      }
    }

    root.querySelector('[data-cs]').onsubmit = (e) => { e.preventDefault(); set({ q: e.target.q.value.trim(), sort: '', fav: '' }); };
    root.querySelector('[data-advform]').onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.target); set(Object.fromEntries(['fund', 'inv', 'case', 'author', 'from', 'to'].map((k) => [k, String(f.get(k) || '').trim()]))); };
    root.addEventListener('click', (e) => {
      const lv = e.target.closest('[data-level]'); if (lv) { root.querySelectorAll('[data-level]').forEach((b) => b.setAttribute('aria-pressed', b === lv)); set({ level: lv.dataset.level, fav: '' }); return; }
      if (e.target.closest('[data-adv]')) { const f = root.querySelector('[data-advform]'); f.hidden = !f.hidden; e.target.closest('[data-adv]').setAttribute('aria-expanded', !f.hidden); if (!f.hidden) f.querySelector('input').focus(); }
      if (e.target.closest('[data-ftoggle]')) fl.classList.toggle('open');
      if (e.target.closest('[data-fav]')) { const on = state.fav !== '1'; e.target.closest('[data-fav]').setAttribute('aria-pressed', on); set({ fav: on ? '1' : '' }); }
      if (e.target.closest('[data-reset]')) { root.querySelector('[data-advform]').reset(); set(Object.fromEntries(PARAMS.filter((k) => !['q', 'level'].includes(k)).map((k) => [k, '']))); }
      const pg = e.target.closest('[data-page]'); if (pg) { set({ page: pg.dataset.page }); root.querySelector('[data-results]').scrollIntoView({ behavior: 'smooth' }); }
      const dec = e.target.closest('[data-decade]'); if (dec) { const on = !(state.from === dec.dataset.decade); set({ from: on ? dec.dataset.decade : '', to: on ? String(+dec.dataset.decade + 9) : '' }); }
      const sg = e.target.closest('[data-sugg]'); if (sg) { root.querySelector('[data-cs] input').value = sg.dataset.sugg; set({ q: sg.dataset.sugg, type: '', place: '', topic: '', from: '', to: '' }); }
      if (e.target.closest('[data-ask]')) S.openAssistant?.(state.q);
    });
    root.addEventListener('change', (e) => {
      const fc = e.target.closest('[data-facet]');
      if (fc) { const key = fc.dataset.facet; const vals = [...root.querySelectorAll(`[data-facet="${key}"]:checked`)].map((x) => x.value); set({ [key]: vals.join(',') }); }
      if (e.target.closest('[data-digital]')) set({ digital: e.target.checked ? '1' : '' });
      if (e.target.closest('[data-sort]')) set({ sort: e.target.value }, { push: false });
    });
    const onPop = () => { const p2 = new URLSearchParams(location.search); for (const k of PARAMS) state[k] = p2.get(k) || ''; state.level ||= 'all'; };
    window.addEventListener('popstate', onPop);
    load();
    return () => { ctl?.abort(); window.removeEventListener('popstate', onPop); };
  };
  return { title: t('cat.title'), html, after, keepFocus: false };
}

function groupCard(r) {
  const ic = { fund: 'landmark', inventory: 'list', case: 'folder' }[r.level];
  return `<a class="doc-card" href="${L('catalog/' + r.id)}"><div class="thumb">${icon(ic)}</div><div><div class="meta" style="margin-bottom:6px"><span class="cipher">${esc(r.cipher)}</span><span class="tag">${esc(t('cat.level.' + r.level))}</span>${r.fund_kind === 'personal' ? `<span class="tag tag-accent">${esc(t('kinds.personal'))}</span>` : ''}</div><h3>${esc(tr(r.title))}${trBadge(r.title)}</h3><div class="meta"><span>${esc(years(r))}</span>${r.units ? `<span>·</span><span>${esc(r.units)} ${esc(t('doc.units'))}</span>` : ''}<span>·</span><span>${esc(branchName(r.branch))}</span></div>${r.descr?.ru ? `<p class="small muted" style="margin:6px 0 0">${esc(tr(r.descr).slice(0, 160))}${tr(r.descr).length > 160 ? '…' : ''}</p>` : ''}</div></a>`;
}

// ---------------------------------------------------------------- Карточка архивной записи
export async function docPage(id) {
  const r = await api('/api/catalog/' + id);
  const isDoc = r.level === 'document';
  const favs = store.get('favs', []);
  const a = r.access;
  const crumbs = [[t('cat.title'), L('catalog')], ...r.chain.map((c) => [c.cipher, L('catalog/' + c.id)]), [r.cipher]];
  const st = { open: t('doc.open'), restricted: t('doc.restricted'), review: t('doc.review'), none: t('doc.none') };
  const kv = [
    [t('doc.cipher'), `<span class="cipher" style="font-size:.9rem">${esc(r.cipher)}</span>`],
    [t('doc.fund'), r.fund_no ? esc('№ ' + r.fund_no) : '—'], [t('doc.inv'), r.inv_no ? esc('№ ' + r.inv_no) : '—'], [t('doc.case'), r.case_no ? esc('№ ' + r.case_no) : '—'],
    [t('doc.date'), esc(years(r)) + (r.date_uncertain ? ` <span class="tag tag-warn">${esc(t('doc.uncertain'))}</span>` : '')],
    [t('doc.type'), r.doc_type ? esc(t('types.' + r.doc_type)) : '—'],
    ...(r.author ? [[t('doc.author'), esc(r.author) + (r.author_uncertain ? ` <span class="tag tag-warn">${esc(t('doc.authorUncertain'))}</span>` : '')]] : []),
    ...(r.place ? [[t('doc.place'), esc(r.place)]] : []),
    ...(isDoc ? [[t('doc.lang'), esc(r.lang || '—')], [t('doc.sheets'), esc(r.sheets ?? '—')]] : []),
    [t('doc.storage'), esc(r.storage || branchName(r.branch))],
    [t('doc.access'), isDoc ? `${a.file === 'restricted' ? st.restricted : st.open}` : st.open],
    ...(isDoc ? [[t('doc.digital'), accessTag(a)]] : []),
    ...(r.units ? [[{ ru: 'Объём', kz: 'Көлемі', en: 'Extent' }[S.lang], `${esc(r.units)} ${esc(t('doc.units'))}`]] : []),
    [t('doc.uid'), `<span class="mono small">${esc(r.uid)}</span>`],
  ];
  const viewer = !isDoc ? '' : a.digital ? `<div class="viewer" data-viewer><div class="viewer-stage" data-stage><img src="${fileUrl(r.id, 1)}" alt="${esc(tr(r.title))} — ${esc(t('doc.page'))} 1" data-img draggable="false"></div>
      <div class="viewer-bar">${a.pages > 1 ? `<button data-vp="-1" aria-label="prev">${icon('left')}</button><span class="small" data-pg>1 / ${a.pages}</span><button data-vp="1" aria-label="next">${icon('right')}</button>` : `<span class="small">${esc(t('doc.page'))} 1</span>`}<span class="grow"></span><button data-vz="out" aria-label="−">${icon('zoomout')}</button><button data-vz="in" aria-label="${esc(t('doc.zoom'))}">${icon('zoomin')}</button><button data-vfull aria-label="${esc(t('doc.fullscreen'))}">${icon('expand')}</button></div></div>`
    : `<div class="viewer"><div class="viewer-locked"><div>${icon('lock')}<h2 style="color:#EFE6D2;font-size:1.3rem">${esc(t('doc.lockedTitle'))}</h2><p style="color:#D8CCB4;max-width:380px;margin:0 auto">${esc(r.access.restriction || (a.file === 'none' ? ({ ru: 'Документ ещё не оцифрован. Ознакомиться с подлинником можно в читальном зале.', kz: 'Құжат әлі цифрланбаған.', en: 'Not yet digitised. The original can be consulted in the reading room.' }[S.lang]) : ''))}</p><a class="btn btn-sm" style="margin-top:14px;background:transparent;color:#EFE6D2;border-color:rgba(232,220,196,.4)" href="${L('reading-room')}">${esc(t('menu.reading')[0])}</a></div></div></div>`;
  const ann = r.annotation;
  const html = `${pageHead(esc(tr(r.title)) + trBadge(r.title), '', [[t('cat.title'), L('catalog')], ...crumbs.slice(1, -1), [r.cipher]])}
  <div class="wrap section" style="padding-top:28px">
    ${missing(r.title) ? `<div class="notice" style="margin-bottom:16px">${icon('info')}<div><p>${esc(t('translationMissing'))}</p></div></div>` : ''}
    <div class="${isDoc ? 'doc-layout' : ''}">
      ${viewer ? `<div>${viewer}</div>` : ''}
      <div class="stack">
        <div class="row"><span class="tag">${esc(t('cat.level.' + r.level))}</span>${isDoc ? accessTag(a) : ''}${r.fund_kind === 'personal' ? `<span class="tag tag-accent">${esc(t('kinds.personal'))}</span>` : ''}${r.demo ? `<span class="tag tag-demo">${esc(t('doc.demo'))}</span>` : ''}</div>
        <div class="row"><button class="btn btn-sm" data-copy>${icon('copy')}${esc(t('doc.copy'))}</button><button class="btn btn-sm" data-share>${icon('share')}${esc(t('doc.share'))}</button><button class="btn btn-sm" data-favbtn aria-pressed="${favs.includes(r.id)}">${icon('star')}<span>${esc(favs.includes(r.id) ? t('doc.faved') : t('doc.fav'))}</span></button></div>
        ${r.descr && tr(r.descr) ? `<div><h2 style="font-size:1.15rem">${esc(t('doc.descr'))}</h2><p>${esc(tr(r.descr))}</p></div>` : ''}
        <div class="kv">${kv.map(([k, v]) => `<div>${esc(k)}</div><div>${v}</div>`).join('')}</div>
        ${r.sourceUrl ? `<p class="small" style="margin:0"><a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${esc(t('doc.onSite'))} ↗</a>${isDoc && r.doc_type === 'photo' ? ` <span class="muted">· ${esc(t('doc.photoNote'))}</span>` : ''}</p>` : ''}
        ${isDoc && a.masterRegistered ? `<p class="small muted">${icon('shield', 'sr-hide')}🛡 ${esc(t('doc.master'))}</p>` : ''}
        ${ann ? `<div class="ai-box"><span class="ai-label">${icon('sparkle')}${esc(t('doc.aiTitle'))}</span><p style="margin:8px 0">${esc(ann.summary)}</p>
          ${ann.keyDates.length ? `<div class="small"><b>${esc(t('doc.aiKeys'))}:</b> ${ann.keyDates.map((y) => `<a class="chip" style="padding:1px 8px" href="${L('catalog?from=' + y + '&to=' + y)}">${esc(y)}</a>`).join(' ')}</div>` : ''}
          ${ann.places.length ? `<div class="small" style="margin-top:6px"><b>${esc(t('doc.aiPlaces'))}:</b> ${ann.places.map((p) => `<a class="chip" style="padding:1px 8px" href="${L('catalog?place=' + encodeURIComponent(p))}">${esc(p)}</a>`).join(' ')}</div>` : ''}
          ${ann.topics.length ? `<div class="small" style="margin-top:6px"><b>${esc(t('doc.topics'))}:</b> ${ann.topics.map((p) => `<a class="chip" style="padding:1px 8px" href="${L('catalog?topic=' + encodeURIComponent(p))}">${esc(p)}</a>`).join(' ')}</div>` : ''}
          <div class="msg" style="padding:0;margin-top:10px"><div class="auto" style="font-size:.74rem;color:var(--muted);display:flex;gap:6px">${icon('info').replace('<svg', '<svg style="width:14px;height:14px;flex:none"')}<span>${esc(ann.note)}</span></div></div></div>` : ''}
        <div><h2 style="font-size:1.15rem">${esc(t('doc.hierarchy'))}</h2><ol class="hier"><li><span class="dot">${icon('landmark').replace('<svg', '<svg style="width:13px"')}</span><span>${esc(branchName(r.branch))}</span></li>${r.chain.map((c) => `<li><span class="dot">${{ fund: 'Ф', inventory: 'О', case: 'Д' }[c.level] || '•'}</span><span><a href="${L('catalog/' + c.id)}">${esc(c.cipher)}</a> — ${esc(tr(c.title))}</span></li>`).join('')}<li class="cur"><span class="dot">${{ fund: 'Ф', inventory: 'О', case: 'Д', document: 'Л' }[r.level]}</span><span><b>${esc(r.cipher)}</b></span></li></ol></div>
      </div>
    </div>
    ${r.children?.length ? `<h2 style="margin-top:36px">${esc(t('doc.children'))} <span class="muted small">(${r.children.length}${r.docCount != null ? ` · ${r.docCount} ${esc(t('cat.level.document').toLowerCase())}` : ''})</span></h2><div class="table-wrap"><table class="table"><thead><tr><th>${esc(t('doc.cipher'))}</th><th>${esc({ ru: 'Заголовок', kz: 'Тақырып', en: 'Title' }[S.lang])}</th><th>${esc(t('doc.date'))}</th></tr></thead><tbody>${r.children.map((c) => `<tr><td><a class="cipher" href="${L('catalog/' + c.id)}">${esc(c.cipher)}</a></td><td><a href="${L('catalog/' + c.id)}">${esc(tr(c.title))}</a></td><td>${esc(years(c))}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${r.level === 'fund' ? `<p style="margin-top:14px"><a class="btn btn-brand" href="${L('catalog?fund=' + encodeURIComponent(r.fund_no))}">${icon('search')}${esc({ ru: 'Все документы фонда', kz: 'Қордың барлық құжаттары', en: 'All items in this fonds' }[S.lang])}</a></p>` : ''}
    ${r.exhibitions?.length ? `<h2 style="margin-top:36px;font-size:1.3rem">${esc(t('doc.inExhibitions'))}</h2><div class="row">${r.exhibitions.map((e) => `<a class="chip" href="${L('exhibitions/' + e.slug)}">${icon('image', 'sr-hide')}${esc(tr(e.title))}</a>`).join('')}</div>` : ''}
    ${ann?.related?.length ? `<h2 style="margin-top:36px">${esc(t('doc.related'))} <span class="tag tag-accent">${icon('sparkle')}${esc({ ru: 'рекомендации', kz: 'ұсыныстар', en: 'recommended' }[S.lang])}</span></h2><div class="grid g2">${ann.related.map((x) => `<a class="doc-card" href="${L('catalog/' + x.id)}"><div class="thumb">${x.type === 'photo' ? `<img src="${fileUrl(x.id, 1, true)}" alt="" loading="lazy">` : icon(typeIcon(x.type))}</div><div><span class="cipher">${esc(x.cipher)}</span><h3 style="margin-top:6px">${esc(tr(x.title))}</h3></div></a>`).join('')}</div>
      <p class="small muted" style="margin-top:8px">${esc({ ru: 'Рекомендации строятся по тематике и месту, без персонализации и истории просмотров.', kz: 'Ұсыныстар тақырып пен орын бойынша, жекелендірусіз құрылады.', en: 'Recommendations are based on subject and place, without personalisation.' }[S.lang])}</p>` : ''}
    ${commentsHtml('record', String(r.id))}
  </div>`;

  return {
    title: tr(r.title), html,
    after(root) {
      root.querySelector('[data-copy]').onclick = () => copy(r.cipher, t('doc.copied'));
      root.querySelector('[data-share]').onclick = () => share(tr(r.title), location.href);
      root.querySelector('[data-favbtn]').onclick = (e) => {
        const f = store.get('favs', []); const on = !f.includes(r.id);
        store.set('favs', on ? [...f, r.id] : f.filter((x) => x !== r.id));
        const b = e.currentTarget; b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = on ? t('doc.faved') : t('doc.fav');
      };
      mountComments(root);
      if (!a.digital) return;
      let pg = 1, z = 1; const img = root.querySelector('[data-img]');
      const upd = () => { img.style.transform = `scale(${z})`; root.querySelector('[data-stage]').style.cursor = z > 1 ? 'zoom-out' : 'zoom-in'; };
      root.querySelectorAll('[data-vp]').forEach((b) => { b.onclick = () => { pg = Math.min(a.pages, Math.max(1, pg + +b.dataset.vp)); img.src = fileUrl(r.id, pg); img.alt = `${tr(r.title)} — ${t('doc.page')} ${pg}`; root.querySelector('[data-pg]').textContent = `${pg} / ${a.pages}`; z = 1; upd(); }; });
      root.querySelectorAll('[data-vz]').forEach((b) => { b.onclick = () => { z = b.dataset.vz === 'in' ? Math.min(3, z + 0.5) : Math.max(1, z - 0.5); upd(); }; });
      const full = () => lightbox(Array.from({ length: a.pages }, (_, i) => ({ src: fileUrl(r.id, i + 1), title: `${tr(r.title)}`, caption: `${r.cipher} · ${t('doc.page')} ${i + 1}` })), pg - 1);
      root.querySelector('[data-vfull]').onclick = full;
      root.querySelector('[data-stage]').onclick = full;
    },
  };
}
