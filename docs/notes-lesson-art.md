# Notes — lesson art swap (resume after images are generated)

**Last touched:** picking back up once all scene images exist.

## Where we are
- Decision: replace the **45 animated `scene` cards** with paper-craft
  illustrations matching the hero style. **Charts stay** (they teach with real
  data; do not convert — especially the 23 in Reading a Chart).
- **5 done + verified on-card:** `two-sided-market`, `spread-toll`,
  `liquidity-depth`, `matching-engine`, `broker-agent` (bid-ask-and-spread,
  exchanges-and-brokers). Committed `d00c655`, `dfb6e0c`.
- **40 remaining** — every prompt tightened to concrete figures/objects in
  `docs/lesson-art-generation.md` (commit `7a6ffa7`).

## The loop, per batch of images
1. Drop `.jpg`s into `public/lesson-art/` (filenames must match scene names
   exactly — the brief's table is the list).
2. `npm run art:optimize` — shrinks ~3 MB exports to ~250 KB (macOS `sips`).
3. `npm run art:apply-scenes` — wires each scene whose image now exists.
4. `npm run gen:content` — validates; fails loudly on any missing file.
5. Ping me — I verify each on-card in the browser and deploy.

## Style lesson learned
Abstract wording → abstract blank shapes. Name real objects + figures with a
physical relationship, colour-coded (green = buyer/more/kept, rust =
seller/less/risk). See the "what makes a subject read" note in the brief.

## Tooling that exists
- `scripts/apply-scene-illustrations.ts` (`art:apply-scenes`)
- `scripts/optimize-lesson-art.mjs` (`art:optimize`)
- validator now checks every `illustration` file exists (`validate-content.ts`)
- `docs/lesson-art-generation.md` — the full brief with all 45 prompts

## Open art questions for later
- A few subjects may still read too abstract (`cash-vs-profit`,
  `execution-tradeoff`, `pe-equation`) — regenerate + re-run the loop if so.
- Course **cover** art and KB (trader/strategy/book) art were not part of this
  pass — revisit if we want full visual consistency there too.
