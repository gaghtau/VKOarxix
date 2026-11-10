import { S, t, esc, L, api, store, accessTag } from './core.js';
import { icon } from './icons.js';

// Рендер ответа помощника: текст, найденные записи со ссылками-источниками, пометка «автоматически»
export function renderAnswer(r) {
  const results = (r.results || []).map((x) => `<a href="${L('catalog/' + x.id)}"><b>${esc(x.title)}</b><br><span class="cipher">${esc(x.cipher)}</span> · ${esc(String(x.year))}</a>`).join('');
  const sources = !r.results?.length && r.sources?.length ? r.sources.map((s) => `<a href="${esc(s.url)}" ${s.external ? 'target="_blank" rel="noopener"' : ''}>${icon(s.external ? 'ext' : 'link', 'sr-hide')}${esc(s.title)}${s.external ? ' ↗' : ''}</a>`).join('') : '';
  const kindTag = { found: '<span class="tag tag-ok">' + icon('check') + 'источник найден</span>', none: '<span class="tag tag-warn">' + icon('info') + 'нет материалов</span>', restricted: '<span class="tag tag-danger">' + icon('lock') + 'ограниченный доступ</span>' }[r.kind] || '';
  return `<div>${S.lang === 'ru' ? kindTag : ''}${r.understood?.length ? `<div class="small muted" style="margin:6px 0">${esc(t('ai.understood'))}: ${esc(r.understood.join(' · '))}</div>` : ''}<p style="margin:6px 0 0">${esc(r.answer)}</p>
  ${results || sources ? `<div class="src">${results}${sources}</div>` : ''}
  ${r.catalogUrl ? `<a class="btn btn-sm" style="margin-top:10px" href="${esc(r.catalogUrl)}">${icon('search')}${esc(t('ai.toCatalog'))}</a>` : ''}
  <div class="auto">${icon('sparkle')}<span>${esc(r.auto || t('ai.auto'))}</span></div></div>`;
}

export async function ask(q) {
  return api('/api/assistant', { method: 'POST', body: { q, lang: S.lang } });
}

export function initAssistant() {
  document.querySelector('.assist-fab')?.remove(); document.querySelector('.assist')?.remove();
  const fab = document.createElement('button');
  fab.className = 'assist-fab'; fab.type = 'button'; fab.setAttribute('aria-haspopup', 'dialog');
  fab.innerHTML = `${icon('sparkle')}<span>${esc(t('ai.open'))}</span>`;
  const box = document.createElement('section');
  box.className = 'assist'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', t('ai.title'));
  const history = store.get('assist-log', []);
  box.innerHTML = `<div class="assist-head"><span class="av">${icon('bot')}</span><div><b>${esc(t('ai.title'))}</b><small>${esc(t('ai.sub'))}</small></div><button type="button" data-x aria-label="${esc(t('close'))}">${icon('x')}</button></div>
    <div class="assist-log" aria-live="polite"><div class="msg bot">${esc(t('ai.hello'))}</div></div>
    <div class="assist-sugg">${t('ai.examples').slice(0, 4).map((e) => `<button class="chip" type="button" data-ex>${esc(e)}</button>`).join('')}</div>
    <form class="assist-form"><label class="sr-only" for="aq">${esc(t('ai.ph'))}</label><input id="aq" class="input" placeholder="${esc(t('ai.ph'))}" autocomplete="off" maxlength="400"><button class="btn btn-accent" aria-label="${esc(t('ai.send'))}">${icon('send')}</button></form>
    <p class="small muted" style="margin:0;padding:0 12px 10px;background:var(--surface)">${esc(t('ai.engine'))}</p>`;
  document.body.append(fab, box);
  const log = box.querySelector('.assist-log');
  const add = (cls, html) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html; log.append(d); log.scrollTop = log.scrollHeight; return d; };
  history.slice(-6).forEach((h) => add(h.me ? 'me' : 'bot', h.html));
  const open = () => { box.classList.add('open'); fab.hidden = true; box.querySelector('input').focus(); };
  const close = () => { box.classList.remove('open'); fab.hidden = false; fab.focus(); };
  fab.onclick = open; box.querySelector('[data-x]').onclick = close;
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  box.addEventListener('click', (e) => { if (e.target.closest('a[href^="/"]')) close(); });
  const send = async (q) => {
    if (!q.trim()) return;
    const me = esc(q); add('me', me);
    const wait = add('bot', '<span class="typing"><i></i><i></i><i></i></span>');
    try { const r = await ask(q); wait.innerHTML = renderAnswer(r); }
    catch { wait.innerHTML = `<p style="margin:0">${esc(t('ai.error'))}</p>`; }
    log.scrollTop = log.scrollHeight;
    store.set('assist-log', [...store.get('assist-log', []), { me: 1, html: me }, { html: wait.innerHTML }].slice(-12));
  };
  box.querySelector('form').onsubmit = (e) => { e.preventDefault(); const i = box.querySelector('input'); send(i.value); i.value = ''; };
  box.querySelector('.assist-sugg').onclick = (e) => { const b = e.target.closest('[data-ex]'); if (b) send(b.textContent); };
  S.openAssistant = (q) => { open(); if (q) send(q); };
}
