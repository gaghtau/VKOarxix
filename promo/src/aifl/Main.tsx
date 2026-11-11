import { useVisualTheme, themePaint, themeAsset } from '../themes/visual-theme';
import { AbsoluteFill, Audio, interpolate, Sequence } from 'remotion';
import { SceneOpen } from './live/SceneOpen';
import { SceneFlyIn } from './live/SceneFlyIn';
import { SceneDetail } from './live/SceneDetail';
import { ScenePapers } from './live/ScenePapers';
import { SceneThenNow } from './live/SceneThenNow';
import { SceneRoute } from './live/SceneRoute';
import { SceneQuad } from './live/SceneQuad';
import './fonts';
import { PaperTitleCard } from './PaperTitleCard';
import { SceneOutroLive } from './live/SceneOutroLive';
import { FlashCut } from './FlashCut';
import { Caption } from './Caption';
import { TimeMap, type Knots } from './timemap';

// ─────────────────────────── Музыка и сетка долей ───────────────────────────
// BGM: «House Vibez» (Lily J, Mixkit Stock Music Free License). Анализ: analysis/beat_data.json
// (librosa, references/music-beat-sync.md): 122.00 BPM, сетка match 98.1 %, ошибка 6.8 мс, дрейф 1.4 мс.
export const FPS = 30;
export const SOURCE_BEAT0 = 7.935632087211041; // t0 сетки в исходном треке, с (аудит, не менять)
export const BEAT_INT = 0.4917954637470821;    // T, с
export const MUSIC_FROM_BEAT = 80;             // ролик начинается с доли 80: спад, «дроп» на доле 112 = доля 32 ролика
export const MUSIC_TRIM_FRAMES = Math.floor((SOURCE_BEAT0 + MUSIC_FROM_BEAT * BEAT_INT) * FPS); // 1418
// доля 80 звучит через ~12.5 мс после начала ролика (остаток от обрезки на целый кадр)
const AUDIO_LEAD_SEC = SOURCE_BEAT0 + MUSIC_FROM_BEAT * BEAT_INT - MUSIC_TRIM_FRAMES / FPS;
// задержка AAC-дорожки в выводе (sound-design §4.6; подтверждена замером прошлого рендера)
export const OUTPUT_AUDIO_OFFSET_SEC = 1.28 / FPS;
export const beatT = (n: number) => AUDIO_LEAD_SEC + OUTPUT_AUDIO_OFFSET_SEC + n * BEAT_INT;
export const beatF = (n: number) => Math.round(beatT(n) * FPS);

// ─────────────────────────── Сцены (границы — целые доли) ───────────────────────────
const span = (a: number, b: number) => ({ from: a === 0 ? 0 : beatF(a), duration: beatF(b) - (a === 0 ? 0 : beatF(a)), beats: [a, b] as const });
export const AIFL_SHOTS = {
  morning: span(0, 14),   // логотип (в обычном темпе, ≥1 с покоя) → стол, записка-герой
  table: span(14, 26),    // колода личных фондов → поиск «Куленов» → клик
  macro: span(26, 32),    // справка о личности
  quad: span(32, 38),     // «дроп»: четыре экрана сразу — помощник, доступность, архив, выставки
  card2: span(38, 44),    // титр «Как город изменился за 130 лет?» — фраза целиком ≥1,5 с
  thennow: span(44, 52),  // шторка сегодня / 1891
  route: span(52, 60),    // маршрут на карте — с сильного удара доли 52
  chart: span(60, 68),    // прейскурант стопкой — с сильного удара доли 60
  outro: span(68, 78),    // финал: логотип собран на доле 72, затем покой
} as const;
export const AIFL_TOTAL = beatF(78);

const S = AIFL_SHOTS;
const local = (shot: { from: number }, beat: number) => beatF(beat) - shot.from;
// таблицы переназначения времени: [реальный кадр сцены, внутренний кадр карточки]
const KNOTS: Record<string, Knots> = {
  morning: [[0, 0], [84, 84], [S.morning.duration, 220]],              // логотип 1:1, дальше быстрее
  table: [[0, 0], [S.table.duration, 190]],
  macro: [[0, 0], [S.macro.duration, 100]],
  // нарезка начинается с внутреннего кадра 8 и идёт 1:1 до рывка (сохраняются интервалы ≥3f из карточки)
  quad: [[0, 8], [local(S.quad, 34) - 0, 8 + local(S.quad, 34)], [S.quad.duration, 90]],
  card2: [[0, 0], [30, 41], [S.card2.duration, 80]],                   // слова влетают за 1 с, дальше держатся
  thennow: [[0, 0], [local(S.thennow, 45), 26], [S.thennow.duration, 150]], // перелёт ручки (26) — на долю 45
  route: [[0, 0], [local(S.route, 59), 120], [S.route.duration, 140]],  // посадка плашки — на долю 59
  chart: [[0, 0], [S.chart.duration, 140]],
  outro: [[0, 0], [local(S.outro, 72), 62], [S.outro.duration, 145]],  // логотип собран — на долю 72
};

