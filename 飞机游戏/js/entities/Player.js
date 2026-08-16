// ===== 玩家战机 =====
class Player {
  constructor(options = {}) {
    this.x = options.x || CONFIG.CANVAS_WIDTH / 2;
    this.y = options.y || CONFIG.CANVAS_HEIGHT - 100;
    this.width = CONFIG.PLAYER.WIDTH;
    this.height = CONFIG.PLAYER.HEIGHT;
    this.speed = CONFIG.PLAYER.SPEED;
    this.active = true;

    // 属性
    this.hp = CONFIG.PLAYER.INIT_HP;
    this.maxHp = CONFIG.PLAYER.MAX_HP;
    this.bombs = CONFIG.PLAYER.INIT_BOMBS;
    this.maxBombs = CONFIG.PLAYER.MAX_BOMBS;
    this.powerLevel = CONFIG.PLAYER.INIT_POWER;
    this.maxPower = CONFIG.PLAYER.MAX_POWER;

    // 状态
    this.invincible = false;
    this.invincibleTimer = 0;
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.laserActive = false;
    this.laserTimer = 0;
    this.wingmanActive = false;
    this.wingmanTimer = 0;

    // 射击
    this.fireRate = CONFIG.PLAYER.FIRE_RATE;
    this.fireTimer = 0;
    this.autoFire = true;

    // 外观
    this.color = options.color || '#00f0ff';
    this.aircraftId = options.aircraftId || 'falcon';
    this.speedMul = options.speedMul || 1;
    this.fireRateMul = options.fireRateMul || 1;
    this.damageMul = options.damageMul || 1;

    // 引擎火焰动画
    this.thrusterTime = 0;

    // 拖拽
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // 引用（外部设置）
    this.bulletPool = null;
    this.particleSystem = null;
    this.audio = null;
    this.input = null;

    // 僚机
    this.wingmen = [
      { offsetX: -50, offsetY: 20, active: false },
      { offsetX: 50, offsetY: 20, active: false },
    ];
  }

  setReferences({ bulletPool, particleSystem, audio, input }) {
    this.bulletPool = bulletPool;
    this.particleSystem = particleSystem;
    this.audio = audio;
    this.input = input;
  }

  update(dt, gameState) {
    if (!this.active) return;

    // 无敌时间
    if (this.invincible) {
      this.invincibleTimer -= dt * 1000;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }

    // 护盾时间
    if (this.shieldActive) {
      this.shieldTimer -= dt * 1000;
      if (this.shieldTimer <= 0) {
        this.shieldActive = false;
      }
    }

    // 激光时间
    if (this.laserActive) {
      this.laserTimer -= dt * 1000;
      if (this.laserTimer <= 0) {
        this.laserActive = false;
        if (this.audio) this.audio.stopLaser();
      }
    }

    // 僚机时间
    if (this.wingmanActive) {
      this.wingmanTimer -= dt * 1000;
      if (this.wingmanTimer <= 0) {
        this.wingmanActive = false;
        this.wingmen[0].active = false;
        this.wingmen[1].active = false;
      }
    }

    // 移动
    this._handleMovement(dt);

    // 边界限制
    this.x = Utils.clamp(this.x, this.width / 2, CONFIG.CANVAS_WIDTH - this.width / 2);
    this.y = Utils.clamp(this.y, this.height / 2, CONFIG.CANVAS_HEIGHT - this.height / 2);

    // 射击
    if (this.autoFire && gameState === GAME_STATE.PLAYING) {
      this.fireTimer += dt * 1000;
      const actualFireRate = this.fireRate / this.fireRateMul;
      if (this.fireTimer >= actualFireRate) {
        this.fireTimer = 0;
        this._fire();
      }
    }

    // 引擎火焰粒子
    this.thrusterTime += dt;
    if (this.thrusterTime > 0.03) {
      this.thrusterTime = 0;
      if (this.particleSystem) {
        this.particleSystem.createTrail(
          this.x,
          this.y + this.height / 2,
          '#ff9900',
          1
        );
      }
    }
  }

  _handleMovement(dt) {
    if (!this.input) return;

    const actualSpeed = this.speed * this.speedMul;

    // 键盘移动
    const { dx, dy } = this.input.getKeyboardMove();
    if (dx !== 0 || dy !== 0) {
      this.x += dx * actualSpeed;
      this.y += dy * actualSpeed;
      this.input.isDragging = false;
      return;
    }

    // 鼠标/触摸拖拽
    if (this.input.isPointerActive()) {
      const pos = this.input.getPointerPos();

      if (!this._dragStarted) {
        this._dragStarted = true;
        this.dragOffsetX = this.x - pos.x;
        this.dragOffsetY = this.y - pos.y;
      }

      this.x = pos.x + this.dragOffsetX;
      this.y = pos.y + this.dragOffsetY;
    } else {
      this._dragStarted = false;
    }
  }

