# Quitt

A minimal workday countdown app that visualizes your remaining work time as a grid of blocks — one block per minute.

## What it does

- Displays your full workday as a grid of 480+ blocks (60 per row = 1 hour per row)
- Blocks fill in as time passes; the current minute fills second by second
- Remaining work time shown in the lunch separator and in the browser tab title
- Configurable schedule via settings panel (validated, saved in localStorage)

## Default schedule

| Period    | Time          |
|-----------|---------------|
| Morning   | 09:00 - 13:00 |
| Lunch     | 13:00 - 14:00 |
| Afternoon | 14:00 - 18:00 |

## Tech stack

- React + TypeScript
- Vite
- Roboto Mono font (self-hosted via `@fontsource`)
- No external UI libraries

## Getting started

```bash
npm install
npm run dev
npm test
```

## Deploy

```bash
npm run deploy
```

Deploys to GitHub Pages via `gh-pages`.

## Live

[gerardbaholli.github.io/Quitt](https://gerardbaholli.github.io/Quitt/)
