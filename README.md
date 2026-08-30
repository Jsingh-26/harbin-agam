# Harbin & Agam

A polished same-screen local 2-player kids web game built with Vite and TypeScript.

## 🎮 How to Play

**Harbin** (Cyan) and **Agam** (Orange) team up to collect stars and reach the rainbow exit!

### Controls

**Harbin (Cyan):**
- W: Jump
- A: Move Left
- D: Move Right
- S: Action (activate switch)

**Agam (Orange):**
- ↑: Jump
- ←: Move Left
- →: Move Right
- ↓: Action (activate switch)

### Objective

1. **Move and jump** around the level
2. **Grab all the sparkling stars** for points
3. **Stand on the glowing switch and press ACTION** to open the brown door
4. **Both walk through the rainbow EXIT** to win!

### Features

- ✨ Colorful, kid-friendly graphics
- 🎯 Juice effects: squash/stretch, particles, screen shake
- 🔊 Web Speech API celebration when stars are collected
- 🎵 Background music and sound effects (mute button available)
- 🌟 Three difficulty levels: Easy, Medium, Hard
- 💪 Co-op gameplay - work together!
- 📱 Responsive canvas that fits any screen without zooming

## 🚀 Running Locally

### Prerequisites
- Node.js 18 or higher

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Then open your browser to the URL shown (typically http://localhost:5173)

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder, ready to deploy to any static hosting service.

## 🎯 Winning the Game

- The brown door blocks the rainbow EXIT until you press the switch
- When a player stands near the switch, a prompt will appear
- Press the ACTION button (S or ↓) to open the door
- When the door opens, both players can reach the rainbow EXIT
- At least one player must reach the EXIT to win
- Avoid enemies (red blocks) and spikes!
- You can stomp on enemies by jumping on them from above

## 🎨 Technical Details

- Built with Vite + TypeScript
- Canvas-based rendering with squash/stretch animations
- Web Audio API for sound effects
- Web Speech API for voice feedback
- No backend, no login, no database - pure client-side
- Responsive canvas that scales to fit any viewport

## 📦 Deployment

This game is designed to run as a static site and can be deployed to:
- Vercel (hobby tier compatible)
- Netlify
- GitHub Pages
- Any static hosting service

Just build the project and deploy the `dist/` folder.

Enjoy playing Harbin & Agam! 🌈⭐
