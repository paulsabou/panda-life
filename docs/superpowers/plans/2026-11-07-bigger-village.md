# Bigger Village Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the village from 70×70 to 140×140 tiles, with a second bridge and six new friends (Nori the giraffe, Toro the elephant, Ume the red panda, Tako the raccoon, Mochi the hamster, Saba the horse), each with their own house.

**Architecture:** The old village keeps its shape, moved 35 tiles right and 35 down so it sits in the middle. A second road and bridge cross the south, and the six new houses sit around the edge. The new friends are plain data: the same rules, the same body, new heads. A 140×140 ground is too big for one canvas, so it is painted in pieces. Tree collision is grouped by tile so 12 walkers on a map four times the size stay quick.

**Tech Stack:** TypeScript, Phaser 4, Vite, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-01-panda-life-design.md` (the bigger-village lines were added in commit `f12572c`)

## Global Constraints

- No new dependencies.
- `src/game` and `src/world` stay free of Phaser; `src/art` stays free of Phaser.
- Copy is English. Friends call Sushi "Sushi-chan".
- Every animal has the same size and body. Only the head (ears, horns, trunk, face) and the colours differ.
- New friends follow the same rules as the old ones. No per-friend speed, wander range or knapsack size.
- Old saves still load. Existing friends keep their coins, hearts, favourites and knapsacks; new friends start with 10 coins and empty knapsacks.
- Sushi's calls come at the same pace as before.
- Wasabi has no house.
- Work on a branch called `bigger-village`, not `main`, because every push to `main` publishes the game. Commit at the end of each task. Don't push.
- `npm test` and `npm run build` pass at the end of every task.

## Review Focus

1. **A save from before this change** (6 friends in `friendCoins` and `knapsacks`) loads with all 12 friends present, and the old 6 keep their values. The test is in Task 4.
2. **Turning the map round all four ways** keeps only the current turn's ground pictures in memory. The test is in Task 2, plus the browser check in Task 6.
3. **Planning a route across the bigger map** stays quick: a route from Sushi's start to every door, both bridges included, takes under 1.5 s in total. The test is in Task 3.
4. **Bridge railings away from Sushi** are layered by their own position, not Sushi's, so the far bridge's near rail doesn't draw over friends or trees elsewhere. This is checked in the browser in Task 6.
5. **The start screen with 14 animals** fits on a 375×667 phone and scrolls instead of being cut off. This is checked in the browser in Task 6.

---

### Task 1: Group tree collision by tile

The map gets four times the trees, and `Collision.blocked` checks every tree each time. This task changes speed only, not behaviour.

**Files:**
- Modify: `src/world/collision.ts`
- Test: `src/world/world.test.ts`

**Interfaces:**
- Produces: `Collision.blocked(x, y)` behaves exactly as now.

- [ ] **Step 1: Write a test that pins the behaviour.** Add to the `collision` describe block in `src/world/world.test.ts`:

```ts
it('blocks exactly where a tree-by-tree check would', () => {
  const near = (x: number, y: number) =>
    village.trees.some((t) => Math.hypot(t.x + 0.5 - x, t.y + 0.5 - y) < (t.kind === 'bamboo' ? 0.9 : 0.65) + 0.45);
  for (const t of village.trees.slice(0, 20)) {
    for (let dy = -2; dy <= 2; dy += 0.25) {
      for (let dx = -2; dx <= 2; dx += 0.25) {
        const x = t.x + 0.5 + dx;
        const y = t.y + 0.5 + dy;
        if (near(x, y)) expect(collision.blocked(x, y)).toBe(true);
      }
    }
  }
});
```

- [ ] **Step 2: Run it.** `npx vitest run src/world/world.test.ts`. Expected: PASS, since this pins today's behaviour.
- [ ] **Step 3: Group the solids by tile.** In the `Collision` constructor, build `private solidsByTile: Map<number, Solid[]>`, keyed `ty * MAP_SIZE + tx`. Put each solid in every tile that its circle grown by `FOOT_RADIUS` touches. `blocked` then checks only `solidsByTile.get(Math.floor(y) * MAP_SIZE + Math.floor(x))`.
- [ ] **Step 4: Run the whole suite.** `npm test`. Expected: all pass, and the `life.test.ts` run time is no slower.
- [ ] **Step 5: Commit.** `git checkout -b bigger-village` (first task only), then `git commit -am "Check only nearby trees when testing where feet can stand"`.

---

### Task 2: Paint the ground in pieces

At 140×140 the world is 6520×3400 px. Today's single canvas would drop to 0.63 scale and look blurry. Paint it in pieces instead, skip pieces with no tiles in them, and keep only the current turn's pieces.

**Files:**
- Modify: `src/art/painters.ts` (`GROUND_SCALE`, `paintGround`)
- Modify: `src/scene/VillageScene.ts` (`ground`, `groundKey`, `placeWorld`)
- Test: create `src/art/ground.test.ts`

**Interfaces:**
- Produces, in `src/art/painters.ts`:
  - `export const GROUND_SCALE = 1.2;` (a constant, no longer derived from `WORLD_W`)
  - `export const GROUND_PIECE = 1024;` (the side of a piece, in world px)
  - `export interface GroundPiece { x: number; y: number; w: number; h: number }` (world px)
  - `export function groundPieces(r: Rotation): GroundPiece[]`: the pieces in a `GROUND_PIECE` grid over `WORLD_W × WORLD_H` that some map tile, or the map's side edge, overlaps. This is pure maths with no canvas.
  - `export function paintGroundPiece(village: Village, r: Rotation, piece: GroundPiece): HTMLCanvasElement`: transparent background, translated so the piece's top-left is at 0,0. It draws the side edges, plus every tile and flower whose projected bounding box (with a 2 px margin) overlaps the piece.
  - `export function paintSky(): HTMLCanvasElement`: a 4×256 canvas with today's `skyTop`→`skyBottom` gradient, stretched behind the ground.
  - `paintGround` is removed.

- [ ] **Step 1: Write the failing tests** in `src/art/ground.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAP_SIZE, WORLD_H, WORLD_W, project, type Rotation } from '../world/iso';
import { GROUND_PIECE, groundPieces } from './painters';

