/* =========================================================
   BOARD MODULE (board.js)
   Renders 32-cell Monopoly Perimeter Board and Camera Perspective.
   ========================================================= */

window.BoardModule = {
  renderBoard() {
    const board = document.querySelector("#gameBoard");
    if (!board) return;

    // Clear cell nodes while preserving center
    const center = board.querySelector(".board-center");
    board.innerHTML = "";
    if (center) board.appendChild(center);

    window.boardCells.forEach((cell, index) => {
      const pos = window.gridPositions[index];
      if (!pos) return;

      const cellEl = document.createElement("div");
      cellEl.className = `board-cell ${cell.type} ${cell.group || ""}`;
      cellEl.dataset.index = index;
      cellEl.style.gridRow = pos[0];
      cellEl.style.gridColumn = pos[1];

      let content = "";
      if (cell.type === "property" || cell.type === "beach") {
        const owner = window.gameState.players.find(p => p.id === cell.ownerId);
        const levelBadges = "🏰".repeat(cell.level || 0);

        content = `
          <div class="color-stripe" style="background:${cell.color}"></div>
          <div class="cell-title">${cell.title}</div>
          <div class="cell-price">${cell.price}</div>
          ${owner ? `<div class="owner-dot" style="background:${owner.color}" title="Chủ: ${owner.name}"></div>` : ""}
          ${levelBadges ? `<div class="building-level">${levelBadges}</div>` : ""}
          ${cell.festivalUntil && cell.festivalUntil >= window.gameState.round ? '<div class="festival-badge">🏆 x5</div>' : ""}
        `;
      } else {
        content = `
          <div class="corner-icon">${cell.icon || "🎲"}</div>
          <div class="cell-title">${cell.title}</div>
          ${cell.subtitle ? `<div class="cell-subtitle">${cell.subtitle}</div>` : ""}
        `;
      }

      cellEl.innerHTML = content;
      board.appendChild(cellEl);
    });

    this.renderTokens();
    this.updateCameraPerspective();
  },

  renderTokens() {
    window.gameState.players.forEach(player => {
      if (player.bankrupt) return;

      const posIndex = player.position || 0;
      const cellEl = document.querySelector(`[data-index="${posIndex}"]`);

      if (cellEl) {
        let tokenEl = cellEl.querySelector(`.token-p${player.id}`);
        if (!tokenEl) {
          tokenEl = document.createElement("div");
          tokenEl.className = `board-token token-p${player.id}`;
          tokenEl.style.backgroundColor = player.color;
          tokenEl.textContent = player.avatar || "♟️";
          cellEl.appendChild(tokenEl);
        }
      }
    });
  },

  toggleCameraLock() {
    window.gameState.cameraLocked = !window.gameState.cameraLocked;
    this.updateCameraPerspective();
  },

  updateCameraPerspective() {
    const board = document.querySelector("#gameBoard");
    if (!board) return;

    board.className = "game-board";

    if (window.gameState.cameraLocked) {
      board.classList.add("cam-locked");
    } else {
      const activeIdx = window.gameState.currentPlayer || 0;
      board.classList.add(`cam-p${activeIdx % 4}`);
    }

    const lockBtn = document.querySelector("#cameraLockBtn");
    if (lockBtn) {
      if (window.gameState.cameraLocked) {
        lockBtn.classList.add("locked");
        lockBtn.innerHTML = "🔒 Khoá Camera";
        if (window.UIModule) window.UIModule.showToast("🔒 Đã khóa Camera (Góc thẳng 0°)");
      } else {
        lockBtn.classList.remove("locked");
        lockBtn.innerHTML = "🔓 Xoay Camera";
        if (window.UIModule) window.UIModule.showToast("🔓 Đã mở Xoay Camera theo lượt!");
      }
    }
  }
};
