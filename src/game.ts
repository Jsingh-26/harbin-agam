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
  private running = false
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

  constructor(
    canvas: HTMLCanvasElement,
    difficulty: Difficulty,
    muted: boolean,
    winCallback: (harbinStars: number, agamStars: number) => void,
    mode: PlayMode = '2p',
    character: CharacterId = 'harbin'
  ) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.difficulty = difficulty
    this.winCallback = winCallback
    this.audioManager = new AudioManager(muted)
    this.mode = mode
    this.character = character

    this.onResize = () => this.resizeCanvas()
    this.onViewportResize = () => this.resizeCanvas()
    this.resizeCanvas()
    window.addEventListener('resize', this.onResize)
    window.visualViewport?.addEventListener('resize', this.onViewportResize)

    const spawn1p = this.mode === '1p'
    if (!spawn1p || this.character === 'harbin') {
      this.harbin = new Player(100, 500, '#00CED1', 'Harbin', 'w', 'a', 'd', 's')
    }
    if (!spawn1p || this.character === 'agam') {
      this.agam = new Player(200, 500, '#FFA500', 'Agam', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown')
    }

    this.createLevel()

    this.onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      this.keys.add(key)
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

    this.switch = new Switch(640, 600)
    this.door = new Door(1100, 400)
    this.door.open()
    this.exit = new Exit(1150, 400)
  }

  public pressKey(key: string) {
    this.keys.add(key.toLowerCase())
  }

  public releaseKey(key: string) {
    this.keys.delete(key.toLowerCase())
  }

  public getActiveCharacter(): CharacterId {
    if (this.harbin && !this.agam) return 'harbin'
    if (this.agam && !this.harbin) return 'agam'
    return this.character
  }

  private get players(): Player[] {
    return [this.harbin, this.agam].filter((p): p is Player => p !== null)
  }

  private resizeCanvas() {
    const vw = window.visualViewport?.width ?? document.documentElement.clientWidth ?? window.innerWidth
    const vh = window.visualViewport?.height ?? document.documentElement.clientHeight ?? window.innerHeight

    const scale = Math.min(vw / this.width, vh / this.height)

    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = `${Math.floor(this.width * scale)}px`
    this.canvas.style.height = `${Math.floor(this.height * scale)}px`
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
      this.enemies.push(new Enemy(400 + i * 250, 400, enemySpeed))
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
    this.audioManager.startBackgroundMusic()
    this.gameLoop()
  }

  public destroy() {
    this.running = false
    window.removeEventListener('resize', this.onResize)
    window.visualViewport?.removeEventListener('resize', this.onViewportResize)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.keys.clear()
  }

  public setMuted(muted: boolean) {
    this.audioManager.setMuted(muted)
  }

  private gameLoop = () => {
    if (!this.running) return

    this.update()
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
      if (player.checkCollision(enemy.x, enemy.y, enemy.width, enemy.height)) {
        if (player.vy > 0 && player.y + player.height < enemy.y + enemy.height / 2) {
          player.bounce()
          enemy.squash()
          this.audioManager.playJump()
        } else {
          player.takeDamage()
          this.audioManager.playHurt()
          this.cameraShake = 10
        }
      }
    })

    this.spikes.forEach(spike => {
      if (player.checkCollision(spike.x, spike.y, spike.width, spike.height)) {
        player.takeDamage()
        this.audioManager.playHurt()
        this.cameraShake = 10
      }
    })
  }

  private update() {
    for (const player of this.players) {
      player.update(this.keys, this.platforms)
    }
    this.separatePlayers()

    this.platforms.forEach(p => p.update())
    this.enemies.forEach(e => e.update(this.platforms))

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

    // Win: reach the rainbow. No switch.
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

    if (this.celebrationOverlay) {
      this.celebrationOverlay.alpha -= 0.008
      if (this.celebrationOverlay.alpha <= 0) {
        this.celebrationOverlay = null
      }
    }
  }

  private render() {
    this.ctx.save()

    if (this.cameraShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.cameraShake
      const shakeY = (Math.random() - 0.5) * this.cameraShake
      this.ctx.translate(shakeX, shakeY)
    }

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, '#B0E0E6')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.platforms.forEach(p => p.render(this.ctx))
    this.exit.render(this.ctx)
    this.stars.forEach(s => s.render(this.ctx))
    this.enemies.forEach(e => e.render(this.ctx))
    this.spikes.forEach(s => s.render(this.ctx))

    for (const player of this.players) {
      player.render(this.ctx)
    }

    this.particles.forEach(p => p.render(this.ctx))

    this.renderHUD()

    if (this.flashAlpha > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`
      this.ctx.fillRect(0, 0, this.width, this.height)
    }

    if (this.celebrationOverlay) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.celebrationOverlay.alpha * 0.8})`
      this.ctx.fillRect(0, 0, this.width, this.height)

      this.ctx.font = 'bold 72px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      const text = `Well done ${this.celebrationOverlay.name}!`
      this.ctx.fillStyle = `rgba(0, 0, 0, ${this.celebrationOverlay.alpha})`
      this.ctx.fillText(text, this.width / 2, this.height / 2)
      this.ctx.fillStyle = `rgba(255, 215, 0, ${this.celebrationOverlay.alpha})`
      this.ctx.fillText(text, this.width / 2 - 2, this.height / 2 - 2)
    }

    this.ctx.restore()
  }

  private renderPlayerHud(player: Player, side: 'left' | 'right') {
    const padding = 20
    const boxW = 200
    const boxH = 80
    const x = side === 'left' ? padding : this.width - padding - boxW

    this.ctx.fillStyle = player.name === 'Harbin' ? 'rgba(0, 206, 209, 0.8)' : 'rgba(255, 165, 0, 0.8)'
    this.ctx.fillRect(x, padding, boxW, boxH)

    this.ctx.fillStyle = 'white'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = side === 'left' ? 'left' : 'right'
    const nameX = side === 'left' ? x + 10 : x + boxW - 10
    this.ctx.fillText(player.name, nameX, padding + 30)

    for (let i = 0; i < player.maxHealth; i++) {
      this.ctx.fillStyle = i < player.health ? '#ff0000' : '#555'
      this.ctx.beginPath()
      const hx = side === 'left' ? x + 10 + i * 25 : x + boxW - 10 - i * 25
      this.ctx.arc(hx, padding + 55, 8, 0, Math.PI * 2)
      this.ctx.fill()
    }

    this.ctx.fillStyle = '#FFD700'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`⭐ × ${player.starsCollected}`, x + 100, padding + 60)
  }

  private renderHUD() {
    if (this.harbin) this.renderPlayerHud(this.harbin, 'left')
    if (this.agam) this.renderPlayerHud(this.agam, 'right')

    const bannerY = this.height - 90
    this.ctx.fillStyle = 'rgba(0, 160, 0, 0.75)'
    this.ctx.fillRect(this.width / 2 - 280, bannerY, 560, 60)
    this.ctx.fillStyle = 'white'
    this.ctx.font = 'bold 22px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.fillText('Go to the rainbow to win!', this.width / 2, bannerY + 38)
  }

  private createStarBurst(x: number, y: number, color: string) {
    for (let i = 0; i < 20; i++) {
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
