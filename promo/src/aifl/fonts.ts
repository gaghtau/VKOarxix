// Шрифты сайта Госархива ВКО: Onest — заголовки, JetBrains Mono — подписи, Inter — интерфейс.
// Грузятся через @remotion/google-fonts (кириллица + латиница), рендер дожидается загрузки.
import { loadFont as onest } from '@remotion/google-fonts/Onest';
import { loadFont as mono } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as inter } from '@remotion/google-fonts/Inter';

export const DISPLAY = onest('normal', { weights: ['500', '700', '800', '900'], subsets: ['cyrillic', 'latin'] }).fontFamily;
export const MONO_FONT = mono('normal', { weights: ['500', '700'], subsets: ['cyrillic', 'latin'] }).fontFamily;
export const UI_FONT = inter('normal', { weights: ['400', '600'], subsets: ['cyrillic', 'latin'] }).fontFamily;