describe('ground pieces', () => {
  it.each([0, 1, 2, 3] as Rotation[])('cover every tile corner at rotation %i', (r) => {
    const pieces = groundPieces(r);
    for (let y = 0; y <= MAP_SIZE; y += 5) {
      for (let x = 0; x <= MAP_SIZE; x += 5) {
        const [px, py] = project(r, x, y);
        expect(pieces.some((p) => px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h)).toBe(true);
      }
    }
  });

  it('never makes a piece bigger than a phone can hold', () => {
    for (const p of groundPieces(0)) expect(Math.max(p.w, p.h)).toBeLessThanOrEqual(GROUND_PIECE);
  });

  it('skips the empty sky in the corners', () => {
    const grid = Math.ceil(WORLD_W / GROUND_PIECE) * Math.ceil(WORLD_H / GROUND_PIECE);
    expect(groundPieces(0).length).toBeLessThan(grid);
  });
});
```

(The last test only bites once the map is 140. At 70 it may pass or fail. If it fails now, mark it `it.skip` and un-skip it in Task 3.)

- [ ] **Step 2: Run them.** `npx vitest run src/art/ground.test.ts`. Expected: FAIL, because `groundPieces` doesn't exist yet.
- [ ] **Step 3: Implement** `groundPieces`, `paintGroundPiece` and `paintSky` in `src/art/painters.ts`, and remove `paintGround`. Pieces at the right and bottom edges are cut to fit inside `WORLD_W`/`WORLD_H`.
- [ ] **Step 4: Change the scene.** `ground` becomes `sky: Image` plus `groundImages: Image[]`. The sky is added once at depth `GROUND_DEPTH - 0.5`, with origin 0,0 and `setDisplaySize(WORLD_W, WORLD_H)`. In `placeWorld`, destroy the current `groundImages` and `textures.remove` their keys. Then, for each `groundPieces(r)[i]`, add the texture `ground-${r}-${i}` from `paintGroundPiece` and an image at `(piece.x, piece.y)` with origin 0,0, scale `1 / GROUND_SCALE` and depth `GROUND_DEPTH`.
- [ ] **Step 5: Verify.** Run `npm test && npm run build`, both expected to pass. Then run `npm run dev`, turn the map all four ways, and check the ground has no seams between pieces.
- [ ] **Step 6: Commit.** `git commit -am "Paint the ground in pieces so a bigger map stays sharp"`

---

### Task 3: A 140×140 map with two bridges

The old village moves to the middle. A south road and a second bridge are added, and the six new house spots are reserved without owners until Task 4.

**Files:**
- Modify: `src/world/iso.ts` (`MAP_SIZE`)
- Modify: `src/world/layout.ts`
- Modify: `src/world/collision.ts` (railings for every bridge)
- Modify: `src/scene/VillageScene.ts` (rails for every bridge, and rail layering)
- Modify tests: `src/world/world.test.ts`, `src/world/life.test.ts:166` (`village.bridge` becomes `village.bridges[0]`)

**Interfaces:**
- Produces:
  - `MAP_SIZE = 140`
  - `Village.bridges: Bridge[]` replaces `Village.bridge`. `bridges[0]` is the old bridge; `bridges[1]` is the south one.
  - `export const OLD_VILLAGE_OFFSET = 35;`
  - `export const NEW_HOUSE_SPOTS: [number, number][]`. Task 4 gives these spots owners.

**Layout values** (all in the new tiles):

- River: `riverX(y) = Math.round(68 + 7 * Math.sin((y - 35) / 9))`, `RIVER_WIDTH = 6`, for every row.
- `roadRow` is renamed `mainRoadRow`, and a `southRoadRow` is added beside it. (The tests import `Pair` from `./iso`.)
- Main road: as today, shifted. Use `fromBridge = x - 66` and row `69 + 6 * sin(fromBridge / 9) * ease`, with the same `ease`.
- South road: `fromBridge = x - 76` and row `111 + 4 * sin(fromBridge / 9) * ease`, with the same `ease`, across the full width.
- Bridges: main bridge rows `[68, 71]`, columns `[61, 71]`. South bridge rows `[110, 113]`, columns `[71, 81]`.
- Old houses and shop: today's `HOUSE_SPOTS` and `SHOP_SPOT`, each plus `OLD_VILLAGE_OFFSET`, kept in the same order.
- `NEW_HOUSE_SPOTS`, in this order: `[30, 36]` (Nori), `[96, 28]` (Toro), `[104, 68]` (Ume), `[56, 102]` (Tako), `[34, 58]` (Mochi), `[98, 100]` (Saba). These were checked to stay off the water and the roads, 13 to 18 tiles from the nearest other house. Move one only if a test below fails, and keep it near the same edge.
- Path from a door: use the road whose row at `doorX` is closest to `doorY`. If that road is below the door, go straight down to it, as today for `hy < 30`. Otherwise use today's "across then up" path.
- Start: `[14.5 + 35, mainRoadRow(49) + 0.5]`, with its keep-clear box shifted by 35 as well.
- Keep-clear boxes around each bridge are as today, shifted for the main bridge and the same size for the south one.
- Until Task 4, `NEW_HOUSE_SPOTS` aren't built as houses. `buildVillage` makes homes only for `FRIENDS.length + 1` spots.

- [ ] **Step 1: Update and add tests** in `src/world/world.test.ts`.
  - Every `village.bridge` becomes a loop over `village.bridges`, or uses `bridges[0]`.
  - The point `[64.5, 34.5]` in "never leads through anything solid" and "crosses the river by the bridge" becomes `[99.5, 69.5]`.
  - The `tiles[50]` water probe becomes `tiles[85]`.
  - Add these tests:

```ts
it('is twice as wide and tall as before', () => {
  expect(MAP_SIZE).toBe(140);
  expect(village.tiles).toHaveLength(140);
});

