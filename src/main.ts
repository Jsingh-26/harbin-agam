import './style.css'
import { Game } from './game'
import type { CharacterId, Difficulty, PlayMode } from './game'
import { unlockAudio } from './audio'

type DeviceChoice = 'laptop' | 'phone' | 'ipad'

const app = document.querySelector<HTMLDivElement>('#app')!

const muteButton = document.createElement('button')
muteButton.className = 'mute-button'
muteButton.type = 'button'
muteButton.setAttribute('aria-label', 'Mute')
muteButton.innerHTML = '🔊'
document.body.appendChild(muteButton)

function detectDefaultDevice(): DeviceChoice {
  const wide = window.innerWidth >= 1024
  const fine = window.matchMedia('(pointer: fine)').matches
  const hover = window.matchMedia('(hover: hover)').matches
  const coarse = window.matchMedia('(pointer: coarse)').matches

  // Laptop/desktop: width >= 1024 AND a fine pointer/hover if available, otherwise width >= 1024
  if (coarse && !hover) return window.innerWidth >= 768 ? 'ipad' : 'phone'
  if (wide && (fine || hover)) return 'laptop'
  if (wide && !coarse) return 'laptop'
  if (wide) return 'laptop'

  // Tablets (including iPad) are typically coarse-pointer and mid-width
  if (coarse && window.innerWidth >= 768) return 'ipad'
  return 'phone'
}

let selectedDevice: DeviceChoice = detectDefaultDevice()
let selectedDifficulty: Difficulty = 'easy'
let selectedCharacter: CharacterId = 'harbin'
let isMuted = false
let game: Game | null = null
let gamePlaying = false

function isTouchDevice(device: DeviceChoice): boolean {
  return device === 'phone' || device === 'ipad'
}

function playModeFor(device: DeviceChoice): PlayMode {
  return isTouchDevice(device) ? '1p' : '2p'
}

// ---------- screens ----------
const titleScreen = document.createElement('div')
titleScreen.className = 'screen active'
titleScreen.id = 'title-screen'
titleScreen.innerHTML = `
  <h1 class="title">Harbin &amp; Agam</h1>
  <p class="subtitle" id="title-subtitle">A kids adventure!</p>

  <p class="section-label">What are you playing on?</p>
  <div class="choice-row" id="device-buttons">
    <button class="button" type="button" data-device="laptop">Laptop</button>
    <button class="button secondary" type="button" data-device="phone">Phone</button>
    <button class="button" type="button" data-device="ipad" style="background:#7c3aed;box-shadow:0 8px 0 #5b21b6, 0 12px 20px rgba(0,0,0,0.3);">iPad</button>
  </div>
  <p class="hint" id="device-hint"></p>

  <p class="section-label">Pick Difficulty:</p>
  <div class="difficulty-buttons" id="difficulty-buttons">
    <button class="button" type="button" data-difficulty="easy">EASY ⭐</button>
    <button class="button secondary" type="button" data-difficulty="medium">MEDIUM ⭐⭐</button>
    <button class="button danger" type="button" data-difficulty="hard">HARD ⭐⭐⭐</button>
  </div>

  <button class="button play-cta" type="button" id="play-button">PLAY!</button>
`

const characterScreen = document.createElement('div')
characterScreen.className = 'screen'
characterScreen.id = 'character-screen'
characterScreen.innerHTML = `
  <h1 class="title">Who is playing?</h1>
  <p class="subtitle">Only that child is in the level</p>
  <div class="character-row">
    <button class="character-card harbin" type="button" data-character="harbin">
      <span class="character-swatch" style="background:#00CED1;"></span>
      <span class="character-name">Harbin</span>
      <span class="character-meta">Girl · older · cyan</span>
    </button>
    <button class="character-card agam" type="button" data-character="agam">
      <span class="character-swatch" style="background:#FFA500;"></span>
      <span class="character-name">Agam</span>
      <span class="character-meta">Boy · younger · orange</span>
    </button>
  </div>
`

const howToScreen = document.createElement('div')
howToScreen.className = 'screen'
howToScreen.id = 'howto-screen'

const winScreen = document.createElement('div')
winScreen.className = 'screen'
winScreen.id = 'win-screen'
winScreen.innerHTML = `
  <h1 class="title">🎉 YOU WIN! 🎉</h1>
  <div class="win-stats" id="win-stats"></div>
  <button class="button" type="button" id="play-again-button">PLAY AGAIN</button>
  <button class="button secondary" type="button" id="home-button">HOME</button>
`

app.appendChild(titleScreen)
app.appendChild(characterScreen)
app.appendChild(howToScreen)
app.appendChild(winScreen)

const canvas = document.createElement('canvas')
canvas.id = 'game-canvas'
app.appendChild(canvas)

