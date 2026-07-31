/* =========================================================
   ANIMATIONS MODULE (animations.js)
   Handles visual motions:
   - 3D-like Dice Roll
   - Step-by-step Token Hop
   - Money Counter / Floating Text Animation
   - Upgrade & Festival Glow Effects
   - Confetti Burst
   ========================================================= */

window.AnimationsModule = {
  async animateDiceRoll(diceElementA, diceElementB) {
    if (!diceElementA || !diceElementB) return;

    diceElementA.classList.add("rolling");
    diceElementB.classList.add("rolling");

    for (let i = 0; i < 8; i++) {
      const valA = Math.floor(Math.random() * 6) + 1;
      const valB = Math.floor(Math.random() * 6) + 1;
      diceElementA.dataset.value = valA;
      diceElementB.dataset.value = valB;
      await this.delay(65);
    }

    const finalA = Math.floor(Math.random() * 6) + 1;
    const finalB = Math.floor(Math.random() * 6) + 1;

    diceElementA.dataset.value = finalA;
    diceElementB.dataset.value = finalB;

    diceElementA.classList.remove("rolling");
    diceElementB.classList.remove("rolling");

    return { valA: finalA, valB: finalB, total: finalA + finalB };
  },

  async animatePlayerMove(player, steps) {
    for (let step = 0; step < steps; step++) {
      const oldPos = player.position;
      const newPos = (oldPos + 1) % window.boardCells.length;

      // Pass Start bonus
      if (newPos === 0 && oldPos === window.boardCells.length - 1) {
        player.money += window.GameConfig.PASS_START_BONUS;
        if (window.UIModule) {
          window.UIModule.showToast(`🎉 ${player.name} đi qua BẮT ĐẦU và nhận $200!`);
          window.UIModule.addLog(`${player.name} đi qua Bắt đầu và nhận $200.`);
          this.spawnFloatingMoney(0, "+$200", "#22ac50");
        }
      }

      player.position = newPos;
      if (window.BoardModule) window.BoardModule.renderTokens();

      const token = document.querySelector(`[data-index="${player.position}"] .board-token`);
      if (token) token.classList.add("hop");

      await this.delay(170);
    }
  },

  spawnFloatingMoney(cellIndex, text, color = "#22ac50") {
    const cell = document.querySelector(`[data-index="${cellIndex}"]`);
    if (!cell) return;

    const floatEl = document.createElement("div");
    floatEl.className = "floating-money";
    floatEl.style.color = color;
    floatEl.textContent = text;

    cell.appendChild(floatEl);
    setTimeout(() => floatEl.remove(), 1200);
  },

  animateUpgradeBuilding(cellIndex) {
    const cell = document.querySelector(`[data-index="${cellIndex}"]`);
    if (!cell) return;

    cell.classList.add("upgrade-glow");
    setTimeout(() => cell.classList.remove("upgrade-glow"), 1000);
  },

  animateFestivalGlow(cellIndex) {
    const cell = document.querySelector(`[data-index="${cellIndex}"]`);
    if (!cell) return;

    cell.classList.add("festival-glow");
    setTimeout(() => cell.classList.remove("festival-glow"), 1500);
    this.createConfetti();
  },

  createConfetti() {
    const layer = document.querySelector("#confettiLayer");
    if (!layer) return;
    layer.innerHTML = "";
    const colors = ["#f6b51f", "#28a962", "#3389e8", "#ef5a4c", "#c56eda"];

    for (let i = 0; i < 55; i++) {
      const piece = document.createElement("i");
      piece.className = "confetti";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = `${3 + Math.random() * 4}s`;
      piece.style.animationDelay = `${Math.random() * 2}s`;
      layer.appendChild(piece);
    }
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
