# Harbin & Agam

A polished kids web game built with Vite and TypeScript. No backend, login, or saved progress.

**Harbin** (girl, cyan `#00CED1`, older) and **Agam** (boy, orange `#FFA500`, younger).

## Devices

Pick Laptop, Phone, or iPad on the first screen.

- Laptop / desktop: same-screen 2-player (not turns). Keyboard. Both kids play together.
- Phone: single-player with on-screen Left, Right, Jump, and Action. Pick Harbin or Agam. Only that child is in the level.
- iPad: same as phone (touch, 1-player, character pick).

Two-player is only on laptop. iPad is treated like a phone (1P touch).

The canvas fits the screen (contain / letterbox) on phones, iPad, and desktop. No 80 percent browser zoom needed.

## How to win

1. Move and jump around the level.
2. Grab sparkling stars (spoken praise plus a fullscreen overlay).
3. Stand near the glowing switch and press ACTION to OPEN THE DOOR.
4. Walk through the rainbow EXIT.

There is a mute button for speech and sound.

## Laptop controls (2-player)

Harbin (cyan): W jump, A left, D right, S ACTION

Agam (orange): Up jump, Left, Right, Down ACTION

Both play at the same time.

## Phone / iPad controls (1-player)

Big thumb buttons: Left / Right to move, JUMP, ACTION to open the door.
Hold a button to keep moving. They sit in the corners so they do not cover the whole playfield.

## Difficulty

Easy / Medium / Hard (more stars, enemies, and spikes on harder settings).

## Features

- Juice: squash/stretch, particles, camera shake
- Glowing switch prompt: press ACTION next to it to open the brown door, then walk through the rainbow EXIT
- Enemies defeated by stomping from above; spikes cost a heart
- Out of hearts? Respawn at the start with full hearts (stars kept) and a spoken "Try again"
- Web Speech API praise ("Well done" plus the child's name with Punjabi pronunciation) plus fullscreen overlay on stars
- Fixed-timestep updates: same game speed on 60 Hz and 120 Hz+ screens
- High-DPI sharp rendering in 2-player mode
- Mute button

## Running locally

Need Node.js 18+.

Use the scripts in package.json: install, dev, and production build. Output is in dist/ for static hosts.

## Technical details

- Vite plus TypeScript, canvas rendering
- Web Audio API plus Web Speech API
- Pure client-side, no database
- pointerdown / pointerup virtual controls; browser scroll and pinch-zoom blocked on game buttons
