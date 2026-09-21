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


/**
 * Speak and unwedge the queue if it stalls. Android WebView TTS can leave an
 * utterance (often a volume-0 warm-up) stuck at the head of the speech queue,
 * which silently blocks every later speak() - the watchdog retries it once.
 */
function speakRobust(utterance: SpeechSynthesisUtterance) {
  const synth = window.speechSynthesis
  if (!synth) return
  const prevOnError = utterance.onerror
  let settled = false
  const timer = window.setTimeout(() => {
    if (settled) return
    settled = true
    try {
      synth.cancel()
      synth.resume()
      synth.speak(utterance)
      synth.resume()
    } catch {
      /* ignore */
    }
  }, 1800)
  const done = () => { settled = true; window.clearTimeout(timer) }
  utterance.onstart = done
  utterance.onend = done
  utterance.onerror = (e) => { done(); if (prevOnError) prevOnError.call(utterance, e) }
  try {
    synth.speak(utterance)
    synth.resume()
  } catch {
    /* ignore */
  }
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
      // Warm the engine with a near-silent utterance. Volume must stay > 0:
      // some Android TTS engines drop volume-0 utterances without callbacks,
      // which wedges the WebView speech queue and silences all later speech.
      const warm = new SpeechSynthesisUtterance(' ')
      warm.volume = 0.02
      speakRobust(warm)
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
   * Voice pick ordered for Punjabi-first pronunciation:
   *  - Punjabi (pa / pa-IN / pa-Guru) voice: name in Gurmukhi (ਅਗਮ / ਹਰਬਿਨ).
   *  - Hindi voice: name in Devanagari (अगम / हरबिन). Hindi engines read
   *    Devanagari natively; feeding them Gurmukhi mispronounces the names.
   *  - English fallback: phonetic respelling, HUR-bin / UH-gum, spoken slowly.
   * The praise phrase stays English ("Well done", "Try again") and is joined
   * with the name in ONE utterance, so a dropped or delayed second utterance
   * can never leave the kid hearing only their name.
   */
  private makePraiseUtterance(phrase: string, name: string): SpeechSynthesisUtterance | null {
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
    utterance.rate = 0.8
    utterance.pitch = 1.0
    utterance.volume = 1

    if (punjabi) {
      const punjabiName = name === 'Harbin' ? 'ਹਰਬਿਨ' : name === 'Agam' ? 'ਅਗਮ' : name
      utterance.text = `${phrase}, ${punjabiName}!`
      utterance.voice = punjabi
      utterance.lang = punjabi.lang
    } else if (hindi) {
      const hindiName = name === 'Harbin' ? 'हरबिन' : name === 'Agam' ? 'अगम' : name
      utterance.text = `${phrase}, ${hindiName}!`
      utterance.voice = hindi
      utterance.lang = hindi.lang
    } else {
      // No Indian voice available: use the phonetic spelling and leave the
      // engine on its DEFAULT voice. Forcing lang='en-IN' with no matching
      // installed voice makes some Android TTS engines drop the utterance.
      const phoneticName = name === 'Harbin' ? 'Hur-bin' : name === 'Agam' ? 'Uh-gum' : name
      utterance.text = `${phrase}, ${phoneticName}!`
      const fallback = indianEn || english
      if (fallback) {
        utterance.voice = fallback
        utterance.lang = fallback.lang
      }
    }

    return utterance
  }

  /** Say a short praise phrase with the kid's name in one utterance. */
  private speakPraise(phrase: string, name: string) {
    if (this.muted || !window.speechSynthesis) return
    void this.ensureRunning()
    const utterance = this.makePraiseUtterance(phrase, name)
    if (!utterance) return
    // Only cancel when something is actually speaking: on some Android TTS
    // engines the first utterance right after cancel() is dropped silently.
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel()
      window.speechSynthesis.resume()
    }
    // If the engine rejects the localized utterance, retry once with a bare
    // default-voice utterance so the kid still hears the praise.
    utterance.onerror = () => {
      if (this.muted) return
      const bare = new SpeechSynthesisUtterance(utterance.text)
      bare.rate = utterance.rate
      speakRobust(bare)
    }
    speakRobust(utterance)
  }

  public speakWellDone(name: string) {
    this.speakPraise('Well done', name)
  }

  public speakEncouragement(name: string) {
    this.speakPraise('Try again', name)
  }

  /**
   * Speak the praise line right now (from a settings tap) and report exactly
   * what happened, so a silent phone becomes diagnosable on the phone.
   */
  public testSpeech(name: string): Promise<string> {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis
      if (!synth) { resolve('Speech is not available in this app shell'); return }
      loadVoices()
      const count = synth.getVoices().length
      const soundState = this.muted ? 'Sound is OFF in settings' : 'Sound is ON'
      let finished = false
      const finish = (msg: string) => { if (!finished) { finished = true; resolve(msg) } }
      const utterance = this.makePraiseUtterance('Well done', name) || new SpeechSynthesisUtterance(`Well done, ${name}!`)
      utterance.volume = 1
      utterance.onstart = () => finish(`Playing "${utterance.text}" - ${soundState}, ${count} voices found`)
      utterance.onerror = (e) => finish(`Speech engine error: ${(e as SpeechSynthesisErrorEvent).error || 'unknown'} - ${soundState}, ${count} voices found`)
      window.setTimeout(() => finish(`Nothing started within 3s (speech queue stalled) - ${soundState}, ${count} voices found`), 3000)
      try { synth.cancel() } catch { /* ignore */ }
      try {
        synth.speak(utterance)
        synth.resume()
      } catch {
        finish('Speech engine threw when asked to speak')
      }
    })
  }

  public speak(text: string) {
    if (this.muted || !window.speechSynthesis) return
    void this.ensureRunning()
    window.speechSynthesis.cancel()
    window.speechSynthesis.resume()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.05
    utterance.volume = 1
    loadVoices()
    const voices = window.speechSynthesis.getVoices()
    const voice =
      voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
      voices.find((v) => /india|hindi|punjabi/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en'))
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang
    }
    window.speechSynthesis.resume()
    speakRobust(utterance)
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