it('keeps the old village in the middle, in the same shape', () => {
  const old = [[8, 8], [20, 6], [52, 7], [57, 20], [7, 50], [22, 54], [50, 53]];
  old.forEach(([x, y], i) => expect([village.houses[i].x, village.houses[i].y]).toEqual([x + 35, y + 35]));
  const shop = village.houses.find((h) => h.isShop)!;
  expect([shop.x, shop.y]).toEqual([18 + 35, 21 + 35]);
});

it('has two bridges, each crossing the whole river', () => {
  expect(village.bridges).toHaveLength(2);
  for (const b of village.bridges) {
    for (let y = b.y0; y < b.y1; y++) {
      village.tiles[y].forEach((tile, x) => {
        if (x >= b.x0 - 3 && x <= b.x1 + 3) expect(tile).not.toBe('water');
      });
    }
  }
});

it('crosses by the south bridge in the south', () => {
  const south = village.bridges[1];
  const from: Pair = [south.x0 - 4, (south.y0 + south.y1) / 2];
  const to: Pair = [south.x1 + 4, (south.y0 + south.y1) / 2];
  const path = findPath(collision, from, to);
  expect(path.length).toBeGreaterThan(0);
  expect(Math.hypot(path.at(-1)![0] - to[0], path.at(-1)![1] - to[1])).toBeLessThan(1);
  expect(path.every(([, y]) => y > village.bridges[0].y1)).toBe(true);
});

