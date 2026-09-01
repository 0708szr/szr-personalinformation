// ===== Boss 基类 =====
class Boss {
  constructor(options = {}) {
    this.bossType = options.bossType || 'GUARDIAN';
    const config = CONFIG.BOSSES[this.bossType];

    this.name = config.name;
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.width = config.width;
    this.height = config.height;
    this.speed = config.speed;
    this.score = config.score;
    this.color = config.color;
    this.totalPhases = config.phases;

    // 难度调整
    if (options.hpMul) {
      this.maxHp *= options.hpMul;
      this.hp = this.maxHp;
    }

    this.x = CONFIG.CANVAS_WIDTH / 2;
    this.y = -this.height; // 从屏幕外进入
    this.targetY = 120;

    this.active = true;
    this.entering = true; // 入场动画
    this.invincible = false;
    this.invincibleTimer = 0;

    // 阶段
    this.phase = 1;
    this.phaseTransition = false;
    this.phaseTransitionTimer = 0;

    // 攻击计时
    this.attackTimer = 0;
    this.attackPattern = 0;
    this.patternTime = 0;

    // 移动
    this.moveAngle = 0;
    this.moveTime = 0;
    this.targetX = CONFIG.CANVAS_WIDTH / 2;

    // 受击闪白
    this.hitFlash = 0;

    // 引用
    this.bulletPool = null;
    this.enemyPool = null;
    this.playerRef = null;
    this.particleSystem = null;
    this.renderer = null;

    // 僚机无人机（部分 Boss 有）
    this.drones = [];
  }

  setReferences({ bulletPool, enemyPool, player, particleSystem, renderer }) {
    this.bulletPool = bulletPool;
    this.enemyPool = enemyPool;
    this.playerRef = player;
    this.particleSystem = particleSystem;
    this.renderer = renderer;
  }

  update(dt) {
    if (!this.active) return;

    // 入场动画
    if (this.entering) {
      this.y += this.speed * 0.5;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
        this.entering = false;
        this.invincible = false;
      }
      return;
    }

    // 无敌时间（阶段切换）
    if (this.invincible) {
      this.invincibleTimer -= dt * 1000;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }

    // 阶段转换
    if (this.phaseTransition) {
      this.phaseTransitionTimer -= dt * 1000;
      if (this.phaseTransitionTimer <= 0) {
        this.phaseTransition = false;
        this._onPhaseStart();
      }
      this._updateMovement(dt);
      return;
    }

    // 检查阶段转换
    this._checkPhaseTransition();

    // 移动
    this._updateMovement(dt);

    // 攻击
    this.attackTimer += dt;
    this.patternTime += dt;
    this._handleAttacks(dt);

    // 更新僚机
    for (let i = this.drones.length - 1; i >= 0; i--) {
      const drone = this.drones[i];
      drone.update(dt);
      if (!drone.active) {
        this.drones.splice(i, 1);
      }
    }

