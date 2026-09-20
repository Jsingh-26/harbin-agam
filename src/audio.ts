let sharedCtx: AudioContext | null = null
let unlocked = false
let voicesReady = false
let bgmInterval: number | null = null
let bgmMuted = false

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
    bgmMuted = muted
    getCtx()
  }

  public setMuted(muted: boolean) {
    this.muted = muted
    bgmMuted = muted
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

  /**
   * Build an utterance that says a kid's name as close to Punjabi as the
   * available voices allow:
   *  - Punjabi (pa / pa-IN / pa-Guru) voice: Gurmukhi text (ਅਗਮ / ਹਰਬਿਨ).
   *  - Hindi voice: Devanagari text (अगम / हरबिन). Hindi engines read
   *    Devanagari natively; feeding them Gurmukhi mispronounces the names.
   *  - English fallback: phonetic respelling, HUR-bin / UH-gum, spoken slowly.
   */
  private makeNameUtterance(name: string): SpeechSynthesisUtterance | null {
    if (!window.speechSynthesis) return null
    loadVoices()

    const voices = window.speechSynthesis.getVoices()
    const punjabi =
      voices.find((v) => /^pa([-_]|$)/i.test(v.lang)) ||
      voices.find((v) => /punjabi|gurmukhi|panjabi/i.test(v.name))
    const hindi =
      voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
      voices.find((v) => /hindi|neel|ravi/i.test(v.name))
    const indianEn =
      voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
      voices.find((v) => /india/i.test(v.name))
    const english = voices.find((v) => v.lang.toLowerCase().startsWith('en'))

    const utterance = new SpeechSynthesisUtterance()
    utterance.rate = 0.75
    utterance.pitch = 1.0
    utterance.volume = 1

    if (punjabi) {
      utterance.text = name === 'Harbin' ? 'ਹਰਬਿਨ' : name === 'Agam' ? 'ਅਗਮ' : name
      utterance.lang = punjabi.lang || 'pa-IN'
      utterance.voice = punjabi
    } else if (hindi) {
      utterance.text = name === 'Harbin' ? 'हरबिन' : name === 'Agam' ? 'अगम' : name
      utterance.lang = hindi.lang || 'hi-IN'
      utterance.voice = hindi
    } else {
      utterance.text = name === 'Harbin' ? 'Hur-bin' : name === 'Agam' ? 'Uh-gum' : name
      utterance.lang = 'en-IN'
      if (indianEn) utterance.voice = indianEn
      else if (english) utterance.voice = english
    }

    return utterance
  }

  /** Say a short English praise phrase, then the kid's name with Punjabi pronunciation. */
  private speakPhraseAndName(phrase: string, name: string) {
    if (this.muted || !window.speechSynthesis) return
    void this.ensureRunning()
    loadVoices()

    const voices = window.speechSynthesis.getVoices()
    const indianEn =
      voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
      voices.find((v) => /india/i.test(v.name))
    const english = voices.find((v) => v.lang.toLowerCase().startsWith('en'))

    window.speechSynthesis.cancel()

    const phraseU = new SpeechSynthesisUtterance(phrase)
    phraseU.rate = 0.9
    phraseU.pitch = 1.0
    phraseU.volume = 1
    phraseU.lang = indianEn?.lang || 'en-IN'
    if (indianEn) phraseU.voice = indianEn
    else if (english) phraseU.voice = english

    const nameU = this.makeNameUtterance(name)
    if (nameU) {
      phraseU.onend = () => {
        try { window.speechSynthesis.speak(nameU) } catch { /* ignore */ }
      }
    }
    window.speechSynthesis.speak(phraseU)
  }

  public speakWellDone(name: string) {
    this.speakPhraseAndName('Well done', name)
  }

  public speakEncouragement(name: string) {
    this.speakPhraseAndName('Try again', name)
  }

  public speak(text: string) {
    if (this.muted || !window.speechSynthesis) return
    void this.ensureRunning()
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.05
    utterance.volume = 1
    utterance.lang = 'en-IN'
    loadVoices()
    const voices = window.speechSynthesis.getVoices()
    const voice =
      voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
      voices.find((v) => /india|hindi|punjabi/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en'))
    if (voice) utterance.voice = voice
    window.speechSynthesis.speak(utterance)
  }

  public playJump() {
    void this.playTone(400, 0.1, 'sine', 0.2)
  }

  public playStomp() {
    if (this.muted) return
    void this.ensureRunning().then((ctx) => {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(500, now)
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.15)
      osc.type = 'square'
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
    })
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
      if (bgmInterval !== null) return
      const master = ctx.createGain()
      master.connect(ctx.destination)
      master.gain.value = 0.02
      const notes = [262, 294, 330, 392, 330, 294]
      let noteIndex = 0
      const tick = () => {
        if (bgmMuted) return
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
      bgmInterval = window.setInterval(tick, 400)
    })
  }

  /** Stop the music loop. Called when a game ends so music never leaks past it. */
  public stopBackgroundMusic() {
    if (bgmInterval !== null) {
      window.clearInterval(bgmInterval)
      bgmInterval = null
    }
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
