import { Player } from './entities/Player'
import { Platform } from './entities/Platform'
import { Star } from './entities/Star'
import { Enemy } from './entities/Enemy'
import { Spike } from './entities/Spike'
import { Switch } from './entities/Switch'
import { Door } from './entities/Door'
import { Exit } from './entities/Exit'
import { Particle } from './entities/Particle'
import { AudioManager } from './audio'

export type PlayMode = '2p' | '1p'
export type CharacterId = 'harbin' | 'agam'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type GameOptions = {
  assistedJump?: boolean
  reducedMotion?: boolean
  maxParticles?: number
  onActionAvailable?: (visible: boolean) => void
  onImpact?: () => void
  /** 'banner' keeps the original bottom objective bar (default, used on web). 'toast' shows a brief fading message in the top safe area. */
  objectiveStyle?: 'banner' | 'toast'
  /** Reword in-world prompts for gesture controls (tap the switch instead of an ACTION button). */
  gestureHints?: boolean
}

export class Game {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width = 1280
  private height = 720
  private harbin: Player | null = null
  private agam: Player | null = null
  private platforms: Platform[] = []
  private stars: Star[] = []
  private enemies: Enemy[] = []
  private spikes: Spike[] = []
  private switch: Switch
  private door: Door
  private exit: Exit
  private particles: Particle[] = []
  private keys: Set<string> = new Set()
  private justPressed: Set<string> = new Set()
  private running = false
  private lastFrameTime = 0
  private accumulator = 0
  private static readonly STEP_MS = 1000 / 60
  private static readonly MAX_STEPS = 5
  private difficulty: Difficulty
  private audioManager: AudioManager
  private winCallback: (harbinStars: number, agamStars: number) => void
  private cameraShake = 0
  private flashAlpha = 0
  private celebrationOverlay: { name: string, alpha: number } | null = null
  private mode: PlayMode
  private character: CharacterId
  private onResize: () => void
  private onKeyDown: (e: KeyboardEvent) => void
  private onKeyUp: (e: KeyboardEvent) => void
  private onViewportResize: () => void
  private paused = false
  private reducedMotion = false
  private maxParticles = 200
  private onActionAvailable?: (visible: boolean) => void
  private onImpact?: () => void
  private objectiveStyle: 'banner' | 'toast' = 'banner'
  private gestureHints = false
  private toastText = ''
  private toastUntil = 0
  private prevDoorOpen = false

  constructor(
    canvas: HTMLCanvasElement,
    difficulty: Difficulty,
    muted: boolean,
    winCallback: (harbinStars: number, agamStars: number) => void,
    mode: PlayMode = '2p',
    character: CharacterId = 'harbin',
    options: GameOptions = {}
  ) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.difficulty = difficulty
    this.winCallback = winCallback
    this.audioManager = new AudioManager(muted)
    this.mode = mode
    this.character = character
    this.reducedMotion = options.reducedMotion ?? false
    this.maxParticles = options.maxParticles ?? 200
    this.onActionAvailable = options.onActionAvailable
    this.onImpact = options.onImpact
    this.objectiveStyle = options.objectiveStyle ?? 'banner'
    this.gestureHints = options.gestureHints ?? false

    this.onResize = () => this.resizeCanvas()
    this.onViewportResize = () => this.resizeCanvas()
    this.resizeCanvas()
    window.addEventListener('resize', this.onResize)
    window.visualViewport?.addEventListener('resize', this.onViewportResize)

    const spawn1p = this.mode === '1p'
    if (!spawn1p || this.character === 'harbin') {
      this.harbin = new Player(100, 500, '#00CED1', 'Harbin', 'w', 'a', 'd', 's', options.assistedJump)
    }
    if (!spawn1p || this.character === 'agam') {
      this.agam = new Player(200, 500, '#FFA500', 'Agam', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown', options.assistedJump)
    }

    this.createLevel()

    this.onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      this.keys.add(key)
      if (!e.repeat) this.justPressed.add(key)
      if (
        key === 'arrowup' || key === 'arrowdown' || key === 'arrowleft' || key === 'arrowright' ||
        key === 'w' || key === 'a' || key === 's' || key === 'd' ||
        key === ' '
      ) {
        e.preventDefault()
      }
    }
    this.onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', this.onKeyDown, { passive: false })
    window.addEventListener('keyup', this.onKeyUp)