it('never puts a house on the road or the river', () => {
  for (const h of village.houses) {
    for (let y = 0; y < HOUSE_SIZE; y++) {
      for (let x = 0; x < HOUSE_SIZE; x++) expect(village.tiles[h.y + y][h.x + x]).toBe('grass');
    }
  }
});

it('plans routes across the whole village quickly', () => {
  const started = performance.now();
  for (const h of village.houses) findPath(collision, village.start, doorSpot(h));
  expect(performance.now() - started).toBeLessThan(1500);
});
```

  Also add `NEW_HOUSE_SPOTS` to "never puts a house on the road or the river" by checking those tiles too, so the spots are proven before Task 4 uses them. Un-skip the sky test from Task 2 if it was skipped.

- [ ] **Step 2: Run them.** `npx vitest run src/world`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement the layout** in `src/world/layout.ts` and `MAP_SIZE` in `src/world/iso.ts`, using the values above. `Collision.groundSolid` checks the railings of every bridge.
- [ ] **Step 4: Rails in the scene.** `VillageScene` makes two rails per bridge. Give `Rail` a `bridge: Bridge` field, and key the textures `rail-${bridgeIndex}-${side}-${r}`. In `layerRails`, a rail whose bridge Sushi is on, or within 2 tiles of its x and y range, keeps today's Sushi-relative depth. Any other rail gets `STANDING_DEPTH + depthOf(r, (bridge.x0 + bridge.x1) / 2, rail.y)`.
- [ ] **Step 5: Run everything.** `npm test && npm run build`. Expected: all pass. If `life.test.ts` cases near their 30 s timeouts, profile before raising the timeout.
- [ ] **Step 6: Commit.** `git commit -am "Double the village in each direction, with a second bridge in the south"`

---

### Task 4: Six new friends

This task adds the new friends' data, houses, tunes, names, favourites and saves. Their heads are placeholders (round ears) until Task 5.

**Files:**
- Modify: `src/game/friends.ts`, `src/art/characters.ts` (`CharacterId`, `CHARACTER_IDS`, `LOOKS`, placeholder cases), `src/game/cast.ts`, `src/game/friendship.ts` (`FAVOURITES`), `src/music/compose.ts` (`THEMES`), `src/world/layout.ts` (owners for `NEW_HOUSE_SPOTS`)
- Tests: `src/game/save.test.ts`, `src/world/world.test.ts`, `src/art/characters.test.ts`

**Interfaces:**
- Produces:
  - `AnimalKind` adds `'giraffe' | 'elephant' | 'redPanda' | 'raccoon' | 'hamster' | 'horse'`.
  - `FriendId` adds `'nori' | 'toro' | 'ume' | 'tako' | 'mochi' | 'saba'`.
  - `FRIENDS` appends these, in this order (so they line up with `NEW_HOUSE_SPOTS`):

| id | name | kind | ask | thanks |
|---|---|---|---|---|
| nori | Nori | giraffe | `Sushi-chan! From up here I can see bamboo everywhere. Could you bring me {n} sticks?` | `Wonderful! I could see your kindness from way up here!` |
| toro | Toro | elephant | `Paoon! Sushi-chan, I need {n} bamboo sticks for my snack. Will you help a big friend?` | `Paoon! I will never forget this, Sushi-chan!` |
| ume | Ume | redPanda | `Um... Sushi-chan? If it's okay... could you find me {n} bamboo sticks?` | `Oh... thank you so much, Sushi-chan. You are so kind.` |
| tako | Tako | raccoon | `Psst, Sushi-chan! I'm building something secret. I need {n} bamboo sticks!` | `Hehe! My secret is safe with you. Thanks, Sushi-chan!` |
| mochi | Mochi | hamster | `Squeak! Sushi-chan, my cheeks are empty! Can you bring {n} bamboo sticks?` | `Squeak squeak! My cheeks are full and happy!` |
| saba | Saba | horse | `Neigh! Sushi-chan, race you! First one to find {n} bamboo sticks wins!` | `Neigh! You win, Sushi-chan! Thank you!` |

  - `CHARACTER_IDS` appends `'giraffe', 'elephant', 'redPanda', 'raccoon', 'hamster', 'horse'`.
  - `ANIMAL_NAMES`: `Giraffe`, `Elephant`, `Red panda`, `Raccoon`, `Hamster`, `Horse`.
  - `LOOKS` fur and limb colours: giraffe `#ffd27a` / `#d9924e`; elephant `#b9c3d6` / `#97a3ba`; redPanda `#d9673a` / `#4a2e2a`; raccoon `#a9a6ad` / `#5d5960`; hamster `#f4c58a` / `#e0a868`; horse `#b77a4d` / `#8a5534`. Pick the dress, dress2, accent, stripe, iris and shoe colours yourself, so that no two characters have the same `dress`.
  - `FAVOURITES`: nori `['mikan-orange', 'umbrella', 'radio', 'dictionary', 'kite']`; toro `['diary', 'photo-frame', 'bag-of-rice', 'sweet-potato', 'bath-towel']`; ume `['pickled-plum', 'blanket', 'floor-cushion', 'green-tea-leaves', 'teacup']`; tako `['bar-of-soap', 'dish-sponge', 'torch', 'scissors', 'melon-bread']`; mochi `['dorayaki', 'chocolate-sticks', 'pillow', 'futon', 'box-of-crayons']`; saba `['apple', 'ramune-soda', 'alarm-clock', 'house-slippers', 'school-bag']`.
  - `THEMES` titles: nori `Nori Above the Treetops`; toro `Toro's Big Warm Kitchen`; ume `Ume Under the Plum Blossom`; tako `Tako's Secret Workshop`; mochi `Mochi's Midnight Snack`; saba `Saba Gallops the Meadow`. Pick the scales, roots, tempos, instruments, chords and patterns yourself. The existing "sounds different" tests must pass.
  - Houses: `NEW_HOUSE_SPOTS[i]` belongs to `FRIENDS[6 + i]`, with `style: (7 + i) % 4`. Push them onto `houses` after the old homes and before the shop, so `houses[0]` stays Sushi's.

