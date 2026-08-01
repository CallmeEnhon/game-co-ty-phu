/* =========================================================
   BOARD MODULE (board.js)  v4.1.1
   – Smooth token movement (FLIP technique, no full re-render per step)
   – Click on property/beach → info panel popup
   – Turn widget stays flat when camera rotates (counter-rotation)
   – Cell text high-contrast for all cell types
   ========================================================= */

window.BoardModule = {
  /* ─── FULL BOARD RENDER ─────────────────────────────────── */
  renderBoard() {
    const board = document.querySelector("#gameBoard");
    if (!board) return;

    // Save center element before clearing
    const center = board.querySelector(".board-center");
    board.innerHTML = "";
    if (center) board.appendChild(center);

    window.boardCells.forEach((cell, index) => {
      const pos = window.gridPositions[index];
      if (!pos) return;

      const cellEl = document.createElement("div");
      cellEl.className = `board-cell ${cell.type} ${cell.group || ""}`;
      cellEl.dataset.index  = index;
      cellEl.dataset.cellId = cell.id;
      cellEl.style.gridRow    = pos[0];
      cellEl.style.gridColumn = pos[1];

      const owner      = cell.ownerId ? window.gameState.players.find(p => p.id === cell.ownerId) : null;
      const levelIcons = cell.level > 0 ? ["🏢","🏗️","🏬","🏰"][Math.min(cell.level-1,3)] : "";
      const hasFestival = cell.festivalUntil && cell.festivalUntil >= window.gameState.round;
      const multLabel  = window.GameConfig ? `x${window.GameConfig.FESTIVAL_RENT_MULTIPLIER}` : "x2";

      if (cell.type === "property" || cell.type === "beach") {
        const priceLabel = cell.price || (cell.cost ? window.fmtMoney(cell.cost) : "");
        cellEl.innerHTML = `
          <div class="color-stripe" style="background:${cell.color}"></div>
          <div class="cell-body">
            <div class="cell-icon-3d">${cell.icon || "🏠"}</div>
            <div class="cell-title">${cell.title}</div>
            <div class="cell-price">${priceLabel}</div>
          </div>
          ${owner ? `<div class="owner-dot" style="background:${owner.color}" title="${owner.name}"></div>` : ""}
          ${levelIcons  ? `<div class="building-level">${levelIcons}</div>` : ""}
          ${hasFestival ? `<div class="festival-badge">🏆${multLabel}</div>` : ""}
        `;
        // Click → info panel
        cellEl.addEventListener("click", (e) => {
          e.stopPropagation();
          window.BoardModule.showCellInfoPanel(cell, cellEl);
        });
      } else {
        cellEl.innerHTML = `
          <div class="cell-body special-body">
            <div class="corner-icon">${cell.icon || "🎲"}</div>
            <div class="cell-title cell-title-special">${cell.title}</div>
            ${cell.subtitle ? `<div class="cell-subtitle">${cell.subtitle}</div>` : ""}
          </div>
        `;
      }

      board.appendChild(cellEl);
    });

    // Re-place tokens smoothly
    this.updatePlayerTokens();
    this.updateCameraPerspective();
  },

  /* ─── SMOOTH TOKEN PLACEMENT (no full re-render per step) ── */
  updatePlayerTokens() {
    document.querySelectorAll(".board-token").forEach(t => t.remove());

    const byPos = {};
    window.gameState.players.forEach((p, pIdx) => {
      if (p.bankrupt) return;
      const pos = p.position || 0;
      if (!byPos[pos]) byPos[pos] = [];
      byPos[pos].push({ player: p, playerIdx: pIdx });
    });

    Object.entries(byPos).forEach(([pos, items]) => {
      const cellEl = document.querySelector(`[data-index="${pos}"]`);
      if (!cellEl) return;
      items.forEach(({ player, playerIdx }, i) => {
        const token = document.createElement("div");
        const isCurrentTurn = playerIdx === window.gameState.currentPlayer;
        const safeId = String(player.id).replace(/[^a-zA-Z0-9_-]/g, "_");

        token.className = `board-token token-${safeId} ${isCurrentTurn ? "current-turn-token" : ""}`;
        token.style.setProperty("--token-color", player.color || "#f4b21f");
        token.dataset.playerId = player.id;

        // Offset stacked tokens
        const offX = (i % 2) * 16 - (items.length > 1 ? 8 : 0);
        const offY = Math.floor(i / 2) * 16 - (items.length > 2 ? 8 : 0);
        token.style.transform = `translate(${offX}px, ${offY}px)`;

        const shortName = player.name || `P${playerIdx+1}`;

        token.innerHTML = `
          <div class="token-avatar">${player.avatar || "♟"}</div>
          <div class="token-name-tag" style="background:${player.color || '#f4b21f'}">${shortName}</div>
        `;

        cellEl.appendChild(token);
      });
    });
  },

  /* ─── ANIMATE TOKEN MOVING ONE STEP ────────────────────────
     Called by AnimationsModule.movePlayerStepByStep() and TOKEN_STEP_UPDATE
  ─────────────────────────────────────────────────────────── */
  animateTokenStep(player, newPos) {
    const safeId   = String(player.id).replace(/[^a-zA-Z0-9_-]/g, "_");
    const oldToken = document.querySelector(`.token-${safeId}`) || document.querySelector(`[data-player-id="${player.id}"]`);
    const newCell  = document.querySelector(`[data-index="${newPos}"]`);
    if (!newCell) return;

    if (oldToken) {
      oldToken.classList.add("hop");
      setTimeout(() => oldToken?.classList.remove("hop"), 320);
      setTimeout(() => {
        newCell.appendChild(oldToken);
        oldToken.style.transform = "";
      }, 160);
    } else {
      this.updatePlayerTokens();
    }
  },

  /* ─── CELL INFO PANEL ────────────────────────────────────── */
  showCellInfoPanel(cell, anchorEl) {
    // Remove existing panel
    document.querySelector("#cellInfoPanel")?.remove();

    const owner = cell.ownerId ? window.gameState.players.find(p => p.id === cell.ownerId) : null;
    const fmt   = window.fmtMoney || (n => `$${n}`);
    const currentRent = window.calculateEffectiveRent ? window.calculateEffectiveRent(cell) : cell.rent;
    const hasFestival = cell.festivalUntil && cell.festivalUntil >= (window.gameState?.round || 0);

    // Build upgrade table
    const levelLabels = ["Cơ bản","Văn phòng","Mở rộng","Tòa nhà","Landmark"];
    const rentFactors = [1, 2, 3.5, 5, 7];
    const upgradeRows = rentFactors.map((f, lvl) => {
      const r = Math.round((cell.rent || 0) * f);
      const upgradeC = (cell.upgradeCosts || [])[lvl - 1] || 0;
      const isCurrentLevel = (cell.level || 0) === lvl;
      return `
        <tr class="${isCurrentLevel ? "current-level-row" : ""}">
          <td>${levelLabels[lvl] || `Cấp ${lvl}`}</td>
          <td style="color:#f4b21f;font-weight:700;">${fmt(r)}</td>
          <td style="color:#95a5a6;">${lvl > 0 && upgradeC ? fmt(upgradeC) : "—"}</td>
        </tr>`;
    }).join("");

    const monopolyOwned = cell.group && cell.group !== "beach" && owner
      ? window.checkColorMonopoly(owner.id, cell.group)
      : false;

    const panel = document.createElement("div");
    panel.id = "cellInfoPanel";
    panel.className = "cell-info-panel";
    panel.innerHTML = `
      <div class="cip-header" style="background:${cell.color || "#2c3e50"}">
        <span class="cip-icon">${cell.icon || "🏠"}</span>
        <span class="cip-title">${cell.title}</span>
        <button class="cip-close" id="cipCloseBtn">✕</button>
      </div>
      <div class="cip-body">
        <div class="cip-row">
          <span>Giá mua</span>
          <strong style="color:#f4b21f">${fmt(cell.cost)}</strong>
        </div>
        <div class="cip-row">
          <span>Chủ sở hữu</span>
          <strong style="color:${owner?.color || "#7f8c8d"}">${owner ? owner.name : "Chưa có chủ"}</strong>
        </div>
        <div class="cip-row">
          <span>Tiền thuê hiện tại</span>
          <strong style="color:#2ecc71">${fmt(currentRent)}${hasFestival ? " 🎊" : ""}${monopolyOwned ? " 🔥" : ""}</strong>
        </div>
        <div class="cip-row">
          <span>Cấp hiện tại</span>
          <strong>${["—","🏢","🏗️","🏬","🏰"][cell.level || 0] || "—"} Cấp ${cell.level || 0}/${window.GameConfig?.MAX_PROPERTY_LEVEL || 4}</strong>
        </div>
        ${hasFestival ? `<div class="cip-badge festival">🏆 Đang có Lễ Hội – Thuê x${window.GameConfig?.FESTIVAL_RENT_MULTIPLIER || 2} (còn ${cell.festivalUntil - (window.gameState?.round || 0)} vòng)</div>` : ""}
        ${monopolyOwned ? `<div class="cip-badge monopoly">🔥 Độc quyền nhóm! Thuê x2</div>` : ""}
        <div class="cip-section-title">📊 Bảng tiền thuê theo cấp</div>
        <table class="cip-table">
          <thead><tr><th>Cấp</th><th>Tiền thuê</th><th>Chi phí UP</th></tr></thead>
          <tbody>${upgradeRows}</tbody>
        </table>
        ${cell.group && cell.group !== "beach" ? `
        <div class="cip-section-title">🏘️ Nhóm: ${cell.group.replace("group_","").toUpperCase()}</div>
        <div class="cip-group-dots">${
          window.boardCells.filter(c => c.group === cell.group).map(c => {
            const o = c.ownerId ? window.gameState.players.find(p => p.id === c.ownerId) : null;
            return `<span class="cip-group-dot" style="background:${o?.color||"#555"}" title="${c.title}">${c.title.slice(0,4)}</span>`;
          }).join("")
        }</div>` : ""}
      </div>`;

    document.body.appendChild(panel);
    document.querySelector("#cipCloseBtn").onclick = () => panel.remove();

    // Close on outside click
    const outsideClose = (e) => {
      if (!panel.contains(e.target) && e.target !== anchorEl) {
        panel.remove();
        document.removeEventListener("click", outsideClose);
      }
    };
    setTimeout(() => document.addEventListener("click", outsideClose), 50);
  },

  /* ─── CAMERA PERSPECTIVE ─────────────────────────────────── */
  toggleCameraLock() {
    window.gameState.cameraLocked = !window.gameState.cameraLocked;
    this.updateCameraPerspective();
  },

  _currentCamAngle: 0,

  updateCameraPerspective() {
    const board = document.querySelector("#gameBoard");
    if (!board) return;
    board.className = "game-board";

    let rotZ = 0;
    if (window.gameState.cameraLocked) {
      board.classList.add("cam-locked");
      rotZ = 0;
    } else {
      const activeIdx = window.gameState.currentPlayer || 0;
      board.classList.add(`cam-p${activeIdx % 4}`);
      rotZ = [0, -90, -180, -270][activeIdx % 4];
    }

    this._currentCamAngle = rotZ;

    // Keep the turn widget flat (counter-rotate so it always faces the screen)
    this._applyWidgetCounterRotation(rotZ);

    const lockBtn = document.querySelector("#cameraLockBtn");
    if (lockBtn) {
      lockBtn.classList.toggle("locked", !!window.gameState.cameraLocked);
      lockBtn.innerHTML = window.gameState.cameraLocked ? "🔒 Camera Phẳng" : "🔓 Xoay 3D";
    }
  },

  // Counter-rotate the center turn widget so it always stays upright
  _applyWidgetCounterRotation(boardRotZ) {
    const widget = document.querySelector(".turn-widget");
    if (!widget) return;
    // Counter the board's Z rotation so the widget stays readable
    widget.style.transform = `rotateX(${boardRotZ === 0 ? 0 : -48}deg) rotateZ(${-boardRotZ}deg)`;
    widget.style.transition = "transform 0.8s cubic-bezier(0.25,1,0.5,1)";
  }
};
