// ===== 游戏主类 =====
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 高清 Canvas 支持
    const dpr = window.devicePixelRatio || 1;
    const logicalW = CONFIG.CANVAS_WIDTH;
    const logicalH = CONFIG.CANVAS_HEIGHT;

    // 设置 Canvas 物理像素尺寸
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;

    // 设置 Canvas CSS 显示尺寸
    canvas.style.width = logicalW + 'px';
    canvas.style.height = logicalH + 'px';

    // 缩放上下文，让所有绘制逻辑使用逻辑坐标
    this.ctx.scale(dpr, dpr);

    this.width = logicalW;
    this.height = logicalH;

    // 状态
    this.state = GAME_STATE.MENU;
    this.mode = GAME_MODE.CAMPAIGN;
    this.levelIndex = 0;
    this.wave = 1;
    this.maxWaves = 8;
    this.score = 0;
    this.kills = 0;
    this.maxCombo = 1;
    this.combo = 1;
    this.comboTimer = 0;
    this.gameTime = 0;

    // 核心子系统
    this.renderer = new Renderer(this.ctx, canvas);
    this.input = new Input(canvas);
    this.particles = new ParticleSystem();
    this.audio = new AudioManager();
    this.menu = new MenuManager();
    this.hud = new HUDManager();

    // 对象池
    this.bulletPool = new BulletPool(300);
    this.enemyPool = new EnemyPool(60);
    this.powerUpPool = new PowerUpPool(40);

    // 实体
    this.player = null;
    this.boss = null;
    this.bossActive = false;

    // 波次管理
    this.waveTimer = 0;
    this.waveDelay = 2000; // 波次间隔
    this.spawnTimer = 0;
    this.spawnInterval = 1200;
    this.enemiesInWave = 0;
    this.maxEnemiesInWave = 5;
    this.waveEnemiesSpawned = 0;
    this.waveTotalEnemies = 0;

    // 难度
    this.difficulty = 'normal';
    this.diffConfig = CONFIG.DIFFICULTY.normal;

    // 时间步长
    this.lastTime = 0;
    this.running = false;
    this.animationId = null;

    // 绑定菜单事件
    this._bindMenuEvents();

    // 全局引用（供 UI 按钮调用）
    window.game = this;
  }

  _bindMenuEvents() {
    this.menu.setAudio(this.audio);

    this.menu.onStartGame = (levelIdx) => {
      this.startCampaign(levelIdx);
    };

    this.menu.onEndless = () => {
      this.startEndless();
    };

    this.menu.onBossRush = () => {
      this.startBossRush();
    };

    this.menu.onResume = () => {
      this.resume();
    };

    this.menu.onRestart = () => {
      this.restart();
    };

    this.menu.onRetry = () => {
      this.restart();
    };

    this.menu.onQuit = () => {
      this.quitToMenu();
    };

    this.menu.onNextLevel = () => {
      this.nextLevel();
    };

    // 输入事件
    this.input.onPause = () => {
      if (this.state === GAME_STATE.PLAYING) {
        this.pause();
      } else if (this.state === GAME_STATE.PAUSED) {
        this.resume();
      }
    };

    this.input.onBomb = () => {
      if (this.state === GAME_STATE.PLAYING) {
        this.useBomb();
      }
    };
  }

  // ===== 游戏启动 =====

  startCampaign(levelIdx) {
    this.mode = GAME_MODE.CAMPAIGN;
    this.levelIndex = levelIdx;
    this._loadLevel(levelIdx);
    this._startGame();
  }

  startEndless() {
    this.mode = GAME_MODE.ENDLESS;
    this.levelIndex = 0;
    this.wave = 1;
    this.maxWaves = 9999;
    this.spawnInterval = 1200;
    this.maxEnemiesInWave = 8;
    this._startGame();
  }

  startBossRush() {
    this.mode = GAME_MODE.BOSS_RUSH;
    this.levelIndex = 0;
    this.wave = 1;
    this.maxWaves = 5;
    this._startGame();
    // 直接进入 Boss
    setTimeout(() => this._spawnBoss(), 500);
  }

  _loadLevel(levelIdx) {
    const level = CONFIG.LEVELS[levelIdx];
    if (!level) return;

    this.levelIndex = levelIdx;
    this.wave = 1;
    this.maxWaves = level.waves;
    this.spawnInterval = level.spawnInterval;
    this.maxEnemiesInWave = level.maxEnemies;
  }

  _startGame() {
    // 加载设置
    const settings = this.menu.getSettings();
    this.difficulty = settings.difficulty || 'normal';
    this.diffConfig = CONFIG.DIFFICULTY[this.difficulty] || CONFIG.DIFFICULTY.normal;
    this.audio.setEnabled(settings.sound !== false);

    // 初始化玩家
    const craftConfig = this.menu.getSelectedAircraftConfig();
    this.player = new Player({
      color: craftConfig.color,
      aircraftId: craftConfig.id,
      speedMul: craftConfig.speedMul,
      fireRateMul: craftConfig.fireRateMul,
      damageMul: craftConfig.damageMul,
    });
    this.player.autoFire = settings.autoFire !== false;
    this.player.setReferences({
      bulletPool: this.bulletPool,
      particleSystem: this.particles,
      audio: this.audio,
      input: this.input,
    });
    this.player.reset();

    // 重置
    this.score = 0;
    this.kills = 0;
    this.maxCombo = 1;
    this.combo = 1;
    this.comboTimer = 0;
    this.gameTime = 0;
    this.boss = null;
    this.bossActive = false;
    this.waveTimer = 1000;
    this.spawnTimer = 0;
    this.enemiesInWave = 0;
    this.waveEnemiesSpawned = 0;
    this.waveTotalEnemies = this._calcWaveEnemies(1);

    this.bulletPool.clear();
    this.enemyPool.clear();
    this.powerUpPool.clear();
    this.particles.clear();

    // UI - 隐藏所有菜单界面，只保留HUD
    this.menu.hideAllScreens();
    this.menu.showHUD();
    this.menu.hideBossHpBar();
    this.hud.reset();

    // 状态
    this.state = GAME_STATE.PLAYING;

    // 音频
    this.audio.resume();
    this.audio.startBGM();

    // 启动循环
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this._loop();
    }
  }

  _calcWaveEnemies(waveNum) {
    if (this.mode === GAME_MODE.ENDLESS) {
      return Math.min(5 + waveNum * 2, 30);
    }
    const level = CONFIG.LEVELS[this.levelIndex];
    if (!level) return 5;
    const base = 3 + waveNum;
    return Math.min(base, level.maxEnemies);
  }

  // ===== 主循环 =====

  _loop() {
    if (!this.running) return;

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // 限制最大 dt，防止卡顿后跳帧
    dt = Math.min(dt, 0.05);

    if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.BOSS_WARNING) {
      this._update(dt);
    }

    this._render();

    this.animationId = requestAnimationFrame(() => this._loop());
  }

  _update(dt) {
    this.gameTime += dt;

    // 渲染器背景更新
    this.renderer.update(dt, CONFIG.GAME_SPEED);

    // 粒子更新
    this.particles.update(dt);

    // 玩家更新
    if (this.player && this.player.active) {
      this.player.update(dt, this.state);
    }

    // 子弹更新
    this.bulletPool.update(dt);

    // 敌人更新
    this.enemyPool.update(dt);

    // 道具更新
    this.powerUpPool.update(dt);

    // Boss 更新
    if (this.boss && this.boss.active) {
      this.boss.update(dt);
      this.menu.updateBossHp(this.boss.hp / this.boss.maxHp);
    }

    // 碰撞检测
    this._checkCollisions();

    // 连击计时
    if (this.combo > 1) {
      this.comboTimer -= dt * 1000;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.hud.updateCombo(1);
      }
    }

    // 波次管理
    if (!this.bossActive && this.mode !== GAME_MODE.BOSS_RUSH) {
      this._updateWaves(dt);
    } else if (this.mode === GAME_MODE.BOSS_RUSH && !this.bossActive) {
      // Boss Rush: 上一个 Boss 死了，等一下出下一个
      if (this._bossRushNextTimer === undefined) {
        this._bossRushNextTimer = 2000;
      }
      this._bossRushNextTimer -= dt * 1000;
      if (this._bossRushNextTimer <= 0) {
        this._bossRushNextTimer = undefined;
        if (this.levelIndex < CONFIG.BOSSES - 1) {
          // 下一个 Boss
          const bossKeys = Object.keys(CONFIG.BOSSES);
          this.levelIndex++;
          this.wave++;
          setTimeout(() => this._spawnBoss(), 300);
        } else {
          // 全部通关
          this._levelComplete();
        }
      }
    }

    // 检查游戏结束
    if (this.player && !this.player.active && this.state === GAME_STATE.PLAYING) {
      this._gameOver();
    }
  }

  _updateWaves(dt) {
    // 波次间隔
    if (this.waveTimer > 0) {
      this.waveTimer -= dt * 1000;
      return;
    }

    // 生成敌人
    this.spawnTimer -= dt * 1000;
    if (this.spawnTimer <= 0 && this.waveEnemiesSpawned < this.waveTotalEnemies) {
      this.spawnTimer = this.spawnInterval * this.diffConfig.spawnRate;
      this._spawnEnemy();
      this.waveEnemiesSpawned++;
    }

    // 检查本波是否完成
    if (
      this.waveEnemiesSpawned >= this.waveTotalEnemies &&
      this.enemyPool.count === 0
    ) {
      // 下一波
      if (this.wave < this.maxWaves) {
        this.wave++;
        this.hud.updateWave(this.wave);
        this.waveTimer = this.waveDelay;
        this.waveEnemiesSpawned = 0;
        this.waveTotalEnemies = this._calcWaveEnemies(this.wave);
      } else {
        // 所有波次完成，出 Boss
        if (!this.bossActive) {
          this._spawnBoss();
        }
      }
    }

    // 无尽模式：难度随波数增加
    if (this.mode === GAME_MODE.ENDLESS) {
      this.spawnInterval = Math.max(300, 1200 - this.wave * 20);
    }
  }

  _spawnEnemy() {
    const level = CONFIG.LEVELS[this.levelIndex];
    let enemyTypes = ['SCOUT', 'FIGHTER'];

    if (this.mode === GAME_MODE.ENDLESS) {
      // 无尽模式：根据波数解锁
      if (this.wave >= 3) enemyTypes.push('HEAVY');
      if (this.wave >= 6) enemyTypes.push('BOMBER');
      if (this.wave >= 10) enemyTypes.push('ELITE');
    } else if (level) {
      enemyTypes = level.enemyTypes;
    }

    const type = Utils.randomChoice(enemyTypes);
    const config = CONFIG.ENEMIES[type];

    const patterns = ['straight', 'zigzag'];
    if (type === 'FIGHTER') patterns.push('dive');
    if (type === 'BOMBER') patterns.push('bomber');
    if (type === 'ELITE') patterns.push('tracking');

    const pattern = Utils.randomChoice(patterns);
    const x = Utils.random(40, this.width - 40);

    this.enemyPool.get({
      x,
      y: -30,
      type,
      pattern,
      hpMul: this.diffConfig.enemyHp,
      speedMul: this.diffConfig.enemySpeed,
      fireRateMul: this.diffConfig.enemyFireRate,
      ...(this._getPatternConfig(pattern, type)),
    }).setReferences({
      bulletPool: this.bulletPool,
      player: this.player,
    });
  }

  _getPatternConfig(pattern, type) {
    const baseSpeed = CONFIG.ENEMIES[type].speed;
    switch (pattern) {
      case 'dive':
        return { vy: baseSpeed * 0.5 };
      case 'bomber':
        return { vy: baseSpeed * 0.6 };
      case 'tracking':
        return { vy: baseSpeed * 0.7 };
      default:
        return {};
    }
  }

  _spawnBoss() {
    let bossType;
    if (this.mode === GAME_MODE.BOSS_RUSH) {
      const bossKeys = Object.keys(CONFIG.BOSSES);
      bossType = bossKeys[this.levelIndex] || 'GUARDIAN';
    } else {
      const level = CONFIG.LEVELS[this.levelIndex];
      bossType = level ? level.boss : 'GUARDIAN';
    }

    this.boss = BossFactory.create(bossType, {
      hpMul: this.diffConfig.enemyHp,
    });
    this.boss.setReferences({
      bulletPool: this.bulletPool,
      enemyPool: this.enemyPool,
      player: this.player,
      particleSystem: this.particles,
      renderer: this.renderer,
    });

    this.bossActive = true;

    // Boss 警告
    this.state = GAME_STATE.BOSS_WARNING;
    this.menu.showBossWarning(this.boss.name);
    this.audio.playBossWarning();
    this.renderer.flash('#ff0000', 0.3, 0.5);
    this.renderer.shake(6, 0.5);

    setTimeout(() => {
      this.menu.hideBossWarning();
      this.menu.showBossHpBar(this.boss.name);
      this.state = GAME_STATE.PLAYING;
    }, 2000);
  }

  // ===== 碰撞检测 =====

  _checkCollisions() {
    if (!this.player || !this.player.active) return;

    const playerBounds = this.player.getBounds();

    // 玩家子弹 vs 敌人
    for (let i = this.bulletPool.activeBullets.length - 1; i >= 0; i--) {
      const bullet = this.bulletPool.activeBullets[i];
      if (!bullet.isPlayerBullet || !bullet.active) continue;

      const bulletBounds = bullet.getBounds();

      // vs 敌人
      for (let j = this.enemyPool.activeEnemies.length - 1; j >= 0; j--) {
        const enemy = this.enemyPool.activeEnemies[j];
        if (!enemy.active) continue;
        if (enemy.isBossDrone) continue; // 僚机在 Boss 里处理

        if (Utils.aabbCollide(bulletBounds, enemy.getBounds())) {
          if (bullet.piercing) {
            if (!bullet.hitEnemies.has(enemy)) {
              bullet.hitEnemies.add(enemy);
              this._enemyTakeDamage(enemy, bullet.damage);
            }
          } else {
            bullet.active = false;
            this._enemyTakeDamage(enemy, bullet.damage);
            break;
          }
        }
      }

      // vs Boss
      if (this.boss && this.boss.active && bullet.active) {
        const bossBounds = this.boss.getBounds();
        if (Utils.aabbCollide(bulletBounds, bossBounds)) {
          if (!bullet.piercing) {
            bullet.active = false;
          }
          this._bossTakeDamage(bullet.damage);
        }

        // Boss 僚机
        for (const drone of this.boss.drones) {
          if (drone.active && Utils.aabbCollide(bulletBounds, drone.getBounds())) {
            if (bullet.piercing) {
              if (!bullet.hitEnemies.has(drone)) {
                bullet.hitEnemies.add(drone);
                this._enemyTakeDamage(drone, bullet.damage, true);
              }
            } else {
              bullet.active = false;
              this._enemyTakeDamage(drone, bullet.damage, true);
              break;
            }
          }
        }
      }
    }

    // 敌人子弹 vs 玩家
    for (let i = this.bulletPool.activeBullets.length - 1; i >= 0; i--) {
      const bullet = this.bulletPool.activeBullets[i];
      if (bullet.isPlayerBullet || !bullet.active) continue;

      if (Utils.aabbCollide(bullet.getBounds(), playerBounds)) {
        bullet.active = false;
        const died = this.player.takeDamage(1);
        this.renderer.shake(4, 0.15);
        this.renderer.flash('#ff3366', 0.3, 0.1);
        this._resetCombo();
        if (died) {
          this._playerDeath();
        }
      }
    }

    // 敌人 vs 玩家（碰撞伤害）
    for (const enemy of this.enemyPool.activeEnemies) {
      if (!enemy.active || enemy.isBossDrone) continue;
      if (Utils.aabbCollide(enemy.getBounds(), playerBounds)) {
        const died = this.player.takeDamage(1);
        enemy.active = false;
        this._onEnemyKilled(enemy, false);
        this.renderer.shake(5, 0.2);
        this.renderer.flash('#ff3366', 0.3, 0.15);
        this._resetCombo();
        if (died) {
          this._playerDeath();
          return;
        }
      }
    }

    // Boss vs 玩家
    if (this.boss && this.boss.active && !this.boss.entering) {
      if (Utils.aabbCollide(this.boss.getBounds(), playerBounds)) {
        const died = this.player.takeDamage(1);
        this.renderer.shake(6, 0.2);
        this.renderer.flash('#ff3366', 0.3, 0.15);
        this._resetCombo();
        if (died) {
          this._playerDeath();
          return;
        }
      }

      // 幽灵 Boss 的激光
      if (this.boss.bossType === 'PHANTOM' && this.boss.getLaserBounds) {
        const laserBounds = this.boss.getLaserBounds();
        if (laserBounds && Utils.aabbCollide(laserBounds, playerBounds)) {
          if (!this._laserHitCooldown || this._laserHitCooldown <= 0) {
            this._laserHitCooldown = 0.3;
            const died = this.player.takeDamage(1);
            this.renderer.shake(4, 0.1);
            this._resetCombo();
            if (died) {
              this._playerDeath();
              return;
            }
          }
        }
        if (this._laserHitCooldown) {
          this._laserHitCooldown -= 1 / 60;
        }
      }
    }

    // 道具 vs 玩家
    for (let i = this.powerUpPool.activePowerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUpPool.activePowerUps[i];
      if (!pu.active) continue;

      if (Utils.aabbCollide(pu.getBounds(), playerBounds)) {
        pu.active = false;
        this._collectPowerUp(pu);
      }
    }
  }

  _enemyTakeDamage(enemy, damage, isDrone = false) {
    const killed = enemy.takeDamage(damage);
    if (killed) {
      this._onEnemyKilled(enemy, !isDrone);
      if (isDrone) {
        // 从 Boss 僚机列表移除
        if (this.boss) {
          const idx = this.boss.drones.indexOf(enemy);
          if (idx > -1) this.boss.drones.splice(idx, 1);
        }
      }
    }
  }

  _bossTakeDamage(damage) {
    if (!this.boss) return;
    const killed = this.boss.takeDamage(damage);
    if (killed) {
      this._onBossKilled();
    }
  }

  _onEnemyKilled(enemy, isNormal = true) {
    // 爆炸效果
    this.particles.createExplosion(enemy.x, enemy.y, enemy.color, isNormal ? 15 : 8, isNormal ? 4 : 3);
    this.audio.playExplosion(false);
    this.renderer.shake(isNormal ? 2 : 1, 0.1);

    // 得分 + 连击
    this._addScore(enemy.score);
    this.kills++;

    // 掉落道具
    if (isNormal && Math.random() < 0.18) {
      this.powerUpPool.tryDrop(enemy.x, enemy.y, 1);
    }
  }

  _onBossKilled() {
    const boss = this.boss;

    // 大爆炸
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (boss) {
          this.particles.createExplosion(
            boss.x + Utils.random(-boss.width / 3, boss.width / 3),
            boss.y + Utils.random(-boss.height / 3, boss.height / 3),
            boss.color,
            25,
            6
          );
        }
      }, i * 150);
    }

    this.audio.playExplosion(true);
    this.renderer.shake(12, 0.6);
    this.renderer.flash('#ffffff', 0.5, 0.3);

    // 得分
    this._addScore(boss.score);
    this.kills++;

    // 必掉道具
    this.powerUpPool.get({ x: boss.x - 30, y: boss.y, type: 'power' });
    this.powerUpPool.get({ x: boss.x + 30, y: boss.y, type: 'shield' });
    this.powerUpPool.get({ x: boss.x, y: boss.y + 20, type: 'bomb' });
    if (Math.random() > 0.5) {
      this.powerUpPool.get({ x: boss.x - 50, y: boss.y + 10, type: 'hp' });
    }

    this.bossActive = false;
    this.menu.hideBossHpBar();

    // 延迟后处理
    setTimeout(() => {
      if (this.mode === GAME_MODE.CAMPAIGN) {
        this._levelComplete();
      } else if (this.mode === GAME_MODE.ENDLESS) {
        // 无尽模式：Boss 后继续刷怪
        this.boss = null;
        this.wave++;
        this.hud.updateWave(this.wave);
        this.waveTimer = 3000;
        this.waveEnemiesSpawned = 0;
        this.waveTotalEnemies = this._calcWaveEnemies(this.wave);
      } else if (this.mode === GAME_MODE.BOSS_RUSH) {
        this.boss = null;
        // 下一个 Boss 在 _update 里处理
      }
    }, 2000);
  }

  _collectPowerUp(pu) {
    this.player.collectPowerUp(pu.type);
    this.audio.playPickup();
    this.particles.createPickup(pu.x, pu.y, pu.color);

    if (pu.type === 'coin') {
      this._addScore(500);
    }

    // 更新 HUD
    this.hud.updateHp(this.player.hp, this.player.maxHp);
    this.hud.updateBombs(this.player.bombs);
    this.hud.updatePowerLevel(this.player.powerLevel);
    this.hud.updateShield(
      this.player.shieldActive,
      this.player.shieldTimer,
      CONFIG.PLAYER.SHIELD_DURATION
    );
  }

  _addScore(amount) {
    // 连击加成
    const multiplier = Math.min(this.combo, CONFIG.COMBO.MAX_MULTIPLIER);
    const finalScore = Math.floor(amount * multiplier);
    this.score += finalScore;
    this.hud.updateScore(this.score);

    // 增加连击
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.comboTimer = CONFIG.COMBO.TIMEOUT;
    this.hud.updateCombo(Math.min(this.combo, CONFIG.COMBO.MAX_MULTIPLIER));
  }

  _resetCombo() {
    this.combo = 1;
    this.comboTimer = 0;
    this.hud.updateCombo(1);
  }

  // ===== 炸弹 =====

  useBomb() {
    if (!this.player || !this.player.active) return;
    if (this.state !== GAME_STATE.PLAYING) return;

    if (this.player.useBomb()) {
      this.hud.updateBombs(this.player.bombs);

      // 清屏所有敌人子弹
      for (const b of this.bulletPool.activeBullets) {
        if (!b.isPlayerBullet) {
          b.active = false;
          this.particles.createExplosion(b.x, b.y, '#ffcc00', 3, 2);
        }
      }

      // 对所有敌人造成伤害
      for (const enemy of this.enemyPool.activeEnemies) {
        if (enemy.active && !enemy.isBossDrone) {
          this._enemyTakeDamage(enemy, 5);
        }
      }

      // 对 Boss 造成伤害
      if (this.boss && this.boss.active) {
        this._bossTakeDamage(20);
      }

      // 特效
      this.renderer.flash('#ffffff', 0.7, 0.2);
      this.renderer.shake(8, 0.3);

      // 扩散波粒子
      for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        this.particles.particles.push(new Particle({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8,
          life: 0.5,
          maxLife: 0.5,
          size: 4,
          color: '#ffcc00',
          fade: true,
          shrink: true,
        }));
      }
    }
  }

  // ===== 游戏状态控制 =====

  pause() {
    if (this.state !== GAME_STATE.PLAYING) return;
    this.state = GAME_STATE.PAUSED;
    this.menu.showPause();
    this.audio.stopBGM();
  }

  resume() {
    if (this.state !== GAME_STATE.PAUSED) return;
    this.state = GAME_STATE.PLAYING;
    this.menu.hidePause();
    this.audio.startBGM();
    this.lastTime = performance.now();
  }

  restart() {
    this.menu.hidePause();
    this.menu.hideGameOver();
    this.menu.hideLevelComplete();

    if (this.mode === GAME_MODE.CAMPAIGN) {
      this.startCampaign(this.levelIndex);
    } else if (this.mode === GAME_MODE.ENDLESS) {
      this.startEndless();
    } else if (this.mode === GAME_MODE.BOSS_RUSH) {
      this.startBossRush();
    }
  }

  quitToMenu() {
    this.state = GAME_STATE.MENU;
    this.menu.hidePause();
    this.menu.hideGameOver();
    this.menu.hideLevelComplete();
    this.menu.hideHUD();
    this.menu.hideBossHpBar();
    this.menu.showScreen('main-menu');
    this.audio.stopBGM();
    this.bossActive = false;
    this.boss = null;
  }

  nextLevel() {
    if (this.levelIndex < CONFIG.LEVELS.length - 1) {
      this.startCampaign(this.levelIndex + 1);
    } else {
      this.quitToMenu();
    }
  }

  _playerDeath() {
    // 大爆炸
    this.particles.createExplosion(this.player.x, this.player.y, '#ff3366', 40, 6);
    this.renderer.shake(10, 0.4);
    this.audio.playExplosion(true);
  }

  _gameOver() {
    this.state = GAME_STATE.GAME_OVER;
    this.audio.stopBGM();
    this.audio.playGameOver();

    const isNewRecord = this.menu.addHighScore(this.score);

    setTimeout(() => {
      this.menu.showGameOver(this.score, this.maxCombo, this.kills, isNewRecord);
    }, 1000);
  }

  _levelComplete() {
    this.state = GAME_STATE.LEVEL_COMPLETE;
    this.audio.stopBGM();
    this.audio.playLevelComplete();

    // 计算星级
    let stars = 1;
    if (this.player && this.player.hp >= this.player.maxHp - 1) stars = 2;
    if (this.player && this.player.hp >= this.player.maxHp) stars = 3;

    // 保存进度
    if (this.mode === GAME_MODE.CAMPAIGN) {
      this.menu.unlockLevel(this.levelIndex + 1);
      const level = CONFIG.LEVELS[this.levelIndex];
      if (level) {
        this.menu.saveLevelStars(level.id, stars);
      }
      this.menu.checkAircraftUnlocks(this.levelIndex + 1);
    }

    this.menu.showLevelComplete(this.score, this.gameTime, stars);
  }

  // ===== 渲染 =====

  _render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 背景
    this.renderer.drawBackground();

    if (this.state !== GAME_STATE.MENU) {
      // 道具
      this.powerUpPool.draw(this.ctx);

      // 敌人
      this.enemyPool.draw(this.ctx);

      // Boss
      if (this.boss && this.boss.active) {
        this.boss.draw(this.ctx);
      }

      // 玩家
      if (this.player) {
        this.player.draw(this.ctx);
      }

      // 子弹
      this.bulletPool.draw(this.ctx);

      // 粒子
      this.particles.draw(this.ctx);
    }

    // 科技风装饰
    if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED) {
      this.renderer.drawCornerDecor();
    }

    // 扫描线（轻微）
    if (this.state === GAME_STATE.PLAYING) {
      this.renderer.drawScanlines();
    }
  }

  // ===== 销毁 =====

  destroy() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.audio.stopBGM();
  }
}
