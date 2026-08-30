export class Platform {
  public x: number
  public y: number
  public width: number
  public height: number
  public color: string
  public type: 'normal' | 'bouncy' | 'moving'
  public vx = 0
  private startX: number
  private moveRange = 100

  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    type: 'normal' | 'bouncy' | 'moving' = 'normal'
  ) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.color = color
    this.type = type
    this.startX = x
    
    if (type === 'moving') {
      this.vx = 1.5
    }
  }

  public update() {
    if (this.type === 'moving') {
      this.x += this.vx
      if (this.x > this.startX + this.moveRange || this.x < this.startX - this.moveRange) {
        this.vx *= -1
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color
    
    if (this.type === 'bouncy') {
      // Bouncy platform with spring effect
      ctx.fillRect(this.x, this.y, this.width, this.height)
      ctx.fillStyle = '#FF69B4'
      for (let i = 0; i < this.width; i += 15) {
        ctx.fillRect(this.x + i, this.y - 3, 3, 3)
      }
    } else if (this.type === 'moving') {
      // Moving platform with arrow
      ctx.fillRect(this.x, this.y, this.width, this.height)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.beginPath()
      ctx.moveTo(this.x + this.width / 2 - 5, this.y + this.height / 2)
      ctx.lineTo(this.x + this.width / 2 + 5, this.y + this.height / 2)
      ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2 - 5)
      ctx.fill()
    } else {
      ctx.fillRect(this.x, this.y, this.width, this.height)
      
      // Add texture
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(this.x, this.y, this.width, 3)
    }
  }
}
