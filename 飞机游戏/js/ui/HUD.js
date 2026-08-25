// ===== HUD 管理器 =====
class HUDManager {
  constructor() {
    this.scoreEl = document.getElementById('score-value');
    this.comboEl = document.getElementById('combo-value');
    this.comboDisplay = document.getElementById('combo-display');
    this.waveEl = document.getElementById('wave-value');
    this.hpHearts = document.getElementById('hp-hearts');
    this.bombCount = document.getElementById('bomb-count');
    this.shieldFill = document.getElementById('shield-fill');
    this.powerLevel = document.getElementById('power-level');

    this._score = 0;
    this._combo = 1;
    this._wave = 1;
  }

  updateScore(score) {
    this._score = score;
    if (this.scoreEl) {
      this.scoreEl.textContent = Utils.formatScore(score);
    }
  }

  addScore(amount) {
    this.updateScore(this._score + amount);
  }

  updateCombo(combo) {
    this._combo = combo;
    if (this.comboEl) {
      this.comboEl.textContent = 'x' + combo;
    }
    if (this.comboDisplay) {
      if (combo > 1) {
        this.comboDisplay.style.opacity = '1';
        this.comboDisplay.style.transform = 'scale(' + (1 + (combo - 1) * 0.05) + ')';
      } else {
        this.comboDisplay.style.opacity = '0.5';
        this.comboDisplay.style.transform = 'scale(1)';
      }
    }
  }

  updateWave(wave) {
    this._wave = wave;
    if (this.waveEl) {
      this.waveEl.textContent = wave;
    }
  }

  updateHp(hp, maxHp) {
    if (this.hpHearts) {
      let hearts = '';
      for (let i = 0; i < maxHp; i++) {
        if (i < hp) {
          hearts += '♥';
        } else {
          hearts += '<span style="opacity:0.2">♥</span>';
        }
      }
      this.hpHearts.innerHTML = hearts;
    }
  }

  updateBombs(bombs) {
    if (this.bombCount) {
      this.bombCount.textContent = bombs;
    }
  }

  updateShield(active, timeLeft, maxTime) {
    if (this.shieldFill) {
      if (active) {
        const pct = (timeLeft / maxTime) * 100;
        this.shieldFill.style.width = pct + '%';
      } else {
        this.shieldFill.style.width = '0%';
      }
    }
  }

  updatePowerLevel(level) {
    if (this.powerLevel) {
      this.powerLevel.textContent = 'Lv.' + level;
    }
  }

  reset() {
    this.updateScore(0);
    this.updateCombo(1);
    this.updateWave(1);
    this.updateHp(CONFIG.PLAYER.INIT_HP, CONFIG.PLAYER.MAX_HP);
    this.updateBombs(CONFIG.PLAYER.INIT_BOMBS);
    this.updateShield(false, 0, 1);
    this.updatePowerLevel(1);
  }
}
