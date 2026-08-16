// ===== 菜单系统 =====
class MenuManager {
  constructor() {
    this.screens = {};
    this.currentScreen = 'main-menu';
    this.onStartGame = null;
    this.onEndless = null;
    this.onBossRush = null;
    this.onResume = null;
    this.onRestart = null;
    this.onQuit = null;
    this.onNextLevel = null;
    this.onRetry = null;
    this.audio = null;
    this._init();
  }

  _init() {
    // 收集所有 screen
    const screenEls = document.querySelectorAll('.screen');
    for (const el of screenEls) {
      this.screens[el.id] = el;
    }

    // 绑定按钮事件
    this._bindMenuButtons();
    this._bindPauseButtons();
    this._bindGameOverButtons();
    this._bindLevelCompleteButtons();
    this._bindHudButtons();
    this._bindSettingEvents();

    // 初始显示主菜单
    this.showScreen('main-menu');
  }

  setAudio(audio) {
    this.audio = audio;
  }

  _playClick() {
    if (this.audio) this.audio.playClick();
  }

  // 隐藏所有菜单界面（游戏开始时调用）
  hideAllScreens() {
    for (const id in this.screens) {
      this.screens[id].classList.remove('active');
      // HUD 和 Boss 血条特殊处理
      if (id !== 'game-hud' && id !== 'boss-hp-bar' && id !== 'boss-warning') {
        this.screens[id].classList.add('hidden');
      }
    }
    this.currentScreen = null;
  }

  // 显示指定屏幕
  showScreen(screenId) {
    for (const id in this.screens) {
      if (id === screenId) {
        this.screens[id].classList.add('active');
        this.screens[id].classList.remove('hidden');
      } else {
        this.screens[id].classList.remove('active');
        // HUD 特殊处理
        if (id !== 'game-hud' && id !== 'boss-hp-bar') {
          this.screens[id].classList.add('hidden');
        }
      }
    }
    this.currentScreen = screenId;
  }

  // 显示游戏 HUD
  showHUD() {
    const hud = this.screens['game-hud'];
    if (hud) {
      hud.classList.remove('hidden');
      hud.classList.add('active');
    }
  }

  hideHUD() {
    const hud = this.screens['game-hud'];
    if (hud) {
      hud.classList.add('hidden');
      hud.classList.remove('active');
    }
  }

