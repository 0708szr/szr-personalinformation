// ===== 游戏入口 =====

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }

  // 创建游戏实例
  const game = new Game(canvas);

  // 防止页面滚动
  document.addEventListener('touchmove', (e) => {
    if (e.target.closest('#game-container')) {
      e.preventDefault();
    }
  }, { passive: false });

  // 页面失去焦点时暂停
  window.addEventListener('blur', () => {
    if (game.state === GAME_STATE.PLAYING) {
      game.pause();
    }
  });

  // 页面获得焦点
  window.addEventListener('focus', () => {
    // 不自动恢复，让玩家手动继续
  });

  console.log('%c SKY STRIKE ', 'background: #00f0ff; color: #000; font-size: 20px; font-weight: bold;');
  console.log('%c 飞机大战 - 科技风格射击游戏 ', 'color: #00f0ff; font-size: 14px;');
});
