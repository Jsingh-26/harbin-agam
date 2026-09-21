import { Platform } from './Platform'

export class Player {
  public x: number
  public y: number
  public width = 40
  public height = 50
  public vx = 0
  public vy = 0
  public color: string
  public name: string
  public health = 4
  public maxHealth = 4
  public starsCollected = 0
  public isGrounded = false
  public actionKey: string
  
  private jumpKey: string
  private leftKey: string
  private rightKey: string
  private speed = 4
  private jumpPower = 12
  private gravity = 0.5
  private invincible = false
  private invincibleTimer = 0
  private squashStretch = 1
  private scale = 1
  private coyoteFrames = 0
  private jumpBufferFrames = 0
  private assistedJump = false
  private jumpWasHeld = false

  constructor(
    x: number,
    y: number,
    color: string,
    name: string,
    jumpKey: string,
    leftKey: string,
    rightKey: string,
    actionKey: string,
    assistedJump = false
  ) {
    this.x = x
    this.y = y
    this.color = color
    this.name = name
    this.jumpKey = jumpKey.toLowerCase()
    this.leftKey = leftKey.toLowerCase()
    this.rightKey = rightKey.toLowerCase()
    this.actionKey = actionKey.toLowerCase()
    this.assistedJump = assistedJump
  }

  public update(keys: Set<string>, platforms: Platform[]) {
    // Movement
    if (keys.has(this.leftKey)) {
      this.vx = -this.speed
    } else if (keys.has(this.rightKey)) {
      this.vx = this.speed
    } else {
      this.vx *= 0.8
    }

    // Mobile assist: remember a jump just before landing and allow a short step after leaving an edge.
    if (this.isGrounded) this.coyoteFrames = this.assistedJump ? 7 : 0
    else if (this.coyoteFrames > 0) this.coyoteFrames--
    const jumpHeld = keys.has(this.jumpKey)
    if (jumpHeld && !this.jumpWasHeld) this.jumpBufferFrames = this.assistedJump ? 7 : 1
    else if (this.jumpBufferFrames > 0) this.jumpBufferFrames--
    this.jumpWasHeld = jumpHeld
    if (this.jumpBufferFrames > 0 && (this.isGrounded || this.coyoteFrames > 0)) {
      this.vy = -this.jumpPower
      this.isGrounded = false
      this.coyoteFrames = 0
      this.jumpBufferFrames = 0
      this.squashStretch = 1.3
    }

    // Gravity
    this.vy += this.gravity

    // Apply velocity
    this.x += this.vx
    this.y += this.vy

    // Collision with platforms
    this.isGrounded = false
    platforms.forEach(platform => {
      if (this.checkPlatformCollision(platform)) {
        // Top collision
        if (this.vy > 0 && this.y + this.height - this.vy <= platform.y) {
          this.y = platform.y - this.height
          this.vy = 0
          this.isGrounded = true
          this.squashStretch = 0.8
          
          // Bouncy platform
          if (platform.type === 'bouncy') {
            this.vy = -15
            this.squashStretch = 1.4
          }
          
          // Moving platform
          if (platform.type === 'moving') {
            this.x += platform.vx
          }
        }
        // Bottom collision
        else if (this.vy < 0 && this.y - this.vy >= platform.y + platform.height) {
          this.y = platform.y + platform.height
          this.vy = 0
        }
        // Side collisions
        if (this.vx > 0 && this.x + this.width - this.vx <= platform.x) {
          this.x = platform.x - this.width
          this.vx = 0
        } else if (this.vx < 0 && this.x - this.vx >= platform.x + platform.width) {
          this.x = platform.x + platform.width
          this.vx = 0
        }
      }
    })

    // Bounds
    if (this.x < 0) this.x = 0
    if (this.x + this.width > 1280) this.x = 1280 - this.width

    // Squash stretch spring back
    this.squashStretch += (1 - this.squashStretch) * 0.2
    
    // Invincibility
    if (this.invincible) {
      this.invincibleTimer--
      if (this.invincibleTimer <= 0) {
        this.invincible = false
      }
    }
  }

  private checkPlatformCollision(platform: Platform): boolean {
    return (
      this.x < platform.x + platform.width &&
      this.x + this.width > platform.x &&
      this.y < platform.y + platform.height &&
      this.y + this.height > platform.y
    )
  }

  public checkCollision(x: number, y: number, width: number, height: number): boolean {
    return (
      this.x < x + width &&
      this.x + this.width > x &&
      this.y < y + height &&
      this.y + this.height > y
    )
  }

  public collectStar() {
    this.starsCollected++
    this.scale = 1.3
  }

  public takeDamage() {
    if (this.invincible || this.health <= 0) return

    this.health--
    this.invincible = true
    this.invincibleTimer = 60
  }

  /** Kid-friendly reset: back to spawn with full hearts and a breather. */
  public resetForRespawn(x: number, y: number) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.health = this.maxHealth
    this.invincible = true
    this.invincibleTimer = 120
  }

  public bounce() {
    this.vy = -12
    this.squashStretch = 1.3
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.save()
    
    // Invincibility flicker
    if (this.invincible && Math.floor(this.invincibleTimer / 5) % 2 === 0) {
      ctx.globalAlpha = 0.5
    }
    
    // Scale effect
    this.scale += (1 - this.scale) * 0.1
    
    const centerX = this.x + this.width / 2
    const centerY = this.y + this.height / 2
    
    ctx.translate(centerX, centerY)
    ctx.scale(this.scale, this.scale * this.squashStretch)
    ctx.translate(-centerX, -centerY)
    
    // Draw rounded rectangle body
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.roundRect(this.x, this.y, this.width, this.height, 10)
    ctx.fill()
    
    // Eyes
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(this.x + 12, this.y + 15, 6, 0, Math.PI * 2)
    ctx.arc(this.x + 28, this.y + 15, 6, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.fillStyle = 'black'
    ctx.beginPath()
    ctx.arc(this.x + 12, this.y + 15, 3, 0, Math.PI * 2)
    ctx.arc(this.x + 28, this.y + 15, 3, 0, Math.PI * 2)
    ctx.fill()
    
    // Smile
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(this.x + 20, this.y + 25, 8, 0.2, Math.PI - 0.2)
    ctx.stroke()
    
    ctx.restore()
  }
}
