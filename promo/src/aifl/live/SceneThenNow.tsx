// «Тогда и сейчас» — адаптация demos/data/before-after-slider-scrub (BeforeAfterSliderScrub.tsx).
// Сохранены тайминги и «критичные параметры» карточки: 4f замаха назад, 12f рывок с перелётом до 76 %, 12f отскок к 70 %,
// пауза, медленный проход 48f до 40 % (≈5:1 к рывку), ≥40f настоящего покоя; граница раскрытия
// идёт ровно по ручке (clip-path inset), ручка тянется по скорости и смазывается в рывке.
// Отличия: вместо FakeDashboard — гравюра 1891 г. («тогда», базовый слой) и фото сегодняшнего
// Усть-Каменогорска («сейчас», раскрывается слева от ручки); метки и цвета — токены сайта.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { DISPLAY, MONO_FONT } from '../fonts';
import { EASE, Grain, SpeedBlur, mix, ramp, softShadow, velocity } from '../Polish';

export const THEN_NOW_DURATION = 150;

const PRE = 10;
const T0 = 14;
const FLING = 26;
const BOUNCE = 38;
const HOLD = 56;
const SCRUB = 104;

const posAt = (f: number): number => {
  if (f < T0) return mix(8, 6.5, ramp(f, PRE, T0 - PRE, EASE.smooth));
  if (f < FLING) return mix(6.5, 76, ramp(f, T0, FLING - T0, EASE.out));
  if (f < BOUNCE) return mix(76, 70, ramp(f, FLING, BOUNCE - FLING, EASE.smooth));
  if (f < HOLD) return 70;
  return mix(70, 40, ramp(f, HOLD, SCRUB - HOLD, EASE.smooth));
};

const W = 1920;
const H = 1080;
const INK = '#151515';
const PAPER = '#EFE8DA';
const GREEN = '#7CF29A';

export const SCENE_THEN_NOW_DEFAULTS = {
  thenLabel: '1891 · гравюра',
  nowLabel: 'Сегодня · фото',
  place: 'Усть-Каменогорск',
};

const Tag: React.FC<{ label: string; x: number; dark?: boolean }> = ({ label, x, dark }) => (
  <div
    style={{
      position: 'absolute', left: x, top: 54, height: 48, padding: '0 22px 0 18px',
      display: 'flex', alignItems: 'center', gap: 12,
      background: dark ? INK : 'rgba(251,248,241,0.94)', color: dark ? PAPER : INK,
      border: `1.5px solid ${INK}`, boxShadow: `5px 5px 0 rgba(21,21,21,${dark ? 0.35 : 0.18})`,
      fontFamily: MONO_FONT, fontSize: 22, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}
  >
    <span style={{ width: 10, height: 10, borderRadius: 5, background: dark ? GREEN : INK, boxShadow: dark ? `0 0 10px ${GREEN}` : 'none' }} />
    {label}
  </div>
);

// фото заполняет кадр целиком (cover) и очень медленно «дышит» — одинаково в обоих слоях
const Photo: React.FC<{ src: string; filter?: string; frame: number }> = ({ src, filter, frame }) => (
  <Img
    src={staticFile(`textures/live/${src}`)}
    style={{
      position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover',
      transform: `scale(${1.0 + 0.012 * ramp(frame, 0, THEN_NOW_DURATION, EASE.linear)})`, // почти без увеличения: гравюра 1600px
      filter,
    }}
  />
);

export const SceneThenNow: React.FC<Partial<typeof SCENE_THEN_NOW_DEFAULTS>> = (props) => {
  const { thenLabel, nowLabel, place } = { ...SCENE_THEN_NOW_DEFAULTS, ...props };
  const frame = useCurrentFrame();
  const p = posAt(frame);
  const x = (p / 100) * W;
  const vx = velocity((f) => (posAt(f) / 100) * W, frame);
  const speed = Math.abs(vx);
  const squish = 1 + Math.min(speed / 110, 1) * 0.18;
  const press = 1 - 0.06 * Math.sin(Math.PI * ramp(frame, PRE, FLING - PRE, EASE.linear));
  const placeIn = ramp(frame, 60, 14, EASE.smooth);

  return (
    <AbsoluteFill style={{ background: PAPER, overflow: 'hidden' }}>
      {/* «тогда»: гравюра 1891 г. в сепию бумаги сайта */}
      <Photo src="uk-1891.jpg" frame={frame} filter="sepia(0.35) contrast(1.05) brightness(1.02)" />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(239,232,218,0.10), rgba(239,232,218,0.22))' }} />
      <Tag label={thenLabel} x={W - 470} />

      {/* «сейчас»: раскрывается слева от ручки, метка живёт в этом слое и режется вместе с ним */}
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${W - x}px 0 0)` }}>
        <Photo src="uk-panorama.jpg" frame={frame} />
        <Tag label={nowLabel} x={72} dark />
      </div>

      <div style={{ position: 'absolute', left: x - 24, top: 0, width: 24, height: H, background: 'linear-gradient(90deg, rgba(21,21,21,0), rgba(21,21,21,0.10))' }} />

      <SpeedBlur vx={vx} amount={0.12} max={14}>
        <div style={{ position: 'absolute', left: x - 1.5, top: 0, width: 3, height: H, background: PAPER, boxShadow: `0 0 0 1px rgba(21,21,21,0.25), 0 0 22px rgba(21,21,21,0.3)` }} />
        <div
          style={{
            position: 'absolute', left: x - 40, top: H / 2 - 40, width: 80, height: 80, borderRadius: 40,
            background: PAPER, border: `2px solid ${INK}`,
            boxShadow: `inset 0 1px 0 #fff, ${softShadow(14 + Math.min(speed / 8, 18))}`,
            transform: `scale(${press * squish}, ${press})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
          }}
        >
          <svg width={38} height={22} viewBox="0 0 36 20" style={{ display: 'block' }}>
            <path d="M11 3 L4 10 L11 17" fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
            <path d="M25 3 L32 10 L25 17" fill="none" stroke={INK} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </SpeedBlur>

      {/* название места: появляется в паузе после рывка и остаётся до конца */}
      <div
        style={{
          position: 'absolute', left: 72, bottom: 176, padding: '14px 24px',
          background: 'rgba(21,21,21,0.86)', color: PAPER,
          fontFamily: DISPLAY, fontWeight: 800, fontSize: 52, letterSpacing: '-0.03em',
          opacity: placeIn, transform: `translateY(${(1 - placeIn) * 18}px)`,
        }}
      >
        {place}
      </div>

      <Grain opacity={0.04} />
    </AbsoluteFill>
  );
};
