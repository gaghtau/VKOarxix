// Переназначение времени сцены (для монтажа под музыку): сцены написаны в своих «внутренних» кадрах
// (тайминги карточек), а на линейке им отводится целое число долей. TimeMap переводит реальный кадр
// последовательности во внутренний по кусочно-линейной таблице — например, логотип в обычном темпе,
// а подъезд камеры быстрее. Дробные кадры допустимы: interpolate() гладко работает с ними.
import React, { createContext, useContext } from 'react';
import { useCurrentFrame } from 'remotion';

export type Knots = [number, number][]; // [реальный кадр, внутренний кадр], по возрастанию

const Ctx = createContext<Knots | null>(null);

export const mapFrame = (f: number, k: Knots): number => {
  if (f <= k[0][0]) return k[0][1] + (f - k[0][0]);
  for (let i = 0; i < k.length - 1; i++) {
    const [r0, s0] = k[i], [r1, s1] = k[i + 1];
    if (f <= r1) return s0 + ((f - r0) / (r1 - r0)) * (s1 - s0);
  }
  const [rl, sl] = k[k.length - 1];
  return sl + (f - rl);
};

export const TimeMap: React.FC<{ knots: Knots; children: React.ReactNode }> = ({ knots, children }) =>
  <Ctx.Provider value={knots}>{children}</Ctx.Provider>;

/** Кадр сцены во «внутреннем» времени: без TimeMap совпадает с useCurrentFrame(). */
export const useSceneFrame = (): number => {
  const f = useCurrentFrame();
  const k = useContext(Ctx);
  return k ? mapFrame(f, k) : f;
};