- [ ] **Step 1: Write the failing tests.**
  - `src/game/save.test.ts`:

```ts
it('loads a save from before the new friends, keeping the old friends as they were', () => {
  const store = memoryStore();
  store.setItem('panda-life-save-v1', JSON.stringify({
    coins: 7, nextId: 3, inbox: [], active: null,
    knapsacks: { sushi: [], maguro: [{ id: 'apple', name: 'Apple', count: 2 }], inari: [], unagi: [], tamago: [], ikura: [], ebi: [] },
    friendCoins: { maguro: 30, inari: 10, unagi: 10, tamago: 10, ikura: 10, ebi: 4 },
    friendship: { 'maguro|sushi': 40 }, discovered: ['maguro:taiyaki'],
  }));
  const p = loadProgress(store);
  expect(p.friendCoins).toMatchObject({ maguro: 30, ebi: 4, nori: 10, toro: 10, ume: 10, tako: 10, mochi: 10, saba: 10 });
  expect(p.knapsacks.maguro).toEqual([{ id: 'apple', name: 'Apple', count: 2 }]);
  expect(p.knapsacks.saba).toEqual([]);
  expect(p.friendship['maguro|sushi']).toBe(40);
});
```

  Use whatever in-memory store helper `save.test.ts` already has, and name it to match.
  - `src/world/world.test.ts`: the existing "gives each of the six friends their own house" test is renamed "gives every friend their own house, plus one for Sushi". Add `expect(FRIENDS).toHaveLength(12)` and `expect(village.houses.find((h) => h.owner?.id === 'saba')).toMatchObject({ x: 98, y: 100 })`.
  - `src/art/characters.test.ts`: replace the local `CHARACTERS` list with `CHARACTER_IDS`, so the knapsack tests cover all 14.
- [ ] **Step 2: Run them.** `npm test`. Expected: FAIL (type errors or missing friends).
- [ ] **Step 3: Implement the data** above. In `ears()` and `tail()`, the six new kinds borrow the beaver's round ears and the rabbit's puff tail for now. `ears()` and `tail()` must stay exhaustive switches.
- [ ] **Step 4: Run everything.** `npm test && npm run build`. Expected: all pass, including "give each other presents and grow fonder" and "never get stuck for good".
- [ ] **Step 5: Commit.** `git commit -am "Add Nori, Toro, Ume, Tako, Mochi and Saba with their own houses"`

