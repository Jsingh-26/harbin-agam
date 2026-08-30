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

export class Game {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width = 1280
  private height = 720
  private harbin: Player
  private agam: Player
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
  private difficulty: 'easy' | 'medium' | 'hard'
  private audioManager: AudioManager
  private winCallback: (harbinStars: number, agamStars: number) => void
  private cameraShake = 0
  private flashAlpha = 0
  private celebrationOverlay: { name: string, alpha: number } | null = null

  constructor(canvas: HTMLCanvasElement, difficulty: 'easy' | 'medium' | 'hard', muted: boolean, winCallback: (harbinStars: number, agamStars: number) => void) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.difficulty = difficulty
    this.winCallback = winCallback
    this.audioManager = new AudioManager(muted)
    
    this.resizeCanvas()
    window.addEventListener('resize', () => this.resizeCanvas())
    
    // Create players
    this.harbin = new Player(100, 500, '#00CED1', 'Harbin', 'w', 'a', 'd', 's')
    this.agam = new Player(200, 500, '#FFA500', 'Agam', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown')
    
    // Create level
    this.createLevel()
    
    // Input
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase())
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
      }
    })
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase())
    })
    
    this.switch = new Switch(640, 600)
    this.door = new Door(1100, 400)
    this.exit = new Exit(1150, 400)
  }

  private resizeCanvas() {
    const container = this.canvas.parentElement!
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    
    const scaleX = containerWidth / this.width
    const scaleY = containerHeight / this.height
    const scale = Math.min(scaleX, scaleY)
    
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = `${this.width * scale}px`
    this.canvas.style.height = `${this.height * scale}px`
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
    this.gameLoop()
  }

  public destroy() {
    this.running = false
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

  private update() {
    // Update players
    this.harbin.update(this.keys, this.platforms)
    this.agam.update(this.keys, this.platforms)
    
    // Update moving platforms
    this.platforms.forEach(p => p.update())
    
    // Update enemies
    this.enemies.forEach(e => e.update(this.platforms))
    
    // Update particles
    this.particles = this.particles.filter(p => {
      p.update()
      return p.life > 0
    })
    
    // Check star collection
    this.stars = this.stars.filter(star => {
      if (this.harbin.checkCollision(star.x, star.y, star.size, star.size)) {
        this.harbin.collectStar()
        this.audioManager.playCollect()
        this.audioManager.speak(`Well done ${this.harbin.name}!`)
        this.createStarBurst(star.x, star.y, this.harbin.color)
        this.showCelebration(this.harbin.name)
        return false
      }
      if (this.agam.checkCollision(star.x, star.y, star.size, star.size)) {
        this.agam.collectStar()
        this.audioManager.playCollect()
        this.audioManager.speak(`Well done ${this.agam.name}!`)
        this.createStarBurst(star.x, star.y, this.agam.color)
        this.showCelebration(this.agam.name)
        return false
      }
      return true
    })
    
    // Check enemy collision
    this.enemies.forEach(enemy => {
      if (this.harbin.checkCollision(enemy.x, enemy.y, enemy.width, enemy.height)) {
        if (this.harbin.vy > 0 && this.harbin.y + this.harbin.height < enemy.y + enemy.height / 2) {
          this.harbin.bounce()
          enemy.squash()
          this.audioManager.playJump()
        } else {
          this.harbin.takeDamage()
          this.audioManager.playHurt()
          this.cameraShake = 10
        }
      }
      if (this.agam.checkCollision(enemy.x, enemy.y, enemy.width, enemy.height)) {
        if (this.agam.vy > 0 && this.agam.y + this.agam.height < enemy.y + enemy.height / 2) {
          this.agam.bounce()
          enemy.squash()
          this.audioManager.playJump()
        } else {
          this.agam.takeDamage()
          this.audioManager.playHurt()
          this.cameraShake = 10
        }
      }
    })
    
    // Check spike collision
    this.spikes.forEach(spike => {
      if (this.harbin.checkCollision(spike.x, spike.y, spike.width, spike.height)) {
        this.harbin.takeDamage()
        this.audioManager.playHurt()
        this.cameraShake = 10
      }
      if (this.agam.checkCollision(spike.x, spike.y, spike.width, spike.height)) {
        this.agam.takeDamage()
        this.audioManager.playHurt()
        this.cameraShake = 10
      }
    })
    
    // Check switch interaction
    const harbinNearSwitch = this.harbin.checkCollision(
      this.switch.x - 20,
      this.switch.y - 20,
      this.switch.width + 40,
      this.switch.height + 40
    )
    const agamNearSwitch = this.agam.checkCollision(
      this.switch.x - 20,
      this.switch.y - 20,
      this.switch.width + 40,
      this.switch.height + 40
    )
    
    this.switch.setPlayerNear(harbinNearSwitch, agamNearSwitch, this.harbin.name, this.agam.name)
    
    if (harbinNearSwitch && this.keys.has(this.harbin.actionKey)) {
      if (!this.door.isOpen) {
        this.door.open()
        this.audioManager.playSwitch()
        this.flashAlpha = 0.5
      }
    }
    if (agamNearSwitch && this.keys.has(this.agam.actionKey.toLowerCase())) {
      if (!this.door.isOpen) {
        this.door.open()
        this.audioManager.playSwitch()
        this.flashAlpha = 0.5
      }
    }
    
    // Check win condition
    if (this.door.isOpen) {
      const harbinAtExit = this.harbin.checkCollision(this.exit.x, this.exit.y, this.exit.width, this.exit.height)
      const agamAtExit = this.agam.checkCollision(this.exit.x, this.exit.y, this.exit.width, this.exit.height)
      
      if (harbinAtExit || agamAtExit) {
        this.audioManager.playWin()
        this.running = false
        setTimeout(() => {
          this.winCallback(this.harbin.starsCollected, this.agam.starsCollected)
        }, 1000)
      }
    }
    
    // Update effects
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
    
    // Camera shake
    if (this.cameraShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.cameraShake
      const shakeY = (Math.random() - 0.5) * this.cameraShake
      this.ctx.translate(shakeX, shakeY)
    }
    
    // Clear
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height)
    gradient.addColorStop(0, '#87CEEB')
    gradient.addColorStop(1, '#B0E0E6')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // Render platforms
    this.platforms.forEach(p => p.render(this.ctx))
    
    // Render door first (behind)
    this.door.render(this.ctx)
    
    // Render exit
    this.exit.render(this.ctx)
    
    // Render switch
    this.switch.render(this.ctx)
    
    // Render stars
    this.stars.forEach(s => s.render(this.ctx))
    
    // Render enemies
    this.enemies.forEach(e => e.render(this.ctx))
    
    // Render spikes
    this.spikes.forEach(s => s.render(this.ctx))
    
    // Render players
    this.harbin.render(this.ctx)
    this.agam.render(this.ctx)
    
    // Render particles
    this.particles.forEach(p => p.render(this.ctx))
    
    // HUD
    this.renderHUD()
    
    // Flash effect
    if (this.flashAlpha > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`
      this.ctx.fillRect(0, 0, this.width, this.height)
    }
    
    // Celebration overlay
    if (this.celebrationOverlay) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.celebrationOverlay.alpha * 0.8})`
      this.ctx.fillRect(0, 0, this.width, this.height)
      
      this.ctx.fillStyle = `rgba(0, 0, 0, ${this.celebrationOverlay.alpha})`
      this.ctx.font = 'bold 80px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      const text = `Well done ${this.celebrationOverlay.name}!`
      this.ctx.fillText(text, this.width / 2, this.height / 2)
      
      this.ctx.fillStyle = `rgba(255, 215, 0, ${this.celebrationOverlay.alpha})`
      this.ctx.fillText(text, this.width / 2 - 2, this.height / 2 - 2)
    }
    
    this.ctx.restore()
  }

  private renderHUD() {
    const padding = 20
    
    // Harbin HUD
    this.ctx.fillStyle = 'rgba(0, 206, 209, 0.8)'
    this.ctx.fillRect(padding, padding, 200, 80)
    
    this.ctx.fillStyle = 'white'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'left'
    this.ctx.fillText('Harbin', padding + 10, padding + 30)
    
    // Hearts
    for (let i = 0; i < this.harbin.maxHealth; i++) {
      this.ctx.fillStyle = i < this.harbin.health ? '#ff0000' : '#555'
      this.ctx.beginPath()
      this.ctx.arc(padding + 10 + i * 25, padding + 55, 8, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // Stars
    this.ctx.fillStyle = '#FFD700'
    this.ctx.fillText(`⭐ × ${this.harbin.starsCollected}`, padding + 100, padding + 60)
    
    // Agam HUD
    this.ctx.fillStyle = 'rgba(255, 165, 0, 0.8)'
    this.ctx.fillRect(this.width - padding - 200, padding, 200, 80)
    
    this.ctx.fillStyle = 'white'
    this.ctx.font = 'bold 24px Arial'
    this.ctx.textAlign = 'right'
    this.ctx.fillText('Agam', this.width - padding - 10, padding + 30)
    
    // Hearts
    for (let i = 0; i < this.agam.maxHealth; i++) {
      this.ctx.fillStyle = i < this.agam.health ? '#ff0000' : '#555'
      this.ctx.beginPath()
      this.ctx.arc(this.width - padding - 10 - i * 25, padding + 55, 8, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // Stars
    this.ctx.fillStyle = '#FFD700'
    this.ctx.textAlign = 'left'
    this.ctx.fillText(`⭐ × ${this.agam.starsCollected}`, this.width - padding - 190, padding + 60)
    
    // Goal message
    if (!this.door.isOpen) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      this.ctx.fillRect(this.width / 2 - 250, this.height - 80, 500, 60)
      this.ctx.fillStyle = '#FFD700'
      this.ctx.font = 'bold 20px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('Open the door, then reach the rainbow!', this.width / 2, this.height - 50)
    } else {
      this.ctx.fillStyle = 'rgba(0, 200, 0, 0.7)'
      this.ctx.fillRect(this.width / 2 - 250, this.height - 80, 500, 60)
      this.ctx.fillStyle = 'white'
      this.ctx.font = 'bold 22px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.fillText('DOOR OPEN — go to the rainbow!', this.width / 2, this.height - 50)
    }
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
