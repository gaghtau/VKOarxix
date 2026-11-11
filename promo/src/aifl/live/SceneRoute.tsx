// Маршрут на карте филиалов. Точной карточки в библиотеке нет — сцена собрана из проверенных
// деталей шаблона: PageCam (2.5D-камера над настоящим снимком страницы), «подъём и посадка» элемента
// с жёсткой тенью (как у записки-героя) и шов-подсветка при посадке (row-embed).
// Линия маршрута рисуется по 61 точке, снятой с настоящей SVG-линии Leaflet (live-layout.json),
// поэтому она ложится ровно на улицы снимка без маршрута.
import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { PageCam, CamKey } from './PageCam';
import layout from '../live-layout.json';

export const ROUTE_DURATION = 140;

const B = layout.branches;
const PTS = B.route as number[][];
const SUM = B.sum!;
const START = PTS[0];
const END = PTS[PTS.length - 1];
const minX = Math.min(...PTS.map((p) => p[0]));
const maxX = Math.max(...PTS.map((p) => p[0]));
const minY = Math.min(...PTS.map((p) => p[1]));
const maxY = Math.max(...PTS.map((p) => p[1]));
const RCX = (minX + maxX) / 2;
const RCY = (minY + maxY) / 2;

// обзор страницы → мягкий подъезд к маршруту; карточка филиала остаётся слева в кадре
const CAM: CamKey[] = [
  { frame: 0, cx: 1100, cy: 460, zoom: 1.2 }, // 1600×900 видимой области внутри снимка 1920×920
  { frame: 16, cx: 1100, cy: 460, zoom: 1.2 },
  // правый край кадра не заходит за край карты (x = map.x + map.w): центр сдвинут влево, карточка филиала слева в кадре
  { frame: 76, cx: B.map.x + B.map.w - 960 / 1.62 - 8, cy: RCY + 30, zoom: 1.62 },
  { frame: ROUTE_DURATION, cx: B.map.x + B.map.w - 960 / 1.64 - 8, cy: RCY + 32, zoom: 1.64 },
];

const DRAW_FROM = 20;
const DRAW_TO = 70;
const INK = '#151515';
const LINE = '#F2EEE6';
const GREEN = '#7CF29A';

// плашка «км · мин» садится рядом с концом маршрута
const SUM_AT = { x: Math.min(END[0] - SUM.w * 0.5, 1500 - SUM.w), y: maxY + 46 };

export const SceneRoute: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [DRAW_FROM, DRAW_TO], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.45, 0, 0.25, 1),
  });
  const startPop = interpolate(frame, [12, 22], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 1.4, 0.4, 1),
  });
  // финиш: кольцо-импульс у главного здания в момент, когда линия до него дошла
  const ring = interpolate(frame, [DRAW_TO - 2, DRAW_TO + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // плашка: подъём 80→92 (перелёт), висит, садится 110→120 с поджатием
  const rise = interpolate(frame, [80, 92], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 1.25, 0.3, 1) });
  const seat = interpolate(frame, [110, 120], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 0.3, 1.05) });
  const lift = rise * (1 - seat);
  const seam = interpolate(frame, [119, 124, 132], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pts = PTS.map((p) => p.join(',')).join(' ');
  const fadeOut = interpolate(frame, [ROUTE_DURATION - 6, ROUTE_DURATION], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ backgroundColor: '#EFE8DA', opacity: fadeOut }}>
      <PageCam src="textures/live/branches-noroute.png" pageH={B.pageH} keys={CAM} ease={Easing.bezier(0.33, 0, 0.15, 1)}>
        <svg width={1920} height={B.pageH} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
          <polyline points={pts} fill="none" stroke={INK} strokeWidth={9} strokeOpacity={0.88} strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
          <polyline points={pts} fill="none" stroke={LINE} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
            pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
          {/* финишное кольцо */}
          {false && ring > 0 && ring < 1 ? (
            <circle cx={END[0]} cy={END[1]} r={10 + 34 * ring} fill="none" stroke={INK} strokeWidth={2.5} opacity={1 - ring} />
          ) : null}
        </svg>
        {/* старт: зелёная точка, как на сайте */}
        <div style={{
          position: 'absolute', left: START[0] - 11, top: START[1] - 11, width: 22, height: 22, borderRadius: 11,
          background: GREEN, border: `3px solid ${INK}`, boxShadow: `0 0 0 ${4 * startPop}px rgba(124,242,154,0.35)`,
          transform: `scale(${startPop})`, boxSizing: 'border-box',
        }} />
        {/* плашка с итогом маршрута */}
        {rise > 0 ? (
          <div style={{ position: 'absolute', left: SUM_AT.x, top: SUM_AT.y, width: SUM.w, height: SUM.h, transformStyle: 'preserve-3d' }}>
            <div style={{
              position: 'absolute', inset: 0,
              transform: `translateY(${-30 * lift - (1 - rise) * 24}px) scale(${1 + 0.06 * lift})`,
              opacity: Math.min(1, rise * 1.6),
              boxShadow: `${6 + 10 * lift}px ${6 + 14 * lift}px 0 rgba(21,21,21,${0.16 + 0.1 * lift})`,
            }}>
              <Img src={staticFile('textures/live/route-sum.png')} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>
            {seam > 0 ? <div style={{ position: 'absolute', left: (SUM.w * (1 - seam)) / 2, top: SUM.h - 2, width: SUM.w * seam, height: 3, background: GREEN, boxShadow: `0 0 8px ${GREEN}` }} /> : null}
          </div>
        ) : null}
      </PageCam>
    </AbsoluteFill>
  );
};
