// ===== 音效系统（Web Audio API 合成） =====
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.enabled = true;
    this.masterGain = null;
    this.bgmOscillators = [];
    this.bgmGain = null;
    this.bgmPlaying = false;
    this.bgmTimer = null;
  }

  _initContext() {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  // 恢复音频上下文（需要用户交互后调用）
  resume() {
    this._initContext();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.masterGain) {
      this.masterGain.gain.value = 0;
    } else if (enabled && this.masterGain) {
      this.masterGain.gain.value = 0.3;
    }
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  // 玩家射击声
  playShoot() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.08);
  }

  // 激光声（持续音，需要start/stop）
  startLaser() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.audioContext) return;
    if (this.laserOsc) return;

    this.laserOsc = this.audioContext.createOscillator();
    this.laserGain = this.audioContext.createGain();

    this.laserOsc.type = 'sawtooth';
    this.laserOsc.frequency.setValueAtTime(120, this.audioContext.currentTime);

    this.laserGain.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.laserGain.gain.linearRampToValueAtTime(0.08, this.audioContext.currentTime + 0.1);

    this.laserOsc.connect(this.laserGain);
    this.laserGain.connect(this.masterGain);
    this.laserOsc.start();
  }

  stopLaser() {
    if (this.laserOsc) {
      this.laserGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
      this.laserOsc.stop(this.audioContext.currentTime + 0.1);
      this.laserOsc = null;
      this.laserGain = null;
    }
  }

  // 爆炸声
  playExplosion(big = false) {
    if (!this.enabled) return;
    this._initContext();
    if (!this.audioContext) return;

    const bufferSize = this.audioContext.sampleRate * (big ? 0.5 : 0.2);
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(big ? 400 : 800, this.audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + (big ? 0.5 : 0.2));

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(big ? 0.4 : 0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + (big ? 0.5 : 0.2));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
  }

  // 拾取道具声
  playPickup() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, this.audioContext.currentTime);
    osc.frequency.linearRampToValueAtTime(1320, this.audioContext.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.2);
  }

  // 玩家受击声
  playHit() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);

    gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.25);
  }

  // 炸弹声
  playBomb() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.audioContext) return;

    // 多层爆炸声
    this.playExplosion(true);

    // 低沉轰鸣
    setTimeout(() => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.6);
      gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.6);
    }, 50);
  }

  // Boss 警告声
  playBossWarning() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.audioContext) return;

    const playAlert = (delay) => {
      setTimeout(() => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.15);
      }, delay);
    };

    playAlert(0);
    playAlert(200);
    playAlert(400);
  }

  // 按钮点击声
  playClick() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.audioContext.currentTime);
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioContext.currentTime + 0.05);
  }

  // 背景音乐（简单的循环电子乐）
  startBGM() {
    if (!this.enabled || this.bgmPlaying) return;
    this._initContext();
    if (!this.audioContext) return;

    this.bgmPlaying = true;

    // 简单的低音循环
    const notes = [110, 110, 146.83, 110, 130.81, 110, 98, 110]; // A2 A2 D3 A2 C3 A2 G2 A2
    let noteIndex = 0;
    const noteDuration = 0.3;
    const bpm = 120;
    const interval = (60 / bpm) * 1000 / 2; // 八分音符

    const playNote = () => {
      if (!this.bgmPlaying || !this.enabled) return;

      const freq = notes[noteIndex % notes.length];
      noteIndex++;

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

      gain.gain.setValueAtTime(0, this.audioContext.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0.03, this.audioContext.currentTime + noteDuration * 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.audioContext.currentTime + noteDuration);

      // 高八度的旋律（简单版）
      if (noteIndex % 2 === 0) {
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2, this.audioContext.currentTime);
        gain2.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain2.gain.linearRampToValueAtTime(0.02, this.audioContext.currentTime + 0.02);
        gain2.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + noteDuration * 0.8);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start();
        osc2.stop(this.audioContext.currentTime + noteDuration * 0.8);
      }
    };

    playNote();
    this.bgmTimer = setInterval(playNote, interval);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // 游戏结束音效
  playGameOver() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.audioContext) return;

    const notes = [440, 392, 349.23, 293.66]; // 下行音阶
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
      }, i * 200);
    });
  }

  // 通关音效
  playLevelComplete() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.audioContext) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C 上行
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.3);
      }, i * 120);
    });
  }
}
