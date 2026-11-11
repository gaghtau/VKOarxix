import { useVisualTheme, themePaint, themeAsset } from '../themes/visual-theme';
import { AbsoluteFill, Audio, Sequence } from 'remotion';
import { SceneOpen } from './live/SceneOpen';
import { SceneFlyIn } from './live/SceneFlyIn';
import { SceneDetail } from './live/SceneDetail';
import { ScenePapers } from './live/ScenePapers';
import { SceneThenNow } from './live/SceneThenNow';
import { SceneRoute } from './live/SceneRoute';
import './fonts';
import { PaperTitleCard } from './PaperTitleCard';
import { SceneOutroLive } from './live/SceneOutroLive';
import { FlashCut } from './FlashCut';
import { Caption } from './Caption';

// ~40.5s @ 30fps — «Стол архивиста»: бумага сайта Госархива ВКО (10 сцен).
// Оба момента логотипа (открытие и финал) держатся полную секунду после того, как собрались.
export const AIFL_SHOTS = {
  morning: { from: 0, duration: 220 },    // 0–7.3s   логотип + 1 с покоя → стол, записка-герой
  card1: { from: 220, duration: 80 },     // титр: ≥1 с чистого чтения после влёта слов (R1)
  table: { from: 300, duration: 190 },    // колода личных фондов → поиск «Куленов» → клик
  macro: { from: 490, duration: 100 },    // справка о личности, строки встраиваются
  card2: { from: 590, duration: 80 },     // «Как город изменился за 130 лет?»
  thennow: { from: 670, duration: 150 },  // шторка сегодня / 1891
  card3: { from: 820, duration: 80 },     // «До любого филиала — маршрут по дорогам.»
  route: { from: 900, duration: 140 },    // маршрут прорисовывается на карте
  chart: { from: 1040, duration: 140 },   // 8 разделов прейскуранта стопкой + ≥0,7 с покоя
  outro: { from: 1180, duration: 145 },   // финал: элементы вокруг логотипа (+1 с покоя)
} as const; // sum = 1325 (44,2 с)

export const AIFL_TOTAL = 1325;

// титры: слова через пробел, `*слово*` — зелёный акцент сайта. Единый источник для рендера и workbench.
export const TITLE_CARDS = {
  card1: { text: 'Вся память края — в *одном* архиве.' },
  card2: { text: 'Как город *изменился* за 130 лет?' },
  card3: { text: 'До любого филиала — *маршрут* по дорогам.' },
} as const;

export const parseWords = (text: string): { text: string; accent?: boolean }[] =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const m = w.match(/^\*(.+)\*$/);
      return m ? { text: m[1], accent: true } : { text: w };
    });

// тёплые вспышки на жёстких стыках сцен (from = стык − 5, длина 10f)
export const FLASH_CUTS = [AIFL_SHOTS.table.from, AIFL_SHOTS.macro.from, AIFL_SHOTS.route.from, AIFL_SHOTS.chart.from];

// клавиатура обрезается под набор «Куленов» (7 знаков × 3f)
export const sfxDuration = (s: { from: number; src: string; duration?: number }) => s.duration ?? 90;

// нижняя строка-пояснение над «живыми» сценами (абсолютные кадры; финал без подписей)
const S = AIFL_SHOTS;
export const CAPTIONS = [
  { from: S.morning.from + 92, duration: 34, text: 'ГЛАВНАЯ · СТОЛ' },
  { from: S.table.from + 64, duration: 50, text: 'ЛИЧНЫЕ ФОНДЫ АРХИВА' },
  { from: S.table.from + 120, duration: 55, text: 'ПОИСК ПО ИМЕНИ' },
  { from: S.macro.from + 12, duration: 78, text: 'СПРАВКА И ШИФР ФОНДА' },
  { from: S.thennow.from + 58, duration: 86, text: 'ОДНО МЕСТО · 130 ЛЕТ РАЗНИЦЫ' },
  { from: S.route.from + 18, duration: 110, text: 'МАРШРУТ ПРЯМО НА КАРТЕ' },
  { from: S.chart.from + 14, duration: 112, text: 'ЦЕНЫ ПО ПОСТАНОВЛЕНИЮ № 289' },
] as const;