    // 受击闪白
    if (this.hitFlash > 0) {
      this.hitFlash -= dt * 10;
    }
  }

  _updateMovement(dt) {
    // 基类默认：左右缓慢移动
    this.moveTime += dt;
    const amp = (CONFIG.CANVAS_WIDTH - this.width) / 2 - 20;
    this.x = CONFIG.CANVAS_WIDTH / 2 + Math.sin(this.moveTime * 0.8) * amp;
  }

  _handleAttacks(dt) {
    // 子类重写
  }

  _checkPhaseTransition() {
    // 根据血量比例切换阶段
    const hpPct = this.hp / this.maxHp;
    let newPhase = 1;

    if (this.totalPhases === 2) {
      newPhase = hpPct > 0.5 ? 1 : 2;
    } else if (this.totalPhases === 3) {
      newPhase = hpPct > 0.66 ? 1 : hpPct > 0.33 ? 2 : 3;
    } else if (this.totalPhases === 4) {
      newPhase = hpPct > 0.75 ? 1 : hpPct > 0.5 ? 2 : hpPct > 0.25 ? 3 : 4;
    }

    if (newPhase !== this.phase && !this.phaseTransition) {
      this._startPhaseTransition(newPhase);
    }
  }

  _startPhaseTransition(newPhase) {
    this.phase = newPhase;
    this.phaseTransition = true;
    this.phaseTransitionTimer = 1500;
    this.invincible = true;
    this.invincibleTimer = 1500;
    this.attackTimer = 0;
    this.patternTime = 0;

    // 屏幕闪红
    if (this.renderer) {
      this.renderer.flash('#ff3366', 0.4, 0.3);
      this.renderer.shake(8, 0.3);
    }
  }

  _onPhaseStart() {
    // 子类可以重写，阶段开始时触发
  }

  // 受到伤害
  takeDamage(damage = 1) {
    if (this.invincible || this.entering || this.phaseTransition) return false;

    this.hp -= damage;
    this.hitFlash = 1;

    if (this.hp <= 0) {
      this.hp = 0;
      this._die();
      return true;
    }
    return false;
  }

  _die() {
    this.active = false;
    // 爆炸效果在 Game 类处理
  }

  // 发射圆形弹幕
  _fireCircle(centerX, centerY, count, speed, startAngle = 0, color = null) {
    if (!this.bulletPool) return;
    for (let i = 0; i < count; i++) {
      const angle = startAngle + (i / count) * Math.PI * 2;
      this.bulletPool.get({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        width: 6,
        height: 6,
        damage: 1,
        isPlayerBullet: false,
        color: color || this.color,
      });
    }
  }

  // 发射扇形弹幕
  _fireFan(centerX, centerY, count, spreadAngle, baseAngle, speed, color = null) {
    if (!this.bulletPool) return;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = baseAngle - spreadAngle / 2 + spreadAngle * t;
      this.bulletPool.get({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        width: 6,
        height: 6,
        damage: 1,
        isPlayerBullet: false,
        color: color || this.color,
      });
    }
  }

  // 发射追踪弹
  _fireHoming(x, y, speed, color = null) {
    if (!this.bulletPool || !this.playerRef) return;
    const angle = Utils.angleTowards(x, y, this.playerRef.x, this.playerRef.y);
    this.bulletPool.get({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      width: 8,
      height: 8,
      damage: 1,
      isPlayerBullet: false,
      color: color || '#ff6600',
    });
  }

  // 生成僚机
  _spawnDrone(offsetAngle) {
    if (!this.enemyPool) return;
    const drone = this.enemyPool.get({
      x: this.x,
      y: this.y,
      type: 'DRONE',
      pattern: 'drone_orbit',
    });
    drone.orbitAngle = offsetAngle;
    drone.orbitRadius = 80;
    drone.orbitCenter = { x: this.x, y: this.y };
    drone.isBossDrone = true;
    drone.bossRef = this;
    this.drones.push(drone);
    return drone;
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();

    // 闪烁效果
    if (this.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    ctx.translate(this.x, this.y);

    // 受击闪白
    if (this.hitFlash > 0) {
      ctx.filter = 'brightness(2)';
    }

    this._drawBody(ctx);

    ctx.restore();

    // 绘制僚机
    for (const drone of this.drones) {
      drone.draw(ctx);
    }
  }

  _drawBody(ctx) {
    // 子类重写
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width * 0.8,
      height: this.height * 0.7,
    };
  }

  // 获取所有碰撞体（包括僚机）
  getAllBounds() {
    const bounds = [this.getBounds()];
    for (const drone of this.drones) {
      if (drone.active) {
        bounds.push(drone.getBounds());
      }
    }
    return bounds;
  }

  reset(options) {
    const config = CONFIG.BOSSES[this.bossType];
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.x = CONFIG.CANVAS_WIDTH / 2;
    this.y = -this.height;
    this.active = true;
    this.entering = true;
    this.invincible = false;
    this.phase = 1;
    this.phaseTransition = false;
    this.attackTimer = 0;
    this.attackPattern = 0;
    this.patternTime = 0;
    this.moveTime = 0;
    this.hitFlash = 0;

    if (options.hpMul) {
      this.maxHp *= options.hpMul;
      this.hp = this.maxHp;
    }

    this.drones = [];
  }

  destroy() {
    // 清理
    this.drones = [];
  }
}

// ============================================================
// Boss 1: 守卫者 Guardian
// ============================================================
class BossGuardian extends Boss {
  constructor(options = {}) {
    super({ ...options, bossType: 'GUARDIAN' });
  }

  _handleAttacks(dt) {
    // 单阶段：交替使用扇形弹和旋转弹幕
    const attackInterval = this.phase === 1 ? 1.8 : 1.2;

    if (this.attackTimer >= attackInterval) {
      this.attackTimer = 0;
      this.attackPattern = (this.attackPattern + 1) % 2;

      if (this.attackPattern === 0) {
        // 前方扇形5发
        this._fireFan(this.x, this.y + this.height / 3, 5, Math.PI / 3, Math.PI / 2, 3.5, '#66aaff');
      } else {
        // 旋转弹幕（慢速）
        this._fireCircle(this.x, this.y, 12, 2.5, this.patternTime, '#00aaff');
      }
    }
  }

