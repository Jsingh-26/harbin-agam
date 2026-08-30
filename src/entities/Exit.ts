export class Exit {
  public x: number
  public y: number
  public width = 60
  public height = 150
  private hue = 0

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public render(ctx: CanvasRenderingContext2D) {
    this.hue += 2
    if (this.hue > 360) this.hue = 0
    
    // Rainbow gradient
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height)
    gradient.addColorStop(0, `hsl(${this.hue}, 100%, 50%)`)
    gradient.addColorStop(0.16, `hsl(${(this.hue + 60) % 360}, 100%, 50%)`)
    gradient.addColorStop(0.33, `hsl(${(this.hue + 120) % 360}, 100%, 50%)`)
    gradient.addColorStop(0.5, `hsl(${(this.hue + 180) % 360}, 100%, 50%)`)
    gradient.addColorStop(0.66, `hsl(${(this.hue + 240) % 360}, 100%, 50%)`)
    gradient.addColorStop(0.83, `hsl(${(this.hue + 300) % 360}, 100%, 50%)`)
    gradient.addColorStop(1, `hsl(${this.hue}, 100%, 50%)`)
    
    ctx.fillStyle = gradient
    ctx.fillRect(this.x, this.y, this.width, this.height)
    
    // Sparkles
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.3) {
        const sx = this.x + Math.random() * this.width
        const sy = this.y + Math.random() * this.height
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.beginPath()
        ctx.arc(sx, sy, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    // Label
    ctx.fillStyle = 'white'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.shadowColor = 'black'
    ctx.shadowBlur = 4
    ctx.fillText('EXIT', this.x + this.width / 2, this.y + this.height / 2)
    ctx.shadowBlur = 0
  }
}
