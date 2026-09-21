import { Game } from './game'
import type { CharacterId, Difficulty } from './game'
import { unlockAudio } from './audio'

const app = document.querySelector<HTMLDivElement>('#app')!
type Settings = { muted: boolean; haptics: boolean; reducedMotion: boolean; difficulty: Difficulty }
const saved = JSON.parse(localStorage.getItem('harbin-agam-mobile-settings') || '{}') as Partial<Settings>
const settings: Settings = { muted: saved.muted ?? false, haptics: saved.haptics ?? true, reducedMotion: saved.reducedMotion ?? false, difficulty: saved.difficulty ?? 'easy' }
let character: CharacterId = 'harbin'
let game: Game | null = null
let paused = false
let actionVisible = false
let coachTimer = 0

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
    <button class="pause-orb" id="pause-button" aria-label="Pause">Ⅱ</button>
    <div class="coach" id="coach">Slide your thumb to move</div>
    <div class="thumb-zone" id="thumb-zone" aria-label="Move left or right"><div class="thumb-knob"></div><span>MOVE</span></div>
    <button class="jump-orb" id="jump-button"><span>↑</span>JUMP</button>
    <button class="action-orb hidden" id="action-button">✦ ACTION</button>
  </section>
  <div class="modal hidden" id="pause-modal" role="dialog" aria-modal="true">
    <div class="modal-card">
      <h2 id="modal-title">Paused</h2>
      <button class="mobile-play" id="resume-button">Keep playing</button>
      <label><span>Sound</span><input type="checkbox" id="sound-toggle"></label>
      <label><span>Light haptics</span><input type="checkbox" id="haptic-toggle"></label>
      <label><span>Reduced motion</span><input type="checkbox" id="motion-toggle"></label>
      <label><span>Difficulty</span><select id="difficulty-select"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
      <button class="quiet-button" id="home-button">Back to home</button>
    </div>
  </div>
  <section class="mobile-win hidden" id="mobile-win"><div class="story-card"><div class="big-rainbow">🌈</div><h1>Wonderful!</h1><p id="win-copy"></p><button class="mobile-play" id="again-button">Play again</button><button class="quiet-button" id="win-home">Home</button></div></section>