// звук (этап 6): Freesound, CC0 — источники и анализ в public/audio/sfx/audio-manifest.json и FREESOUND-CREDITS.md.
// Привязка «пик звука на кадр действия» (sound-design §4.6): from = цель − пик источника − задержка AAC-дорожки.
// Задержку вывода берём 1,28f (AAC priming 2048 сэмплов @48 кГц, тот же конвейер Remotion → mp4/aac).
const OUT_LAG = 1.28;
const PEAK: Record<string, number> = { // энергетический пик файла, в кадрах (из manifest.analysis)
  'fs-701104.mp3': 15.2, 'fs-812686.mp3': 6.5, 'fs-389590.mp3': 2.9, 'fs-419341.mp3': 1.3,
  'fs-571577.mp3': 10.1, 'fs-787405.mp3': 11.2, 'fs-527726.mp3': 0, 'fs-687107.mp3': 4.3,
  'fs-444709-norm.mp3': 5.9, 'fs-321137-norm.mp3': 0, 'fs-859482.mp3': 68.6, 'fs-812752.mp3': 5.0, 'fs-759840.mp3': 8.2,
};
const at = (target: number, src: string, volume: number, duration?: number) =>
  ({ from: Math.max(0, Math.round(target - PEAK[src] - OUT_LAG)), src, volume, duration });
const WHOOSH_SOFT = 'fs-701104.mp3', WHOOSH_BIG = 'fs-812686.mp3', WHOOSH_FAST = 'fs-389590.mp3', SWOOSH = 'fs-419341.mp3';
const DEAL_A = 'fs-571577.mp3', DEAL_B = 'fs-787405.mp3', KEYS = 'fs-527726.mp3', CLICK = 'fs-687107.mp3';
const PAPER = 'fs-444709-norm.mp3', MARKER = 'fs-321137-norm.mp3', RISER = 'fs-859482.mp3', IMPACT = 'fs-812752.mp3', SHINE = 'fs-759840.mp3';
// посадки 8 разделов прейскуранта: cue + 22 (ScenePapers), два сэмпла по очереди и громкость по убыванию
const PRICE_LANDS = [18, 28, 38, 48, 58, 68, 78, 88].map((c) => c + 22);

export const SFX: { from: number; src: string; volume: number; duration?: number }[] = [
  // 1. логотип собирается мягким воздухом, переход к столу — короткий взмах
  at(S.morning.from + 16, WHOOSH_SOFT, 0.35),
  at(S.morning.from + 84, WHOOSH_FAST, 0.6),
  // записка-герой: подъём — кинематографичный взмах, обход луча — искра, посадка — лист бумаги на стол
  at(S.morning.from + 134, WHOOSH_BIG, 0.4),
  at(S.morning.from + 145, SHINE, 0.22),
  at(S.morning.from + 211, PAPER, 0.55),
  at(S.card1.from + 2, SWOOSH, 0.35),
  // 3. колода: воздух на крупном плане, раздача ускоряется (два разных сэмпла, тише к концу),
  // взмах обратно к поиску, клавиатура под «Куленов», фильтр, клик, наезд
  at(S.table.from + 16, WHOOSH_SOFT, 0.28),
  at(S.table.from + 40, DEAL_A, 0.5),
  at(S.table.from + 62, DEAL_B, 0.42),
  at(S.table.from + 80, DEAL_A, 0.3),
  at(S.table.from + 118, WHOOSH_BIG, 0.38),
  at(S.table.from + 127, KEYS, 0.35, 24),
  at(S.table.from + 162, WHOOSH_FAST, 0.55),
  at(S.table.from + 176, CLICK, 0.55),
  at(S.table.from + 182, SWOOSH, 0.3),
  // 4. строки справки садятся на страницу: бумага / карта по очереди, тише к концу
  at(S.macro.from + 24, PAPER, 0.42),
  at(S.macro.from + 33, DEAL_B, 0.24),
  at(S.macro.from + 42, PAPER, 0.32),
  at(S.macro.from + 51, DEAL_B, 0.18),
  at(S.card2.from + 2, SWOOSH, 0.35),
  // 6. шторка: рывок — взмах, отскок — лёгкий щелчок, медленный проход без звука
  at(S.thennow.from + 18, WHOOSH_FAST, 0.6),
  at(S.thennow.from + 30, CLICK, 0.18),
  at(S.card3.from + 2, SWOOSH, 0.35),
  // 8. маршрут: точка старта — щелчок, линия — маркер по бумаге, финиш — карта, плашка — воздух и посадка
  at(S.route.from + 16, CLICK, 0.3),
  { from: S.route.from + 20, src: MARKER, volume: 0.42, duration: 24 },
  { from: S.route.from + 44, src: MARKER, volume: 0.34, duration: 24 },
  at(S.route.from + 70, DEAL_B, 0.3),
  at(S.route.from + 86, WHOOSH_SOFT, 0.3),
  at(S.route.from + 119, PAPER, 0.48),
  // 9. разделы прейскуранта ложатся стопкой
  ...PRICE_LANDS.map((land, i) => at(S.chart.from + land, i % 2 ? DEAL_B : PAPER, i % 2 ? 0.3 - i * 0.012 : 0.46 - i * 0.03)),
  // 10. финал: элементы слетаются (взмах), нарастание → удар на логотипе → искра на линии
  at(S.outro.from + 10, WHOOSH_BIG, 0.32),
  at(S.outro.from + 60, RISER, 0.42),
  at(S.outro.from + 62, IMPACT, 0.5), // логотип собран (последняя буква садится ~f62)
  at(S.outro.from + 72, SHINE, 0.28),
];