  _fire() {
    if (!this.bulletPool) return;

    const baseDamage = 1 * this.damageMul;

    if (this.laserActive) {
      // 激光
      this.bulletPool.get({
        x: this.x,
        y: this.y - this.height / 2,
        vy: -20,
        width: CONFIG.BULLET.LASER_WIDTH,
        height: 4,
        damage: baseDamage * 0.3,
        isPlayerBullet: true,
        color: '#b000ff',
        piercing: true,
        isLaser: true,
        laserLength: 80,
      });
      if (this.audio && !this._laserPlaying) {
        this.audio.startLaser();
        this._laserPlaying = true;
      }
    } else {
      if (this.audio) this.audio.playShoot();

      // 根据火力等级发射不同数量的子弹
      switch (this.powerLevel) {
        case 1:
          this._spawnBullet(0, -this.height / 2, 0, baseDamage);
          break;
        case 2:
          this._spawnBullet(-8, -this.height / 2, 0, baseDamage);
          this._spawnBullet(8, -this.height / 2, 0, baseDamage);
          break;
        case 3:
          this._spawnBullet(0, -this.height / 2, 0, baseDamage);
          this._spawnBullet(-12, -this.height / 2 + 5, 0, baseDamage * 0.8);
          this._spawnBullet(12, -this.height / 2 + 5, 0, baseDamage * 0.8);
          break;
        case 4:
          this._spawnBullet(-6, -this.height / 2, 0, baseDamage);
          this._spawnBullet(6, -this.height / 2, 0, baseDamage);
          this._spawnBullet(-16, -this.height / 2 + 8, -1, baseDamage * 0.8);
          this._spawnBullet(16, -this.height / 2 + 8, 1, baseDamage * 0.8);
          break;
        case 5:
        default:
          this._spawnBullet(0, -this.height / 2, 0, baseDamage * 1.2);
          this._spawnBullet(-10, -this.height / 2 + 4, 0, baseDamage);
          this._spawnBullet(10, -this.height / 2 + 4, 0, baseDamage);
          this._spawnBullet(-20, -this.height / 2 + 10, -1.5, baseDamage * 0.7);
          this._spawnBullet(20, -this.height / 2 + 10, 1.5, baseDamage * 0.7);
          break;
      }

      // 僚机射击
      if (this.wingmanActive) {
        for (const w of this.wingmen) {
          if (w.active) {
            const wx = this.x + w.offsetX;
            const wy = this.y + w.offsetY;
            this.bulletPool.get({
              x: wx,
              y: wy,
              vy: -CONFIG.BULLET.PLAYER_SPEED,
              width: 3,
              height: 10,
              damage: baseDamage * 0.5,
              isPlayerBullet: true,
              color: '#00ff88',
            });
          }
        }
      }

      if (this._laserPlaying) {
        if (this.audio) this.audio.stopLaser();
        this._laserPlaying = false;
      }
    }
  }

  _spawnBullet(offsetX, offsetY, vxOffset, damage) {
    this.bulletPool.get({
      x: this.x + offsetX,
      y: this.y + offsetY,
      vx: vxOffset,
      vy: -CONFIG.BULLET.PLAYER_SPEED,
      damage: damage,
      isPlayerBullet: true,
      color: this.color,
    });
  }

  // 受到伤害
  takeDamage(amount = 1) {
    if (this.invincible) return false;

    if (this.shieldActive) {
      this.shieldActive = false;
      this.shieldTimer = 0;
      if (this.particleSystem) {
        this.particleSystem.createShieldBreak(this.x, this.y, 30);
      }
      if (this.audio) this.audio.playPickup();
      this._setInvincible(1000);
      return false;
    }

    this.hp -= amount;
    if (this.audio) this.audio.playHit();
    if (this.particleSystem) {
      this.particleSystem.createExplosion(this.x, this.y, '#ff3366', 10, 3);
    }

    // 火力降级
    if (this.powerLevel > 1) {
      this.powerLevel--;
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.active = false;
      return true; // 死亡
    }

    this._setInvincible(CONFIG.PLAYER.INVINCIBLE_TIME);
    return false;
  }

  _setInvincible(time) {
    this.invincible = true;
    this.invincibleTimer = time;
  }

  // 拾取道具
  collectPowerUp(type) {
    switch (type) {
      case 'power':
        if (this.powerLevel < this.maxPower) {
          this.powerLevel++;
        }
        break;
      case 'shield':
        this.shieldActive = true;
        this.shieldTimer = CONFIG.PLAYER.SHIELD_DURATION;
        break;
      case 'bomb':
        if (this.bombs < this.maxBombs) {
          this.bombs++;
        }
        break;
      case 'laser':
        this.laserActive = true;
        this.laserTimer = 10000;
        break;
      case 'wingman':
        this.wingmanActive = true;
        this.wingmanTimer = 15000;
        this.wingmen[0].active = true;
        this.wingmen[1].active = true;
        break;
      case 'hp':
        if (this.hp < this.maxHp) {
          this.hp++;
        }
        break;
      case 'coin':
        // 得分在 Game 类处理
        break;
    }
  }

