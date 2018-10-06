registerAnimator('test', class {
  animate(currentTime, effect) {
    effect.localTime = currentTime; 
  }
});