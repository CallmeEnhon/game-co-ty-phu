/* =========================================================
   BOARD MODULE (board.js)
   Renders the MonoConCard Isometric 3D Board and handles
   Dynamic Player Camera Angle & Camera Lock Toggle.
   ========================================================= */

window.BoardModule = {
  renderBoard() {
    const board = document.querySelector("#gameBoard");
    if (!board) return;

    // Preserve center widget
    const center = board.querySelector(".board-center");
    board.innerHTML = "";
    if (center) board.appendChild(center);

    window.boardCells.forEach((cell, index) => {
      const element = document.createElement("article");
      element.className = `board-cell ${cell.type}`;
      element.dataset.index = index;

      const coords = window.gridPositions[index];
      element.style.gridRow = coords[0];
      element.style.gridColumn = coords[1];

      // Property or Beach color band
      let bandHTML = "";
      if (cell.color && (cell.type === "property" || cell.type === "beach")) {
        bandHTML = `<div class="property-band" style="--band-color:${cell.color}"></div>`;
      }

      // Owner indicator
      let ownerHTML = "";
      if (cell.ownerId !== null && cell.ownerId !== undefined) {
        const owner = window.gameState.players.find(p => p.id === cell.ownerId);
        if (owner) {
          ownerHTML = `<div class="cell-owner-dot" style="background:${owner.color}" title="Chủ sở hữu: ${owner.name}"></div>`;
        }
      }

      // Level badge
      let levelHTML = "";
      if (cell.level && cell.level > 0) {
        levelHTML = `<div class="cell-level-badge">Lv.${cell.level}</div>`;
      }

      // Festival badge & countdown (x5 Rent)
      let festivalHTML = "";
      if (cell.festivalUntil && cell.festivalUntil >= window.gameState.round) {
        const remainingRounds = cell.festivalUntil - window.gameState.round + 1;
        festivalHTML = `<div class="cell-festival-badge" title="Đang tổ chức Lễ hội (x5 tiền thuê còn ${remainingRounds} vòng)">🏆 x5 (${remainingRounds}v)</div>`;
      }

      element.innerHTML = `
        ${bandHTML}
        ${ownerHTML}
        ${levelHTML}
        ${festivalHTML}
        <div class="cell-content">
          <div class="cell-icon">${cell.icon || ""}</div>
          <div class="cell-title">${cell.title}</div>
          <div class="cell-price">${cell.price || cell.subtitle || ""}</div>
        </div>
        <div class="cell-token-layer"></div>
      `;

      board.appendChild(element);
    });

    this.renderTokens();
    this.updateCameraPerspective();
  },

  renderTokens() {
    document.querySelectorAll(".cell-token-layer").forEach(layer => layer.innerHTML = "");

    window.gameState.players.forEach(player => {
      if (player.bankrupt) return;
      const layer = document.querySelector(`[data-index="${player.position}"] .cell-token-layer`);
      if (!layer) return;

      const token = document.createElement("div");
      token.className = "board-token";
      token.style.background = player.color;
      token.textContent = player.name[0];
      token.title = `${player.name} ($${player.money})`;
      layer.appendChild(token);
    });
  },

  updateCameraPerspective() {
    const board = document.querySelector("#gameBoard");
    if (!board) return;

    // Reset camera angle classes
    board.classList.remove("cam-p0", "cam-p1", "cam-p2", "cam-p3", "camera-locked");

    if (window.gameState.cameraLocked) {
      board.classList.add("camera-locked");
    } else {
      const pIndex = window.gameState.currentPlayer % 4;
      board.classList.add(`cam-p${pIndex}`);
    }
  },

  toggleCameraLock() {
    window.gameState.cameraLocked = !window.gameState.cameraLocked;
    this.updateCameraPerspective();

    const lockBtn = document.querySelector("#cameraLockBtn");
    if (lockBtn) {
      if (window.gameState.cameraLocked) {
        lockBtn.classList.add("locked");
        lockBtn.innerHTML = "🔒 Khoá Camera";
        if (window.UIModule) window.UIModule.showToast("🔒 Đã khóa Camera (Góc tĩnh)");
      } else {
        lockBtn.classList.remove("locked");
        lockBtn.innerHTML = "🔓 Xoay Camera";
        if (window.UIModule) window.UIModule.showToast("🔓 Đã mở Xoay Camera theo lượt chơi!");
      }
    }
  }
};
