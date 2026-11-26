// Langit Nusantara — make.fun entry program (Node 22, standard library only).
//
// The game lives in game/ beside this file: plain static files a desktop
// browser loads offline (game/index.html plus its ES modules, no library,
// no network request). This program hands it in: it copies game/ and
// screenshots/ into the output directory and writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly, before copying anything, when the game is not there: a
// half-written /output would look like an entry and grade as one.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — build the game before handing it in');
}
if (!existsSync(join(here, 'screenshots')) || readdirSync(join(here, 'screenshots')).length === 0) {
  throw new Error('screenshots/ is empty — take the screenshots before handing it in');
}
// The gate refuses a screenshot over 256 KiB: catch an oversized one here,
// before the entry is handed in, instead of after it is graded.
for (const shot of readdirSync(join(here, 'screenshots'))) {
  const bytes = statSync(join(here, 'screenshots', shot)).size;
  if (bytes > 262144) {
    throw new Error(`screenshots/${shot} is ${bytes} bytes — over the 256 KiB gate cap`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Langit Nusantara handed in to ${out}`);
