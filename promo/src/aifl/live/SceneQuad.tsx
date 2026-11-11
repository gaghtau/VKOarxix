// «Ещё на сайте» — адаптация demos/rhythm/quad-split-parallel-scenes (QuadSplitParallelScenes.tsx).
// Сохранено расписание событий карточки (это и есть её рецепт): TL — 0–40 набор, 44 «загрузка»,
// весь кадр медленный inQuad-наезд 1→1.1; TR — 0–24 набор, 27/33 строки, 37 последняя строка +
// 37–47 рывок-наезд 1→1.85 с sin-размытием (самый сильный удар — на долю музыки); BL — слова 14/30/49
// с перелётом; BR — 4–14 появление, 25 клик, 27 отметка, 38–50 перелёт курсора, 52 клик, 56 плашка.
// Соседние сильные события разведены на ≥3 кадра (BL 17/31/47, BR отметка 30, второй перелёт 41);
// мигания курсоров 16f и 14f+5 в разной фазе.
// Перекраска под сайт: бумага / чернила / зелёный / тёплый серый — шахматный порядок яркости;
// TL и BR — настоящие снимки сайта (помощник, выставки), TR и BL — типографика.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { useSceneFrame } from '../timemap';
import { DISPLAY, MONO_FONT, UI_FONT } from '../fonts';
import { EASE, Grain, mix, ramp } from '../Polish';

export const QUAD_DURATION = 90;

const PAPER = '#FBF8F1';
const DESK = '#EFE8DA';
const INK = '#151515';
const GREEN = '#1F3D2B';
const SIGNAL = '#7CF29A';
const LATTE = '#E6DECD';

const G = 8;
const QW = (1920 - 3 * G) / 2;
const QH = (1080 - 3 * G) / 2;
const QUADS = [
  { x: G, y: G }, { x: 2 * G + QW, y: G }, { x: G, y: 2 * G + QH }, { x: 2 * G + QW, y: 2 * G + QH },
];

const blink = (f: number, period: number, phase = 0) => (Math.floor((f + phase) / (period / 2)) % 2 === 0 ? 1 : 0);
const typed = (s: string, f: number, a: number, b: number) => s.slice(0, Math.floor(ramp(f, a, b - a, EASE.linear) * s.length));
const mono = (size: number, weight = 500): React.CSSProperties => ({ fontFamily: MONO_FONT, fontSize: size, fontWeight: weight, whiteSpace: 'pre' });

const Corner: React.FC<{ n: string; label: string; color: string }> = ({ n, label, color }) => (
  <div style={{ position: 'absolute', left: 34, top: 24, ...mono(30, 700), letterSpacing: '0.18em', textTransform: 'uppercase', color }}>{n} — {label}</div>
);

