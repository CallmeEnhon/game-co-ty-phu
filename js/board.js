/* =========================================================
   BOARD MODULE (board.js)
   Renders the board cells, tokens, property ownership,
   upgrade levels, and festival countdown badges.
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

      // Property color band
      let bandHTML = "";
      if (cell.color && cell.type === "property") {
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

      // Festival badge & countdown
      let festivalHTML = "";
      if (cell.festivalUntil && cell.festivalUntil >= window.gameState.round) {
        const remainingRounds = cell.festivalUntil - window.gameState.round + 1;
        festivalHTML = `<div class="cell-festival-badge" title="Đang tổ chức Lễ hội (x2 tiền thuê còn ${remainingRounds} vòng)">🎉 ${remainingRounds}v</div>`;
      }

      element.innerHTML = `
        ${bandHTML}
        ${ownerHTML}
        ${levelHTML}
        ${festivalHTML}
        <div class="cell-icon">${cell.icon || ""}</div>
        <div class="cell-title">${cell.title}</div>
        <div class="cell-price">${cell.price || cell.subtitle || ""}</div>
        <div class="cell-token-layer"></div>
      `;

      board.appendChild(element);
    });

    this.renderTokens();
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

  highlightCell(cellIndex) {
    document.querySelectorAll(".board-cell").forEach(cell => cell.classList.remove("highlighted"));
    const targetCell = document.querySelector(`[data-index="${cellIndex}"]`);
    if (targetCell) {
      targetCell.classList.add("highlighted");
    }
  }
};