  _drawBody(ctx) {
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;

    // 主体 - 菱形机甲
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(w / 3, h / 2);
    ctx.lineTo(-w / 3, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 中央核心
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(0, 0, w / 6, 0, Math.PI * 2);
    ctx.fill();

    // 两侧装甲
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 4;
    ctx.fillRect(-w / 2 - 10, -h / 6, 15, h / 3);
    ctx.fillRect(w / 2 - 5, -h / 6, 15, h / 3);
  }
}

// ============================================================
// Boss 2: 烈焰 Inferno
// ============================================================
class BossInferno extends Boss {
  constructor(options = {}) {
    super({ ...options, bossType: 'INFERNO' });
    this.flameTimer = 0;
    this.missileTimer = 0;
    this.summonTimer = 0;
  }

  _handleAttacks(dt) {
    this.flameTimer += dt;
    this.missileTimer += dt;
    this.summonTimer += dt;

    // 火焰喷射（持续）
    const flameInterval = 0.08;
    if (this.flameTimer >= flameInterval) {
      this.flameTimer = 0;
      this._fireFlame();
    }

    // 导弹齐射
    const missileInterval = this.phase === 1 ? 3.5 : 2.5;
    if (this.missileTimer >= missileInterval) {
      this.missileTimer = 0;
      this._fireMissiles();
    }

    // 召唤小兵（二阶段开始）
    if (this.phase >= 2) {
      const summonInterval = 6;
      if (this.summonTimer >= summonInterval) {
        this.summonTimer = 0;
        this._summonMinions();
      }
    }
  }

  _fireFlame() {
    if (!this.bulletPool) return;
    // 前方锥形火焰
    for (let i = 0; i < 3; i++) {
      const spread = Utils.random(-0.3, 0.3);
      const angle = Math.PI / 2 + spread;
      const speed = Utils.random(3, 5);
      this.bulletPool.get({
        x: this.x + Utils.random(-15, 15),
        y: this.y + this.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        width: 8,
        height: 8,
        damage: 1,
        isPlayerBullet: false,
        color: '#ff6600',
      });
    }
  }

  _fireMissiles() {
    // 4发追踪导弹
    for (let i = 0; i < 4; i++) {
      const offsetX = (i - 1.5) * 25;
      setTimeout(() => {
        if (this.active) this._fireHoming(this.x + offsetX, this.y + this.height / 2, 2.5, '#ff4400');
      }, i * 100);
    }
  }

  _summonMinions() {
    if (!this.enemyPool) return;
    for (let i = 0; i < 3; i++) {
      this.enemyPool.get({
        x: this.x + (i - 1) * 50,
        y: this.y + 40,
        type: 'SCOUT',
        pattern: 'straight',
        vy: 2,
      });
    }
  }

  _drawBody(ctx) {
    const w = this.width;
    const h = this.height;
    const time = Date.now() / 200;

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 8;

    // 火焰战机主体
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, -h / 6);
    ctx.lineTo(w / 2 - 10, h / 3);
    ctx.lineTo(w / 4, h / 2);
    ctx.lineTo(-w / 4, h / 2);
    ctx.lineTo(-w / 2 + 10, h / 3);
    ctx.lineTo(-w / 2, -h / 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 火焰尾翼
    ctx.fillStyle = '#ffcc00';
    ctx.shadowBlur = 6;
    for (let i = -1; i <= 1; i += 2) {
      const flameH = 15 + Math.sin(time + i) * 5;
      ctx.beginPath();
      ctx.moveTo(i * w / 3, -h / 4);
      ctx.lineTo(i * (w / 3 + 10), -h / 4 - flameH);
      ctx.lineTo(i * (w / 3 - 5), -h / 4);
      ctx.closePath();
      ctx.fill();
    }

    // 中央核心
    ctx.fillStyle = '#ffff88';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, w / 8, 0, Math.PI * 2);
    ctx.fill();

    // 喷嘴
    ctx.fillStyle = '#ff4400';
    ctx.fillRect(-w / 3, h / 2 - 5, 10, 10);
    ctx.fillRect(w / 3 - 10, h / 2 - 5, 10, 10);
    ctx.fillRect(-5, h / 2 - 5, 10, 10);
  }
}