export const TITLE_CARDS = {
  card2: { text: 'Как город *изменился* за 130 лет?' },
} as const;

export const parseWords = (text: string): { text: string; accent?: boolean }[] =>
  text.split(/\s+/).filter(Boolean).map((w) => {
    const m = w.match(/^\*(.+)\*$/);
    return m ? { text: m[1], accent: true } : { text: w };
  });

// тёплые вспышки на жёстких стыках; самая сильная — на «дропе»
// не больше 3 вспышек на весь кадр и ≥16 долей между ними (music-beat-sync §4): доли 14, 32, 52
export const FLASH_CUTS = [S.table.from, S.quad.from, S.route.from];

export const sfxDuration = (s: { from: number; src: string; duration?: number }) => s.duration ?? 90;

// подписи по долям (на плашке, крупно); финал и нарезка без подписей
// bottom — отступ плашки снизу: справка и карта — сверху кадра, чтобы не закрывать кнопки и строки страницы
export const CAPTIONS: { from: number; duration: number; text: string; bottom?: number }[] = [
  { from: beatF(6), duration: beatF(10) - beatF(6), text: 'ГЛАВНАЯ · СТОЛ' },
  { from: beatF(16), duration: beatF(20) - beatF(16), text: 'ЛИЧНЫЕ ФОНДЫ АРХИВА' },
  { from: beatF(22), duration: beatF(26) - beatF(22), text: 'ПОИСК ПО ИМЕНИ' },
  { from: beatF(27), duration: beatF(31) - beatF(27), text: 'СПРАВКА И ШИФР ФОНДА', bottom: 930 },
  { from: beatF(47), duration: beatF(51) - beatF(47), text: 'ОДНО МЕСТО · 130 ЛЕТ' },
  { from: beatF(53), duration: beatF(59) - beatF(53), text: 'МАРШРУТ ПРЯМО НА КАРТЕ' },
  { from: beatF(61), duration: beatF(67) - beatF(61), text: 'ЦЕНЫ ПО ПОСТАНОВЛЕНИЮ № 289' },
];

// ─────────────────────────── Звуковые эффекты ───────────────────────────
// Freesound CC0 (public/audio/sfx/audio-manifest.json). При плотной музыке — только уникальные действия
// экрана (раздача, клавиатура, клик, маркер, посадки); «воздух» на камеру и титры отдан музыке.
// Пик звука ставится на кадр действия: from = цель − пик файла − задержка вывода.
const OUT_LAG = OUTPUT_AUDIO_OFFSET_SEC * FPS;
const PEAK: Record<string, number> = {
  'fs-701104.mp3': 15.2, 'fs-812686.mp3': 6.5, 'fs-389590.mp3': 2.9, 'fs-419341.mp3': 1.3,
  'fs-571577.mp3': 10.1, 'fs-787405.mp3': 11.2, 'fs-527726.mp3': 0, 'fs-687107.mp3': 4.3,
  'fs-444709-norm.mp3': 5.9, 'fs-321137-norm.mp3': 0, 'fs-859482.mp3': 68.6, 'fs-812752.mp3': 5.0, 'fs-759840.mp3': 8.2,
};
const at = (target: number, src: string, volume: number, duration?: number) =>
  ({ from: Math.max(0, Math.round(target - PEAK[src] - OUT_LAG)), src, volume, duration });
// перевод внутреннего кадра сцены (тайминги карточки) в абсолютный кадр ролика
const inv = (shot: keyof typeof KNOTS, internal: number) => {
  const k = KNOTS[shot];
  for (let i = 0; i < k.length - 1; i++) {
    const [r0, s0] = k[i], [r1, s1] = k[i + 1];
    if (internal <= s1) return S[shot as keyof typeof S].from + r0 + ((internal - s0) / (s1 - s0)) * (r1 - r0);
  }
  return S[shot as keyof typeof S].from + k[k.length - 1][0];
};
const WHOOSH_FAST = 'fs-389590.mp3', DEAL_A = 'fs-571577.mp3', DEAL_B = 'fs-787405.mp3', KEYS = 'fs-527726.mp3';
const CLICK = 'fs-687107.mp3', PAPER = 'fs-444709-norm.mp3', MARKER = 'fs-321137-norm.mp3', IMPACT = 'fs-812752.mp3', SHINE = 'fs-759840.mp3';

