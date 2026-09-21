import { registerPlugin } from '@capacitor/core'
import { Game } from './game'
import type { CharacterId, Difficulty } from './game'
import { unlockAudio } from './audio'

const app = document.querySelector<HTMLDivElement>('#app')!
const UpdateCheck = registerPlugin<{ check(): Promise<{ status: string; version?: string; message?: string }> }>('UpdateCheck')
type Settings = { muted: boolean; haptics: boolean; reducedMotion: boolean; difficulty: Difficulty }
const saved = (() => { try { return JSON.parse(localStorage.getItem('harbin-agam-mobile-settings') || '{}') } catch { return {} } })() as Partial<Settings>
const settings: Settings = { muted: saved.muted ?? false, haptics: saved.haptics ?? true, reducedMotion: saved.reducedMotion ?? false, difficulty: saved.difficulty ?? 'easy' }
let character: CharacterId = 'harbin'
let game: Game | null = null
let paused = false
let actionWasAvailable = false
let hintTimer = 0

const shell = document.createElement('main')
shell.className = 'mobile-shell'
shell.innerHTML = `
  <section class="mobile-menu" id="mobile-menu">
    <div class="story-card">
      <div class="stars" aria-hidden="true">✦ ✧ ✦</div>
      <h1>Harbin <span>&amp;</span> Agam</h1>
      <p>A little rainbow adventure</p>
      <div class="kid-picks" role="group" aria-label="Choose your hero">
        <button class="kid-card harbin selected" data-kid="harbin"><i>H</i><b>Harbin</b><small>cyan star</small></button>
        <button class="kid-card agam" data-kid="agam"><i>A</i><b>Agam</b><small>orange sun</small></button>
      </div>
      <button class="mobile-play" id="mobile-play">Play</button>
      <button class="quiet-button" id="menu-settings">Settings</button>
    </div>
  </section>
  <section class="mobile-game hidden" id="mobile-game">
    <canvas id="mobile-canvas"></canvas>
    <div class="gesture-layer" id="gesture-layer" aria-label="Game area. Swipe left or right to walk. Swipe up to jump."></div>
    <button class="pause-orb" id="pause-button" aria-label="Pause">Ⅱ</button>
    <div class="gesture-hint hidden" id="gesture-hint"><b>How to play</b><span>Swipe left or right to walk</span><span>Swipe up to jump</span><span>Tap the glowing switch to act</span><span>Tap anywhere else to stop</span></div>
  </section>
  <div class="modal hidden" id="pause-modal" role="dialog" aria-modal="true">
    <div class="modal-card">
      <h2 id="modal-title">Paused</h2>
      <p class="how-to">Swipe left or right to walk &middot; Swipe up to jump &middot; Tap to act or stop</p>
      <button class="mobile-play" id="resume-button">Keep playing</button>
      <label><span>Sound</span><input type="checkbox" id="sound-toggle"></label>
      <label><span>Light haptics</span><input type="checkbox" id="haptic-toggle"></label>
      <label><span>Reduced motion</span><input type="checkbox" id="motion-toggle"></label>
      <label><span>Difficulty</span><select id="difficulty-select"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
      <button class="quiet-button" id="update-button">Check for updates</button>
      <p class="update-status" id="update-status"></p>
      <button class="quiet-button" id="home-button">Back to home</button>
    </div>
  </div>
  <section class="mobile-win hidden" id="mobile-win"><div class="story-card"><div class="big-rainbow">🌈</div><h1>Wonderful!</h1><p id="win-copy"></p><button class="mobile-play" id="again-button">Play again</button><button class="quiet-button" id="win-home">Home</button></div></section>
`
app.appendChild(shell)

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const menu = $('mobile-menu'), gameView = $('mobile-game'), modal = $('pause-modal'), win = $('mobile-win')
const canvas = $<HTMLCanvasElement>('mobile-canvas'), gestureLayer = $('gesture-layer')
const persist = () => { try { localStorage.setItem('harbin-agam-mobile-settings', JSON.stringify(settings)) } catch { /* storage unavailable */ } }
const haptic = (pattern: number | number[] = 12) => { if (settings.haptics) navigator.vibrate?.(pattern) }