// ============================================================
// Boss 3: 幽灵 Phantom
// ============================================================
class BossPhantom extends Boss {
  constructor(options = {}) {
    super({ ...options, bossType: 'PHANTOM' });
    this.teleportTimer = 0;
    this.teleportCooldown = 0;
    this.isTeleporting = false;
    this.teleportAlpha = 1;
    this.laserActive = false;
    this.laserX = 0;
    this.laserDir = 1;
    this.laserTimer = 0;
  }

  _handleAttacks(dt) {
    this.teleportCooldown -= dt;
    this.laserTimer += dt;

    // 瞬移（各阶段频率不同）
    const teleportInterval = [4, 3, 2.5][this.phase - 1] || 3;
    if (this.teleportCooldown <= 0 && !this.isTeleporting) {
      this.teleportCooldown = teleportInterval;
      this._startTeleport();
    }

    // 瞬移过程
    if (this.isTeleporting) {
      this.teleportTimer -= dt;
      this.teleportAlpha = Math.abs(Math.sin(this.teleportTimer * 10));
      if (this.teleportTimer <= 0) {
        this.isTeleporting = false;
        this.teleportAlpha = 1;
        this._doTeleport();
        // 瞬移后立即攻击
        this._fireCircle(this.x, this.y, 16, 3, 0, '#aa44ff');
      }
    }

    // 环形弹幕
    const ringInterval = this.phase >= 2 ? 2.5 : 3.5;
    if (this.attackTimer >= ringInterval) {
      this.attackTimer = 0;
      this._fireCircle(this.x, this.y, this.phase >= 2 ? 24 : 18, 2.8, this.patternTime * 0.5, '#aa44ff');
    }
    this.attackTimer += dt;

    // 激光扫射（三阶段）
    if (this.phase >= 3) {
      if (!this.laserActive && this.laserTimer >= 4) {
        this.laserActive = true;
        this.laserTimer = 0;
        this.laserX = 50;
        this.laserDir = 1;
      }
      if (this.laserActive) {
        this.laserX += this.laserDir * 3;
        if (this.laserX > CONFIG.CANVAS_WIDTH - 50) this.laserDir = -1;
        if (this.laserX < 50) this.laserDir = 1;
        // 激光伤害由 Game 类处理碰撞
      }
      if (this.laserActive && this.laserTimer >= 3) {
        this.laserActive = false;
        this.laserTimer = 0;
      }
    }
  }

  _startTeleport() {
    this.isTeleporting = true;
    this.teleportTimer = 0.3;
    this.invincible = true;
    if (this.particleSystem) {
      this.particleSystem.createExplosion(this.x, this.y, '#aa44ff', 20, 3);
    }
  }

  _doTeleport() {
    // 随机位置（但确保在屏幕内）
    this.x = Utils.random(80, CONFIG.CANVAS_WIDTH - 80);
    this.y = Utils.random(80, 200);
    this.invincible = false;
    if (this.particleSystem) {
      this.particleSystem.createExplosion(this.x, this.y, '#aa44ff', 20, 3);
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();

    // 半透明 + 闪烁
    let alpha = 0.7;
    if (this.isTeleporting) {
      alpha = this.teleportAlpha * 0.7;
    }
    if (this.invincible && Math.floor(Date.now() / 80) % 2 === 0) {
      alpha *= 0.5;
    }
    ctx.globalAlpha = alpha;

    ctx.translate(this.x, this.y);

    if (this.hitFlash > 0) {
      ctx.filter = 'brightness(2)';
    }

    this._drawBody(ctx);

    ctx.restore();

    // 绘制激光
    if (this.laserActive && !this.isTeleporting) {
      this._drawLaser(ctx);
    }

    for (const drone of this.drones) {
      drone.draw(ctx);
    }
  }

  _drawBody(ctx) {
    const w = this.width;
    const h = this.height;
    const time = Date.now() / 300;

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#dd88ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#aa44ff';
    ctx.shadowBlur = 8;

    // 幽灵战机 - 流线型
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w / 3, -h / 3, w / 2, 0, w / 2 - 10, h / 3);
    ctx.lineTo(w / 4, h / 2);
    ctx.lineTo(-w / 4, h / 2);
    ctx.lineTo(-w / 2 + 10, h / 3);
    ctx.bezierCurveTo(-w / 2, 0, -w / 3, -h / 3, 0, -h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 眼睛/核心
    const eyeGlow = 0.7 + Math.sin(time * 2) * 0.3;
    ctx.fillStyle = `rgba(255, 200, 255, ${eyeGlow})`;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(0, -h / 8, w / 5, h / 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 装饰线
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-w / 3, h / 6);
    ctx.quadraticCurveTo(0, h / 3, w / 3, h / 6);
    ctx.stroke();
  }

  _drawLaser(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const laserWidth = 12;
    const y = this.y + this.height / 2;

    // 外发光
    const grad = ctx.createLinearGradient(0, y - laserWidth, 0, y + 800);
    grad.addColorStop(0, 'rgba(170, 68, 255, 0.8)');
    grad.addColorStop(1, 'rgba(170, 68, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.laserX - laserWidth, y, laserWidth * 2, CONFIG.CANVAS_HEIGHT);

    // 核心
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.laserX - 3, y, 6, CONFIG.CANVAS_HEIGHT);

    ctx.restore();
  }

  // 获取激光碰撞体
  getLaserBounds() {
    if (!this.laserActive || this.isTeleporting) return null;
    return {
      x: this.laserX,
      y: this.y + this.height / 2 + 50,
      width: 14,
      height: CONFIG.CANVAS_HEIGHT,
    };
  }
}

// ============================================================
// Boss 4: 泰坦 Titan
// ============================================================
class BossTitan extends Boss {
  constructor(options = {}) {
    super({ ...options, bossType: 'TITAN' });
    this.turretTimer = 0;
    this.bombTimer = 0;
    this.chargeTimer = 0;
    this.isCharging = false;
    this.chargeDir = 0;
    this.droneTimer = 0;
  }

