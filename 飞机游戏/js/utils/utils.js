// ===== 工具函数 =====

const Utils = {
  // 随机数
  random(min, max) {
    return Math.random() * (max - min) + min;
  },

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // 范围限制
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  // 角度转弧度
  degToRad(deg) {
    return deg * Math.PI / 180;
  },

  // AABB 碰撞检测
  aabbCollide(a, b) {
    return (
      a.x - a.width / 2 < b.x + b.width / 2 &&
      a.x + a.width / 2 > b.x - b.width / 2 &&
      a.y - a.height / 2 < b.y + b.height / 2 &&
      a.y + a.height / 2 > b.y - b.height / 2
    );
  },

  // 圆形碰撞
  circleCollide(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < (a.radius || a.width / 2) + (b.radius || b.width / 2);
  },

  // 两点距离
  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // 角度朝向目标
  angleTowards(fromX, fromY, toX, toY) {
    return Math.atan2(toY - fromY, toX - fromX);
  },

  // 颜色带透明度
  rgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  // 线性插值
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // 缓动函数 - easeOutQuad
  easeOutQuad(t) {
    return t * (2 - t);
  },

  // 格式化分数（加千分位逗号）
  formatScore(score) {
    return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },

  // 格式化时间 (秒 -> mm:ss)
  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  },

  // 从数组随机选择
  randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  // 打乱数组
  shuffle(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  },

  // 本地存储
  storage: {
    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },

    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn('localStorage not available');
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (e) {}
    },
  },
};
