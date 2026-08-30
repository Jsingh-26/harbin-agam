export class AudioManager {
  private muted: boolean
  private audioContext: AudioContext

  constructor(muted: boolean) {
    this.muted = muted
    this.audioContext = new AudioContext()
  }

  public setMuted(muted: boolean) {
    this.muted = muted
  }

  public speak(text: string) {
    if (this.muted || !window.speechSynthesis) return
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.1
    utterance.pitch = 1.2
    utterance.volume = 1
    
    // Try to use a friendly voice
    const voices = window.speechSynthesis.getVoices()
    const friendlyVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha'))
    ) || voices.find(v => v.lang.startsWith('en'))
    
    if (friendlyVoice) {
      utterance.voice = friendlyVoice
    }
    
    window.speechSynthesis.speak(utterance)
  }

  public playJump() {
    if (this.muted) return
    this.playTone(400, 0.1, 'sine', 0.2)
  }

  public playCollect() {
    if (this.muted) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.frequency.setValueAtTime(523, now)
    osc.frequency.exponentialRampToValueAtTime(1047, now + 0.1)
    
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
    
    osc.start(now)
    osc.stop(now + 0.2)
  }

  public playHurt() {
    if (this.muted) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3)
    osc.type = 'sawtooth'
    
    gain.gain.setValueAtTime(0.3, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
    
    osc.start(now)
    osc.stop(now + 0.3)
  }

  public playSwitch() {
    if (this.muted) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.setValueAtTime(600, now + 0.05)
    osc.type = 'square'
    
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
    
    osc.start(now)
    osc.stop(now + 0.1)
  }

  public playWin() {
    if (this.muted) return
    const ctx = this.audioContext
    const now = ctx.currentTime
    
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      const startTime = now + i * 0.15
      osc.frequency.setValueAtTime(freq, startTime)
      
      gain.gain.setValueAtTime(0.2, startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3)
      
      osc.start(startTime)
      osc.stop(startTime + 0.3)
    })
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    const ctx = this.audioContext
    const now = ctx.currentTime
    
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.frequency.value = frequency
    osc.type = type
    
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration)
    
    osc.start(now)
    osc.stop(now + duration)
  }
}
