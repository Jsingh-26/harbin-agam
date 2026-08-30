export class Door {
  public x: number
  public y: number
  public width = 20
  public height = 150
  public isOpen = false
  private openAmount = 0

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public open() {
    this.isOpen = true
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Animate opening
    if (this.isOpen) {
      this.openAmount += (1 - this.openAmount) * 0.1
    }
    
    const currentHeight = this.height * (1 - this.openAmount)
    
    if (currentHeight > 1) {
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(this.x, this.y, this.width, currentHeight)
      
      // Door texture
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.fillRect(this.x + 2, this.y, this.width - 4, currentHeight)
      
      // Handle
      ctx.fillStyle = '#FFD700'
      ctx.beginPath()
      ctx.arc(this.x + this.width - 5, this.y + currentHeight / 2, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
