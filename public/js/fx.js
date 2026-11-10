// Анимации на GSAP (ScrollTrigger + SplitText): по мотивам free-gsap-effects и museum-of-animation.
// Включение экрана монитора, «печать» заголовка, маска строк, падение записок на стол,
// закреплённая горизонтальная лента, подсветка текста при прокрутке, раскрытие фото, рельс глав,
// шторка между страницами. Без GSAP или при «Без анимации» / «Удобном чтении» всё видно сразу.
let ctx = null, splits = [], guards = [];
const gs = () => window.gsap;
const D = () => document.documentElement.dataset;
export const fxEnabled = () => !!(gs() && window.ScrollTrigger) && !D().motion && !D().reading && !D().contrast;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function killFx() {
  splits.forEach((s) => s.revert?.()); splits = [];
  guards.forEach(clearInterval); guards = [];
  ctx?.revert(); ctx = null; window.__reelGoto = null;
  window.ScrollTrigger?.clearScrollMemory?.('manual');
}

// Шторка между страницами (короткая; не задерживает навигацию дольше 0,5 с)
export async function curtain(run, label = '') {
  if (!fxEnabled()) return run();
  const gsap = gs();
  // При системной настройке «уменьшить движение» — мягкое затемнение вместо выезда шторки
  if (reduce()) {
    let f = document.querySelector('.curtain-fade');
    if (!f) { f = document.createElement('div'); f.className = 'curtain-fade'; f.setAttribute('aria-hidden', 'true'); document.body.append(f); }
    await Promise.race([gsap.to(f, { opacity: 1, duration: 0.18 }).then(), sleep(260)]);
    await run();
    gsap.to(f, { opacity: 0, duration: 0.3 });
    return;
  }
  let el = document.querySelector('.curtain');
  if (!el) { el = document.createElement('div'); el.className = 'curtain'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<span></span>'; document.body.append(el); }
  el.querySelector('span').textContent = label;
  await Promise.race([gsap.fromTo(el, { yPercent: 100 }, { yPercent: 0, duration: 0.28, ease: 'power2.in' }).then(), sleep(360)]);
  await run();
  gsap.to(el, { yPercent: -100, duration: 0.42, ease: 'power3.out', delay: 0.04 });
}

export function initFx(root) {
  killFx();
  if (!fxEnabled()) return;
  const gsap = gs(); const { ScrollTrigger, SplitText } = window;
  gsap.registerPlugin(ScrollTrigger, ...(SplitText ? [SplitText] : []));
  const soft = reduce();
  const tweens = [];
  ctx = gsap.context(() => {
    // 1) Монитор: появление, «включение» экрана, печать заголовка
    const crt = root.querySelector('[data-crt]');
    if (crt) {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from(crt, { y: soft ? 0 : 60, opacity: 0, duration: 0.8 })
        .from(crt.querySelector('.crt-screen'), { scaleY: soft ? 1 : 0.02, filter: 'brightness(3)', duration: 0.55, ease: 'power4.out' }, '-=0.35');
      const h = crt.querySelector('h1');
      if (h && SplitText) {
        const st = new SplitText(h, { type: 'words,chars', wordsClass: 'wd', charsClass: 'ch' }); splits.push(st);
        tl.from(st.chars, { opacity: 0, duration: 0.01, stagger: 0.045, ease: 'none' }, '-=0.1');
      }
      tl.from(crt.querySelectorAll('.crt-in > .mlabel, .crt-search, .crt-hint'), { y: 14, opacity: 0, stagger: 0.1, duration: 0.5 }, '-=0.2');
      tweens.push(tl);
    }

    // 2) Заголовки: строки поднимаются из-под маски
    if (SplitText) root.querySelectorAll('[data-split], .page-head h1').forEach((h) => {
      const st = new SplitText(h, { type: 'lines', linesClass: 'split-line', mask: 'lines' }); splits.push(st);
      tweens.push(gsap.from(st.lines, { yPercent: soft ? 0 : 105, opacity: soft ? 0 : 1, duration: 0.9, stagger: 0.08, ease: 'power4.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } }));
    });

    // 3) Записки «падают» на стол с поворотом
    const notes = root.querySelectorAll('[data-board] .note');
    if (notes.length) tweens.push(gsap.from(notes, { y: soft ? 0 : -90, rotation: soft ? 0 : (i) => (i % 2 ? 9 : -9), opacity: 0, duration: 0.9, ease: 'back.out(1.5)', stagger: 0.09, clearProps: 'transform', scrollTrigger: { trigger: root.querySelector('[data-board]'), start: 'top 78%', once: true } }));

    // 4) Лента портретов: закрепление и горизонтальная прокрутка (на широком экране)
    const reelWrap = root.querySelector('[data-reel]');
    if (reelWrap && innerWidth >= 1000 && !D().fs) {
      const track = reelWrap.querySelector('.reel-track'); const section = reelWrap.closest('section');
      const count = root.querySelector('[data-reel-count]'); const n = track.children.length;
      const dist = () => Math.max(0, track.scrollWidth - reelWrap.clientWidth + 40);
      const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (self) => { const i = Math.round(self.progress * (n - 1)); if (count) count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`; } } });
      window.__reelGoto = (i) => { const st = tw.scrollTrigger; window.scrollTo({ top: st.start + (st.end - st.start) * (i / Math.max(1, n - 1)), behavior: 'smooth' }); };
      tweens.push(gsap.from(track.children, { y: 60, opacity: 0, stagger: 0.06, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: section, start: 'top 70%', once: true } }));
    }

    // 5) Тезис: слова проявляются по мере прокрутки
    root.querySelectorAll('[data-highlight]').forEach((p) => {
      if (!SplitText) return;
      const st = new SplitText(p, { type: 'words', wordsClass: 'w' }); splits.push(st);
      gsap.fromTo(st.words, { opacity: 0.14 }, { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true } });
    });

    // 6) Фото раскрываются «шторкой» снизу вверх
    root.querySelectorAll('[data-clip], .fig > img, .fig-zoom, .tile .img, .poster img').forEach((el) => {
      if (el.closest('[data-reel]') && innerWidth >= 1000) return;
      tweens.push(gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: soft ? 0.4 : 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
    });

    // 7) Карточки на внутренних страницах — партиями
    const cards = root.querySelectorAll('.doc-card, .news-card, .card-link, .tile, .icard, .cm-card, .tl-item, details.faq');
    if (cards.length) {
      gsap.set(cards, { opacity: 0, y: soft ? 0 : 26 });
      ScrollTrigger.batch(cards, { start: 'top 92%', once: true, onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06, overwrite: true }) });
      guards.push(setInterval(() => cards.forEach((c) => { if (+getComputedStyle(c).opacity < 0.05 && c.getBoundingClientRect().top < innerHeight) gsap.set(c, { opacity: 1, y: 0 }); }), 2500));
    }

    // 8) Рельс глав и счётчик в углу
    const rail = root.querySelectorAll('.d-rail a'); const counter = root.querySelector('[data-count]'); const next = root.querySelector('[data-next]');
    root.querySelectorAll('section[id^="ch"]').forEach((sec, i, all) => {
      ScrollTrigger.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => {
        if (!s.isActive) return;
        rail.forEach((a, k) => a.setAttribute('aria-current', k === i ? 'true' : 'false'));
        if (counter) counter.textContent = String(i + 1).padStart(2, '0');
        if (next) { const nx = all[i + 1]; next.style.visibility = nx ? 'visible' : 'hidden'; if (nx) next.setAttribute('href', '#' + nx.id); }
      } });
    });
  }, root);

  // Страховка: если анимация не запустилась (фоновая вкладка и т. п.), показываем содержимое
  guards.push(setInterval(() => tweens.forEach((tw) => {
    const st = tw.scrollTrigger;
    if (tw.progress() < 1 && (!st || st.start <= scrollY + innerHeight) && document.visibilityState !== 'visible') tw.progress(1);
  }), 1500));
  setTimeout(() => tweens.forEach((tw) => { const st = tw.scrollTrigger; if (tw.progress() === 0 && (!st || st.start < scrollY + innerHeight * 0.9)) tw.progress(1); }), 4000);
  // Пересчёт после отрисовки. ScrollTrigger помнит прокрутку прошлой страницы и при refresh()
  // возвращает её — поэтому запоминаем текущую позицию сами и восстанавливаем именно её.
  requestAnimationFrame(() => {
    const y = scrollY;
    ScrollTrigger.clearScrollMemory?.('manual');
    ScrollTrigger.refresh();
    if (Math.abs(scrollY - y) > 2) window.scrollTo(0, y);
  });
}
