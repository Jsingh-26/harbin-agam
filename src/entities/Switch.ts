export class Switch {
  public x: number
  public y: number
  public width = 40
  public height = 15
  private glow = 0
  private showPrompt = false
  private promptText = ''

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  public setPrompt(text: string | null) {
    this.showPrompt = !!text
    this.promptText = text || ''
  }

  public render(ctx: CanvasRenderingContext2D) {
    this.glow += 0.1

    // Glow effect
    const glowSize = 5 + Math.sin(this.glow) * 3
    ctx.save()
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = glowSize * 2

    // Switch base
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(this.x - 5, this.y, this.width + 10, this.height + 5)

    // Switch button
    ctx.fillStyle = '#FFD700'
    ctx.fillRect(this.x, this.y - 5, this.width, this.height)

    ctx.restore()

    // Prompt
    if (this.showPrompt) {
      ctx.font = 'bold 18px Arial'
      const promptWidth = Math.max(ctx.measureText(this.promptText).width + 24, 80)
      const promptX = this.x + this.width / 2 - promptWidth / 2
      const promptY = this.y - 56

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
      ctx.fillRect(promptX, promptY, promptWidth, 40)

      ctx.fillStyle = '#FFD700'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(this.promptText, this.x + this.width / 2, promptY + 20)

      // Arrow pointing down
      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.moveTo(this.x + this.width / 2, promptY + 45)
      ctx.lineTo(this.x + this.width / 2 - 6, promptY + 38)
      ctx.lineTo(this.x + this.width / 2 + 6, promptY + 38)
      ctx.closePath()
      ctx.fill()
    }
  }
}