export const AiflMain: React.FC = () => {
  const theme = useVisualTheme();
  const paint = (css: string) => themePaint(theme, css);
  const asset = (src: string) => themeAsset(theme, src);

  return (
    <AbsoluteFill style={{ backgroundColor: paint('#EFE8DA') }}>
      {/* beat-pinned promo sound effects (no music bed — SFX only) */}
      {SFX.map((s, i) => (
        <Sequence
          key={`sfx-${i}`}
          from={s.from}
          durationInFrames={sfxDuration(s)}
        >
          <Audio src={asset(`audio/sfx/${s.src}`)} volume={s.volume} />
        </Sequence>
      ))}
      <Sequence from={AIFL_SHOTS.morning.from} durationInFrames={AIFL_SHOTS.morning.duration}>
        <SceneOpen />
      </Sequence>
      <Sequence from={AIFL_SHOTS.card1.from} durationInFrames={AIFL_SHOTS.card1.duration}>
        <PaperTitleCard
          duration={AIFL_SHOTS.card1.duration}
          words={parseWords(TITLE_CARDS.card1.text)}
        />
      </Sequence>
      <Sequence from={AIFL_SHOTS.table.from} durationInFrames={AIFL_SHOTS.table.duration}>
        <SceneFlyIn />
      </Sequence>
      <Sequence from={AIFL_SHOTS.macro.from} durationInFrames={AIFL_SHOTS.macro.duration}>
        <SceneDetail />
      </Sequence>
      <Sequence from={AIFL_SHOTS.card2.from} durationInFrames={AIFL_SHOTS.card2.duration}>
        <PaperTitleCard duration={AIFL_SHOTS.card2.duration} words={parseWords(TITLE_CARDS.card2.text)} />
      </Sequence>
      <Sequence from={AIFL_SHOTS.thennow.from} durationInFrames={AIFL_SHOTS.thennow.duration}>
        <SceneThenNow />
      </Sequence>
      <Sequence from={AIFL_SHOTS.card3.from} durationInFrames={AIFL_SHOTS.card3.duration}>
        <PaperTitleCard duration={AIFL_SHOTS.card3.duration} words={parseWords(TITLE_CARDS.card3.text)} />
      </Sequence>
      <Sequence from={AIFL_SHOTS.route.from} durationInFrames={AIFL_SHOTS.route.duration}>
        <SceneRoute />
      </Sequence>
      <Sequence from={AIFL_SHOTS.chart.from} durationInFrames={AIFL_SHOTS.chart.duration}>
        <ScenePapers />
      </Sequence>
      <Sequence from={AIFL_SHOTS.outro.from} durationInFrames={AIFL_SHOTS.outro.duration}>
        <SceneOutroLive />
      </Sequence>
      {/* narration captions over the live shots (under the flash cuts) */}
      {CAPTIONS.map((c) => (
        <Sequence key={c.from} from={c.from} durationInFrames={c.duration}>
          <Caption text={c.text} duration={c.duration} />
        </Sequence>
      ))}
      {/* warm flash cuts straddling scene changes */}
      {FLASH_CUTS.map((cut) => (
        <Sequence key={cut} from={cut - 5} durationInFrames={10}>
          <FlashCut duration={10} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
