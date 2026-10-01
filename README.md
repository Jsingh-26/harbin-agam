# Two-Player Platform Adventure

A browser platformer built with TypeScript and HTML Canvas. Play with two players on one keyboard, or choose the cyan character or orange character for single-player touch play on a phone or iPad. Collect stars, dodge spikes, stomp enemies, and find the glowing switch that opens the way to the rainbow exit.

[Play the web game](https://harbin-agam-game.vercel.app/) · [Android edition and review status](https://github.com/Jsingh-26/harbin-agam/pull/1)

![The cyan character and orange character beside platforms, stars, enemies, spikes, a glowing switch, and the rainbow exit.](docs/images/gameplay.png)

## At a glance

| Item | Details |
| --- | --- |
| Web stack | TypeScript, Vite, HTML Canvas, Web Audio API, Web Speech API |
| Play modes | Laptop/desktop: two players play simultaneously on one keyboard. Phone/iPad: single-player with a character choice and on-screen buttons. |
| Difficulty | Easy / Medium / Hard; higher settings add stars, enemies, and spikes and increase enemy speed. |
| Hosting | Vercel |
| Android | A separate Capacitor edition lives in a review branch under [PR #1](https://github.com/Jsingh-26/harbin-agam/pull/1). It is not merged into `main`. |

## Gameplay

- Move and jump across regular, moving, and bouncy platforms.
- Collect sparkling stars to increase your character's star count and trigger visual celebrations and spoken praise when supported by the browser.
- Stomp enemies from above to defeat them. Other enemy contact and spikes cost a heart, with a short period of invulnerability after damage.
- When all hearts are lost, respawn at the start with full hearts and keep the stars already collected.
- Stand near the glowing switch and press your Action control to open the door. Walk into the rainbow exit to win; collecting every star is optional.
- Use the mute button to toggle sound and speech.

## Controls

| Player or device | Move left / right | Jump | Action: open the door near the switch |
| --- | --- | --- | --- |
| cyan character (keyboard) | A / D | W | S |
| orange character (keyboard) | Left / Right arrows | Up arrow | Down arrow |
| Phone / iPad (either character, single-player) | On-screen Left / Right buttons | On-screen JUMP button | On-screen ACTION button |

Choose Laptop, Phone, or iPad on the opening screen, then choose a difficulty. Phone and iPad play also ask you to select one character. Hold a direction button to keep moving.

## Run locally

Use **Node.js 22.12+** and npm. The locked Vite version requires a recent Node.js release.

```bash
git clone https://github.com/Jsingh-26/harbin-agam.git platform-adventure
cd platform-adventure
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build:

```bash
npm run build
```

The build runs the TypeScript compiler and Vite and writes static files to `dist/`. Use `npm run preview` to preview that build locally.

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html` | HTML shell and module entry point. |
| `src/main.ts` | Device, difficulty, and character selection; instructions and win screens; touch buttons; mute control; game startup. |
| `src/game.ts` | Fixed-step game loop, level setup, camera and canvas sizing, collisions, star collection, switch/door interaction, respawning, win detection, and HUD. |
| `src/entities/` | Player, platform, star, enemy, spike, switch, door, exit, and particle classes with their rendering and behavior. |
| `src/audio.ts` | Web Audio sound effects and background music, audio unlocking, and Web Speech praise and prompts. |
| `src/style.css` | Screen layouts, buttons, canvas presentation, and touch-control styling. |
| `package.json` / `package-lock.json` | npm scripts, development dependencies, and locked dependency versions. |
| `tsconfig.json` | TypeScript compiler configuration. |
| `docs/images/gameplay.png` | Gameplay screenshot shown above. |

The web game runs in the browser with no backend, account system, or saved progress. The Android project belongs to the separate review branch linked above.
