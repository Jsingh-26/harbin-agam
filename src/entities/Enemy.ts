import { Platform } from './Platform'

export class Enemy {
  public x: number
  public y: number
  public width = 30
  public height = 30
  public vx: number
  public defeated = false
  private defeatTimer = 0
  private vy = 0
  private gravity = 0.5
  private squashAmount = 1
  private startX: number
  private patrolRange = 100

  constructor(x: number, y: number, speed: number) {
    this.x = x
    this.y = y
    this.vx = speed
    this.startX = x
  }

  public update(platforms: Platform[]) {
    if (this.defeated) {
      // Flattened: fade out, then Game removes it
      this.defeatTimer--
      return
    }

    // Movement
    this.x += this.vx

    // Patrol range
    if (this.x > this.startX + this.patrolRange || this.x < this.startX - this.patrolRange) {
      this.vx *= -1
    }

    // Gravity
    this.vy += this.gravity
    this.y += this.vy

    // Platform collision
    platforms.forEach(platform => {
      if (
        this.x < platform.x + platform.width &&
        this.x + this.width > platform.x &&
        this.y < platform.y + platform.height &&
        this.y + this.height > platform.y
      ) {
        if (this.vy > 0) {
          this.y = platform.y - this.height
          this.vy = 0
        }
      }
    })

    // Squash spring back
    this.squashAmount += (1 - this.squashAmount) * 0.2
  }

  /** Stomped from above: defeated, flattened, and removed after a short fade. */
  public squash() {
    if (this.defeated) return
    this.defeated = true
    this.squashAmount = 0.15
    this.defeatTimer = 30
  }

  public isGone(): boolean {
    return this.defeated && this.defeatTimer <= 0
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save()

    if (this.defeated) {
      ctx.globalAlpha = Math.max(0, this.defeatTimer / 30)
    }

    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2

    ctx.translate(centerX, centerY)
    ctx.scale(1, this.squashAmount)
    ctx.translate(-centerX, -centerY)

    // Body
    ctx.fillStyle = '#8B0000'
    ctx.fillRect(this.x, this.y, this.width, this.height)

    // Eyes
    ctx.fillStyle = 'white'
    ctx.fillRect(this.x + 5, this.y + 8, 8, 8)
    ctx.fillRect(this.x + 17, this.y + 8, 8, 8)

    ctx.fillStyle = 'black'
    ctx.fillRect(this.x + 8, this.y + 11, 3, 3)
    ctx.fillRect(this.x + 20, this.y + 11, 3, 3)

    ctx.restore()
  }
}