function showOnly(el: HTMLElement) { [menu, gameView, win].forEach(x => x.classList.add('hidden')); el.classList.remove('hidden') }
function syncSettings() {
  $<HTMLInputElement>('sound-toggle').checked = !settings.muted
  $<HTMLInputElement>('haptic-toggle').checked = settings.haptics
  $<HTMLInputElement>('motion-toggle').checked = settings.reducedMotion
  $<HTMLSelectElement>('difficulty-select').value = settings.difficulty
}
function setPaused(value: boolean) { paused = value; if (value) clearGestures(); game?.setPaused(value); modal.classList.toggle('hidden', !value); if (value) syncSettings() }

shell.querySelectorAll<HTMLElement>('[data-kid]').forEach(btn => btn.addEventListener('click', () => {
  character = btn.dataset.kid as CharacterId
  shell.querySelectorAll('[data-kid]').forEach(x => x.classList.toggle('selected', x === btn)); haptic()
}))

function start() {
  game?.destroy(); clearGestures(); void unlockAudio(); showOnly(gameView); modal.classList.add('hidden'); paused = false; actionWasAvailable = false
  game = new Game(canvas, settings.difficulty, settings.muted, (h, a) => {
    game?.destroy(); game = null; clearGestures(); $('win-copy').textContent = `${character === 'harbin' ? 'Harbin' : 'Agam'} found ${h + a} stars!`; showOnly(win); haptic([35, 40, 70])
  }, '1p', character, {
    assistedJump: true,
    reducedMotion: settings.reducedMotion,
    maxParticles: 80,
    objectiveStyle: 'toast',
    gestureHints: true,
    onActionAvailable: (available) => { if (available && !actionWasAvailable) haptic(8); actionWasAvailable = available },
    onImpact: () => haptic()
  })
  game.start()
  const hint = $('gesture-hint')
  hint.classList.remove('hidden')
  window.clearTimeout(hintTimer)
  hintTimer = window.setTimeout(() => hint.classList.add('hidden'), 6000)
}
$('mobile-play').addEventListener('click', start); $('again-button').addEventListener('click', start)
$('menu-settings').addEventListener('click', () => { modal.classList.remove('hidden'); syncSettings(); $('resume-button').classList.add('hidden'); $('modal-title').textContent = 'Settings' })
$('pause-button').addEventListener('click', () => { $('resume-button').classList.remove('hidden'); $('modal-title').textContent = 'Paused'; setPaused(true) })
$('resume-button').addEventListener('click', () => setPaused(false))
function home() { game?.destroy(); game = null; clearGestures(); modal.classList.add('hidden'); showOnly(menu) }
$('home-button').addEventListener('click', home); $('win-home').addEventListener('click', home)
$<HTMLInputElement>('sound-toggle').addEventListener('change', e => { settings.muted = !(e.target as HTMLInputElement).checked; game?.setMuted(settings.muted); persist() })
$<HTMLInputElement>('haptic-toggle').addEventListener('change', e => { settings.haptics = (e.target as HTMLInputElement).checked; persist(); haptic() })
$<HTMLInputElement>('motion-toggle').addEventListener('change', e => { settings.reducedMotion = (e.target as HTMLInputElement).checked; game?.setReducedMotion(settings.reducedMotion); persist() })
$<HTMLSelectElement>('difficulty-select').addEventListener('change', e => { settings.difficulty = (e.target as HTMLSelectElement).value as Difficulty; persist() })

$('update-button').addEventListener('click', async () => {
  const status = $('update-status')
  status.textContent = 'Checking...'
  haptic()
  try {
    const result = await UpdateCheck.check()
    if (result.status === 'latest') status.textContent = 'You have the newest version'
    else if (result.status === 'updating') status.textContent = `Update ${result.version ?? ''} found - follow the update prompt`
    else if (result.status === 'unavailable') status.textContent = 'Updates arrive through the Firebase app once it is set up'
    else status.textContent = `Could not check: ${result.message ?? 'please try again later'}`
  } catch {
    status.textContent = 'Could not check for updates yet'
  }
})

