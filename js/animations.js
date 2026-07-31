/* =========================================================
   ANIMATIONS MODULE (animations.js)
   Handles visual motions:
   - 3D Dice Roll
   - Step-by-step Token Hop (420ms smooth hop per tile)
   - Confetti Burst & Upgrade Effects
   ========================================================= */

window.AnimationsModule = {
  async animateDiceRoll(diceElementA, diceElementB) {
    if (!diceElementA || !diceElementB) return { valA: 3, valB: 4, total: 7 };

    diceElementA.classList.add("rolling");
    diceElementB.classList.add("rolling");

    for (let i = 0; i < 7; i++) {
      const valA = Math.floor(Math.random() * 6) + 1;
      const valB = Math.floor(Math.random() * 6) + 1;
      diceElementA.setAttribute("data-value", valA);
      diceElementB.setAttribute("data-value", valB);
      await this.delay(65);
    }

    const finalA = Math.floor(Math.random() * 6) + 1;
    const finalB = Math.floor(Math.random() * 6) + 1;

    diceElementA.setAttribute("data-value", finalA);
    diceElementB.setAttribute("data-value", finalB);

    diceElementA.classList.remove("rolling");
    diceElementB.classList.remove("rolling");

    return { valA: finalA, valB: finalB, total: finalA + finalB };
  },

  async movePlayerStepByStep(player, steps, onStepCallback) {
    const totalCells = (window.boardCells || []).length || 32;
    for (let step = 0; step < steps; step++) {
      const oldPos = player.position || 0;
      const newPos = (oldPos + 1) % totalCells;
      const passedStart = (newPos === 0 && oldPos === totalCells - 1);

      player.position = newPos;
      if (window.BoardModule) window.BoardModule.renderBoard();

      if (onStepCallback) onStepCallback(newPos, passedStart);

      await this.delay(420); // 420ms per hop for clear step-by-step visibility
    }
  },

  triggerConfetti() {
    const layer = document.querySelector("#confettiLayer");
    if (!layer) return;
    layer.innerHTML = "";
    const colors = ["#f6b51f", "#28a962", "#3389e8", "#ef5a4c", "#c56eda"];

    for (let i = 0; i < 50; i++) {
      const piece = document.createElement("i");
      piece.className = "confetti";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = `${3 + Math.random() * 3}s`;
      piece.style.animationDelay = `${Math.random() * 1.5}s`;
      layer.appendChild(piece);
    }
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