  // 使用炸弹
  useBomb() {
    if (this.bombs <= 0) return false;
    this.bombs--;
    this._setInvincible(2000);
    if (this.audio) this.audio.playBomb();
    return true;
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();

    // 无敌闪烁
    if (this.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // 绘制战机
    this._drawShip(ctx);

    // 绘制僚机
    if (this.wingmanActive) {
      for (const w of this.wingmen) {
        if (w.active) {
          const wx = this.x + w.offsetX;
          const wy = this.y + w.offsetY;
          this._drawWingman(ctx, wx, wy);
        }
      }
    }

    // 护盾
    if (this.shieldActive) {
      this._drawShield(ctx);
    }

    ctx.restore();
  }

  _drawShip(ctx) {
    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.translate(x, y);

    // 引擎火焰
    const flameH = 12 + Math.sin(Date.now() / 50) * 4;
    const flameGrad = ctx.createLinearGradient(0, h / 2, 0, h / 2 + flameH);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.3, '#ffcc00');
    flameGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(-5, h / 2 - 2);
    ctx.lineTo(5, h / 2 - 2);
    ctx.lineTo(3, h / 2 + flameH);
    ctx.lineTo(-3, h / 2 + flameH);
    ctx.closePath();
    ctx.fill();

    // 战机主体
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 5;

    // 机身
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);                     // 机头
    ctx.lineTo(w / 4, -h / 4);                 // 上肩左
    ctx.lineTo(w / 2, h / 4);                  // 左翼尖
    ctx.lineTo(w / 4, h / 3);                  // 左翼根
    ctx.lineTo(w / 6, h / 2 - 4);              // 尾部左
    ctx.lineTo(-w / 6, h / 2 - 4);             // 尾部右
    ctx.lineTo(-w / 4, h / 3);                 // 右翼根
    ctx.lineTo(-w / 2, h / 4);                 // 右翼尖
    ctx.lineTo(-w / 4, -h / 4);                // 上肩右
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 座舱
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.ellipse(0, -h / 6, w / 8, h / 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 机翼装饰线
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-w / 3, h / 6);
    ctx.lineTo(-w / 5, -h / 6);
    ctx.moveTo(w / 3, h / 6);
    ctx.lineTo(w / 5, -h / 6);
    ctx.stroke();

    ctx.restore();
  }

  _drawWingman(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    const w = 20;
    const h = 24;

    // 引擎火焰
    const flameH = 8 + Math.sin(Date.now() / 50) * 2;
    const flameGrad = ctx.createLinearGradient(0, h / 2, 0, h / 2 + flameH);
    flameGrad.addColorStop(0, '#00ff88');
    flameGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = flameGrad;
    ctx.fillRect(-2, h / 2, 4, flameH);

    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 3;

    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, h / 3);
    ctx.lineTo(w / 5, h / 2);
    ctx.lineTo(-w / 5, h / 2);
    ctx.lineTo(-w / 2, h / 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  _drawShield(ctx) {
    const radius = Math.max(this.width, this.height) * 0.7;
    const time = Date.now() / 1000;
    const pulse = 1 + Math.sin(time * 3) * 0.05;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 外层能量罩
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.arc(0, 0, radius * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // 内层半透明
    ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius * pulse * 0.95, 0, Math.PI * 2);
    ctx.fill();

    // 六边形纹理
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + time;
      const x1 = Math.cos(angle) * radius * 0.3;
      const y1 = Math.sin(angle) * radius * 0.3;
      const x2 = Math.cos(angle) * radius * 0.9;
      const y2 = Math.sin(angle) * radius * 0.9;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  getBounds() {
    // 碰撞体积稍小一点，手感更好
    return {
      x: this.x,
      y: this.y,
      width: this.width * 0.7,
      height: this.height * 0.7,
    };
  }

  reset() {
    this.x = CONFIG.CANVAS_WIDTH / 2;
    this.y = CONFIG.CANVAS_HEIGHT - 100;
    this.hp = CONFIG.PLAYER.INIT_HP;
    this.bombs = CONFIG.PLAYER.INIT_BOMBS;
    this.powerLevel = CONFIG.PLAYER.INIT_POWER;
    this.active = true;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.laserActive = false;
    this.laserTimer = 0;
    this.wingmanActive = false;
    this.wingmanTimer = 0;
    this.fireTimer = 0;
    this._dragStarted = false;
    this._laserPlaying = false;
    this.wingmen[0].active = false;
    this.wingmen[1].active = false;
  }
}