  _updateMovement(dt) {
    if (this.isCharging) {
      // 冲撞
      this.y += 6 * this.chargeDir;
      if (this.chargeDir > 0 && this.y > 400) {
        this.isCharging = false;
        this.chargeDir = -1;
        this.chargeTimer = 0;
      } else if (this.chargeDir < 0 && this.y < this.targetY) {
        this.y = this.targetY;
        this.isCharging = false;
        this.chargeTimer = 0;
      }
      return;
    }

    // 正常左右移动
    this.moveTime += dt;
    const amp = (CONFIG.CANVAS_WIDTH - this.width) / 2 - 30;
    this.x = CONFIG.CANVAS_WIDTH / 2 + Math.sin(this.moveTime * 0.5) * amp;
  }

  _handleAttacks(dt) {
    this.turretTimer += dt;
    this.bombTimer += dt;
    this.chargeTimer += dt;
    this.droneTimer += dt;

    // 多炮塔齐射
    const turretInterval = this.phase === 1 ? 1.5 : 1;
    if (this.turretTimer >= turretInterval) {
      this.turretTimer = 0;
      this._fireTurrets();
    }

    // 轰炸模式
    const bombInterval = this.phase === 1 ? 3 : 2;
    if (this.bombTimer >= bombInterval) {
      this.bombTimer = 0;
      this._fireBombs();
    }

    // 冲撞（二阶段）
    if (this.phase >= 2) {
      const chargeInterval = 5;
      if (this.chargeTimer >= chargeInterval && !this.isCharging) {
        this.isCharging = true;
        this.chargeDir = 1;
        if (this.renderer) this.renderer.flash('#ff0000', 0.3, 0.2);
      }
    }

    // 召唤僚机
    const droneInterval = this.phase === 1 ? 8 : 5;
    if (this.droneTimer >= droneInterval && this.drones.length < 4) {
      this.droneTimer = 0;
      this._spawnDrones();
    }
  }

  _fireTurrets() {
    // 左中右三路
    const positions = [
      { x: -this.width / 3, y: this.height / 3 },
      { x: 0, y: this.height / 2 - 5 },
      { x: this.width / 3, y: this.height / 3 },
    ];

    for (const pos of positions) {
      this._fireFan(this.x + pos.x, this.y + pos.y, 3, Math.PI / 4, Math.PI / 2, 3.5, '#aaaaaa');
    }
  }

