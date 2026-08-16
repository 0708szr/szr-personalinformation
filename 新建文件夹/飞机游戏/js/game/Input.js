// ===== 输入系统 =====
class Input {
  constructor(canvas) {
    this.canvas = canvas;

    // 键盘状态
    this.keys = {};

    // 鼠标/触摸位置
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.touchActive = false;

    // 拖拽状态
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;

    // 事件回调
    this.onBomb = null;
    this.onPause = null;
    this.onFire = null;

    this._initEvents();
  }

  _initEvents() {
    // 键盘事件
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.onBomb) this.onBomb();
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (this.onPause) this.onPause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // 鼠标事件
    this.canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true;
      this.isDragging = true;
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
      this.isDragging = false;
    });

    // 触摸事件
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        this.touchActive = true;
        this.isDragging = true;
        this.mouseDown = true;
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        this.mouseX = touch.clientX - rect.left;
        this.mouseY = touch.clientY - rect.top;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.touchActive = false;
      this.mouseDown = false;
      this.isDragging = false;
    }, { passive: false });

    this.canvas.addEventListener('touchcancel', () => {
      this.touchActive = false;
      this.mouseDown = false;
      this.isDragging = false;
    });
  }

  // 获取移动向量（基于键盘）
  getKeyboardMove() {
    let dx = 0;
    let dy = 0;

    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) dy -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) dy += 1;

    // 归一化对角线移动
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(2);
      dx /= len;
      dy /= len;
    }

    return { dx, dy };
  }

  // 是否在拖拽（鼠标按住或触摸）
  isPointerActive() {
    return this.isDragging;
  }

  // 获取指针位置
  getPointerPos() {
    return { x: this.mouseX, y: this.mouseY };
  }

  reset() {
    this.keys = {};
    this.mouseDown = false;
    this.isDragging = false;
    this.touchActive = false;
  }
}
