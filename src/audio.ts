let sharedCtx: AudioContext | null = null
let unlocked = false
let voicesReady = false

function getCtx(): AudioContext {
  if (!sharedCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedCtx = new Ctx()
  }
  return sharedCtx
}

function loadVoices() {
  if (!window.speechSynthesis) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length) voicesReady = true
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices()
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
}

/** Call from a real tap/click. Required on iPhone/iPad/Chrome autoplay policy. */
export async function unlockAudio(): Promise<void> {
  const ctx = getCtx()
  try {
    if (ctx.state === 'suspended') await ctx.resume()
  } catch {
    /* ignore */
  }

  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch {
    /* ignore */
  }

  if (window.speechSynthesis) {
    loadVoices()
    try {
      window.speechSynthesis.cancel()
      const warm = new SpeechSynthesisUtterance(' ')
      warm.volume = 0
      window.speechSynthesis.speak(warm)
    } catch {
      /* ignore */
    }
  }

  unlocked = true
}

export class AudioManager {
  private muted: boolean

  constructor(muted: boolean) {
    this.muted = muted
    getCtx()
  }

  public setMuted(muted: boolean) {
    this.muted = muted
  }

  private async ensureRunning() {
    const ctx = getCtx()
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        /* ignore */
      }
    }
    return ctx
  }

  public speak(text: string) {
    if (this.muted || !window.speechSynthesis) return
    void this.ensureRunning()

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.05
    utterance.pitch = 1.15
    utterance.volume = 1
    utterance.lang = 'en-US'

    loadVoices()
    const voices = window.speechSynthesis.getVoices()
    const friendly =
      voices.find((v) => v.lang.startsWith('en') && /female|samantha|google us|karen|moira/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en'))
    if (friendly) utterance.voice = friendly

    window.speechSynthesis.speak(utterance)
  }

  public playJump() {
    void this.playTone(400, 0.1, 'sine', 0.2)
  }

  public playCollect() {
    if (this.muted) return
    void this.ensureRunning().then((ctx) => {
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
    })
  }

  public playHurt() {
    if (this.muted) return
    void this.ensureRunning().then((ctx) => {
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
    })
  }

  public playSwitch() {
    if (this.muted) return
    void this.ensureRunning().then((ctx) => {
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
    })
  }

  public playWin() {
    if (this.muted) return
    void this.ensureRunning().then((ctx) => {
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
    })
  }

  public startBackgroundMusic() {
    if (this.muted) return
    void this.ensureRunning().then((ctx) => {
      if ((ctx as AudioContext & { __bgm?: boolean }).__bgm) return
      ;(ctx as AudioContext & { __bgm?: boolean }).__bgm = true
      const master = ctx.createGain()
      master.connect(ctx.destination)
      master.gain.value = 0.02
      const notes = [262, 294, 330, 392, 330, 294]
      let noteIndex = 0
      const tick = () => {
        if (this.muted) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(master)
        osc.frequency.value = notes[noteIndex]
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.02, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
        noteIndex = (noteIndex + 1) % notes.length
      }
      tick()
      window.setInterval(tick, 400)
    })
  }

  private async playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (this.muted) return
    const ctx = await this.ensureRunning()
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

export { unlocked, voicesReady }
