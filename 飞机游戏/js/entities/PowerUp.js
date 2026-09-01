// ===== 道具实体 =====
class PowerUp {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.type = options.type || 'power';
    this.speed = options.speed || CONFIG.POWERUPS.SPEED;
    this.size = options.size || CONFIG.POWERUPS.SIZE;
    this.width = this.size;
    this.height = this.size;
    this.active = true;

    // 配置
    const config = CONFIG.POWERUPS[this.type.toUpperCase()] || CONFIG.POWERUPS.POWER;
    this.color = options.color || config.color;
    this.letter = options.letter || config.letter;

    // 动画
    this.pulseTime = 0;
    this.rotation = 0;
    this.floatOffset = Utils.random(0, Math.PI * 2);

    // 初始速度（带点横向漂移）
    this.vx = Utils.random(-0.5, 0.5);
    this.vy = this.speed;
  }

  update(dt) {
    if (!this.active) return;

    this.x += this.vx;
    this.y += this.vy;

    // 左右边界反弹
    if (this.x < this.size / 2) {
      this.x = this.size / 2;
      this.vx = Math.abs(this.vx);
    }
    if (this.x > CONFIG.CANVAS_WIDTH - this.size / 2) {
      this.x = CONFIG.CANVAS_WIDTH - this.size / 2;
      this.vx = -Math.abs(this.vx);
    }

    // 超出屏幕
    if (this.y > CONFIG.CANVAS_HEIGHT + this.size) {
      this.active = false;
    }

    // 动画
    this.pulseTime += dt;
    this.rotation += dt * 2;
    this.floatOffset += dt * 3;
  }

  draw(ctx) {
    if (!this.active) return;

    const pulse = 1 + Math.sin(this.pulseTime * 4) * 0.1;
    const floatY = Math.sin(this.floatOffset) * 2;
    const size = this.size * pulse;

    ctx.save();
    ctx.translate(this.x, this.y + floatY);

    // 外发光圈
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
    grad.addColorStop(0, Utils.rgba(this.color.replace('#', ''), 0.4));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 六边形外壳
    ctx.rotate(this.rotation * 0.3);
    ctx.fillStyle = Utils.rgba(this.color.replace('#', ''), 0.2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * (size / 2);
      const py = Math.sin(angle) * (size / 2);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 内部字母
    ctx.rotate(-this.rotation * 0.3);
    ctx.fillStyle = this.color;
    ctx.font = `bold ${size * 0.5}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 6;
    ctx.fillText(this.letter, 0, 1);

    ctx.restore();
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.size,
      height: this.size,
    };
  }

  reset(options) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.type = options.type || 'power';
    this.speed = options.speed || CONFIG.POWERUPS.SPEED;
    this.size = options.size || CONFIG.POWERUPS.SIZE;
    this.width = this.size;
    this.height = this.size;
    this.active = true;
    this.pulseTime = 0;
    this.rotation = 0;
    this.floatOffset = Utils.random(0, Math.PI * 2);
    this.vx = Utils.random(-0.5, 0.5);
    this.vy = this.speed;

    const config = CONFIG.POWERUPS[this.type.toUpperCase()] || CONFIG.POWERUPS.POWER;
    this.color = options.color || config.color;
    this.letter = options.letter || config.letter;
  }
}

// ===== 道具对象池 =====
class PowerUpPool {
  constructor(maxSize = 30) {
    this.pool = [];
    this.maxSize = maxSize;
    this.activePowerUps = [];
  }

  get(options) {
    let pu;
    if (this.pool.length > 0) {
      pu = this.pool.pop();
      pu.reset(options);
    } else {
      pu = new PowerUp(options);
    }
    this.activePowerUps.push(pu);
    return pu;
  }

  release(pu) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(pu);
    }
    const idx = this.activePowerUps.indexOf(pu);
    if (idx > -1) this.activePowerUps.splice(idx, 1);
  }

  // 随机掉落道具
  tryDrop(x, y, dropChance = 0.15) {
    if (Math.random() > dropChance) return null;

    // 根据概率选择道具类型
    const types = [];
    const chances = [];
    for (const [key, config] of Object.entries(CONFIG.POWERUPS)) {
      if (typeof config === 'object' && config.type) {
        types.push(config.type);
        chances.push(config.chance);
      }
    }

    const total = chances.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let type = types[0];
    for (let i = 0; i < types.length; i++) {
      r -= chances[i];
      if (r <= 0) {
        type = types[i];
        break;
      }
    }

    return this.get({ x, y, type });
  }

  update(dt) {
    for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
      const pu = this.activePowerUps[i];
      pu.update(dt);
      if (!pu.active) {
        this.release(pu);
      }
    }
  }

  draw(ctx) {
    for (const pu of this.activePowerUps) {
      pu.draw(ctx);
    }
  }

  clear() {
    for (const pu of this.activePowerUps) {
      this.pool.push(pu);
    }
    this.activePowerUps = [];
  }

  get count() {
    return this.activePowerUps.length;
  }
}