export const SFX: { from: number; src: string; volume: number; duration?: number }[] = [
  at(inv('morning', 211), PAPER, 0.5),                    // записка-герой садится на стол
  at(inv('table', 40), DEAL_A, 0.42),                     // раздача колоды
  at(inv('table', 64), DEAL_B, 0.34),
  { from: Math.round(inv('table', 127)), src: KEYS, volume: 0.32, duration: Math.round(inv('table', 149) - inv('table', 127)) },
  at(inv('table', 176), CLICK, 0.5),                      // клик по карточке
  at(inv('macro', 24), PAPER, 0.32),                      // первая строка справки
  at(inv('quad', 25), CLICK, 0.32),                       // клик по выставке в нарезке
  at(inv('thennow', 18), WHOOSH_FAST, 0.5),               // рывок шторки
  { from: Math.round(inv('route', 20)), src: MARKER, volume: 0.36, duration: 22 }, // линия маршрута
  at(inv('route', 119), PAPER, 0.42),                     // посадка плашки
  at(inv('chart', 40), PAPER, 0.3),                       // разделы прейскуранта — только начало и конец стопки
  at(inv('chart', 110), DEAL_B, 0.24),
  at(beatF(72), IMPACT, 0.42),                            // логотип собран — вместе с ударом музыки
  at(inv('outro', 72), SHINE, 0.22),
];
// без музыки звуков нужно больше и громче: «воздух» на движения камеры, титр и сборку финала
const SFX_NO_BGM = [
  at(inv('morning', 84), WHOOSH_FAST, 0.5), at(inv('morning', 134), 'fs-812686.mp3', 0.36),
  at(inv('table', 118), 'fs-812686.mp3', 0.34), at(S.quad.from + 2, 'fs-701104.mp3', 0.4),
  at(S.card2.from + 2, 'fs-419341.mp3', 0.35), at(inv('route', 86), 'fs-701104.mp3', 0.3),
  at(inv('outro', 10), 'fs-812686.mp3', 0.3), at(beatF(72), 'fs-859482.mp3', 0.38),
];

export const AiflMain: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => {
  const theme = useVisualTheme();
  const paint = (css: string) => themePaint(theme, css);
  const asset = (src: string) => themeAsset(theme, src);
  const scene = (key: keyof typeof KNOTS, el: React.ReactNode) => {
    const shot = S[key as keyof typeof S];
    return (
      <Sequence key={key} from={shot.from} durationInFrames={shot.duration}>
        <TimeMap knots={KNOTS[key]}>{el}</TimeMap>
      </Sequence>
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: paint('#EFE8DA') }}>
      {/* музыка: отдельная inputProp `bgm`, чтобы из той же линейки рендерить версию без музыки */}
      {bgm ? (
        <Audio
          src={asset('audio/bgm/house-vibez.mp3')}
          trimBefore={MUSIC_TRIM_FRAMES}
          volume={(f) => 0.5 * interpolate(f, [0, 8, AIFL_TOTAL - 40, AIFL_TOTAL], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      ) : null}
      {(bgm ? SFX : [...SFX, ...SFX_NO_BGM]).map((s, i) => (
        <Sequence key={`sfx-${i}`} from={s.from} durationInFrames={sfxDuration(s)}>
          <Audio src={asset(`audio/sfx/${s.src}`)} volume={bgm ? s.volume : Math.min(1, s.volume * 1.35)} />
        </Sequence>
      ))}
      {scene('morning', <SceneOpen />)}
      {scene('table', <SceneFlyIn />)}
      {scene('macro', <SceneDetail />)}
      {scene('quad', <SceneQuad />)}
      {scene('card2', <PaperTitleCard duration={80} words={parseWords(TITLE_CARDS.card2.text)} />)}
      {scene('thennow', <SceneThenNow />)}
      {scene('route', <SceneRoute />)}
      {scene('chart', <ScenePapers />)}
      {scene('outro', <SceneOutroLive />)}
      {CAPTIONS.map((c) => (
        <Sequence key={c.from} from={c.from} durationInFrames={c.duration}>
          <Caption text={c.text} duration={c.duration} {...(c.bottom ? { bottom: c.bottom } : {})} />
        </Sequence>
      ))}
      {FLASH_CUTS.map((cut) => (
        <Sequence key={cut} from={cut - 5} durationInFrames={10}>
          <FlashCut duration={10} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
