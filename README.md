# Panda Life

Game published for annasabou.com.

A gentle isometric browser game. You play Sushi, a panda or whichever animal you choose, answering calls from friends, collecting bamboo for coins and spending them at the village shop.

## Running it

```sh
npm install
npm run dev
```

Then open the address it prints.

## Other commands

- `npm test` runs the tests.
- `npm run build` checks the types and builds the game into `dist/`.

Every push to `main` is tested, built and published to GitHub Pages by `.github/workflows/deploy.yml`.

The design is in `docs/superpowers/specs/2026-11-01-panda-life-design.md`. The hand-built prototype that came before the real game is in `mockups/`.