document.addEventListener('visibilitychange', () => { if (document.hidden && game) setPaused(true) })

// ---- Gesture controls: no visible buttons. A completed swipe left or right
// starts walking that way (no holding), swipe up jumps, tap the glowing switch
// to act, tap anywhere else to stop walking. ----

function currentKeys() { return character === 'harbin' ? { left: 'a', right: 'd', jump: 'w', action: 's' } : { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', action: 'arrowdown' } }

type PointerTrack = { startX: number; startY: number; lastX: number; lastY: number; startT: number; moved: number }
const pointers = new Map<number, PointerTrack>()
let moveDir: 'left' | 'right' | null = null

function canvasScale() { const r = canvas.getBoundingClientRect(); return { sx: r.width / Math.max(1, canvas.width), sy: r.height / Math.max(1, canvas.height) } }
function gesturesActive() { return Boolean(game) && !paused }

function applyMove(dir: 'left' | 'right' | null) {
  if (dir === moveDir) return
  const keys = currentKeys()
  game?.releaseKey(keys.left); game?.releaseKey(keys.right)
  moveDir = dir
  if (dir) { game?.pressKey(keys[dir]); haptic(6) }
}

function doJump() {
  const keys = currentKeys()
  game?.pressKey(keys.jump)
  haptic(10)
  window.setTimeout(() => game?.releaseKey(keys.jump), 90)
}

function trySwitch(e: PointerEvent): boolean {
  if (!game || !game.isActionAvailableNow()) return false
  const sp = game.getSwitchScreenPoint()
  if (!sp) return false
  const rect = canvas.getBoundingClientRect()
  const { sx, sy } = canvasScale()
  const dx = e.clientX - (rect.left + sp.x * sx)
  const dy = e.clientY - (rect.top + sp.y * sy)
  if (dx * dx + dy * dy > 90 * 90) return false
  const keys = currentKeys()
  game.pressKey(keys.action)
  haptic([15, 40, 15])
  window.setTimeout(() => game?.releaseKey(keys.action), 120)
  return true
}

// Classify one completed touch: tap, swipe up (jump), or swipe sideways (walk).
function finishGesture(e: PointerEvent, track: PointerTrack) {
  if (!game) return
  const dx = track.lastX - track.startX
  const dy = track.lastY - track.startY
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  if (track.moved < 16 && performance.now() - track.startT <= 500) {
    if (!trySwitch(e)) applyMove(null) // tap: act on the switch, otherwise stop
    return
  }
  if (ady > 34 && ady > adx && dy < 0) { doJump(); return }
  if (adx > 40 && adx > ady) applyMove(dx > 0 ? 'right' : 'left')
}

function clearGestures() {
  pointers.clear()
  applyMove(null)
}

gestureLayer.addEventListener('pointerdown', e => {
  if (!gesturesActive()) return
  e.preventDefault()
  try { gestureLayer.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
  $('gesture-hint').classList.add('hidden')
  pointers.set(e.pointerId, { startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, startT: performance.now(), moved: 0 })
})
gestureLayer.addEventListener('pointermove', e => {
  const track = pointers.get(e.pointerId)
  if (!track || !gesturesActive()) return
  track.moved = Math.max(track.moved, Math.hypot(e.clientX - track.startX, e.clientY - track.startY))
  track.lastX = e.clientX; track.lastY = e.clientY
})
function endPointer(e: PointerEvent, cancelled: boolean) {
  const track = pointers.get(e.pointerId)
  if (!track) return
  pointers.delete(e.pointerId)
  if (!cancelled && gesturesActive()) finishGesture(e, track)
}
gestureLayer.addEventListener('pointerup', e => endPointer(e, false))
gestureLayer.addEventListener('pointercancel', e => endPointer(e, true))
gestureLayer.addEventListener('contextmenu', e => e.preventDefault())
