import './style.css'
import { Game } from './game'

const app = document.querySelector<HTMLDivElement>('#app')!

// Create mute button
const muteButton = document.createElement('button')
muteButton.className = 'mute-button'
muteButton.innerHTML = '🔊'
document.body.appendChild(muteButton)

// Create screens
const titleScreen = document.createElement('div')
titleScreen.className = 'screen active'
titleScreen.id = 'title-screen'
titleScreen.innerHTML = `
  <h1 class="title">Harbin & Agam</h1>
  <p class="subtitle">2-Player Adventure!</p>
  <button class="button" id="play-button">PLAY!</button>
  <p class="subtitle">Pick Difficulty:</p>
  <div class="difficulty-buttons">
    <button class="button" data-difficulty="easy">EASY ⭐</button>
    <button class="button secondary" data-difficulty="medium">MEDIUM ⭐⭐</button>
    <button class="button danger" data-difficulty="hard">HARD ⭐⭐⭐</button>
  </div>
`

const howToScreen = document.createElement('div')
howToScreen.className = 'screen'
howToScreen.id = 'howto-screen'
howToScreen.innerHTML = `
  <h1 class="title">How to Play</h1>
  <div class="controls">
    <div class="player-controls" style="background: rgba(0, 206, 209, 0.3);">
      <h3 style="color: #00CED1;">Harbin</h3>
      <div class="control-item">
        <span class="key">W</span>
        <span>Jump</span>
      </div>
      <div class="control-item">
        <span class="key">A</span>
        <span>Left</span>
      </div>
      <div class="control-item">
        <span class="key">D</span>
        <span>Right</span>
      </div>
      <div class="control-item">
        <span class="key">S</span>
        <span>Action</span>
      </div>
    </div>
    <div class="player-controls" style="background: rgba(255, 165, 0, 0.3);">
      <h3 style="color: #FFA500;">Agam</h3>
      <div class="control-item">
        <span class="key">↑</span>
        <span>Jump</span>
      </div>
      <div class="control-item">
        <span class="key">←</span>
        <span>Left</span>
      </div>
      <div class="control-item">
        <span class="key">→</span>
        <span>Right</span>
      </div>
      <div class="control-item">
        <span class="key">↓</span>
        <span>Action</span>
      </div>
    </div>
  </div>
  <div class="instructions">
    <ul class="instruction-list">
      <li><span class="emoji">🏃</span> Move and jump around the level</li>
      <li><span class="emoji">⭐</span> Grab all the sparkling stars</li>
      <li><span class="emoji">🔘</span> Stand on the glowing switch and press ACTION to open the door</li>
      <li><span class="emoji">🌈</span> Both walk through the rainbow EXIT to win!</li>
    </ul>
  </div>
  <button class="button" id="start-button">START GAME!</button>
`

const winScreen = document.createElement('div')
winScreen.className = 'screen'
winScreen.id = 'win-screen'
winScreen.innerHTML = `
  <h1 class="title">🎉 YOU WIN! 🎉</h1>
  <div class="win-stats" id="win-stats"></div>
  <button class="button" id="play-again-button">PLAY AGAIN</button>
`

app.appendChild(titleScreen)
app.appendChild(howToScreen)
app.appendChild(winScreen)

// Create canvas
const canvas = document.createElement('canvas')
app.appendChild(canvas)

// Game instance
let game: Game | null = null
let selectedDifficulty: 'easy' | 'medium' | 'hard' = 'easy'
let isMuted = false

// Audio context for background music
let audioContext: AudioContext | null = null
let backgroundGainNode: GainNode | null = null
let backgroundOscillator: OscillatorNode | null = null

function startBackgroundMusic() {
  if (!audioContext) {
    audioContext = new AudioContext()
    backgroundGainNode = audioContext.createGain()
    backgroundGainNode.connect(audioContext.destination)
    backgroundGainNode.gain.value = isMuted ? 0 : 0.02
    
    // Simple happy melody loop
    const notes = [262, 294, 330, 392, 330, 294] // C D E G E D
    let noteIndex = 0
    
    function playNote() {
      if (!audioContext || !backgroundGainNode) return
      
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      
      osc.connect(gain)
      gain.connect(backgroundGainNode)
      
      osc.frequency.value = notes[noteIndex]
      osc.type = 'sine'
      
      gain.gain.setValueAtTime(0.02, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4)
      
      osc.start()
      osc.stop(audioContext.currentTime + 0.4)
      
      noteIndex = (noteIndex + 1) % notes.length
    }
    
    setInterval(playNote, 400)
  }
}

function updateMuteButton() {
  muteButton.innerHTML = isMuted ? '🔇' : '🔊'
  if (backgroundGainNode) {
    backgroundGainNode.gain.value = isMuted ? 0 : 0.02
  }
}

muteButton.addEventListener('click', () => {
  isMuted = !isMuted
  updateMuteButton()
  if (game) {
    game.setMuted(isMuted)
  }
})

// Title screen - difficulty selection
titleScreen.querySelectorAll('[data-difficulty]').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedDifficulty = (btn as HTMLElement).dataset.difficulty as 'easy' | 'medium' | 'hard'
    titleScreen.querySelectorAll('[data-difficulty]').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
  })
})

// Play button - go to how-to
document.getElementById('play-button')?.addEventListener('click', () => {
  titleScreen.classList.remove('active')
  howToScreen.classList.add('active')
  startBackgroundMusic()
})

// Start button - start game
document.getElementById('start-button')?.addEventListener('click', () => {
  howToScreen.classList.remove('active')
  startBackgroundMusic()
  startGame()
})

// Play again button
document.getElementById('play-again-button')?.addEventListener('click', () => {
  winScreen.classList.remove('active')
  startGame()
})

function startGame() {
  if (game) {
    game.destroy()
  }
  game = new Game(canvas, selectedDifficulty, isMuted, (harbinStars: number, agamStars: number) => {
    // Win callback
    showWinScreen(harbinStars, agamStars)
  })
  game.start()
}

function showWinScreen(harbinStars: number, agamStars: number) {
  const statsDiv = document.getElementById('win-stats')!
  statsDiv.innerHTML = `
    <div style="color: #00CED1;">Harbin collected ${harbinStars} stars!</div>
    <div style="color: #FFA500;">Agam collected ${agamStars} stars!</div>
    <div style="margin-top: 20px;">Total: ${harbinStars + agamStars} stars! ⭐</div>
  `
  winScreen.classList.add('active')
}
