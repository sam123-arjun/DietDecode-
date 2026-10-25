/**
 * Web Audio API piezoelectric buzzer synthesizer.
 * Replicates the ESP32 buzzer tone (GPIO 23 active high / PWM tone)
 * for physical device demonstration in the browser.
 */

class PiezoBuzzerSimulator {
  private ctx: AudioContext | null = null;
  private intervalId: number | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAlarm();
    }
  }

  /**
   * Play a single short chirp (confirmation beep for acknowledgement or button press)
   */
  public playChirp(frequency: number = 2400, durationMs: number = 90) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square'; // Classic square-wave piezo buzzer sound
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  private secondChirpTimeout: number | null = null;

  /**
   * Start repeated reminder beep pattern (BEEP - BEEP - PAUSE)
   */
  public startReminderAlarm() {
    if (this.isMuted || this.intervalId !== null) return;
    this.initContext();

    const beepCycle = () => {
      this.playChirp(2600, 120);
      this.secondChirpTimeout = window.setTimeout(() => {
        if (this.intervalId !== null) {
          this.playChirp(2600, 120);
        }
      }, 180);
    };

    beepCycle();
    this.intervalId = window.setInterval(beepCycle, 1500);
  }

  /**
   * Stop any ongoing reminder buzzer loop
   */
  public stopAlarm() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.secondChirpTimeout !== null) {
      clearTimeout(this.secondChirpTimeout);
      this.secondChirpTimeout = null;
    }
  }
}

export const buzzerAudio = new PiezoBuzzerSimulator();
