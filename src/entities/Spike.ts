export class Spike {
  public x: number
  public y: number
  public width = 30
  public height = 20

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#8B0000'
    ctx.beginPath()
    ctx.moveTo(this.x, this.y + this.height)
    ctx.lineTo(this.x + this.width / 2, this.y)
    ctx.lineTo(this.x + this.width, this.y + this.height)
    ctx.closePath()
    ctx.fill()
    
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(this.x, this.y + this.height, this.width, 3)
  }
}
