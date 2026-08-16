// ===== 敌人实体（基类 + 各类型）=====
class Enemy {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || -50;
    this.type = options.type || 'SCOUT';

    // 从配置读取
    const config = CONFIG.ENEMIES[this.type] || CONFIG.ENEMIES.SCOUT;
    this.maxHp = config.hp;
    this.hp = options.hp || config.hp;
    this.speed = config.speed;
    this.score = config.score;
    this.width = config.width;
    this.height = config.height;
    this.color = config.color;
    this.fireRate = config.fireRate;

    // 难度调整
    if (options.hpMul) {
      this.maxHp *= options.hpMul;
      this.hp = this.maxHp;
    }
    if (options.speedMul) {
      this.speed *= options.speedMul;
    }
    if (options.fireRateMul) {
      this.fireRate *= options.fireRateMul;
    }

    this.vx = options.vx || 0;
    this.vy = options.vy || this.speed;
    this.active = true;

    // 射击
    this.fireTimer = Utils.random(0, this.fireRate);

    // 运动模式
    this.pattern = options.pattern || 'straight'; // straight, zigzag, dive, bomber, tracking
    this.patternTime = 0;
    this.startX = this.x;
    this.startY = this.y;

    // 受击闪白
    this.hitFlash = 0;

    // 引用
    this.bulletPool = null;
    this.playerRef = null;
  }

  setReferences({ bulletPool, player }) {
    this.bulletPool = bulletPool;
    this.playerRef = player;
  }

  update(dt) {
    if (!this.active) return;

    this.patternTime += dt;

    // 根据运动模式更新位置
    this._updateMovement(dt);

    // 超出屏幕底部
    if (this.y > CONFIG.CANVAS_HEIGHT + this.height) {
      this.active = false;
    }

    // 超出左右边界（有些模式可能飞出）
    if (this.x < -this.width * 2 || this.x > CONFIG.CANVAS_WIDTH + this.width * 2) {
      // 有些模式允许短暂飞出，但完全出去了就销毁
      if (this.pattern !== 'bomber' && this.pattern !== 'tracking') {
        // 不销毁，让它继续
      }
    }

    // 射击
    if (this.fireRate > 0 && this.y > 0 && this.y < CONFIG.CANVAS_HEIGHT * 0.6) {
      this.fireTimer += dt * 1000;
      if (this.fireTimer >= this.fireRate) {
        this.fireTimer = 0;
        this._fire();
      }
    }

    // 受击闪烁
    if (this.hitFlash > 0) {
      this.hitFlash -= dt * 10;
    }
  }

  _updateMovement(dt) {
    switch (this.pattern) {
      case 'straight':
        this.y += this.vy;
        break;

      case 'zigzag': {
        this.y += this.vy;
        const amp = 60;
        const freq = 2;
        this.x = this.startX + Math.sin(this.patternTime * freq) * amp;
        break;
      }

      case 'dive': {
        // 先直线下到一定位置后俯冲
        if (this.y < 150) {
          this.y += this.vy * 0.5;
        } else {
          // 向玩家方向俯冲
          if (this.playerRef && this.playerRef.active) {
            const angle = Utils.angleTowards(this.x, this.y, this.playerRef.x, this.playerRef.y);
            this.vx = Math.cos(angle) * this.speed * 1.5;
            this.vy = Math.sin(angle) * this.speed * 1.5;
          }
          this.x += this.vx;
          this.y += this.vy;
        }
        break;
      }

      case 'bomber': {
        // 缓慢下降 + 左右移动
        this.y += this.vy * 0.6;
        const amp = 100;
        const freq = 0.8;
        this.x = CONFIG.CANVAS_WIDTH / 2 + Math.sin(this.patternTime * freq + this.startX * 0.01) * amp;
        break;
      }

      case 'tracking': {
        // 追踪玩家（水平方向）
        this.y += this.vy * 0.7;
        if (this.playerRef && this.playerRef.active) {
          const dx = this.playerRef.x - this.x;
          this.vx = Utils.clamp(dx * 0.02, -this.speed, this.speed);
          this.x += this.vx;
        }
        break;
      }

      default:
        this.y += this.vy;
    }
  }

  _fire() {
    if (!this.bulletPool) return;

    const bulletSpeed = CONFIG.BULLET.ENEMY_SPEED;

    switch (this.type) {
      case 'FIGHTER': {
        // 单发向下
        this.bulletPool.get({
          x: this.x,
          y: this.y + this.height / 2,
          vx: 0,
          vy: bulletSpeed,
          width: CONFIG.BULLET.ENEMY_WIDTH,
          height: CONFIG.BULLET.ENEMY_WIDTH,
          damage: 1,
          isPlayerBullet: false,
          color: '#ffcc00',
        });
        break;
      }

      case 'HEAVY': {
        // 散射3发
        for (let i = -1; i <= 1; i++) {
          const angle = Math.PI / 2 + i * 0.3;
          this.bulletPool.get({
            x: this.x,
            y: this.y + this.height / 2,
            vx: Math.cos(angle) * bulletSpeed,
            vy: Math.sin(angle) * bulletSpeed,
            width: CONFIG.BULLET.ENEMY_WIDTH + 1,
            height: CONFIG.BULLET.ENEMY_WIDTH + 1,
            damage: 1,
            isPlayerBullet: false,
            color: '#ff6600',
          });
        }
        break;
      }

      case 'BOMBER': {
        // 抛物线投弹
        this.bulletPool.get({
          x: this.x + Utils.random(-10, 10),
          y: this.y + this.height / 2,
          vx: Utils.random(-1, 1),
          vy: 2,
          width: 10,
          height: 10,
          damage: 1,
          isPlayerBullet: false,
          color: '#ff4400',
        });
        break;
      }

      case 'ELITE': {
        // 多发追踪弹（向玩家方向）
        if (this.playerRef && this.playerRef.active) {
          const baseAngle = Utils.angleTowards(this.x, this.y, this.playerRef.x, this.playerRef.y);
          for (let i = -1; i <= 1; i++) {
            const angle = baseAngle + i * 0.2;
            this.bulletPool.get({
              x: this.x,
              y: this.y + this.height / 2,
              vx: Math.cos(angle) * bulletSpeed * 1.2,
              vy: Math.sin(angle) * bulletSpeed * 1.2,
              width: 7,
              height: 7,
              damage: 1,
              isPlayerBullet: false,
              color: '#00ff88',
            });
          }
        }
        break;
      }

      case 'DRONE': {
        // 简单向下射击
        this.bulletPool.get({
          x: this.x,
          y: this.y + this.height / 2,
          vx: 0,
          vy: bulletSpeed * 0.8,
          width: 5,
          height: 5,
          damage: 1,
          isPlayerBullet: false,
          color: '#ffcc00',
        });
        break;
      }
    }
  }

  // 受到伤害
  takeDamage(damage = 1) {
    this.hp -= damage;
    this.hitFlash = 1;

    if (this.hp <= 0) {
      this.active = false;
      return true; // 死亡
    }
    return false;
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 受击闪白
    if (this.hitFlash > 0) {
      ctx.filter = 'brightness(2)';
    }

    switch (this.type) {
      case 'SCOUT':
        this._drawScout(ctx);
        break;
      case 'FIGHTER':
        this._drawFighter(ctx);
        break;
      case 'HEAVY':
        this._drawHeavy(ctx);
        break;
      case 'BOMBER':
        this._drawBomber(ctx);
        break;
      case 'ELITE':
        this._drawElite(ctx);
        break;
      case 'DRONE':
        this._drawDrone(ctx);
        break;
      default:
        this._drawScout(ctx);
    }

    // 血条（血量大于1时显示）
    if (this.maxHp > 1 && this.hp < this.maxHp) {
      const barW = this.width;
      const barH = 3;
      const pct = this.hp / this.maxHp;
      ctx.filter = 'none';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-barW / 2, -this.height / 2 - 8, barW, barH);
      ctx.fillStyle = pct > 0.5 ? '#00ff88' : pct > 0.25 ? '#ffcc00' : '#ff3366';
      ctx.fillRect(-barW / 2, -this.height / 2 - 8, barW * pct, barH);
    }

    ctx.restore();
  }

  _drawScout(ctx) {
    const w = this.width;
    const h = this.height;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 2;

    // 倒三角小飞机
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(0, -h / 4);
    ctx.lineTo(-w / 2, -h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 驾驶舱
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.arc(0, 0, w / 6, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawFighter(ctx) {
    const w = this.width;
    const h = this.height;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 2;

    // 菱形战机
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(w / 3, -h / 2);
    ctx.lineTo(-w / 3, -h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 中央
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 3;
    ctx.fillRect(-3, -h / 4, 6, h / 2);
  }

  _drawHeavy(ctx) {
    const w = this.width;
    const h = this.height;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 3;

    // 重型 - 宽体
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 4);
    ctx.lineTo(-w / 3, h / 2);
    ctx.lineTo(w / 3, h / 2);
    ctx.lineTo(w / 2, -h / 4);
    ctx.lineTo(w / 4, -h / 2);
    ctx.lineTo(-w / 4, -h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 装甲板
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.shadowBlur = 0;
    ctx.fillRect(-w / 3, -h / 6, w * 2 / 3, h / 4);

    // 炮台
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 2;
    ctx.fillRect(-w / 6, h / 2 - 4, w / 3, 6);
  }

  _drawBomber(ctx) {
    const w = this.width;
    const h = this.height;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 3;

    // 大型轰炸机
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 机翼
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2 - 10, -h / 6);
    ctx.lineTo(-w / 2 - 10, h / 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2 + 10, -h / 6);
    ctx.lineTo(w / 2 + 10, h / 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 弹舱
    ctx.fillStyle = '#ffcc00';
    ctx.shadowBlur = 3;
    ctx.fillRect(-6, h / 3 - 2, 12, 8);
  }

  _drawElite(ctx) {
    const w = this.width;
    const h = this.height;
    const time = Date.now() / 500;

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 2;

    // 流线型精英战机
    ctx.save();
    ctx.rotate(Math.sin(time) * 0.05);

    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w / 3, h / 4);
    ctx.lineTo(w / 2, -h / 4);
    ctx.lineTo(w / 3, -h / 2);
    ctx.lineTo(0, -h / 3);
    ctx.lineTo(-w / 3, -h / 2);
    ctx.lineTo(-w / 2, -h / 4);
    ctx.lineTo(-w / 3, h / 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 核心
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 2;
    ctx.beginPath();
    ctx.arc(0, 0, w / 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawDrone(ctx) {
    const w = this.width;
    const h = this.height;
    const time = Date.now() / 200;

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 2;

    // 旋转的无人机
    ctx.save();
    ctx.rotate(time);

    // 十字形
    ctx.fillRect(-w / 2, -2, w, 4);
    ctx.fillRect(-2, -h / 2, 4, h);

    // 中心
    ctx.beginPath();
    ctx.arc(0, 0, w / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width * 0.8,
      height: this.height * 0.8,
    };
  }

  reset(options) {
    this.x = options.x || 0;
    this.y = options.y || -50;
    this.type = options.type || 'SCOUT';

    const config = CONFIG.ENEMIES[this.type] || CONFIG.ENEMIES.SCOUT;
    this.maxHp = config.hp;
    this.hp = options.hp || config.hp;
    this.speed = config.speed;
    this.score = config.score;
    this.width = config.width;
    this.height = config.height;
    this.color = config.color;
    this.fireRate = config.fireRate;

    if (options.hpMul) {
      this.maxHp *= options.hpMul;
      this.hp = this.maxHp;
    }
    if (options.speedMul) {
      this.speed *= options.speedMul;
    }
    if (options.fireRateMul) {
      this.fireRate *= options.fireRateMul;
    }

    this.vx = options.vx || 0;
    this.vy = options.vy || this.speed;
    this.active = true;
    this.fireTimer = Utils.random(0, this.fireRate);
    this.pattern = options.pattern || 'straight';
    this.patternTime = 0;
    this.startX = this.x;
    this.startY = this.y;
    this.hitFlash = 0;
  }
}

// ===== 敌人对象池 =====
class EnemyPool {
  constructor(maxSize = 50) {
    this.pool = [];
    this.maxSize = maxSize;
    this.activeEnemies = [];
  }

  get(options) {
    let enemy;
    if (this.pool.length > 0) {
      enemy = this.pool.pop();
      enemy.reset(options);
    } else {
      enemy = new Enemy(options);
    }
    this.activeEnemies.push(enemy);
    return enemy;
  }

  release(enemy) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(enemy);
    }
    const idx = this.activeEnemies.indexOf(enemy);
    if (idx > -1) this.activeEnemies.splice(idx, 1);
  }

  update(dt) {
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const e = this.activeEnemies[i];
      e.update(dt);
      if (!e.active) {
        this.release(e);
      }
    }
  }

  draw(ctx) {
    for (const e of this.activeEnemies) {
      e.draw(ctx);
    }
  }

  clear() {
    for (const e of this.activeEnemies) {
      this.pool.push(e);
    }
    this.activeEnemies = [];
  }

  get count() {
    return this.activeEnemies.length;
  }
}