// ---------- touch controls (shown only during 1P play) ----------
const touchControls = document.createElement('div')
touchControls.className = 'touch-controls hidden'
touchControls.id = 'touch-controls'
touchControls.innerHTML = `
  <div class="touch-cluster touch-left">
    <button class="touch-btn" type="button" data-touch="left" aria-label="Left">◀</button>
    <button class="touch-btn" type="button" data-touch="right" aria-label="Right">▶</button>
  </div>
  <div class="touch-cluster touch-right">
    <button class="touch-btn touch-action" type="button" data-touch="action">ACTION</button>
    <button class="touch-btn touch-jump" type="button" data-touch="jump">JUMP</button>
  </div>
`
document.body.appendChild(touchControls)

function keysForCharacter(character: CharacterId): Record<'left' | 'right' | 'jump' | 'action', string> {
  if (character === 'harbin') {
    return { left: 'a', right: 'd', jump: 'w', action: 's' }
  }
  return { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', action: 'arrowdown' }
}

function bindHoldButton(el: HTMLElement, onDown: () => void, onUp: () => void) {
  const pointers = new Set<number>()
  const down = (e: PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (pointers.has(e.pointerId)) return
    pointers.add(e.pointerId)
    try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    el.classList.add('pressed')
    onDown()
  }
  const up = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return
    pointers.delete(e.pointerId)
    e.preventDefault()
    if (pointers.size === 0) {
      el.classList.remove('pressed')
      onUp()
    }
  }
  el.addEventListener('pointerdown', down)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
  el.addEventListener('lostpointercapture', up)
  el.addEventListener('contextmenu', (e) => e.preventDefault())
}

touchControls.querySelectorAll<HTMLElement>('[data-touch]').forEach((btn) => {
  const action = btn.dataset.touch as 'left' | 'right' | 'jump' | 'action'
  bindHoldButton(
    btn,
    () => {
      if (!game) return
      const map = keysForCharacter(selectedCharacter)
      game.pressKey(map[action])
    },
    () => {
      if (!game) return
      const map = keysForCharacter(selectedCharacter)
      game.releaseKey(map[action])
    }
  )
})

function showTouchControls(show: boolean) {
  touchControls.classList.toggle('hidden', !show)
}

// ---------- audio ----------
function updateMuteButton() {
  muteButton.innerHTML = isMuted ? '🔇' : '🔊'
  muteButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute')
}

muteButton.addEventListener('click', () => {
  void unlockAudio()
  isMuted = !isMuted
  updateMuteButton()
  if (game) game.setMuted(isMuted)
})

document.addEventListener('pointerdown', () => { void unlockAudio() }, { once: true })

// ---------- UI helpers ----------
function showScreen(el: HTMLElement | null) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'))
  el?.classList.add('active')
}

function markChoice(container: HTMLElement, selector: string, value: string, attr: string) {
  container.querySelectorAll(selector).forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLElement).dataset[attr] === value)
  })
}

function updateDeviceHint() {
  const hint = document.getElementById('device-hint')
  const subtitle = document.getElementById('title-subtitle')
  if (!hint || !subtitle) return
  if (selectedDevice === 'laptop') {
    subtitle.textContent = 'Same-screen 2-player adventure!'
    hint.textContent = 'Laptop: Harbin uses WASD, Agam uses arrow keys. Both play at the same time.'
  } else if (selectedDevice === 'ipad') {
    subtitle.textContent = 'Single-player touch adventure!'
    hint.textContent = 'iPad: one player with on-screen buttons. Pick Harbin or Agam next.'
  } else {
    subtitle.textContent = 'Single-player touch adventure!'
    hint.textContent = 'Phone: one player with on-screen buttons. Pick Harbin or Agam next.'
  }
}