    this.switch = new Switch(640, 630)
    this.door = new Door(1120, 500)
    this.exit = new Exit(1150, 500)
  }

  public pressKey(key: string) {
    const k = key.toLowerCase()
    if (!this.keys.has(k)) this.justPressed.add(k)
    this.keys.add(k)
  }

  public releaseKey(key: string) {
    this.keys.delete(key.toLowerCase())
  }

  public getActiveCharacter(): CharacterId {
    if (this.harbin && !this.agam) return 'harbin'
    if (this.agam && !this.harbin) return 'agam'
    return this.character
  }

  /** Player center in canvas pixels under the 1p camera. Null outside 1p mode. */
  public getPlayerScreenPoint(): { x: number; y: number } | null {
    if (this.mode !== '1p') return null
    const player = this.players[0]
    if (!player) return null
    const { scale, camX, camY } = this.camera1p()
    return { x: (player.x + player.width / 2 - camX) * scale, y: (player.y + player.height / 2 - camY) * scale }
  }

  /** Switch center in canvas pixels under the 1p camera. Null outside 1p mode. */
  public getSwitchScreenPoint(): { x: number; y: number } | null {
    if (this.mode !== '1p') return null
    const { scale, camX, camY } = this.camera1p()
    return { x: (this.switch.x + this.switch.width / 2 - camX) * scale, y: (this.switch.y + this.switch.height / 2 - camY) * scale }
  }

  public isActionAvailableNow(): boolean {
    return !this.door.isOpen && this.playersNearSwitch()
  }

  private playersNearSwitch(): boolean {
    const switchCX = this.switch.x + this.switch.width / 2
    const switchCY = this.switch.y + this.switch.height / 2
    return this.players.some(player =>
      Math.abs(player.x + player.width / 2 - switchCX) < 80 &&
      Math.abs(player.y + player.height / 2 - switchCY) < 80
    )
  }

  private get players(): Player[] {
    return [this.harbin, this.agam].filter((p): p is Player => p !== null)
  }

  private resizeCanvas() {
    const vw = window.visualViewport?.width ?? document.documentElement.clientWidth ?? window.innerWidth
    const vh = window.visualViewport?.height ?? document.documentElement.clientHeight ?? window.innerHeight

    if (this.mode === '1p') {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      this.canvas.style.width = `${Math.floor(vw)}px`
      this.canvas.style.height = `${Math.floor(vh)}px`
      this.canvas.width = Math.max(1, Math.floor(vw * dpr))
      this.canvas.height = Math.max(1, Math.floor(vh * dpr))
      return
    }

    const scale = Math.min(vw / this.width, vh / this.height)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cssW = Math.max(1, Math.floor(this.width * scale))
    const cssH = Math.max(1, Math.floor(this.height * scale))
    this.canvas.style.width = `${cssW}px`
    this.canvas.style.height = `${cssH}px`
    // Backing store at device pixels so 2-player is sharp on high-DPI screens
    this.canvas.width = Math.max(1, Math.floor(cssW * dpr))
    this.canvas.height = Math.max(1, Math.floor(cssH * dpr))
  }

  private applyCamera() {
    const screenW = this.canvas.width
    const screenH = this.canvas.height
    const ctx = this.ctx

    if (this.mode !== '1p') {
      const scale = Math.min(screenW / this.width, screenH / this.height)
      const ox = (screenW - this.width * scale) / 2
      const oy = (screenH - this.height * scale) / 2
      ctx.setTransform(scale, 0, 0, scale, ox, oy)
      return { screenW, screenH }
    }

    const { scale, camX, camY } = this.camera1p()
    ctx.setTransform(scale, 0, 0, scale, -camX * scale, -camY * scale)
    return { screenW, screenH }
  }

  private camera1p() {
    const screenW = this.canvas.width
    const screenH = this.canvas.height
    const player = this.players[0]
    const aspect = screenW / Math.max(1, screenH)
    const cssW = parseFloat(this.canvas.style.width) || screenW
    let viewH = 400
    if (cssW >= 700) viewH = 520
    if (cssW >= 1000) viewH = 580
    if (aspect > 1.2) viewH = Math.min(560, viewH + 40)
    let viewW = viewH * aspect
    if (viewW < 360) {
      viewW = 360
      viewH = viewW / aspect
    }

    let camX = 0
    let camY = 0
    if (player) {
      camX = player.x + player.width / 2 - viewW / 2
      camY = player.y + player.height / 2 - viewH / 2
    }
    camX = Math.max(0, Math.min(Math.max(0, this.width - viewW), camX))
    camY = Math.max(0, Math.min(Math.max(0, this.height - viewH), camY))
    const scale = screenW / viewW
    return { scale, camX, camY }
  }

  private createLevel() {
    // Ground
    this.platforms.push(new Platform(0, 650, 1280, 70, '#2d5016'))

    // Platforms based on difficulty
    this.platforms.push(new Platform(300, 550, 150, 20, '#8B4513'))
    this.platforms.push(new Platform(500, 450, 150, 20, '#8B4513'))
    this.platforms.push(new Platform(700, 350, 200, 20, '#8B4513'))
    this.platforms.push(new Platform(950, 450, 150, 20, '#8B4513'))

    // Bouncy platforms
    this.platforms.push(new Platform(150, 500, 100, 15, '#FF1493', 'bouncy'))
    this.platforms.push(new Platform(1050, 580, 100, 15, '#FF1493', 'bouncy'))

    // Moving platform
    this.platforms.push(new Platform(400, 250, 120, 15, '#00CED1', 'moving'))

    // Stars
    const starCount = this.difficulty === 'easy' ? 8 : this.difficulty === 'medium' ? 12 : 16
    const starPositions = [
      [350, 500], [550, 400], [750, 300], [1000, 400],
      [200, 450], [450, 200], [850, 250], [1100, 550],
      [320, 350], [600, 280], [920, 320], [150, 300],
      [800, 500], [650, 180], [400, 550], [1150, 300]
    ]
    for (let i = 0; i < starCount; i++) {
      this.stars.push(new Star(starPositions[i][0], starPositions[i][1]))
    }

    // Enemies
    const enemyCount = this.difficulty === 'easy' ? 2 : this.difficulty === 'medium' ? 3 : 4
    const enemySpeed = this.difficulty === 'easy' ? 1 : this.difficulty === 'medium' ? 1.5 : 2
    for (let i = 0; i < enemyCount; i++) {
      this.enemies.push(new Enemy(400 + i * 180, 400, enemySpeed))
    }

    // Spikes
    const spikeCount = this.difficulty === 'easy' ? 2 : this.difficulty === 'medium' ? 3 : 5
    const spikePositions = [[600, 630], [800, 630], [1000, 630], [450, 630], [350, 630]]
    for (let i = 0; i < spikeCount; i++) {
      this.spikes.push(new Spike(spikePositions[i][0], spikePositions[i][1]))
    }
  }

  public start() {
    this.running = true
    this.lastFrameTime = 0
    this.accumulator = 0
    this.audioManager.startBackgroundMusic()
    requestAnimationFrame(this.gameLoop)
  }

  public destroy() {
    this.running = false
    this.audioManager.stopBackgroundMusic()
    window.removeEventListener('resize', this.onResize)
    window.visualViewport?.removeEventListener('resize', this.onViewportResize)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.keys.clear()
  }

  public setMuted(muted: boolean) { this.audioManager.setMuted(muted) }
  public setPaused(paused: boolean) {
    this.paused = paused
    this.keys.clear()
    this.justPressed.clear()
    this.lastFrameTime = 0
    if (paused) this.audioManager.stopBackgroundMusic()
    else this.audioManager.startBackgroundMusic()
  }
  public setReducedMotion(value: boolean) { this.reducedMotion = value }

  private gameLoop = (time: number) => {
    if (!this.running) return
    if (this.paused) { requestAnimationFrame(this.gameLoop); return }

    if (this.lastFrameTime === 0) this.lastFrameTime = time
    let elapsed = time - this.lastFrameTime
    this.lastFrameTime = time
    if (elapsed > 250) elapsed = 250 // tab was hidden; don't fast-forward
    this.accumulator += elapsed

    let steps = 0
    while (this.accumulator >= Game.STEP_MS && steps < Game.MAX_STEPS) {
      this.update()
      this.accumulator -= Game.STEP_MS
      steps++
    }
    if (steps === Game.MAX_STEPS) this.accumulator = 0

    this.render()

    requestAnimationFrame(this.gameLoop)
  }

  private separatePlayers() {
    if (!this.harbin || !this.agam) return
    const a = this.harbin
    const b = this.agam
    if (!a.checkCollision(b.x, b.y, b.width, b.height)) return

    const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
    const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
    if (overlapX <= 0 || overlapY <= 0) return

    if (overlapX < overlapY) {
      const push = overlapX / 2 + 0.5
      if (a.x + a.width / 2 < b.x + b.width / 2) {
        a.x -= push
        b.x += push
      } else {
        a.x += push
        b.x -= push
      }
      a.vx = 0
      b.vx = 0
    } else {
      const push = overlapY / 2 + 0.5
      if (a.y + a.height / 2 < b.y + b.height / 2) {
        a.y -= push
        b.y += push
        if (a.vy > 0) {
          a.vy = 0
          a.isGrounded = true
        }
      } else {
        a.y += push
        b.y -= push
        if (b.vy > 0) {
          b.vy = 0
          b.isGrounded = true
        }
      }
    }

    for (const p of [a, b]) {
      if (p.x < 0) p.x = 0
      if (p.x + p.width > this.width) p.x = this.width - p.width
    }
  }

  private handlePlayerHazards(player: Player) {

    this.enemies.forEach(enemy => {
      if (enemy.defeated) return
      if (player.checkCollision(enemy.x, enemy.y, enemy.width, enemy.height)) {
        if (player.vy > 0 && player.y + player.height < enemy.y + enemy.height / 2) {
          player.bounce()
          enemy.squash()
          this.audioManager.playStomp()
          this.createStarBurst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#8B0000')
        } else {
          player.takeDamage()
          this.audioManager.playHurt()
          this.cameraShake = this.reducedMotion ? 0 : 10
          this.onImpact?.()
        }
      }
    })

    this.spikes.forEach(spike => {
      if (player.checkCollision(spike.x, spike.y, spike.width, spike.height)) {
        player.takeDamage()
        this.audioManager.playHurt()
        this.cameraShake = this.reducedMotion ? 0 : 10
        this.onImpact?.()
      }
    })

    // Kid-friendly lose state: no game over, just a fresh try from the start
    if (player.health <= 0) {
      this.respawnPlayer(player)
    }
  }

  private respawnPlayer(player: Player) {
    const spawnX = player.name === 'Harbin' ? 100 : 200
    player.resetForRespawn(spawnX, 500)
    this.flashAlpha = 0.5
    this.audioManager.speakEncouragement(player.name)
  }

  private openDoor() {
    if (this.door.isOpen) return
    this.door.open()
    this.audioManager.playSwitch()
    this.audioManager.speak('The door is open! Go to the rainbow!')
    this.flashAlpha = 0.3
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16
      const speed = 1.5 + Math.random() * 2.5
      this.particles.push(new Particle(
        this.door.x + this.door.width / 2,
        this.door.y + this.door.height / 2,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#FFD700'
      ))
    }
  }

  private updateSwitchAndDoor() {
    if (this.door.isOpen) {
      this.switch.setPrompt(null)
      return
    }

    const switchCX = this.switch.x + this.switch.width / 2
    const switchCY = this.switch.y + this.switch.height / 2
    const near = this.players.filter(player =>
      Math.abs(player.x + player.width / 2 - switchCX) < 80 &&
      Math.abs(player.y + player.height / 2 - switchCY) < 80
    )

    this.onActionAvailable?.(near.length > 0)
    if (near.length === 0) {
      this.switch.setPrompt(null)
      return
    }

    if (this.mode === '1p') {
      this.switch.setPrompt(this.gestureHints ? 'Tap the switch!' : 'Press ACTION!')
    } else {
      const labels = near.map(player => (player.name === 'Harbin' ? 'S' : '\u2193'))
      this.switch.setPrompt(`Press ${labels.join(' or ')}!`)
    }

    for (const player of near) {
      if (this.justPressed.has(player.actionKey)) {
        this.openDoor()
        break
      }
    }
  }

  private update() {
    for (const player of this.players) {
      player.update(this.keys, this.platforms)
    }
    this.separatePlayers()

    this.platforms.forEach(p => p.update())
    this.enemies.forEach(e => e.update(this.platforms))
    this.enemies = this.enemies.filter(e => !e.isGone())

    // A closed door is a wall
    if (!this.door.isOpen) {
      for (const player of this.players) {
        if (player.checkCollision(this.door.x, this.door.y, this.door.width, this.door.height)) {
          if (player.x + player.width / 2 < this.door.x + this.door.width / 2) {
            player.x = this.door.x - player.width
          } else {
            player.x = this.door.x + this.door.width
          }
          player.vx = 0
        }
      }
    }

    this.updateSwitchAndDoor()

    if (this.particles.length > this.maxParticles) this.particles.splice(0, this.particles.length - this.maxParticles)
    this.particles = this.particles.filter(p => {
      p.update()
      return p.life > 0
    })

    this.stars = this.stars.filter(star => {
      for (const player of this.players) {
        if (player.checkCollision(star.x, star.y, star.size, star.size)) {
          player.collectStar()
          this.audioManager.playCollect()
          this.audioManager.speakWellDone(player.name)
          this.createStarBurst(star.x, star.y, player.color)
          this.showCelebration(player.name)
          return false
        }
      }
      return true
    })

    for (const player of this.players) {
      this.handlePlayerHazards(player)
    }

    // Win: reach the rainbow (the door must be open to get there)
    const someoneAtExit = this.players.some(player =>
      player.checkCollision(this.exit.x, this.exit.y, this.exit.width, this.exit.height)
    )
    if (someoneAtExit) {
      this.audioManager.playWin()
      this.running = false
      setTimeout(() => {
        this.winCallback(this.harbin?.starsCollected ?? 0, this.agam?.starsCollected ?? 0)
      }, 1000)
    }

    if (this.cameraShake > 0) {
      this.cameraShake *= 0.9
      if (this.cameraShake < 0.1) this.cameraShake = 0
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha -= 0.02
    }

    if (this.celebrationOverlay && !this.reducedMotion) {
      this.celebrationOverlay.alpha -= 0.008
      if (this.celebrationOverlay.alpha <= 0) {
        this.celebrationOverlay = null
      }
    }

    this.justPressed.clear()
  }

  private render() {
    const ctx = this.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.applyCamera()

    if (this.cameraShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.cameraShake
      const shakeY = (Math.random() - 0.5) * this.cameraShake
      ctx.translate(shakeX, shakeY)
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, '#B0E0E6')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)

    this.platforms.forEach(p => p.render(ctx))
    this.switch.render(ctx)
    this.door.render(ctx)
    this.exit.render(ctx)
    this.stars.forEach(s => s.render(ctx))
    this.enemies.forEach(e => e.render(ctx))
    this.spikes.forEach(s => s.render(ctx))

    for (const player of this.players) {
      player.render(ctx)
    }

    this.particles.forEach(p => p.render(ctx))

    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`
      ctx.fillRect(0, 0, this.width, this.height)
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.renderHUD()

    if (this.celebrationOverlay) {
      const w = this.canvas.width
      const h = this.canvas.height
      ctx.fillStyle = `rgba(255, 255, 255, ${this.celebrationOverlay.alpha * 0.8})`
      ctx.fillRect(0, 0, w, h)
      ctx.font = `bold ${Math.round(h * 0.08)}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const text = `Well done ${this.celebrationOverlay.name}!`
      ctx.fillStyle = `rgba(0, 0, 0, ${this.celebrationOverlay.alpha})`
      ctx.fillText(text, w / 2, h / 2)
      ctx.fillStyle = `rgba(255, 215, 0, ${this.celebrationOverlay.alpha})`
      ctx.fillText(text, w / 2 - 2, h / 2 - 2)
    }
  }

  private screenSize() {
    return { w: this.canvas.width, h: this.canvas.height }
  }

  private renderPlayerHud(player: Player, side: 'left' | 'right') {
    const { w } = this.screenSize()
    const padding = Math.max(12, Math.round(w * 0.02))
    const mobileHud = this.gestureHints
    if (mobileHud) {
      // Compact single-player card, always top-left: name + hearts on one
      // row, star count beneath. One kid plays on mobile, so the HUD never
      // sits on the right under the pause button.
      const rowPad = 12
      const boxW = Math.min(190, Math.round(w * 0.24))
      const boxH = 66
      const x = padding
      this.ctx.fillStyle = player.name === 'Harbin' ? 'rgba(0, 206, 209, 0.85)' : 'rgba(255, 165, 0, 0.85)'
      this.ctx.fillRect(x, padding, boxW, boxH)
      this.ctx.fillStyle = 'white'
      this.ctx.font = 'bold 19px Arial'
      this.ctx.textAlign = 'left'
      this.ctx.fillText(player.name, x + rowPad, padding + 24)
      const nameW = this.ctx.measureText(player.name).width
      const heartY = padding + 18
      for (let i = 0; i < player.maxHealth; i++) {
        this.ctx.fillStyle = i < player.health ? '#ff0000' : 'rgba(0, 0, 0, 0.35)'
        this.ctx.beginPath()
        this.ctx.arc(x + rowPad + nameW + 14 + i * 17, heartY, 6, 0, Math.PI * 2)
        this.ctx.fill()
      }
      this.ctx.fillStyle = '#FFD700'
      this.ctx.font = 'bold 16px Arial'
      this.ctx.textAlign = 'left'
      this.ctx.fillText(`⭐ × ${player.starsCollected}`, x + rowPad, padding + boxH - 12)
      return
    }
    const boxW = Math.min(240, Math.round(w * 0.28))
    const boxH = mobileHud ? Math.max(88, Math.round(w * 0.11)) : Math.max(56, Math.round(w * 0.07))
    const rowPad = mobileHud ? 12 : 10
    const x = side === 'left' ? padding : w - padding - boxW

    this.ctx.fillStyle = player.name === 'Harbin' ? 'rgba(0, 206, 209, 0.8)' : 'rgba(255, 165, 0, 0.8)'
    this.ctx.fillRect(x, padding, boxW, boxH)

    this.ctx.fillStyle = 'white'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = side === 'left' ? 'left' : 'right'
    const nameX = side === 'left' ? x + rowPad : x + boxW - rowPad
    this.ctx.fillText(player.name, nameX, padding + (mobileHud ? 28 : 30))

    const heartY = padding + (mobileHud ? 52 : 55)
    for (let i = 0; i < player.maxHealth; i++) {
      this.ctx.fillStyle = i < player.health ? '#ff0000' : '#555'
      this.ctx.beginPath()
      const hx = side === 'left' ? x + rowPad + i * 25 : x + boxW - rowPad - i * 25
      this.ctx.arc(hx, heartY, 8, 0, Math.PI * 2)
      this.ctx.fill()
    }

    this.ctx.fillStyle = '#FFD700'
    this.ctx.textAlign = mobileHud ? (side === 'left' ? 'left' : 'right') : 'left'
    const starX = mobileHud ? (side === 'left' ? x + rowPad : x + boxW - rowPad) : x + 100
    const starY = mobileHud ? padding + boxH - 12 : padding + 60
    this.ctx.fillText(`⭐ × ${player.starsCollected}`, starX, starY)
  }

  private renderHUD() {
    if (this.gestureHints) {
      const active = this.harbin ?? this.agam
      if (active) this.renderPlayerHud(active, 'left')
    } else {
      if (this.harbin) this.renderPlayerHud(this.harbin, 'left')
      if (this.agam) this.renderPlayerHud(this.agam, 'right')
    }

    if (this.objectiveStyle === 'toast') {
      this.renderObjectiveToast()
      return
    }

    const { w, h } = this.screenSize()
    const bannerH = Math.max(44, Math.round(h * 0.08))
    const bannerW = Math.min(w - 24, Math.round(w * 0.8))
    const bannerY = h - bannerH - (this.mode === '1p' ? Math.round(h * 0.18) : 16)
    this.ctx.fillStyle = 'rgba(0, 160, 0, 0.75)'
    this.ctx.fillRect((w - bannerW) / 2, bannerY, bannerW, bannerH)
    this.ctx.fillStyle = 'white'
    this.ctx.textAlign = 'center'
    const bannerText = this.door.isOpen
      ? 'Door open! Go to the rainbow to win!'
      : 'Find the glowing switch to open the door!'
    // Shrink the font until the message fits inside the banner
    let bannerFont = Math.max(16, Math.round(h * 0.035))
    this.ctx.font = `bold ${bannerFont}px Arial`
    while (bannerFont > 12 && this.ctx.measureText(bannerText).width > bannerW - 32) {
      bannerFont -= 2
      this.ctx.font = `bold ${bannerFont}px Arial`
    }
    this.ctx.fillText(bannerText, w / 2, bannerY + bannerH * 0.62)
  }

  private roundRectPath(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx
    const radius = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.arcTo(x + w, y, x + w, y + h, radius)
    ctx.arcTo(x + w, y + h, x, y + h, radius)
    ctx.arcTo(x, y + h, x, y, radius)
    ctx.arcTo(x, y, x + w, y, radius)
    ctx.closePath()
  }

  /** Brief objective message in the top safe area that fades out. Mobile gesture mode only;
   *  it never covers the player HUD, pause button, or the play field for long. */
  private renderObjectiveToast() {
    const now = performance.now()
    const doorOpen = this.door.isOpen
    if ((doorOpen && !this.prevDoorOpen) || this.toastUntil === 0) {
      this.toastText = doorOpen ? 'Door open! Go to the rainbow to win!' : 'Find the glowing switch to open the door!'
      this.toastUntil = now + 5200
    }
    this.prevDoorOpen = doorOpen
    if (now >= this.toastUntil) return

    const { w, h } = this.screenSize()
    const ctx = this.ctx
    const alpha = Math.min(1, (this.toastUntil - now) / 700)

    // Keep the toast clear of the player HUD box (top-left) and the DOM pause button (top-right).
    const padding = Math.max(12, Math.round(w * 0.02))
    const hudBoxW = this.gestureHints ? Math.min(190, Math.round(w * 0.24)) : Math.min(240, Math.round(w * 0.28))
    const leftClear = (this.harbin || this.agam) ? padding + hudBoxW + 24 : padding
    const rightClear = (!this.gestureHints && this.agam) ? padding + hudBoxW + 24 : Math.round(w * 0.09) + 24
    const zoneW = Math.max(160, w - leftClear - rightClear)

    let font = Math.max(26, Math.round(h * 0.042))
    ctx.font = `bold ${font}px Arial`
    while (font > 14 && ctx.measureText(this.toastText).width > zoneW - 48) {
      font -= 2
      ctx.font = `bold ${font}px Arial`
    }
    const pillW = Math.min(zoneW, ctx.measureText(this.toastText).width + 48)
    const pillH = Math.round(font * 2.2)
    const x = leftClear + Math.max(0, (zoneW - pillW) / 2)
    const y = Math.max(10, Math.round(h * 0.025))

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.fillStyle = 'rgba(13, 35, 64, 0.82)'
    this.roundRectPath(x, y, pillW, pillH, pillH / 2)
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.font = `bold ${font}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.toastText, x + pillW / 2, y + pillH / 2 + 1)
    ctx.restore()
  }

  private createStarBurst(x: number, y: number, color: string) {
    for (let i = 0; i < (this.reducedMotion ? 6 : 20); i++) {
      const angle = (Math.PI * 2 * i) / 20
      const speed = 2 + Math.random() * 3
      this.particles.push(new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color
      ))
    }
  }

  private showCelebration(name: string) {
    this.celebrationOverlay = { name, alpha: 1 }
  }
}