---

### Task 5: Draw the new heads

**Files:**
- Modify: `src/art/characters.ts` (`ears`, `hangingEars`, `tail`, `markings`, `nose`, `mouthExtras`)
- Test: `src/art/characters.test.ts`

**Interfaces:**
- Consumes: the six `CharacterId`s from Task 4.
- Produces: no new exports. Each new head marks its main feature with an SVG `id` so tests can find it.

What each head needs. All of these are drawn in the same 240-wide head space as the others, sliding with `off` and the ear offsets like the existing features:

- **Giraffe** (`id="ossicones"`): two short horns with round knobs on top of the head, small sideways oval ears, brown patches as `markings`, and a thin tail with a dark tuft.
- **Elephant** (`id="trunk"`): big round ears behind the head, wider than the head's sides, with pink insides. A short curled trunk takes the place of `nose`, drawn in the face group so it turns with the head. Thin tail. No whiskers.
- **Red panda** (`id="ringed-tail"`): rounded pointy ears with white rims, white cheek and eyebrow patches as `markings`, and a big tail with three dark rings.
- **Raccoon** (`id="mask"`): a black band across both eyes as `markings`, drawn under the eyes, plus a white muzzle, rounded ears with dark rims, and a grey tail with dark rings. It must not read as the tanuki, whose patches are separate brown ovals.
- **Hamster** (`id="cheeks"`): tiny round ears, big puffed white cheek ovals, and a tiny tail that only shows from behind.
- **Horse** (`id="mane"`): tall pointed ears, a dark mane of three tufts across the top of the head (drawn after the head oval so it overlaps it, like the dog's floppy ears), a white blaze down the face, and a long dark flowing tail.

- [ ] **Step 1: Write the failing test** in `src/art/characters.test.ts`:

```ts
it.each([
  ['giraffe', 'ossicones'], ['elephant', 'trunk'], ['redPanda', 'ringed-tail'],
  ['raccoon', 'mask'], ['hamster', 'cheeks'], ['horse', 'mane'],
] as const)('draws the %s with its %s', (id, feature) => {
  expect(characterSvg(id, 'front', null)).toContain(`id="${feature}"`);
});
```

  The red panda's tail shows from the front, as other tails do. If it doesn't, check its `'side'` pose instead.
- [ ] **Step 2: Run it.** `npx vitest run src/art`. Expected: FAIL.
- [ ] **Step 3: Draw the six heads.**
- [ ] **Step 4: Run the tests** with `npm test` (all pass). Then look at the art: run `npm run dev`, start a new game, and check each new animal's face on the animal picker. Walk Sushi as each new animal in all four directions.
- [ ] **Step 5: Commit.** `git commit -am "Draw giraffe, elephant, red panda, raccoon, hamster and horse heads"`

---

### Task 6: Screens for 14 animals and 12 friends, and a check in the browser

**Files:**
- Modify: `src/ui/styles.css` (`.animal-grid`, `.start-card.animals`, the Friends panel)
- Modify: `README.md` only if it names a count of friends (it doesn't today, so probably no change).

- [ ] **Step 1: Animal picker.** Use 7 columns on desktop, and 4 columns under the existing 720 px breakpoint. Give `.start-card.animals` `max-height: calc(100vh - 40px)` and `overflow-y: auto`.
- [ ] **Step 2: Friends screen.** Check it lists all 12 friends and scrolls inside its panel. Copy the existing scrolling panel rules at `styles.css:367` and `:397` if it doesn't.
- [ ] **Step 3: Browser check.** Run `npm run dev` and check each of these:
  - At 1440×900 and at 375×667, the animal picker shows all 14 and scrolls on the phone.
  - A new game as the horse: the friend who was the horse (Saba) is drawn as the panda.
  - Turn the map round all four ways. The ground has no seams, and in DevTools → Memory the texture count doesn't grow with each turn.
  - Walk across both bridges. Rails layer correctly at the bridge Sushi is on, and the other bridge's rails don't draw over anything far away.
  - Walk into one new friend's house: the room uses that house's colours, and that friend's tune plays.
  - Wait for calls: a new friend phones eventually, and the call shows their face.
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: all pass.
- [ ] **Step 5: Commit.** `git commit -am "Fit 14 animals and 12 friends on the screens"`