function fillHowTo() {
  const touch = isTouchDevice(selectedDevice)
  const kid = selectedCharacter === 'harbin' ? 'Harbin' : 'Agam'
  const color = selectedCharacter === 'harbin' ? '#00CED1' : '#FFA500'

  if (touch) {
    howToScreen.innerHTML = `
      <h1 class="title">How to Play</h1>
      <p class="subtitle" style="color:${color};">You are ${kid}!</p>
      <div class="controls">
        <div class="player-controls">
          <h3>Touch buttons</h3>
          <div class="control-item"><span class="key">◀ ▶</span><span>Move</span></div>
          <div class="control-item"><span class="key">JUMP</span><span>Jump</span></div>
          <div class="control-item"><span class="key">ACTION</span><span>Open the door</span></div>
        </div>
      </div>
      <div class="instructions">
        <ul class="instruction-list">
          <li><span class="emoji">🏃</span> Move and jump with the big buttons</li>
          <li><span class="emoji">⭐</span> Grab the sparkling stars</li>
          <li><span class="emoji">🌈</span> Reach the rainbow to win!</li>
        </ul>
      </div>
      <button class="button" type="button" id="start-button">START GAME!</button>
    `
  } else {
    howToScreen.innerHTML = `
      <h1 class="title">How to Play</h1>
      <p class="subtitle">Both play at the same time — not turns!</p>
      <div class="controls">
        <div class="player-controls" style="background: rgba(0, 206, 209, 0.3);">
          <h3 style="color: #00CED1;">Harbin</h3>
          <div class="control-item"><span class="key">W</span><span>Jump</span></div>
          <div class="control-item"><span class="key">A</span><span>Left</span></div>
          <div class="control-item"><span class="key">D</span><span>Right</span></div>
        </div>
        <div class="player-controls" style="background: rgba(255, 165, 0, 0.3);">
          <h3 style="color: #FFA500;">Agam</h3>
          <div class="control-item"><span class="key">↑</span><span>Jump</span></div>
          <div class="control-item"><span class="key">←</span><span>Left</span></div>
          <div class="control-item"><span class="key">→</span><span>Right</span></div>
        </div>
      </div>
      <div class="instructions">
        <ul class="instruction-list">
          <li><span class="emoji">🏃</span> Move and jump</li>
          <li><span class="emoji">⭐</span> Grab the sparkling stars</li>
          <li><span class="emoji">🌈</span> Reach the rainbow to win!</li>
        </ul>
      </div>
      <button class="button" type="button" id="start-button">START GAME!</button>
    `
  }

  document.getElementById('start-button')?.addEventListener('click', () => {
    showScreen(null)
    void unlockAudio()
    startGame()
  })
}

function syncTitleChoices() {
  markChoice(titleScreen, '[data-device]', selectedDevice, 'device')
  markChoice(titleScreen, '[data-difficulty]', selectedDifficulty, 'difficulty')
  updateDeviceHint()
}

titleScreen.querySelectorAll('[data-device]').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedDevice = (btn as HTMLElement).dataset.device as DeviceChoice
    syncTitleChoices()
  })
})

titleScreen.querySelectorAll('[data-difficulty]').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedDifficulty = (btn as HTMLElement).dataset.difficulty as Difficulty
    syncTitleChoices()
  })
})

document.getElementById('play-button')?.addEventListener('click', () => {
  void unlockAudio()
  if (isTouchDevice(selectedDevice)) {
    showScreen(characterScreen)
  } else {
    fillHowTo()
    showScreen(howToScreen)
  }
})

characterScreen.querySelectorAll('[data-character]').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedCharacter = (btn as HTMLElement).dataset.character as CharacterId
    fillHowTo()
    showScreen(howToScreen)
  })
})

document.getElementById('play-again-button')?.addEventListener('click', () => {
  showScreen(null)
  startGame()
})

document.getElementById('home-button')?.addEventListener('click', () => {
  if (game) {
    game.destroy()
    game = null
  }
  gamePlaying = false
  showTouchControls(false)
  document.body.classList.remove('playing')
  showScreen(titleScreen)
})

function startGame() {
  if (game) game.destroy()
  const mode = playModeFor(selectedDevice)
  gamePlaying = true
  document.body.classList.add('playing')
  showTouchControls(mode === '1p')

  game = new Game(
    canvas,
    selectedDifficulty,
    isMuted,
    (harbinStars, agamStars) => {
      gamePlaying = false
      showTouchControls(false)
      document.body.classList.remove('playing')
      showWinScreen(harbinStars, agamStars)
    },
    mode,
    selectedCharacter
  )
  game.start()
}

function showWinScreen(harbinStars: number, agamStars: number) {
  const statsDiv = document.getElementById('win-stats')!
  if (playModeFor(selectedDevice) === '1p') {
    const name = selectedCharacter === 'harbin' ? 'Harbin' : 'Agam'
    const color = selectedCharacter === 'harbin' ? '#00CED1' : '#FFA500'
    const stars = selectedCharacter === 'harbin' ? harbinStars : agamStars
    statsDiv.innerHTML = `
      <div style="color: ${color};">Well done ${name}!</div>
      <div style="color: ${color};">${name} collected ${stars} stars!</div>
    `
  } else {
    statsDiv.innerHTML = `
      <div style="color: #00CED1;">Harbin collected ${harbinStars} stars!</div>
      <div style="color: #FFA500;">Agam collected ${agamStars} stars!</div>
      <div style="margin-top: 20px;">Total: ${harbinStars + agamStars} stars! ⭐</div>
    `
  }
  showScreen(winScreen)
}

// Block browser scroll / pinch-zoom during play (and on game keys/buttons)
document.addEventListener('touchmove', (e) => {
  if (gamePlaying) e.preventDefault()
}, { passive: false })

document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('gesturechange', (e) => e.preventDefault())
document.addEventListener('gestureend', (e) => e.preventDefault())

syncTitleChoices()