  _fireBombs() {
    if (!this.bulletPool) return;
    // 大量炸弹下落
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        if (this.active && this.bulletPool) {
          this.bulletPool.get({
            x: Utils.random(this.x - this.width / 2, this.x + this.width / 2),
            y: this.y + this.height / 2,
            vx: Utils.random(-0.5, 0.5),
            vy: Utils.random(2, 3.5),
            width: 10,
            height: 10,
            damage: 1,
            isPlayerBullet: false,
            color: '#888888',
          });
        }
      }, i * 80);
    }
  }

  _spawnDrones() {
    if (!this.enemyPool) return;
    const count = this.phase === 1 ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const drone = this.enemyPool.get({
        x: this.x + (i === 0 ? -60 : 60),
        y: this.y + 20,
        type: 'DRONE',
      });
      drone.orbitAngle = i * Math.PI;
      drone.orbitRadius = 100;
      drone.orbitCenter = { x: this.x, y: this.y };
      drone.isBossDrone = true;
      drone.bossRef = this;
      this.drones.push(drone);
    }
  }

  _drawBody(ctx) {
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = '#666666';
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#888888';
    ctx.shadowBlur = 5;

    // 主体 - 重型战舰
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 20, -h / 2);
    ctx.lineTo(w / 2 - 20, -h / 2);
    ctx.lineTo(w / 2, -h / 4);
    ctx.lineTo(w / 2 - 10, h / 3);
    ctx.lineTo(w / 3, h / 2);
    ctx.lineTo(-w / 3, h / 2);
    ctx.lineTo(-w / 2 + 10, h / 3);
    ctx.lineTo(-w / 2, -h / 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 装甲板
    ctx.fillStyle = '#888888';
    ctx.shadowBlur = 0;
    ctx.fillRect(-w / 3, -h / 3, w * 2 / 3, h / 4);

    // 指挥塔
    ctx.fillStyle = '#555555';
    ctx.strokeStyle = '#aaaaaa';
    ctx.shadowBlur = 5;
    ctx.fillRect(-20, -h / 2 - 15, 40, 20);
    ctx.strokeRect(-20, -h / 2 - 15, 40, 20);

    // 炮塔
    ctx.fillStyle = '#444444';
    const turrets = [-w / 3, 0, w / 3];
    for (const tx of turrets) {
      ctx.fillRect(tx - 6, h / 3 - 5, 12, 15);
      ctx.strokeRect(tx - 6, h / 3 - 5, 12, 15);
    }

    // 红色指示灯
    ctx.fillStyle = this.phase === 2 ? '#ff0000' : '#ff6600';
    ctx.shadowColor = this.phase === 2 ? '#ff0000' : '#ff6600';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(0, -h / 2 - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // 侧翼
    ctx.fillStyle = '#666666';
    ctx.strokeStyle = '#999999';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2 - 20, -h / 6);
    ctx.lineTo(-w / 2 - 20, h / 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2 + 20, -h / 6);
    ctx.lineTo(w / 2 + 20, h / 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width * 0.9,
      height: this.height * 0.8,
    };
  }
}

// ============================================================
// Boss 5: 湮灭 Annihilation (最终 Boss)
// ============================================================
class BossAnnihilation extends Boss {
  constructor(options = {}) {
    super({ ...options, bossType: 'ANNIHILATION' });
    this.wingsExtended = false;
    this.coreExposed = false;
    this.spinAngle = 0;
    this.laserArrayAngle = 0;
  }

  _onPhaseStart() {
    if (this.phase === 2) {
      this.wingsExtended = true;
    }
    if (this.phase === 3) {
      this.coreExposed = true;
    }
  }

  _updateMovement(dt) {
    this.moveTime += dt;
    this.spinAngle += dt * 0.5;
    this.laserArrayAngle += dt * 2;

    // 根据阶段移动方式不同
    if (this.phase === 1) {
      const amp = (CONFIG.CANVAS_WIDTH - this.width) / 2 - 20;
      this.x = CONFIG.CANVAS_WIDTH / 2 + Math.sin(this.moveTime * 0.6) * amp;
    } else if (this.phase === 2) {
      const amp = (CONFIG.CANVAS_WIDTH - this.width) / 2 - 10;
      this.x = CONFIG.CANVAS_WIDTH / 2 + Math.sin(this.moveTime * 0.8) * amp;
      this.y = this.targetY + Math.sin(this.moveTime * 0.5) * 30;
    } else if (this.phase === 3) {
      // 核心暴露阶段 - 缓慢移动
      const amp = 100;
      this.x = CONFIG.CANVAS_WIDTH / 2 + Math.sin(this.moveTime * 0.4) * amp;
    } else {
      // 狂暴阶段 - 快速移动
      const amp = (CONFIG.CANVAS_WIDTH - this.width) / 2;
      this.x = CONFIG.CANVAS_WIDTH / 2 + Math.sin(this.moveTime * 1.2) * amp;
      this.y = this.targetY + Math.sin(this.moveTime * 0.8) * 50;
    }
  }