`
app.appendChild(shell)

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const menu = $('mobile-menu'), gameView = $('mobile-game'), modal = $('pause-modal'), win = $('mobile-win')
const canvas = $<HTMLCanvasElement>('mobile-canvas'), coach = $('coach'), actionButton = $('action-button')
const persist = () => localStorage.setItem('harbin-agam-mobile-settings', JSON.stringify(settings))
const haptic = (pattern: number | number[] = 12) => { if (settings.haptics) navigator.vibrate?.(pattern) }

function showOnly(el: HTMLElement) { [menu, gameView, win].forEach(x => x.classList.add('hidden')); el.classList.remove('hidden') }
function syncSettings() {
  $<HTMLInputElement>('sound-toggle').checked = !settings.muted
  $<HTMLInputElement>('haptic-toggle').checked = settings.haptics
  $<HTMLInputElement>('motion-toggle').checked = settings.reducedMotion
  $<HTMLSelectElement>('difficulty-select').value = settings.difficulty
}
function setPaused(value: boolean) { paused = value; game?.setPaused(value); modal.classList.toggle('hidden', !value); if (value) syncSettings() }
function updateAction(visible: boolean) { if (visible === actionVisible) return; actionVisible = visible; actionButton.classList.toggle('hidden', !visible); if (visible) haptic(8) }

shell.querySelectorAll<HTMLElement>('[data-kid]').forEach(btn => btn.addEventListener('click', () => {
  character = btn.dataset.kid as CharacterId
  shell.querySelectorAll('[data-kid]').forEach(x => x.classList.toggle('selected', x === btn)); haptic()
}))

function start() {
  game?.destroy(); void unlockAudio(); showOnly(gameView); modal.classList.add('hidden'); paused = false; updateAction(false)
  coach.textContent = 'Slide your thumb to move'; coach.classList.remove('hidden'); clearTimeout(coachTimer); coachTimer = window.setTimeout(() => coach.classList.add('hidden'), 3200)
  game = new Game(canvas, settings.difficulty, settings.muted, (h, a) => {
    game?.destroy(); game = null; $('win-copy').textContent = `${character === 'harbin' ? 'Harbin' : 'Agam'} found ${h + a} stars!`; showOnly(win); haptic([35, 40, 70])
  }, '1p', character, { assistedJump: true, reducedMotion: settings.reducedMotion, maxParticles: 80, onActionAvailable: updateAction, onImpact: () => haptic() })
  game.start()
}
$('mobile-play').addEventListener('click', start); $('again-button').addEventListener('click', start)
$('menu-settings').addEventListener('click', () => { modal.classList.remove('hidden'); syncSettings(); $('resume-button').classList.add('hidden'); $('modal-title').textContent = 'Settings' })
$('pause-button').addEventListener('click', () => { $('resume-button').classList.remove('hidden'); $('modal-title').textContent = 'Paused'; setPaused(true) })
$('resume-button').addEventListener('click', () => setPaused(false))
function home() { game?.destroy(); game = null; modal.classList.add('hidden'); showOnly(menu) }
$('home-button').addEventListener('click', home); $('win-home').addEventListener('click', home)
$<HTMLInputElement>('sound-toggle').addEventListener('change', e => { settings.muted = !(e.target as HTMLInputElement).checked; game?.setMuted(settings.muted); persist() })
$<HTMLInputElement>('haptic-toggle').addEventListener('change', e => { settings.haptics = (e.target as HTMLInputElement).checked; persist(); haptic() })
$<HTMLInputElement>('motion-toggle').addEventListener('change', e => { settings.reducedMotion = (e.target as HTMLInputElement).checked; game?.setReducedMotion(settings.reducedMotion); persist() })
$<HTMLSelectElement>('difficulty-select').addEventListener('change', e => { settings.difficulty = (e.target as HTMLSelectElement).value as Difficulty; persist() })

document.addEventListener('visibilitychange', () => { if (document.hidden && game) setPaused(true) })

function currentKeys() { return character === 'harbin' ? { left: 'a', right: 'd', jump: 'w', action: 's' } : { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', action: 'arrowdown' } }
const zone = $('thumb-zone'), knob = zone.querySelector<HTMLElement>('.thumb-knob')!
let movePointer: number | null = null, moveDirection: 'left'|'right'|null = null
function releaseMove() { const keys = currentKeys(); game?.releaseKey(keys.left); game?.releaseKey(keys.right); moveDirection = null; knob.style.transform = ''; zone.classList.remove('active') }
function moveAt(e: PointerEvent) { const r = zone.getBoundingClientRect(); const dx = Math.max(-36, Math.min(36, e.clientX - (r.left + r.width / 2))); knob.style.transform = `translateX(${dx}px)`; const next = Math.abs(dx) < 10 ? null : dx < 0 ? 'left' : 'right'; if (next !== moveDirection) { releaseMove(); moveDirection = next; if (next) game?.pressKey(currentKeys()[next]) } }
zone.addEventListener('pointerdown', e => { e.preventDefault(); movePointer=e.pointerId; zone.setPointerCapture(e.pointerId); zone.classList.add('active'); moveAt(e); coach.classList.add('hidden') })
zone.addEventListener('pointermove', e => { if(e.pointerId===movePointer) moveAt(e) })
zone.addEventListener('pointerup', e => { if(e.pointerId===movePointer){ movePointer=null; releaseMove() } }); zone.addEventListener('pointercancel', releaseMove)
function bindPress(el: HTMLElement, action: 'jump'|'action') { el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); game?.pressKey(currentKeys()[action]); el.classList.add('pressed'); haptic() }); const up=(e:PointerEvent)=>{game?.releaseKey(currentKeys()[action]);el.classList.remove('pressed');try{el.releasePointerCapture(e.pointerId)}catch{}}; el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up) }
bindPress($('jump-button'),'jump'); bindPress(actionButton,'action')
