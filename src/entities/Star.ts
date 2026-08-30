export class Star {
  public x: number
  public y: number
  public size = 20
  private rotation = 0
  private pulse = 0
  private sparkles: { x: number, y: number, life: number }[] = []

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public render(ctx: CanvasRenderingContext2D) {
    this.rotation += 0.05
    this.pulse += 0.1
    
    const scale = 1 + Math.sin(this.pulse) * 0.2
    
    ctx.save()
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2)
    ctx.rotate(this.rotation)
    ctx.scale(scale, scale)
    
    // Draw star
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
      const x = Math.cos(angle) * this.size / 2
      const y = Math.sin(angle) * this.size / 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      
      const innerAngle = angle + Math.PI / 5
      const innerX = Math.cos(innerAngle) * this.size / 4
      const innerY = Math.sin(innerAngle) * this.size / 4
      ctx.lineTo(innerX, innerY)
    }
    ctx.closePath()
    ctx.fill()
    
    // Glow
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 15
    ctx.fill()
    
    ctx.restore()
    
    // Sparkles
    if (Math.random() < 0.3) {
      this.sparkles.push({
        x: this.x + Math.random() * this.size,
        y: this.y + Math.random() * this.size,
        life: 30
      })
    }
    
    this.sparkles = this.sparkles.filter(s => {
      s.life--
      const alpha = s.life / 30
      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, 2, 0, Math.PI * 2)
      ctx.fill()
      return s.life > 0
    })
  }
}