  _handleAttacks(dt) {
    this.attackTimer += dt;

    switch (this.phase) {
      case 1:
        this._phase1Attacks(dt);
        break;
      case 2:
        this._phase2Attacks(dt);
        break;
      case 3:
        this._phase3Attacks(dt);
        break;
      case 4:
        this._phase4Attacks(dt);
        break;
    }
  }

  // 第一阶段：双翼炮塔 + 普通弹幕
  _phase1Attacks(dt) {
    // 双炮塔射击
    if (this.attackTimer >= 0.8) {
      this.attackTimer = 0;
      this._fireFan(this.x - this.width / 3, this.y + this.height / 4, 3, Math.PI / 3, Math.PI / 2, 3.5, '#ff3366');
      this._fireFan(this.x + this.width / 3, this.y + this.height / 4, 3, Math.PI / 3, Math.PI / 2, 3.5, '#ff3366');
    }

    // 定期环形弹幕
    if (this.patternTime >= 3) {
      this.patternTime = 0;
      this._fireCircle(this.x, this.y, 20, 2.5, 0, '#ff0066');
    }
  }

  // 第二阶段：展开双翼 + 激光阵列 + 追踪导弹
  _phase2Attacks(dt) {
    // 激光阵列（旋转发射）
    if (this.attackTimer >= 0.3) {
      this.attackTimer = 0;
      for (let i = 0; i < 3; i++) {
        const angle = this.laserArrayAngle + (i / 3) * Math.PI * 2;
        this._fireLaserBeam(angle);
      }
    }

    // 追踪导弹
    if (this.patternTime >= 2) {
      this.patternTime = 0;
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          if (this.active && this.phase === 2) {
            const side = i % 2 === 0 ? -1 : 1;
            this._fireHoming(this.x + side * this.width / 3, this.y + 20, 2, '#ff0066');
          }
        }, i * 150);
      }
    }
  }

  _fireLaserBeam(angle) {
    if (!this.bulletPool) return;
    this.bulletPool.get({
      x: this.x,
      y: this.y,
      vx: Math.cos(angle) * 4,
      vy: Math.sin(angle) * 4,
      width: 4,
      height: 20,
      damage: 1,
      isPlayerBullet: false,
      color: '#ff0066',
    });
  }

  // 第三阶段：核心暴露 + 召唤大量小兵 + 全屏弹幕
  _phase3Attacks(dt) {
    // 全屏弹幕（螺旋）
    if (this.attackTimer >= 0.15) {
      this.attackTimer = 0;
      this._fireCircle(this.x, this.y, 4, 3, this.spinAngle, '#ff3366');
    }

    // 召唤小兵
    if (this.patternTime >= 3.5) {
      this.patternTime = 0;
      this._summonArmy();
    }
  }

  _summonArmy() {
    if (!this.enemyPool) return;
    for (let i = 0; i < 5; i++) {
      this.enemyPool.get({
        x: Utils.random(50, CONFIG.CANVAS_WIDTH - 50),
        y: -30 - i * 20,
        type: 'SCOUT',
        pattern: 'zigzag',
        vy: 2.5,
      });
    }
    for (let i = 0; i < 2; i++) {
      this.enemyPool.get({
        x: Utils.random(80, CONFIG.CANVAS_WIDTH - 80),
        y: -50 - i * 30,
        type: 'FIGHTER',
        pattern: 'straight',
        vy: 2,
      });
    }
  }

  // 第四阶段：狂暴模式 - 旋转激光 + 随机轰炸 + 冲撞
  _phase4Attacks(dt) {
    // 旋转激光弹幕
    if (this.attackTimer >= 0.1) {
      this.attackTimer = 0;
      this._fireCircle(this.x, this.y, 8, 4.5, this.spinAngle * 2, '#ff0066');
    }

    // 随机轰炸
    if (this.patternTime >= 0.8) {
      this.patternTime = 0;
      this._randomBombing();
    }
  }

  _randomBombing() {
    if (!this.bulletPool) return;
    for (let i = 0; i < 3; i++) {
      this.bulletPool.get({
        x: Utils.random(20, CONFIG.CANVAS_WIDTH - 20),
        y: this.y + Utils.random(-30, 30),
        vx: Utils.random(-1, 1),
        vy: Utils.random(3, 5),
        width: 12,
        height: 12,
        damage: 1,
        isPlayerBullet: false,
        color: '#ff0066',
      });
    }
  }

  _drawBody(ctx) {
    const w = this.width;
    const h = this.height;
    const time = Date.now() / 200;

    // 主体
    ctx.fillStyle = '#330022';
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff0066';
    ctx.shadowBlur = 10;

    // 主舰体
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 3, -h / 3);
    ctx.lineTo(w / 2 - 10, -h / 6);
    ctx.lineTo(w / 2, h / 6);
    ctx.lineTo(w / 3, h / 2 - 10);
    ctx.lineTo(w / 6, h / 2);
    ctx.lineTo(-w / 6, h / 2);
    ctx.lineTo(-w / 3, h / 2 - 10);
    ctx.lineTo(-w / 2, h / 6);
    ctx.lineTo(-w / 2 + 10, -h / 6);
    ctx.lineTo(-w / 3, -h / 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 装甲层
    ctx.fillStyle = '#550033';
    ctx.shadowBlur = 0;
    ctx.fillRect(-w / 3, -h / 4, w * 2 / 3, h / 3);

    // 双翼（阶段2+展开）
    if (this.wingsExtended || this.phase >= 2) {
      ctx.fillStyle = '#440022';
      ctx.strokeStyle = '#ff3366';
      ctx.shadowBlur = 6;

      // 左翼
      ctx.beginPath();
      ctx.moveTo(-w / 3, -h / 6);
      ctx.lineTo(-w / 2 - 30, -h / 3);
      ctx.lineTo(-w / 2 - 40, 0);
      ctx.lineTo(-w / 2 - 30, h / 4);
      ctx.lineTo(-w / 3, h / 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 右翼
      ctx.beginPath();
      ctx.moveTo(w / 3, -h / 6);
      ctx.lineTo(w / 2 + 30, -h / 3);
      ctx.lineTo(w / 2 + 40, 0);
      ctx.lineTo(w / 2 + 30, h / 4);
      ctx.lineTo(w / 3, h / 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 翼端炮口
      ctx.fillStyle = '#ff0066';
      ctx.shadowBlur = 5;
      ctx.fillRect(-w / 2 - 43, -5, 6, 10);
      ctx.fillRect(w / 2 + 37, -5, 6, 10);
    }

    // 核心（阶段3+暴露，发光更强）
    const coreGlow = 0.6 + Math.sin(time * 3) * 0.4;
    const coreColor = this.coreExposed || this.phase >= 3 ? '#ffff00' : '#ff3366';
    const coreSize = this.coreExposed || this.phase >= 3 ? w / 5 : w / 8;

    ctx.fillStyle = coreColor;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = this.phase >= 4 ? 12 : 8;
    ctx.globalAlpha = coreGlow;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    // 核心内环
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize * 0.6, 0, Math.PI * 2);
    ctx.stroke();

    // 装饰环
    ctx.strokeStyle = this.phase >= 4 ? '#ff0066' : '#ff3366';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 4;
    for (let i = 0; i < 2; i++) {
      const ringR = coreSize + 10 + i * 8;
      ctx.globalAlpha = 0.5 - i * 0.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, ringR, ringR * 0.3, this.spinAngle * (i % 2 === 0 ? 1 : -1), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 炮口
    ctx.fillStyle = '#220011';
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(i * w / 4 - 4, h / 2 - 8, 8, 12);
      ctx.strokeRect(i * w / 4 - 4, h / 2 - 8, 8, 12);
    }
  }

  getBounds() {
    // 核心暴露时，核心才是弱点（伤害区域更小但受击更多）
    if (this.coreExposed || this.phase >= 3) {
      return {
        x: this.x,
        y: this.y,
        width: this.width * 0.5,
        height: this.height * 0.5,
      };
    }
    return {
      x: this.x,
      y: this.y,
      width: this.width * 0.8,
      height: this.height * 0.7,
    };
  }
}

// ============================================================
// Boss 工厂
// ============================================================
const BossFactory = {
  create(bossType, options = {}) {
    switch (bossType) {
      case 'GUARDIAN':
        return new BossGuardian(options);
      case 'INFERNO':
        return new BossInferno(options);
      case 'PHANTOM':
        return new BossPhantom(options);
      case 'TITAN':
        return new BossTitan(options);
      case 'ANNIHILATION':
        return new BossAnnihilation(options);
      default:
        return new BossGuardian(options);
    }
  },
};
