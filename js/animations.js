/* =========================================================
   ANIMATIONS MODULE (animations.js)  v4.1.1
   – Ultra-smooth dice roll with realistic bounce
   – Per-step token hop via BoardModule.animateTokenStep()
     (NO full board re-render per step → silky 60fps)
   – Confetti burst on win
   ========================================================= */

window.AnimationsModule = {

  /* ─── DICE ROLL ─────────────────────────────────────────── */
  async animateDiceRoll(diceElementA, diceElementB) {
    if (!diceElementA || !diceElementB) {
      const a = Math.ceil(Math.random()*6), b = Math.ceil(Math.random()*6);
      return { valA: a, valB: b, total: a+b };
    }

    diceElementA.classList.add("rolling");
    diceElementB.classList.add("rolling");

    // Fast flicker phase (simulates tumbling)
    const flickerCount = 10;
    for (let i = 0; i < flickerCount; i++) {
      diceElementA.setAttribute("data-value", Math.ceil(Math.random()*6));
      diceElementB.setAttribute("data-value", Math.ceil(Math.random()*6));
      // Decelerate: start fast, slow down
      await this.delay(30 + i * 15);
    }

    // Final values
    const finalA = Math.ceil(Math.random()*6);
    const finalB = Math.ceil(Math.random()*6);
    diceElementA.setAttribute("data-value", finalA);
    diceElementB.setAttribute("data-value", finalB);

    diceElementA.classList.remove("rolling");
    diceElementB.classList.remove("rolling");

    // Bounce settle animation
    diceElementA.classList.add("settle"); diceElementB.classList.add("settle");
    await this.delay(300);
    diceElementA.classList.remove("settle"); diceElementB.classList.remove("settle");

    // Update total display
    const totalEl    = document.querySelector("#diceTotal");
    const moveTextEl = document.querySelector("#moveText");
    const isDouble   = finalA === finalB;
    if (totalEl)    totalEl.textContent    = `Tổng: ${finalA + finalB}${isDouble ? " 🎲ĐÔI!" : ""}`;
    if (moveTextEl) moveTextEl.textContent = `Di chuyển ${finalA + finalB} ô`;

    return { valA: finalA, valB: finalB, total: finalA + finalB };
  },

  /* ─── STEP-BY-STEP TOKEN MOVEMENT ──────────────────────────
     Uses BoardModule.animateTokenStep() for smooth DOM moves
     instead of calling renderBoard() every step.
  ─────────────────────────────────────────────────────────── */
  async movePlayerStepByStep(player, steps, onStepCallback) {
    const totalCells = (window.boardCells || []).length || 32;

    for (let step = 0; step < steps; step++) {
      const oldPos = player.position || 0;
      const newPos = (oldPos + 1) % totalCells;
      const passedStart = newPos === 0 && oldPos === totalCells - 1;

      player.position = newPos;

      // Broadcast TOKEN_STEP_UPDATE so all players in room see step movement in real time!
      if (window.RoomsModule) {
        window.RoomsModule.publishCloudMessage({
          type: "TOKEN_STEP_UPDATE",
          playerId: player.id,
          newPos: newPos
        });
      }

      // Local smooth DOM token hop
      if (window.BoardModule?.animateTokenStep) {
        window.BoardModule.animateTokenStep(player, newPos);
      }

      if (onStepCallback) onStepCallback(newPos, passedStart);

      // 350ms per hop: fast enough to feel responsive, slow enough to track
      await this.delay(350);
    }

    // Final board sync after all steps
    if (window.BoardModule?.renderBoard) {
      window.BoardModule.renderBoard();
    }
  },

  /* ─── CONFETTI ────────────────────────────────────────────── */
  triggerConfetti() {
    const layer = document.querySelector("#confettiLayer");
    if (!layer) return;
    layer.innerHTML = "";
    const colors = ["#f6b51f","#28a962","#3389e8","#ef5a4c","#c56eda","#00d2d3","#ff9f43"];

    for (let i = 0; i < 80; i++) {
      const piece = document.createElement("i");
      piece.className = "confetti";
      piece.style.cssText = `
        left:${Math.random()*100}%;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        animation-duration:${2.5 + Math.random()*3}s;
        animation-delay:${Math.random()*1.2}s;
        width:${6+Math.random()*6}px;
        height:${6+Math.random()*6}px;
        border-radius:${Math.random()>0.5?"50%":"2px"};
      `;
      layer.appendChild(piece);
    }
    // Auto clean
    setTimeout(() => { if(layer) layer.innerHTML = ""; }, 6000);
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
