// ===== 粒子实体 =====
class Particle {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.life = options.life || 1;
    this.maxLife = options.maxLife || this.life;
    this.size = options.size || 3;
    this.initialSize = this.size;
    this.color = options.color || '#ffffff';
    this.gravity = options.gravity || 0;
    this.fade = options.fade !== false;
    this.shrink = options.shrink !== false;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;

    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;

    this.life -= dt;

    if (this.life <= 0) {
      this.active = false;
      return;
    }

    if (this.shrink) {
      const t = this.life / this.maxLife;
      this.size = this.initialSize * t;
    }
  }

  draw(ctx) {
    if (!this.active || this.size <= 0) return;

    const alpha = this.fade ? (this.life / this.maxLife) : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.size * 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  reset(options) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.vx = options.vx || 0;
    this.vy = options.vy || 0;
    this.life = options.life || 1;
    this.maxLife = options.maxLife || this.life;
    this.size = options.size || 3;
    this.initialSize = this.size;
    this.color = options.color || '#ffffff';
    this.gravity = options.gravity || 0;
    this.fade = options.fade !== false;
    this.shrink = options.shrink !== false;
    this.active = true;
  }
}
