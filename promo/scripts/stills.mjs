// Контрольные кадры: node scripts/stills.mjs v1 40 150 ...  (один бандл на все кадры)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
const [tag, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const comp = await selectComposition({ serveUrl, id: 'AiflPromo' });
for (const f of frames) {
  await renderStill({ serveUrl, composition: comp, frame: Number(f), output: `out/qa/${tag}-f${String(f).padStart(4, '0')}.png` });
  console.log('still', f);
}