  // 绑定所有菜单相关按钮
  _bindMenuButtons() {
    // 为所有 screen 中的 data-action 按钮绑定事件
    for (const id in this.screens) {
      const screen = this.screens[id];
      const buttons = screen.querySelectorAll('[data-action]');
      for (const btn of buttons) {
        // 避免重复绑定
        if (btn._menuBound) continue;
        btn._menuBound = true;
        btn.addEventListener('click', () => {
          this._playClick();
          const action = btn.dataset.action;
          this._handleMenuAction(action);
        });
      }
    }

    // 音效切换按钮
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        if (this.audio) {
          const enabled = this.audio.toggle();
          soundToggle.textContent = enabled ? '🔊' : '🔇';
          this._saveSettings({ sound: enabled });
        }
      });
    }
  }

  _handleMenuAction(action) {
    switch (action) {
      case 'start':
        this._showLevelSelect();
        break;
      case 'endless':
        if (this.onEndless) this.onEndless();
        break;
      case 'bossrush':
        if (this.onBossRush) this.onBossRush();
        break;
      case 'aircraft':
        this._showAircraftSelect();
        break;
      case 'leaderboard':
        this._showLeaderboard();
        break;
      case 'settings':
        this._showSettings();
        break;
      case 'back-menu':
        this.showScreen('main-menu');
        break;
    }
  }

  // 关卡选择
  _showLevelSelect() {
    const grid = document.getElementById('level-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const unlocked = this._getUnlockedLevels();

    CONFIG.LEVELS.forEach((level, index) => {
      const isUnlocked = index < unlocked;
      const stars = this._getLevelStars(level.id);

      const btn = document.createElement('div');
      btn.className = 'level-btn' + (isUnlocked ? '' : ' locked');
      btn.innerHTML = `
        <div class="level-num">${level.id}</div>
        <div class="level-name">${isUnlocked ? level.name : '???'}</div>
        <div class="level-stars">${isUnlocked ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '🔒'}</div>
      `;

      if (isUnlocked) {
        btn.addEventListener('click', () => {
          this._playClick();
          if (this.onStartGame) this.onStartGame(level.id - 1);
        });
      }

      grid.appendChild(btn);
    });

    this.showScreen('level-select');
  }

  // 战机选择
  _showAircraftSelect() {
    const list = document.getElementById('aircraft-list');
    if (!list) return;

    list.innerHTML = '';
    const unlockedIds = this._getUnlockedAircrafts();
    const selected = this._getSelectedAircraft();

    CONFIG.AIRCRAFTS.forEach((craft) => {
      const isUnlocked = unlockedIds.includes(craft.id);
      const isSelected = selected === craft.id;

      const card = document.createElement('div');
      card.className = 'aircraft-card' + (isUnlocked ? '' : ' locked') + (isSelected ? ' selected' : '');

      const svg = this._getAircraftSVG(craft.color);

      card.innerHTML = `
        <div class="aircraft-icon">${svg}</div>
        <div class="aircraft-info">
          <div class="aircraft-name">${craft.name}</div>
          <div class="aircraft-desc">${isUnlocked ? craft.desc : '🔒 ' + (craft.unlockCondition || '未解锁')}</div>
        </div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          this._playClick();
          this._setSelectedAircraft(craft.id);
          this._showAircraftSelect(); // 刷新显示
        });
      }

      list.appendChild(card);
    });

    this.showScreen('aircraft-select');
  }

  _getAircraftSVG(color) {
    return `<svg viewBox="0 0 50 50" width="50" height="50">
      <polygon points="25,5 35,20 40,35 25,30 10,35 15,20" fill="${color}" stroke="#fff" stroke-width="1.5" style="filter: drop-shadow(0 0 4px ${color})"/>
      <ellipse cx="25" cy="18" rx="4" ry="6" fill="#fff"/>
    </svg>`;
  }

  // 排行榜
  _showLeaderboard() {
    const list = document.getElementById('score-list');
    if (!list) return;

    const scores = this._getHighScores();
    list.innerHTML = '';

    if (scores.length === 0) {
      list.innerHTML = '<div class="no-scores">暂无记录，快去创造纪录吧！</div>';
    } else {
      scores.forEach((score, index) => {
        const item = document.createElement('div');
        item.className = 'score-item';
        item.innerHTML = `
          <span class="rank rank-${index + 1}">${index + 1}</span>
          <span class="score-val">${Utils.formatScore(score)}</span>
        `;
        list.appendChild(item);
      });
    }

    this.showScreen('leaderboard');
  }

  // 设置
  _showSettings() {
    const settings = this._loadSettings();

    const soundCheck = document.getElementById('setting-sound');
    const diffSelect = document.getElementById('setting-difficulty');
    const autoFireCheck = document.getElementById('setting-autofire');

    if (soundCheck) soundCheck.checked = settings.sound !== false;
    if (diffSelect) diffSelect.value = settings.difficulty || 'normal';
    if (autoFireCheck) autoFireCheck.checked = settings.autoFire !== false;

    this.showScreen('settings');
  }

  _bindSettingEvents() {
    const soundCheck = document.getElementById('setting-sound');
    const diffSelect = document.getElementById('setting-difficulty');
    const autoFireCheck = document.getElementById('setting-autofire');

    if (soundCheck) {
      soundCheck.addEventListener('change', (e) => {
        this._playClick();
        const enabled = e.target.checked;
        this._saveSettings({ sound: enabled });
        if (this.audio) this.audio.setEnabled(enabled);
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) soundToggle.textContent = enabled ? '🔊' : '🔇';
      });
    }

    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        this._playClick();
        this._saveSettings({ difficulty: e.target.value });
      });
    }

    if (autoFireCheck) {
      autoFireCheck.addEventListener('change', (e) => {
        this._playClick();
        this._saveSettings({ autoFire: e.target.checked });
      });
    }
  }

  // 暂停界面按钮
  _bindPauseButtons() {
    const screen = this.screens['pause-screen'];
    if (!screen) return;

    const buttons = screen.querySelectorAll('[data-action]');
    for (const btn of buttons) {
      btn.addEventListener('click', () => {
        this._playClick();
        const action = btn.dataset.action;
        if (action === 'resume' && this.onResume) this.onResume();
        if (action === 'restart' && this.onRestart) this.onRestart();
        if (action === 'quit' && this.onQuit) this.onQuit();
      });
    }
  }

  // 游戏结束按钮
  _bindGameOverButtons() {
    const screen = this.screens['gameover-screen'];
    if (!screen) return;

    const buttons = screen.querySelectorAll('[data-action]');
    for (const btn of buttons) {
      btn.addEventListener('click', () => {
        this._playClick();
        const action = btn.dataset.action;
        if (action === 'retry' && this.onRetry) this.onRetry();
        if (action === 'quit' && this.onQuit) this.onQuit();
      });
    }
  }

  // 关卡通关按钮
  _bindLevelCompleteButtons() {
    const screen = this.screens['level-complete'];
    if (!screen) return;

    const buttons = screen.querySelectorAll('[data-action]');
    for (const btn of buttons) {
      btn.addEventListener('click', () => {
        this._playClick();
        const action = btn.dataset.action;
        if (action === 'next-level' && this.onNextLevel) this.onNextLevel();
        if (action === 'quit' && this.onQuit) this.onQuit();
      });
    }
  }

  // HUD 按钮
  _bindHudButtons() {
    const pauseBtn = document.getElementById('pause-btn');
    const bombBtn = document.getElementById('bomb-btn');

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this._playClick();
        if (window.game && window.game.pause) {
          window.game.pause();
        }
      });
    }

    if (bombBtn) {
      bombBtn.addEventListener('click', () => {
        this._playClick();
        if (window.game && window.game.useBomb) {
          window.game.useBomb();
        }
      });
    }
  }

  // 显示暂停
  showPause() {
    const screen = this.screens['pause-screen'];
    if (screen) {
      screen.classList.remove('hidden');
      screen.classList.add('active');
    }
  }

  hidePause() {
    const screen = this.screens['pause-screen'];
    if (screen) {
      screen.classList.add('hidden');
      screen.classList.remove('active');
    }
  }

  // 显示游戏结束
  showGameOver(score, combo, kills, isNewRecord) {
    const finalScore = document.getElementById('final-score');
    const finalCombo = document.getElementById('final-combo');
    const finalKills = document.getElementById('final-kills');
    const highScore = document.getElementById('high-score');
    const newRecord = document.getElementById('new-record');

    if (finalScore) finalScore.textContent = Utils.formatScore(score);
    if (finalCombo) finalCombo.textContent = 'x' + combo;
    if (finalKills) finalKills.textContent = kills;
    if (highScore) highScore.textContent = Utils.formatScore(this._getBestScore());
    if (newRecord) {
      if (isNewRecord) {
        newRecord.classList.remove('hidden');
      } else {
        newRecord.classList.add('hidden');
      }
    }

    const screen = this.screens['gameover-screen'];
    if (screen) {
      screen.classList.remove('hidden');
      screen.classList.add('active');
    }
  }

  hideGameOver() {
    const screen = this.screens['gameover-screen'];
    if (screen) {
      screen.classList.add('hidden');
      screen.classList.remove('active');
    }
  }

  // 显示关卡通关
  showLevelComplete(score, timeSeconds, stars) {
    const levelScore = document.getElementById('level-score');
    const levelTime = document.getElementById('level-time');
    const starsDisplay = document.getElementById('stars-display');

    if (levelScore) levelScore.textContent = Utils.formatScore(score);
    if (levelTime) levelTime.textContent = Utils.formatTime(timeSeconds);
    if (starsDisplay) {
      starsDisplay.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    }

    const screen = this.screens['level-complete'];
    if (screen) {
      screen.classList.remove('hidden');
      screen.classList.add('active');
    }
  }

  hideLevelComplete() {
    const screen = this.screens['level-complete'];
    if (screen) {
      screen.classList.add('hidden');
      screen.classList.remove('active');
    }
  }

  // Boss 警告
  showBossWarning(bossName) {
    const warning = document.getElementById('boss-warning');
    const nameEl = document.getElementById('warning-boss-name');
    if (nameEl) nameEl.textContent = bossName;
    if (warning) {
      warning.classList.remove('hidden');
      warning.classList.add('active');
    }
  }

  hideBossWarning() {
    const warning = document.getElementById('boss-warning');
    if (warning) {
      warning.classList.add('hidden');
      warning.classList.remove('active');
    }
  }

  // Boss 血条
  showBossHpBar(bossName) {
    const bar = document.getElementById('boss-hp-bar');
    const nameEl = document.getElementById('boss-name');
    if (nameEl) nameEl.textContent = bossName;
    if (bar) bar.classList.remove('hidden');
  }

  hideBossHpBar() {
    const bar = document.getElementById('boss-hp-bar');
    if (bar) bar.classList.add('hidden');
  }

  updateBossHp(hpPct) {
    const inner = document.getElementById('boss-hp-inner');
    if (inner) inner.style.width = (hpPct * 100) + '%';
  }

  // ===== 存储相关 =====

  _getUnlockedLevels() {
    const unlocked = Utils.storage.get(CONFIG.STORAGE_KEYS.UNLOCKED_LEVELS, 1);
    return Math.max(1, Math.min(unlocked, CONFIG.LEVELS.length));
  }

  _getUnlockedAircrafts() {
    const ids = Utils.storage.get(CONFIG.STORAGE_KEYS.UNLOCKED_AIRCRAFTS, ['falcon']);
    return ids;
  }

  _getSelectedAircraft() {
    return Utils.storage.get(CONFIG.STORAGE_KEYS.SELECTED_AIRCRAFT, 'falcon');
  }

  _setSelectedAircraft(id) {
    Utils.storage.set(CONFIG.STORAGE_KEYS.SELECTED_AIRCRAFT, id);
  }

  _getLevelStars(levelId) {
    const stars = Utils.storage.get(CONFIG.STORAGE_KEYS.LEVEL_STARS, {});
    return stars[levelId] || 0;
  }

  _getHighScores() {
    return Utils.storage.get(CONFIG.STORAGE_KEYS.HIGH_SCORES, []);
  }

  _getBestScore() {
    const scores = this._getHighScores();
    return scores.length > 0 ? scores[0] : 0;
  }

  _loadSettings() {
    return Utils.storage.get(CONFIG.STORAGE_KEYS.SETTINGS, {
      sound: true,
      difficulty: 'normal',
      autoFire: true,
    });
  }

  _saveSettings(partial) {
    const current = this._loadSettings();
    Utils.storage.set(CONFIG.STORAGE_KEYS.SETTINGS, { ...current, ...partial });
  }

  getSettings() {
    return this._loadSettings();
  }

  getSelectedAircraftConfig() {
    const id = this._getSelectedAircraft();
    return CONFIG.AIRCRAFTS.find(a => a.id === id) || CONFIG.AIRCRAFTS[0];
  }

  // 解锁关卡
  unlockLevel(levelIndex) {
    const current = this._getUnlockedLevels();
    if (levelIndex + 1 > current) {
      Utils.storage.set(CONFIG.STORAGE_KEYS.UNLOCKED_LEVELS, levelIndex + 1);
    }
  }

  // 保存关卡星级
  saveLevelStars(levelId, stars) {
    const allStars = Utils.storage.get(CONFIG.STORAGE_KEYS.LEVEL_STARS, {});
    if (!allStars[levelId] || stars > allStars[levelId]) {
      allStars[levelId] = stars;
      Utils.storage.set(CONFIG.STORAGE_KEYS.LEVEL_STARS, allStars);
    }
  }

  // 添加高分
  addHighScore(score) {
    const scores = this._getHighScores();
    scores.push(score);
    scores.sort((a, b) => b - a);
    const topScores = scores.slice(0, 10);
    Utils.storage.set(CONFIG.STORAGE_KEYS.HIGH_SCORES, topScores);
    return topScores[0] === score; // 是否新纪录
  }

  // 检查并解锁战机
  checkAircraftUnlocks(levelCompleted) {
    const unlocked = this._getUnlockedAircrafts();
    let changed = false;

    if (levelCompleted >= 3 && !unlocked.includes('thunder')) {
      unlocked.push('thunder');
      changed = true;
    }
    if (levelCompleted >= 5 && !unlocked.includes('phantom')) {
      unlocked.push('phantom');
      changed = true;
    }

    if (changed) {
      Utils.storage.set(CONFIG.STORAGE_KEYS.UNLOCKED_AIRCRAFTS, unlocked);
    }
    return changed;
  }
}
