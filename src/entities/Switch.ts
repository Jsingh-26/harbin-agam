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

  public setPlayerNear(harbinNear: boolean, agamNear: boolean, harbinName: string, agamName: string) {
    if (harbinNear) {
      this.showPrompt = true
      this.promptText = `${harbinName}: press S`
    } else if (agamNear) {
      this.showPrompt = true
      this.promptText = `${agamName}: press ↓`
    } else {
      this.showPrompt = false
    }
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
      const promptWidth = ctx.measureText(this.promptText).width + 20
      const promptX = this.x + this.width / 2 - promptWidth / 2
      const promptY = this.y - 50
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(promptX, promptY, promptWidth, 35)
      
      ctx.fillStyle = 'white'
      ctx.font = 'bold 18px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(this.promptText, this.x + this.width / 2, promptY + 22)
      
      // Arrow pointing down
      ctx.fillStyle = 'white'
      ctx.beginPath()
      ctx.moveTo(this.x + this.width / 2, promptY + 35)
      ctx.lineTo(this.x + this.width / 2 - 5, promptY + 30)
      ctx.lineTo(this.x + this.width / 2 + 5, promptY + 30)
      ctx.closePath()
      ctx.fill()
    }
  }
}
