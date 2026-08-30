export class Particle {
  public x: number
  public y: number
  public vx: number
  public vy: number
  public color: string
  public life: number
  public maxLife = 60

  constructor(x: number, y: number, vx: number, vy: number, color: string) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.color = color
    this.life = this.maxLife
  }

  public update() {
    this.x += this.vx
    this.y += this.vy
    this.vy += 0.2
    this.life--
  }

  public render(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife
    ctx.fillStyle = this.color.replace(')', `, ${alpha})`)
    if (!ctx.fillStyle.includes('rgba')) {
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`
    }
    ctx.beginPath()
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}
