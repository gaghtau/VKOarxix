import { MONO_FONT } from './fonts';
import { useVisualTheme, sceneDefaults } from '../themes/visual-theme';
import { interpolate, useCurrentFrame } from 'remotion';


/** Context-level defaults, editable per clip in the workbench (hex = sRGB of the oklch tokens). */
export const CAPTION_DEFAULTS = {
  bottom: 56,
  fontSize: 46, // крупный моноширинный капс на плашке (aesthetic-rules Q11: служебный текст читается с телефона)
  color: '#EFE8DA',
  accent: '#7CF29A'
};

/** Screen-space narration caption: a mono UI info-strip at the bottom of the
 * frame, led by a small amber square. Fades/rises in over 8 frames and fades
 * out over the last 8 of its window. */
export const Caption: React.FC<{
  text: string;
  duration: number;
  bottom?: number;
  fontSize?: number;
  color?: string;
  accent?: string;
}> = (props) => {
  const theme = useVisualTheme();
  const paperStyle = theme.id === 'ink-press';
  const MONO = (paperStyle ? MONO_FONT : theme.font);
  const {text, duration, ...style} = props;
  const {fontSize, color, accent, bottom} = {...sceneDefaults(theme, 'caption', CAPTION_DEFAULTS), ...style};
  const frame = useCurrentFrame();
  const inT = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outT = interpolate(frame, [duration - 8, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'baseline',
        gap: 14,
        fontFamily: MONO,
        fontSize,
        letterSpacing: paperStyle ? '0.08em' : '0.015em',
        ...(!paperStyle ? {left: '50%', width: 'max-content', maxWidth: '90%', padding: '8px 18px', borderRadius: 8, background: theme.surface, border: `1px solid ${theme.border}`, fontWeight: 500, lineHeight: 1.2} : {left: '50%', width: 'max-content', maxWidth: '92%', padding: '16px 30px', background: 'rgba(21,21,21,0.92)', boxShadow: '8px 8px 0 rgba(21,21,21,0.18)', fontWeight: 700, lineHeight: 1.15, alignItems: 'center'}),
        textTransform: 'uppercase',
        color,
        opacity: inT * outT,
        transform: `translate(-50%, ${(1 - inT) * 8}px)`,
        pointerEvents: 'none',
      }}
    >
      <span style={{ width: 12, height: 12, background: accent, display: 'inline-block', boxShadow: `0 0 10px ${accent}` }} />
      <span>{text}</span>
    </div>
  );
};
