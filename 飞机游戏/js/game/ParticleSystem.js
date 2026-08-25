// ===== 粒子系统 =====
class ParticleSystem {
  constructor(maxCount = CONFIG.PARTICLES.MAX_COUNT) {
    this.particles = [];
    this.maxCount = maxCount;
  }

  // 创建爆炸粒子
  createExplosion(x, y, color = '#ffcc00', count = CONFIG.PARTICLES.EXPLOSION_COUNT, speed = 4) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxCount) break;

      const angle = Utils.random(0, Math.PI * 2);
      const v = Utils.random(speed * 0.3, speed);

      this.particles.push(new Particle({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: Utils.random(0.3, 0.8),
        maxLife: 0.8,
        size: Utils.random(2, 5),
        color,
        gravity: 0,
        fade: true,
        shrink: true,
      }));
    }
  }

  // 创建拖尾粒子
  createTrail(x, y, color = '#00f0ff', count = CONFIG.PARTICLES.TRAIL_COUNT) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxCount) break;

      this.particles.push(new Particle({
        x: x + Utils.random(-3, 3),
        y: y + Utils.random(-2, 2),
        vx: Utils.random(-0.5, 0.5),
        vy: Utils.random(1, 2),
        life: Utils.random(0.2, 0.4),
        maxLife: 0.4,
        size: Utils.random(1.5, 3),
        color,
        gravity: 0,
        fade: true,
        shrink: true,
      }));
    }
  }

  // 创建护盾破碎粒子
  createShieldBreak(x, y, radius = 25) {
    for (let i = 0; i < 20; i++) {
      if (this.particles.length >= this.maxCount) break;

      const angle = (i / 20) * Math.PI * 2;
      const v = Utils.random(2, 4);

      this.particles.push(new Particle({
        x: x + Math.cos(angle) * radius * 0.5,
        y: y + Math.sin(angle) * radius * 0.5,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 0.6,
        maxLife: 0.6,
        size: Utils.random(2, 4),
        color: '#00f0ff',
        gravity: 0,
        fade: true,
        shrink: true,
      }));
    }
  }

  // 创建拾取闪光
  createPickup(x, y, color = '#ffcc00') {
    for (let i = 0; i < 10; i++) {
      if (this.particles.length >= this.maxCount) break;

      const angle = Utils.random(0, Math.PI * 2);
      const v = Utils.random(1, 3);

      this.particles.push(new Particle({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 1,
        life: 0.5,
        maxLife: 0.5,
        size: Utils.random(2, 4),
        color,
        gravity: 0.1,
        fade: true,
        shrink: false,
      }));
    }
  }

  // 创建屏幕震动后的落尘（装饰）
  createDust(x, y) {
    for (let i = 0; i < 6; i++) {
      if (this.particles.length >= this.maxCount) break;

      this.particles.push(new Particle({
        x: x + Utils.random(-20, 20),
        y: y + Utils.random(-10, 10),
        vx: Utils.random(-1, 1),
        vy: Utils.random(-2, -0.5),
        life: 0.8,
        maxLife: 0.8,
        size: Utils.random(1, 2.5),
        color: '#ffffff',
        gravity: 0.05,
        fade: true,
        shrink: true,
      }));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);

      if (!p.active) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      p.draw(ctx);
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}
