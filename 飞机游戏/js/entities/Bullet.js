// ===== 子弹实体 =====
class Bullet {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || -CONFIG.BULLET.PLAYER_SPEED;
    this.width = options.width || CONFIG.BULLET.PLAYER_WIDTH;
    this.height = options.height || CONFIG.BULLET.PLAYER_HEIGHT;
    this.damage = options.damage || 1;
    this.isPlayerBullet = options.isPlayerBullet !== false;
    this.color = options.color || (this.isPlayerBullet ? '#00f0ff' : '#ff3366');
    this.trailColor = options.trailColor || this.color;
    this.active = true;
    this.piercing = options.piercing || false; // 穿透
    this.hitEnemies = new Set(); // 穿透时记录已击中的敌人
    this.isLaser = options.isLaser || false;
    this.laserLength = options.laserLength || 0;
  }

  update(dt) {
    if (!this.active) return;

    this.x += this.vx;
    this.y += this.vy;

    // 超出屏幕
    if (
      this.y < -this.height ||
      this.y > CONFIG.CANVAS_HEIGHT + this.height ||
      this.x < -this.width ||
      this.x > CONFIG.CANVAS_WIDTH + this.width
    ) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();

    if (this.isLaser) {
      // 激光样式
      const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.laserLength);
      grad.addColorStop(0, this.color);
      grad.addColorStop(0.5, this.color);
      grad.addColorStop(1, Utils.rgba(this.color.replace('#', ''), 0.3));

      ctx.fillStyle = grad;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 4;
      ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.laserLength);

      // 核心亮光
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.fillRect(this.x - this.width / 3, this.y, this.width / 1.5, this.laserLength * 0.9);

      // 外边框
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.strokeRect(this.x - this.width / 2, this.y, this.width, this.laserLength);
    } else {
      // 普通子弹 - 清晰的胶囊形状
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 4;

      // 子弹主体 - 实心填充
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 白色高光核心
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y - 1, this.width / 4, this.height / 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // 清晰边框
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // 拖尾 - 更短更清晰
      const trailLen = this.height * 1.2;
      const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + trailLen);
      grad.addColorStop(0, this.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.7;
      ctx.shadowBlur = 2;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + trailLen / 2 + 2, this.width / 3, trailLen / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // 获取碰撞体
  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.isLaser ? this.laserLength : this.height,
    };
  }

  reset(options) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || -CONFIG.BULLET.PLAYER_SPEED;
    this.width = options.width || CONFIG.BULLET.PLAYER_WIDTH;
    this.height = options.height || CONFIG.BULLET.PLAYER_HEIGHT;
    this.damage = options.damage || 1;
    this.isPlayerBullet = options.isPlayerBullet !== false;
    this.color = options.color || (this.isPlayerBullet ? '#00f0ff' : '#ff3366');
    this.trailColor = options.trailColor || this.color;
    this.piercing = options.piercing || false;
    this.hitEnemies.clear();
    this.isLaser = options.isLaser || false;
    this.laserLength = options.laserLength || 0;
    this.active = true;
  }
}

// ===== 子弹对象池 =====
class BulletPool {
  constructor(maxSize = 200) {
    this.pool = [];
    this.maxSize = maxSize;
    this.activeBullets = [];
  }

  get(options) {
    let bullet;
    if (this.pool.length > 0) {
      bullet = this.pool.pop();
      bullet.reset(options);
    } else {
      bullet = new Bullet(options);
    }
    this.activeBullets.push(bullet);
    return bullet;
  }

  release(bullet) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(bullet);
    }
    const idx = this.activeBullets.indexOf(bullet);
    if (idx > -1) this.activeBullets.splice(idx, 1);
  }

  update(dt) {
    for (let i = this.activeBullets.length - 1; i >= 0; i--) {
      const b = this.activeBullets[i];
      b.update(dt);
      if (!b.active) {
        this.release(b);
      }
    }
  }

  draw(ctx) {
    for (const b of this.activeBullets) {
      b.draw(ctx);
    }
  }

  clear() {
    for (const b of this.activeBullets) {
      this.pool.push(b);
    }
    this.activeBullets = [];
  }

  get count() {
    return this.activeBullets.length;
  }
}
