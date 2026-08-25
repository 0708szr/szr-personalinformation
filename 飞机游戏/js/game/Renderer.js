// ===== 渲染器（背景 + 通用绘制工具） =====
class Renderer {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.width = CONFIG.CANVAS_WIDTH;
    this.height = CONFIG.CANVAS_HEIGHT;

    // 三层星空
    this.starsLayer1 = []; // 最慢 远
    this.starsLayer2 = []; // 中速
    this.starsLayer3 = []; // 最快 近

    // 星云
    this.nebulae = [];

    this._initStars();
    this._initNebulae();

    // 屏幕震动
    this.shakeAmount = 0;
    this.shakeTime = 0;

    // 闪屏效果
    this.flashColor = null;
    this.flashAlpha = 0;
    this.flashTime = 0;
  }

  _initStars() {
    // 远层
    for (let i = 0; i < 40; i++) {
      this.starsLayer1.push({
        x: Utils.random(0, this.width),
        y: Utils.random(0, this.height),
        size: Utils.random(0.5, 1.2),
        speed: CONFIG.BACKGROUND.STAR_SPEED_SLOW,
        alpha: Utils.random(0.3, 0.6),
      });
    }

    // 中层
    for (let i = 0; i < 30; i++) {
      this.starsLayer2.push({
        x: Utils.random(0, this.width),
        y: Utils.random(0, this.height),
        size: Utils.random(1, 2),
        speed: CONFIG.BACKGROUND.STAR_SPEED_MID,
        alpha: Utils.random(0.5, 0.8),
        twinkle: Utils.random(0, Math.PI * 2),
      });
    }

    // 近层
    for (let i = 0; i < 20; i++) {
      this.starsLayer3.push({
        x: Utils.random(0, this.width),
        y: Utils.random(0, this.height),
        size: Utils.random(1.5, 3),
        speed: CONFIG.BACKGROUND.STAR_SPEED_FAST,
        alpha: Utils.random(0.7, 1),
        color: Math.random() > 0.7 ? '#aaddff' : '#ffffff',
      });
    }
  }

  _initNebulae() {
    for (let i = 0; i < 3; i++) {
      this.nebulae.push({
        x: Utils.random(0, this.width),
        y: Utils.random(-this.height, this.height),
        radius: Utils.random(100, 200),
        color: i % 2 === 0 ? 'rgba(176, 0, 255, 0.06)' : 'rgba(0, 240, 255, 0.06)',
        speed: 0.2,
      });
    }
  }

  // 屏幕震动
  shake(amount, time = 0.2) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  // 闪屏
  flash(color = '#ffffff', alpha = 0.5, time = 0.15) {
    this.flashColor = color;
    this.flashAlpha = alpha;
    this.flashTime = time;
  }

  update(dt, speedMul = 1) {
    // 更新星星
    for (const s of this.starsLayer1) {
      s.y += s.speed * speedMul;
      if (s.y > this.height) {
        s.y = 0;
        s.x = Utils.random(0, this.width);
      }
    }

    for (const s of this.starsLayer2) {
      s.y += s.speed * speedMul;
      s.twinkle += dt * 3;
      if (s.y > this.height) {
        s.y = 0;
        s.x = Utils.random(0, this.width);
      }
    }

    for (const s of this.starsLayer3) {
      s.y += s.speed * speedMul;
      if (s.y > this.height) {
        s.y = 0;
        s.x = Utils.random(0, this.width);
      }
    }

    // 星云
    for (const n of this.nebulae) {
      n.y += n.speed * speedMul;
      if (n.y - n.radius > this.height) {
        n.y = -n.radius;
        n.x = Utils.random(0, this.width);
      }
    }

    // 震动衰减
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) {
        this.shakeAmount = 0;
      }
    }

    // 闪屏衰减
    if (this.flashTime > 0) {
      this.flashTime -= dt;
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3);
    }
  }

  drawBackground() {
    const ctx = this.ctx;

    // 震动偏移
    let ox = 0, oy = 0;
    if (this.shakeAmount > 0) {
      ox = Utils.random(-this.shakeAmount, this.shakeAmount);
      oy = Utils.random(-this.shakeAmount, this.shakeAmount);
    }

    ctx.save();
    ctx.translate(ox, oy);

    // 深空背景渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#050510');
    gradient.addColorStop(0.5, '#0a0a20');
    gradient.addColorStop(1, '#0f0520');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // 星云
    ctx.globalCompositeOperation = 'lighter';
    for (const n of this.nebulae) {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius);
      grad.addColorStop(0, n.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // 星星 - 远层
    ctx.fillStyle = '#6688aa';
    for (const s of this.starsLayer1) {
      ctx.globalAlpha = s.alpha;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // 星星 - 中层
    for (const s of this.starsLayer2) {
      const twinkleAlpha = s.alpha * (0.6 + 0.4 * Math.sin(s.twinkle));
      ctx.globalAlpha = twinkleAlpha;
      ctx.fillStyle = '#aaccff';
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // 星星 - 近层（发光）
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.starsLayer3) {
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 4;
      ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    }
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'source-over';

    ctx.globalAlpha = 1;
    ctx.restore();

    // 闪屏效果
    if (this.flashAlpha > 0 && this.flashColor) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }

  // 绘制扫描线效果（科技感）
  drawScanlines() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.fillStyle = '#00f0ff';
    for (let y = 0; y < this.height; y += 3) {
      ctx.fillRect(0, y, this.width, 1);
    }
    ctx.restore();
  }

  // 绘制四角装饰（科技感边框）
  drawCornerDecor() {
    const ctx = this.ctx;
    const size = 20;
    const pad = 8;

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.lineWidth = 2;

    // 左上
    ctx.beginPath();
    ctx.moveTo(pad, pad + size);
    ctx.lineTo(pad, pad);
    ctx.lineTo(pad + size, pad);
    ctx.stroke();

    // 右上
    ctx.beginPath();
    ctx.moveTo(this.width - pad - size, pad);
    ctx.lineTo(this.width - pad, pad);
    ctx.lineTo(this.width - pad, pad + size);
    ctx.stroke();

    // 左下
    ctx.beginPath();
    ctx.moveTo(pad, this.height - pad - size);
    ctx.lineTo(pad, this.height - pad);
    ctx.lineTo(pad + size, this.height - pad);
    ctx.stroke();

    // 右下
    ctx.beginPath();
    ctx.moveTo(this.width - pad - size, this.height - pad);
    ctx.lineTo(this.width - pad, this.height - pad);
    ctx.lineTo(this.width - pad, this.height - pad - size);
    ctx.stroke();

    ctx.restore();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }
}
