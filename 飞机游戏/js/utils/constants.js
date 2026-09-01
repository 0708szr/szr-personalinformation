// ===== 游戏常量配置 =====
const CONFIG = {
  // 画布
  CANVAS_WIDTH: 480,
  CANVAS_HEIGHT: 720,

  // 游戏速度
  GAME_SPEED: 1,

  // 玩家
  PLAYER: {
    WIDTH: 40,
    HEIGHT: 48,
    SPEED: 6,
    FIRE_RATE: 150,       // ms/发
    INVINCIBLE_TIME: 2000, // 受击后无敌时间 ms
    MAX_HP: 5,
    INIT_HP: 3,
    MAX_BOMBS: 5,
    INIT_BOMBS: 2,
    MAX_POWER: 5,
    INIT_POWER: 1,
    SHIELD_DURATION: 15000, // 护盾持续 ms
  },

  // 子弹
  BULLET: {
    PLAYER_SPEED: 10,
    PLAYER_WIDTH: 4,
    PLAYER_HEIGHT: 14,
    ENEMY_SPEED: 4,
    ENEMY_WIDTH: 6,
    ENEMY_HEIGHT: 6,
    LASER_WIDTH: 8,
    LASER_DAMAGE: 0.5, // 每帧伤害
  },

  // 敌人配置
  ENEMIES: {
    SCOUT: {     // 小飞机
      hp: 1,
      speed: 2.5,
      score: 100,
      width: 28,
      height: 28,
      fireRate: 0,
      color: '#ff6688',
    },
    FIGHTER: {   // 侦察机
      hp: 3,
      speed: 2,
      score: 200,
      width: 34,
      height: 34,
      fireRate: 1500,
      color: '#ff9900',
    },
    HEAVY: {     // 重型机
      hp: 8,
      speed: 1.2,
      score: 500,
      width: 48,
      height: 44,
      fireRate: 2000,
      color: '#cc44ff',
    },
    BOMBER: {    // 轰炸机
      hp: 12,
      speed: 1,
      score: 800,
      width: 52,
      height: 50,
      fireRate: 2500,
      color: '#ff4400',
    },
    ELITE: {     // 精英机
      hp: 18,
      speed: 1.8,
      score: 1500,
      width: 44,
      height: 44,
      fireRate: 1000,
      color: '#00ff88',
    },
    DRONE: {     // 僚机无人机
      hp: 2,
      speed: 3,
      score: 300,
      width: 20,
      height: 20,
      fireRate: 1200,
      color: '#ffcc00',
    },
  },

  // 道具
  POWERUPS: {
    POWER: { type: 'power', color: '#ff3366', letter: 'P', chance: 0.25 },
    SHIELD: { type: 'shield', color: '#00f0ff', letter: 'S', chance: 0.15 },
    BOMB: { type: 'bomb', color: '#ff9900', letter: 'B', chance: 0.12 },
    LASER: { type: 'laser', color: '#b000ff', letter: 'L', chance: 0.1 },
    WINGMAN: { type: 'wingman', color: '#00ff88', letter: 'W', chance: 0.08 },
    HP: { type: 'hp', color: '#ff6699', letter: '+', chance: 0.1 },
    COIN: { type: 'coin', color: '#ffcc00', letter: '$', chance: 0.2 },
    SPEED: 2,
    SIZE: 24,
  },

  // Boss 配置
  BOSSES: {
    GUARDIAN: {
      name: '守卫者 GUARDIAN',
      hp: 80,
      width: 120,
      height: 100,
      speed: 1.5,
      score: 5000,
      color: '#00aaff',
      phases: 1,
    },
    INFERNO: {
      name: '烈焰 INFERNO',
      hp: 160,
      width: 140,
      height: 120,
      speed: 1.8,
      score: 10000,
      color: '#ff4400',
      phases: 2,
    },
    PHANTOM: {
      name: '幽灵 PHANTOM',
      hp: 240,
      width: 130,
      height: 110,
      speed: 2.2,
      score: 18000,
      color: '#aa44ff',
      phases: 3,
    },
    TITAN: {
      name: '泰坦 TITAN',
      hp: 380,
      width: 180,
      height: 160,
      speed: 1,
      score: 30000,
      color: '#888888',
      phases: 2,
    },
    ANNIHILATION: {
      name: '湮灭 ANNIHILATION',
      hp: 600,
      width: 220,
      height: 200,
      speed: 1.2,
      score: 80000,
      color: '#ff0066',
      phases: 4,
    },
  },

  // 粒子
  PARTICLES: {
    MAX_COUNT: 200,
    EXPLOSION_COUNT: 15,
    BOSS_EXPLOSION_COUNT: 80,
    TRAIL_COUNT: 2,
  },

  // 连击
  COMBO: {
    TIMEOUT: 2000,  // 连击超时 ms
    MAX_MULTIPLIER: 5,
  },

  // 背景
  BACKGROUND: {
    STAR_COUNT: 80,
    STAR_SPEED_SLOW: 0.5,
    STAR_SPEED_MID: 1.5,
    STAR_SPEED_FAST: 3,
  },

  // 难度倍率
  DIFFICULTY: {
    easy: { enemyHp: 0.7, enemySpeed: 0.8, enemyFireRate: 1.3, spawnRate: 0.8 },
    normal: { enemyHp: 1, enemySpeed: 1, enemyFireRate: 1, spawnRate: 1 },
    hard: { enemyHp: 1.4, enemySpeed: 1.2, enemyFireRate: 0.75, spawnRate: 1.3 },
  },

  // 关卡配置
  LEVELS: [
    {
      id: 1,
      name: '星际边境',
      waves: 8,
      boss: 'GUARDIAN',
      enemyTypes: ['SCOUT', 'FIGHTER'],
      spawnInterval: 1200,
      maxEnemies: 8,
    },
    {
      id: 2,
      name: '陨石带',
      waves: 10,
      boss: 'INFERNO',
      enemyTypes: ['SCOUT', 'FIGHTER', 'HEAVY'],
      spawnInterval: 1000,
      maxEnemies: 10,
    },
    {
      id: 3,
      name: '暗物质区',
      waves: 12,
      boss: 'PHANTOM',
      enemyTypes: ['FIGHTER', 'HEAVY', 'BOMBER'],
      spawnInterval: 900,
      maxEnemies: 12,
    },
    {
      id: 4,
      name: '敌军要塞',
      waves: 14,
      boss: 'TITAN',
      enemyTypes: ['HEAVY', 'BOMBER', 'ELITE'],
      spawnInterval: 800,
      maxEnemies: 14,
    },
    {
      id: 5,
      name: '最终决战',
      waves: 16,
      boss: 'ANNIHILATION',
      enemyTypes: ['FIGHTER', 'HEAVY', 'BOMBER', 'ELITE'],
      spawnInterval: 700,
      maxEnemies: 16,
    },
  ],

  // 战机配置
  AIRCRAFTS: [
    {
      id: 'falcon',
      name: '猎鹰 FALCON',
      desc: '均衡型战机，新手首选',
      unlocked: true,
      color: '#00f0ff',
      speedMul: 1,
      fireRateMul: 1,
      damageMul: 1,
    },
    {
      id: 'thunder',
      name: '雷霆 THUNDER',
      desc: '高速型战机，火力稍弱',
      unlocked: false,
      unlockCondition: '通关第3关',
      color: '#ffcc00',
      speedMul: 1.3,
      fireRateMul: 0.85,
      damageMul: 0.9,
    },
    {
      id: 'phantom',
      name: '幻影 PHANTOM',
      desc: '重火力型，移动较慢',
      unlocked: false,
      unlockCondition: '通关第5关',
      color: '#b000ff',
      speedMul: 0.8,
      fireRateMul: 1.2,
      damageMul: 1.3,
    },
  ],

  // 存储键名
  STORAGE_KEYS: {
    HIGH_SCORES: 'skystrike_highscores',
    UNLOCKED_LEVELS: 'skystrike_unlocked_levels',
    UNLOCKED_AIRCRAFTS: 'skystrike_unlocked_aircrafts',
    SELECTED_AIRCRAFT: 'skystrike_selected_aircraft',
    SETTINGS: 'skystrike_settings',
    LEVEL_STARS: 'skystrike_level_stars',
  },
};

// 游戏状态枚举
const GAME_STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  LEVEL_COMPLETE: 'level_complete',
  BOSS_WARNING: 'boss_warning',
};

// 游戏模式
const GAME_MODE = {
  CAMPAIGN: 'campaign',
  ENDLESS: 'endless',
  BOSS_RUSH: 'boss_rush',
};