// ── TL: ИИ-помощник — вопрос набирается, в 44 «приходит» настоящий ответ со страницы сайта ──
const Q = 'Где документы о деде?';
const QuadTL: React.FC<{ f: number }> = ({ f }) => {
  const push = mix(1, 1.1, Math.pow(Math.min(1, f / 90), 2));
  const load = ramp(f, 44, 14, EASE.snappy);
  return (
    <div style={{ position: 'absolute', inset: 0, background: PAPER }}>
      <div style={{ position: 'absolute', left: 70, top: 92, width: QW - 140, transform: `scale(${push})`, transformOrigin: '50% 90%' }}>
        <div style={{ height: 70, border: `2px solid ${INK}`, background: '#fff', display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14, boxShadow: '6px 6px 0 rgba(21,21,21,0.14)' }}>
          <span style={{ ...mono(34, 700), color: GREEN }}>✦</span>
          <span style={{ fontFamily: UI_FONT, fontSize: 34, fontWeight: 600, color: INK }}>{typed(Q, f, 0, 40)}</span>
          <span style={{ width: 3, height: 38, background: INK, opacity: f < 44 ? blink(f, 16) : 0, marginLeft: -8 }} />
        </div>
        <div style={{ height: 6, background: GREEN, width: `${load * 100}%`, opacity: 1 - ramp(f, 56, 6, EASE.linear), marginTop: 14 }} />
        <div style={{ overflow: 'hidden', marginTop: 10, height: 250 }}>
          {/* ответ помощника крупно: те же находки, что выдаёт сайт на этот вопрос (см. quad-assistant.png) */}
          <div style={{ transform: `translateY(${(1 - load) * 260}px)`, display: 'grid', gap: 12 }}>
            {[['Ф.1466. Оп.3', 'Куленов А. С.'], ['Ф.77. Оп.1', 'Бердус И. В.'], ['46', 'материалов найдено']].map(([a, b], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', background: i === 2 ? GREEN : DESK, color: i === 2 ? DESK : INK }}>
                <span style={{ ...mono(32, 700), color: i === 2 ? SIGNAL : GREEN }}>{a}</span>
                <span style={{ fontFamily: UI_FONT, fontSize: 32, fontWeight: 600 }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Corner n="01" label="ИИ-помощник" color="#6A6458" />
    </div>
  );
};

// ── TR: доступность — «консоль настроек», рывок-наезд на последней строке ──
const QuadTR: React.FC<{ f: number }> = ({ f }) => {
  const zip = ramp(f, 37, 10, EASE.smooth);
  const zoom = mix(1, 1.85, zip);
  const blur = 5 * Math.sin(Math.PI * zip);
  const old = 1 - zip; // строки выше уходят полностью — не вылезают за край при наезде
  const line = (at: number) => ramp(f, at, 5, EASE.out);
  return (
    <div style={{ position: 'absolute', inset: 0, background: INK, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 80, top: 104, width: 800, transform: `translateY(${(-40 * zip).toFixed(2)}px) scale(${zoom})`, transformOrigin: '0px 230px', filter: blur > 0.2 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
        <div style={{ ...mono(38), color: DESK, opacity: old }}>
          <span style={{ color: SIGNAL }}>&gt; </span>{typed('для слабовидящих', f, 0, 24)}
          <span style={{ display: 'inline-block', width: 20, height: 40, verticalAlign: '-6px', background: DESK, opacity: f < 27 ? blink(f, 14, 5) : 0 }} />
        </div>
        <div style={{ ...mono(32), color: '#A79F8E', marginTop: 30, opacity: line(27) * old, transform: `translateX(${(1 - line(27)) * -16}px)` }}>
          <span style={{ color: SIGNAL }}>✓</span> фото отдельно
        </div>
        <div style={{ ...mono(32), color: '#A79F8E', marginTop: 14, opacity: line(33) * old, transform: `translateX(${(1 - line(33)) * -16}px)` }}>
          <span style={{ color: SIGNAL }}>✓</span> чтение вслух
        </div>
        <div style={{ ...mono(46, 700), color: DESK, marginTop: 34, opacity: line(37) }}>
          <span style={{ color: SIGNAL, textShadow: `0 0 18px ${SIGNAL}` }}>●</span> КРУПНЫЙ ТЕКСТ
        </div>
      </div>
      <Corner n="02" label="Доступность" color="#8C8678" />
    </div>
  );
};

// ── BL: три слова падают — зелёная плашка сайта ──
const WORDS: Array<[string, number]> = [['Ищи.', 17], ['Читай.', 31], ['Приходи.', 47]];
const QuadBL: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: 'absolute', inset: 0, background: GREEN }}>
    <div style={{ position: 'absolute', left: 64, top: 74 }}>
      {WORDS.map(([w, at], i) => {
        const s = Math.min(1, Math.max(0, (f - at) / 8));
        if (s <= 0) return <div key={w} style={{ height: 132 * 0.98 }} />;
        const y = (1 - EASE.overshoot(s)) * -70;
        const last = i === WORDS.length - 1;
        return (
          <div key={w} style={{ fontFamily: DISPLAY, fontSize: 128, fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.98, color: last ? SIGNAL : DESK, opacity: Math.min(1, s * 3), transform: `translateY(${y.toFixed(2)}px) scale(${mix(1.12, 1, EASE.snappy(s)).toFixed(4)})`, transformOrigin: '0% 100%' }}>{w}</div>
        );
      })}
    </div>
    <Corner n="03" label="Архив" color="#A9C2AF" />
  </div>
);

// ── BR: выставки — курсор кликает по двум выставкам, в конце плашка ──
const P_START: [number, number] = [860, 470];
const P_A: [number, number] = [250, 230];
const P_B: [number, number] = [590, 230];
const qBez = (a: number[], b: number[], c: number[], t: number): [number, number] => {
  const u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
};
const TILE_A = { x: 72, y: 96, w: 330, h: 296 };
const TILE_B = { x: 420, y: 96, w: 330, h: 296 };
const QuadBR: React.FC<{ f: number }> = ({ f }) => {
  const slide = ramp(f, 4, 10, EASE.snappy);
  const m1 = ramp(f, 14, 11, EASE.swift);
  const m2 = ramp(f, 41, 10, EASE.swift);
  const p = m2 > 0 ? qBez(P_A, [420, 180], P_B, m2) : qBez(P_START, [620, 520], P_A, m1);
  const press = (at: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, (f - at) / 5)));
  const markA = ramp(f, 30, 6, EASE.snappy);
  const markB = ramp(f, 54, 6, EASE.snappy);
  const toast = ramp(f, 56, 10, EASE.overshoot);
  // фрагмент страницы «Онлайн-выставки»: две первые выставки (снимок 1920×1080 @2x)
  const crop = (t: typeof TILE_A, sx: number, mark: number, pressAt: number) => (
    <div style={{ position: 'absolute', left: t.x, top: t.y, width: t.w, height: t.h, overflow: 'hidden', transform: `translateX(${(1 - slide) * -60}px) scale(${1 - 0.04 * press(pressAt)})`, opacity: slide, boxShadow: `6px 6px 0 rgba(21,21,21,${0.14 + 0.1 * mark})`, outline: mark > 0.5 ? `4px solid ${GREEN}` : 'none' }}>
      <div style={{ width: '100%', height: '100%', backgroundImage: `url(${staticFile('textures/live/quad-exhibitions.png')})`, backgroundSize: '1920px 1080px', backgroundPosition: `-${sx}px -264px` }} />
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, background: LATTE }}>
      {crop(TILE_A, 375, markA, 25)}
      {crop(TILE_B, 795, markB, 52)}
      {toast > 0 && (
        <div style={{ position: 'absolute', right: 52, bottom: 44, padding: '18px 26px', background: INK, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '8px 8px 0 rgba(21,21,21,0.25)', transform: `translateY(${(1 - toast) * 40}px) scale(${mix(0.85, 1, toast)})`, opacity: Math.min(1, toast * 2) }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: SIGNAL, boxShadow: `0 0 12px ${SIGNAL}` }} />
          <span style={{ fontFamily: UI_FONT, fontSize: 32, fontWeight: 600, color: DESK }}>Онлайн-выставки · без очереди</span>
        </div>
      )}
      {f >= 10 && f < 76 && (
        <svg width={34} height={46} viewBox="-1 -1 18 26" style={{ position: 'absolute', left: p[0], top: p[1], overflow: 'visible', opacity: ramp(f, 10, 4, EASE.out) * (1 - ramp(f, 68, 8, EASE.exit)), transform: `scale(${1 - 0.18 * Math.max(press(25), press(52))})`, transformOrigin: '0 0', filter: 'drop-shadow(0 3px 5px rgba(21,21,21,0.4))' }}>
          <path d="M0 0 L0 20.5 L4.9 15.9 L8.1 23.4 L11.4 22 L8.3 14.7 L14.8 14.7 Z" fill={INK} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
        </svg>
      )}
      <Corner n="04" label="Выставки" color="#6A6458" />
    </div>
  );
};

export const SceneQuad: React.FC = () => {
  const f = useSceneFrame();
  const scenes = [<QuadTL f={f} />, <QuadTR f={f} />, <QuadBL f={f} />, <QuadBR f={f} />];
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      {QUADS.map((q, i) => (
        <div key={i} style={{ position: 'absolute', left: q.x, top: q.y, width: QW, height: QH, overflow: 'hidden', borderRadius: 2 }}>{scenes[i]}</div>
      ))}
      <Grain opacity={0.05} blend="overlay" />
    </AbsoluteFill>
  );
};
