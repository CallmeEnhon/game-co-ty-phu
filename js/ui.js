/* =========================================================
   UI MODULE (ui.js)  v4.0.0
   MonoConCard - Full Game Logic: Jail/WorldTour/Festival/Rent
   ========================================================= */

window.UIModule = {
  toastTimer: null,

  /* ─── SCREEN SWITCHING ─────────────────────────────────── */
  showScreen(screenName) {
    window.gameState.screen = screenName;
    document.querySelectorAll(".screen").forEach(s => {
      s.classList.remove("active");
      s.style.display = "none";
    });
    const target = document.querySelector(`#${screenName}Screen`);
    if (target) { target.classList.add("active"); target.style.display = "flex"; }

    const rulesBtn      = document.querySelector("#rulesBtn");
    const cameraLockBtn = document.querySelector("#cameraLockBtn");
    const leaveBtn      = document.querySelector("#leaveRoomBtn");
    const inGame = screenName === "game";
    if (rulesBtn)      rulesBtn.classList.toggle("hidden", !inGame);
    if (cameraLockBtn) cameraLockBtn.classList.toggle("hidden", !inGame);
    if (leaveBtn)      leaveBtn.classList.toggle("hidden", !inGame);

    if (screenName === "result") {
      this.renderResults();
      if (window.AnimationsModule) window.AnimationsModule.triggerConfetti();
    }
  },

  /* ─── PLAYER RAIL ──────────────────────────────────────── */
  renderPlayerRail() {
    const rail = document.querySelector("#playerListContainer");
    if (!rail) return;

    rail.innerHTML = window.gameState.players.map((player, idx) => {
      const isCurrent  = idx === window.gameState.currentPlayer;
      const beaches    = (window.boardCells || []).filter(c => c.type === "beach" && c.ownerId === player.id).length;
      const jailBadge  = player.inJail ? `<span style="color:#e74c3c;font-size:9px;">⛓️ Tù ${player.jailTurns || 0}</span>` : "";
      return `
        <article class="player-hud-card ${isCurrent ? "active-turn" : ""} ${player.bankrupt ? "bankrupt" : ""}"
                 style="--player-accent:${player.color}">
          <div class="player-hud-left">
            <div class="avatar" style="--avatar-color:${player.color}">${player.avatar}</div>
          </div>
          <div class="player-hud-right">
            <div class="player-hud-name">
              <span>${player.name}</span>
              ${player.host ? "👑" : ""}${player.isBot ? "🤖" : ""}
              ${jailBadge}
            </div>
            <div class="player-hud-money">$${(player.money || 0).toLocaleString()}</div>
            <div class="player-hud-stats">Tài sản: $${(player.asset || 0).toLocaleString()} | 🏖️ ${beaches}/4</div>
          </div>
        </article>`;
    }).join("");

    const nameEl  = document.querySelector("#currentPlayerName");
    const current = window.gameState.players[window.gameState.currentPlayer];
    if (nameEl && current) {
      nameEl.textContent = `${current.name}${current.isBot ? " (Bot)" : ""}`;
      nameEl.style.color = current.color;
    }
    this.updateTurnControls();
  },

  updateTurnControls() {
    const current = window.gameState.players[window.gameState.currentPlayer];
    const rollBtn = document.querySelector("#rollDiceBtn");
    if (!rollBtn || !current) return;
    const isMyTurn = current.id === window.myPlayerId;
    if (!window.gameState.busy && !window.gameState.rolling) {
      rollBtn.disabled = !isMyTurn;
      rollBtn.textContent = isMyTurn ? "🎲 Đổ Xúc Xắc" : `⏳ Lượt ${current.name}...`;
    }
  },

  /* ─── ROLL DICE (entry point for human player) ─────────── */
  async rollDice() {
    if (window.gameState.rolling || window.gameState.busy) return;
    const current = window.gameState.players[window.gameState.currentPlayer];
    if (!current || current.id !== window.myPlayerId) {
      this.showToast(`Chưa tới lượt của bạn!`); return;
    }

    // If in jail → show jail dialog instead
    if (current.inJail) {
      this.openJailModal(current); return;
    }

    // Guest → ask host to roll
    if (window.RoomsModule && !window.RoomsModule.isHost) {
      window.gameState.rolling = true;
      document.querySelector("#rollDiceBtn").disabled = true;
      window.RoomsModule.publishCloudMessage({ type: "REQ_ROLL_DICE", playerId: window.myPlayerId });
      return;
    }
    await this.handleHostRollDice(current.id);
  },

  /* ─── MAIN HOST ROLL DICE ─────────────────────────────── */
  async handleHostRollDice(playerId) {
    if (window.gameState.rolling || window.gameState.busy) return;
    const current = window.gameState.players.find(p => p.id === playerId)
                 || window.gameState.players[window.gameState.currentPlayer];
    if (!current || current.bankrupt) { this.nextTurn(); return; }

    window.gameState.rolling = true;
    window.gameState.busy    = true;
    const rollBtn = document.querySelector("#rollDiceBtn");
    if (rollBtn) rollBtn.disabled = true;

    const diceA = document.querySelector("#diceA");
    const diceB = document.querySelector("#diceB");

    const result   = await window.AnimationsModule.animateDiceRoll(diceA, diceB);
    const total    = result.total;
    const isDouble = result.valA === result.valB;
    window.gameState.stats.diceRolls++;

    // Double-roll count (3× → jail)
    if (isDouble) {
      current.doubleRollCount = (current.doubleRollCount || 0) + 1;
      if (current.doubleRollCount >= 3) {
        current.doubleRollCount = 0;
        current.position = 24; current.inJail = true; current.jailTurns = 0;
        this.showToast(`🚨 ${current.name} đổ ĐÔI 3 lần – vào Đảo Bị Lãng Quên!`);
        this.addLog(`🚨 ${current.name} đổ đôi 3 lần liên tiếp, bị giam!`);
        window.gameState.rolling = false; window.gameState.busy = false;
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        window.BoardModule?.renderBoard(); this.renderPlayerRail();
        this.nextTurn(); return;
      }
    } else {
      current.doubleRollCount = 0;
    }

    const logMsg = `${current.name} đổ xúc xắc: ${result.valA}+${result.valB}=${total}${isDouble ? " 🎲ĐÔI!" : ""}`;
    this.addLog(logMsg);

    // Move step by step
    await window.AnimationsModule.movePlayerStepByStep(current, total, (newPos, passedStart) => {
      if (passedStart) {
        current.money += window.GameConfig.PASS_START_BONUS;
        this.showToast(`🚩 ${current.name} qua ô Bắt Đầu: +$${window.GameConfig.PASS_START_BONUS}!`);
        this.addLog(`🚩 ${current.name} qua ô Bắt Đầu, nhận +$${window.GameConfig.PASS_START_BONUS}`);
        this.renderPlayerRail();
      }
    });

    if (window.RoomsModule) {
      window.RoomsModule.publishCloudMessage({
        type: "GAME_STATE_UPDATE",
        valA: result.valA, valB: result.valB, total, isDouble,
        players: window.gameState.players,
        boardCells: window.boardCells,
        currentPlayer: window.gameState.currentPlayer,
        round: window.gameState.round,
        logMsg
      });
    }

    window.gameState.rolling = false;
    this.handleCellAction(current);
  },

  /* ─── APPLY REMOTE STATE UPDATE ────────────────────────── */
  async applyGameStateUpdate(data) {
    const dA = document.querySelector("#diceA"), dB = document.querySelector("#diceB");
    if (dA) dA.setAttribute("data-value", data.valA);
    if (dB) dB.setAttribute("data-value", data.valB);
    const totalEl    = document.querySelector("#diceTotal");
    const moveTextEl = document.querySelector("#moveText");
    if (totalEl)    totalEl.textContent    = `Tổng: ${data.total}${data.isDouble ? " 🎲ĐÔI!" : ""}`;
    if (moveTextEl) moveTextEl.textContent = `Di chuyển ${data.total} ô`;

    if (data.players)       window.gameState.players       = data.players;
    if (data.boardCells)    window.boardCells              = data.boardCells;
    if (data.currentPlayer !== undefined) window.gameState.currentPlayer = data.currentPlayer;
    if (data.round !== undefined)         window.gameState.round         = data.round;
    if (data.logMsg) this.addLog(data.logMsg);

    window.BoardModule?.renderBoard();
    this.renderPlayerRail();
    this.updateTurnControls();
  },

  hideAllModals() {
    ["propertyModal","jailModal","rulesModal"].forEach(id => {
      document.querySelector(`#${id}`)?.classList.add("hidden");
    });
    // Remove festival glow
    document.querySelectorAll(".festival-selectable").forEach(el => el.classList.remove("festival-selectable"));
  },

  /* ─── CELL ACTION DISPATCHER ────────────────────────────── */
  handleCellAction(player) {
    const cell    = window.boardCells[player.position];
    const isMyTurn = player.id === window.myPlayerId;
    if (!cell) { this.nextTurn(); return; }

    this.addLog(`${player.name} dừng tại: ${cell.title}`);

    switch (cell.type) {
      case "property":
      case "beach":
        if (cell.ownerId === null) {
          if (isMyTurn) this.openPropertyModal(cell, player);
          else if (player.isBot && window.RoomsModule?.isHost) window.BotModule.decidePropertyPurchase(player, cell);
          else { this.hideAllModals(); this.showToast(`⏳ ${player.name} đang cân nhắc mua ${cell.title}...`); }
        } else if (cell.ownerId === player.id) {
          if (cell.type === "property" && (cell.level||0) < window.GameConfig.MAX_PROPERTY_LEVEL) {
            if (isMyTurn) this.openUpgradeModal(cell, player);
            else if (player.isBot && window.RoomsModule?.isHost) window.BotModule.decideUpgradeProperty(player, cell);
            else { this.hideAllModals(); this.showToast(`⏳ ${player.name} đang nâng cấp...`); }
          } else {
            this.nextTurn();
          }
        } else {
          const owner = window.gameState.players.find(p => p.id === cell.ownerId);
          const rent  = window.calculateEffectiveRent(cell);
          if (owner && !owner.bankrupt) {
            player.money -= rent;
            owner.money  += rent;
            this.showToast(`💸 ${player.name} trả $${rent} cho ${owner.name}`);
            this.addLog(`💸 ${player.name} trả $${rent} tiền thuê cho ${owner.name} (${cell.title})`);
            this.renderPlayerRail();
            this.checkBankruptcy(player);
            if (window.RoomsModule) window.RoomsModule.broadcastState();
          }
          setTimeout(() => this.nextTurn(), 1400);
        }
        break;

      case "tax": {
        const assets = player.money + (player.properties||[]).reduce((s,i) => s + (window.boardCells[i]?.cost||0), 0);
        const tax    = Math.round(assets * window.GameConfig.TAX_PERCENTAGE);
        player.money -= tax;
        this.showToast(`📜 ${player.name} nộp thuế 10%: -$${tax}`);
        this.addLog(`📜 ${player.name} nộp -$${tax} thuế tài sản`);
        this.renderPlayerRail();
        this.checkBankruptcy(player);
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        setTimeout(() => this.nextTurn(), 1400);
        break;
      }

      case "world_tour":
        if (isMyTurn) this.openWorldTourModal(player);
        else if (player.isBot && window.RoomsModule?.isHost) window.BotModule.decideWorldTour(player);
        else { this.hideAllModals(); this.showToast(`✈️ ${player.name} đang chọn điểm bay...`); }
        break;

      case "festival":
        if (isMyTurn) this.openFestivalModal(player);
        else if (player.isBot && window.RoomsModule?.isHost) window.BotModule.decideFestival(player);
        else { this.hideAllModals(); this.showToast(`🏆 ${player.name} đang chọn khu đất tổ chức lễ hội...`); }
        break;

      case "jail":
        // Visiting, not imprisoned
        this.addLog(`${player.name} thăm Đảo Bị Lãng Quên (không bị giam)`);
        setTimeout(() => this.nextTurn(), 800);
        break;

      case "chance": {
        window.gameState.stats.chanceDrawn++;
        const cards = [
          { text: "🎁 Trúng xổ số! Nhận +$200",   money:  200 },
          { text: "🎁 Thưởng thành tích! +$150",   money:  150 },
          { text: "💸 Sửa chữa bất động sản -$100",money: -100 },
          { text: "💸 Phí dịch vụ! Trả -$80",      money:  -80 },
          { text: "🎉 Tổ chức tiệc! Nhận +$250",   money:  250 },
          { text: "📉 Thị trường xuống, mất -$150", money: -150 }
        ];
        const card = cards[Math.floor(Math.random() * cards.length)];
        player.money += card.money;
        this.showToast(card.text);
        this.addLog(`🎡 ${player.name} rút Cơ Hội: ${card.text}`);
        this.renderPlayerRail();
        this.checkBankruptcy(player);
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        setTimeout(() => this.nextTurn(), 1400);
        break;
      }

      default:
        setTimeout(() => this.nextTurn(), 800);
    }
  },

  /* ─── JAIL MODAL ─────────────────────────────────────────── */
  openJailModal(player) {
    const modal    = document.querySelector("#jailModal");
    if (!modal) { this.nextTurn(); return; }
    modal.classList.remove("hidden");
    window.gameState.busy = true;

    const payBtn  = document.querySelector("#payJailBtn");
    const rollBtn = document.querySelector("#rollJailBtn");

    payBtn.onclick = () => {
      if (player.money >= window.GameConfig.JAIL_FINE) {
        player.money    -= window.GameConfig.JAIL_FINE;
        player.inJail    = false;
        player.jailTurns = 0;
        this.showToast(`✅ ${player.name} nộp $${window.GameConfig.JAIL_FINE} và thoát tù!`);
        this.addLog(`✅ ${player.name} nộp phạt $${window.GameConfig.JAIL_FINE}, được thả`);
        modal.classList.add("hidden");
        window.gameState.busy = false;
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        this.renderPlayerRail();
        this.handleHostRollDice(player.id);
      } else {
        this.showToast(`❌ Không đủ $${window.GameConfig.JAIL_FINE}!`);
      }
    };

    rollBtn.onclick = async () => {
      modal.classList.add("hidden");
      window.gameState.busy = false;
      const diceA = document.querySelector("#diceA"), diceB = document.querySelector("#diceB");
      const result = await window.AnimationsModule.animateDiceRoll(diceA, diceB);
      const isDouble = result.valA === result.valB;
      this.addLog(`${player.name} đổ thử vận may: ${result.valA}+${result.valB}=${result.total} ${isDouble?"✅ĐÔI–Thoát tù!":"❌ Chưa thoát"}`);

      if (isDouble) {
        player.inJail    = false;
        player.jailTurns = 0;
        this.showToast(`🎉 Đổ Đôi! ${player.name} thoát tù và di chuyển ${result.total} ô!`);
        window.gameState.rolling = true; window.gameState.busy = true;
        await window.AnimationsModule.movePlayerStepByStep(player, result.total, (_, passedStart) => {
          if (passedStart) {
            player.money += window.GameConfig.PASS_START_BONUS;
            this.renderPlayerRail();
          }
        });
        window.gameState.rolling = false; window.gameState.busy = false;
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        window.BoardModule?.renderBoard();
        this.renderPlayerRail();
        this.handleCellAction(player);
      } else {
        player.jailTurns = (player.jailTurns || 0) + 1;
        if (player.jailTurns >= 3) {
          // Force pay after 3 failed attempts
          player.money    -= window.GameConfig.JAIL_FINE;
          player.inJail    = false;
          player.jailTurns = 0;
          this.showToast(`⚠️ ${player.name} phải nộp phạt $${window.GameConfig.JAIL_FINE} sau 3 lượt tù!`);
          this.addLog(`⚠️ ${player.name} bị trừ $${window.GameConfig.JAIL_FINE} sau 3 lượt không thoát`);
        } else {
          this.showToast(`😔 ${player.name} chưa đổ Đôi – còn ${3 - player.jailTurns} lượt trong tù`);
        }
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        this.renderPlayerRail();
        this.nextTurn();
      }
    };
  },

  /* ─── WORLD TOUR MODAL (pick city to fly to) ────────────── */
  openWorldTourModal(player) {
    if (player.money < window.GameConfig.WORLD_TOUR_FEE) {
      this.showToast(`❌ Không đủ $${window.GameConfig.WORLD_TOUR_FEE} để bay!`);
      this.nextTurn(); return;
    }

    // Build city list HTML
    const cities = window.boardCells
      .filter(c => c.type === "property" || c.type === "beach")
      .map(c => `<option value="${c.id}">${c.icon} ${c.title} ($${c.cost}) – Ô ${c.id}</option>`)
      .join("");

    // Use a quick inline modal
    const existing = document.querySelector("#worldTourInlineModal");
    if (existing) existing.remove();

    const div = document.createElement("div");
    div.id = "worldTourInlineModal";
    div.className = "modal-backdrop";
    div.innerHTML = `
      <article class="property-modal" style="max-width:380px;">
        <header class="property-modal-header" style="font-size:16px;text-align:center;">✈️ VÒNG QUANH THẾ GIỚI</header>
        <div class="property-modal-body" style="display:block; padding:12px 0; color:#cfd8dc;">
          <p style="margin-bottom:12px;font-size:13px;">Chọn điểm bay – Phí: <strong style="color:var(--gothic-gold)">$${window.GameConfig.WORLD_TOUR_FEE}</strong></p>
          <select id="worldTourSelect" style="width:100%;padding:9px 12px;border-radius:8px;border:1px solid rgba(244,196,83,0.4);background:rgba(4,15,27,0.9);color:white;font-size:13px;outline:none;">
            ${cities}
          </select>
        </div>
        <footer class="property-modal-actions" style="flex-direction:column;gap:8px;">
          <button id="worldTourConfirmBtn" class="btn btn-primary" style="width:100%;">🛫 Bay ngay ($${window.GameConfig.WORLD_TOUR_FEE})</button>
          <button id="worldTourCancelBtn" class="btn btn-light" style="width:100%;">Bỏ qua</button>
        </footer>
      </article>`;
    document.body.appendChild(div);

    document.querySelector("#worldTourConfirmBtn").onclick = () => {
      const sel    = document.querySelector("#worldTourSelect");
      const destId = parseInt(sel.value, 10);
      const destCell = window.boardCells[destId];
      if (!destCell) return;

      player.money -= window.GameConfig.WORLD_TOUR_FEE;
      const oldPos = player.position;
      if (destId < oldPos) player.money += window.GameConfig.PASS_START_BONUS;
      player.position = destId;

      this.showToast(`✈️ ${player.name} bay đến ${destCell.icon} ${destCell.title}!`);
      this.addLog(`✈️ ${player.name} bay đến ${destCell.title} (ô ${destId}), trả $${window.GameConfig.WORLD_TOUR_FEE}`);

      div.remove();
      window.BoardModule?.updatePlayerTokens();
      this.renderPlayerRail();
      if (window.RoomsModule) window.RoomsModule.broadcastState();
      this.handleCellAction(player);
    };

    document.querySelector("#worldTourCancelBtn").onclick = () => {
      div.remove();
      this.nextTurn();
    };
  },

  /* ─── FESTIVAL MODAL (glow owned cells, click to pick) ───── */
  openFestivalModal(player) {
    const ownedProps = (player.properties || [])
      .map(idx => window.boardCells[idx])
      .filter(c => c && c.type === "property");

    if (ownedProps.length === 0) {
      this.showToast(`⚠️ ${player.name} chưa có đất nào để tổ chức Giải Đấu!`);
      this.addLog(`⚠️ ${player.name} không sở hữu đất nào`);
      this.nextTurn(); return;
    }

    this.showToast(`🏆 Chọn khu đất tổ chức Giải Đấu Thế Giới!`);
    this.addLog(`🏆 ${player.name} đang chọn khu đất tổ chức Lễ Hội`);

    // Highlight all owned property cells on board
    const allCells = document.querySelectorAll(".board-cell");
    allCells.forEach(el => {
      const cellId = parseInt(el.dataset.cellId, 10);
      const cell   = window.boardCells[cellId];
      if (cell && player.properties?.includes(cellId) && cell.type === "property") {
        el.classList.add("festival-selectable");
        el.style.cursor = "pointer";
        el.onclick = () => {
          // Clear glow from all
          document.querySelectorAll(".festival-selectable").forEach(x => {
            x.classList.remove("festival-selectable");
            x.onclick = null;
          });

          // Apply festival to chosen cell
          cell.festivalUntil = window.gameState.round + window.GameConfig.FESTIVAL_DURATION_ROUNDS;
          el.classList.add("festival-active-cell");

          this.showToast(`🏆 ${cell.title} được chọn! Tiền thuê x5 trong ${window.GameConfig.FESTIVAL_DURATION_ROUNDS} vòng!`);
          this.addLog(`🏆 ${player.name} chọn ${cell.title} làm Giải Đấu Thế Giới (x5 thuê, ${window.GameConfig.FESTIVAL_DURATION_ROUNDS} vòng)`);

          if (window.RoomsModule) window.RoomsModule.broadcastState();
          window.BoardModule?.renderBoard();
          this.nextTurn();
        };
      }
    });
  },

  /* ─── PROPERTY MODAL ────────────────────────────────────── */
  openPropertyModal(cell, player) {
    const modal = document.querySelector("#propertyModal");
    if (!modal) return;

    document.querySelector("#propertyHeaderName").textContent = cell.title.toUpperCase();
    document.querySelector("#propertyName").textContent       = cell.title;
    document.querySelector("#propertyPrice").textContent      = `$${cell.cost}`;
    document.querySelector("#propertyRent").textContent       = `$${cell.rent}`;
    document.querySelector("#propertyOwnerText").textContent  = "Chưa có chủ sở hữu";
    document.querySelector("#buyPropertyBtn").textContent     = `Mua ($${cell.cost})`;

    document.querySelector("#buyPropertyBtn").onclick = () => {
      this.buyProperty(player, cell);
      modal.classList.add("hidden");
    };
    document.querySelector("#skipPropertyBtn").onclick = () => {
      modal.classList.add("hidden");
      this.nextTurn();
    };
    modal.classList.remove("hidden");
  },

  buyProperty(player, cell) {
    if (player.money >= cell.cost) {
      player.money -= cell.cost;
      cell.ownerId  = player.id;
      cell.level    = 0;
      if (!player.properties) player.properties = [];
      player.properties.push(cell.id);
      window.gameState.stats.propertiesBought++;

      this.showToast(`🏙️ ${player.name} đã mua ${cell.icon} ${cell.title} ($${cell.cost})!`);
      this.addLog(`🏙️ ${player.name} sở hữu ${cell.title}`);

      if (window.RoomsModule) window.RoomsModule.broadcastState();
      window.BoardModule?.renderBoard();
      this.renderPlayerRail();

      if (window.checkBeachMonopolyWin(player)) {
        this.showToast(`🏆 ${player.name} sở hữu đủ 4 Bãi Biển – THẮNG TUYỆT ĐỐI!`);
        this.addLog(`🏆 ${player.name} THẮNG với 4 Bãi Biển!`);
        setTimeout(() => this.showScreen("result"), 1200);
        return;
      }
    } else {
      this.showToast(`❌ Không đủ tiền mua ${cell.title}!`);
    }
    this.nextTurn();
  },

  /* ─── UPGRADE MODAL ─────────────────────────────────────── */
  openUpgradeModal(cell, player) {
    const upgradeCost = window.calculateUpgradeCost(cell);
    const modal = document.querySelector("#propertyModal");
    if (!modal) return;

    document.querySelector("#propertyHeaderName").textContent = `NÂNG CẤP: ${cell.title.toUpperCase()}`;
    document.querySelector("#propertyName").textContent       = `${cell.title} (Cấp ${(cell.level||0)+1})`;
    document.querySelector("#propertyPrice").textContent      = `$${upgradeCost}`;
    document.querySelector("#propertyRent").textContent       = `$${window.calculateEffectiveRent(cell)}`;
    document.querySelector("#propertyOwnerText").textContent  = `Chủ: ${player.name}`;
    document.querySelector("#buyPropertyBtn").textContent     = `Nâng cấp ($${upgradeCost})`;

    document.querySelector("#buyPropertyBtn").onclick = () => {
      if (player.money >= upgradeCost) {
        player.money -= upgradeCost;
        cell.level    = (cell.level || 0) + 1;
        this.showToast(`⬆️ ${player.name} nâng cấp ${cell.title} → Cấp ${cell.level}!`);
        this.addLog(`⬆️ ${player.name} nâng cấp ${cell.title} lên Cấp ${cell.level}`);
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        window.BoardModule?.renderBoard();
        this.renderPlayerRail();
      } else {
        this.showToast(`❌ Không đủ $${upgradeCost} để nâng cấp!`);
      }
      modal.classList.add("hidden");
      this.nextTurn();
    };
    document.querySelector("#skipPropertyBtn").onclick = () => {
      modal.classList.add("hidden");
      this.nextTurn();
    };
    modal.classList.remove("hidden");
  },

  /* ─── BANKRUPTCY CHECK ───────────────────────────────────── */
  checkBankruptcy(player) {
    if (player.money < 0 && !player.bankrupt) {
      player.bankrupt = true;
      window.gameState.stats.bankruptcies++;
      this.showToast(`💥 ${player.name} PHÁ SẢN!`);
      this.addLog(`💥 ${player.name} phá sản!`);
      (player.properties||[]).forEach(idx => {
        const c = window.boardCells[idx];
        if (c) { c.ownerId = null; c.level = 0; c.festivalUntil = null; }
      });
      player.properties = [];
      if (window.RoomsModule) window.RoomsModule.broadcastState();
      window.BoardModule?.renderBoard();
    }
  },

  /* ─── NEXT TURN ──────────────────────────────────────────── */
  nextTurn() {
    window.gameState.busy    = false;
    window.gameState.rolling = false;

    const activePlayers = window.gameState.players.filter(p => !p.bankrupt);
    if (activePlayers.length <= 1) {
      const winner = activePlayers[0];
      this.addLog(`🏆 ${winner?.name || "Không ai"} CHIẾN THẮNG!`);
      setTimeout(() => this.showScreen("result"), 800);
      return;
    }

    let nextIdx = window.gameState.currentPlayer;
    do {
      nextIdx = (nextIdx + 1) % window.gameState.players.length;
      if (nextIdx === 0) window.gameState.round++;
    } while (window.gameState.players[nextIdx].bankrupt);

    window.gameState.currentPlayer = nextIdx;
    if (window.RoomsModule) window.RoomsModule.broadcastState();
    this.renderPlayerRail();
    window.BoardModule?.updateCameraPerspective();

    const current = window.gameState.players[nextIdx];
    if (current.isBot && window.RoomsModule?.isHost) {
      setTimeout(() => window.BotModule.handleBotTurn(current), 800);
    }
  },

  /* ─── RESULTS ────────────────────────────────────────────── */
  renderResults() {
    const listContainer = document.querySelector("#rankingList");
    if (!listContainer) return;
    const sorted = [...window.gameState.players]
      .map(p => ({
        ...p,
        totalAsset: p.money + (p.properties||[]).reduce((s,i) => s + (window.boardCells[i]?.cost||0), 0)
      }))
      .sort((a,b) => b.totalAsset - a.totalAsset);

    const medals = ["🥇","🥈","🥉","4️⃣"];
    listContainer.innerHTML = sorted.map((player,i) => `
      <div class="rank-row">
        <div class="rank-medal">${medals[i]||""}</div>
        <div class="rank-player">
          <div class="avatar" style="--avatar-color:${player.color}">${player.avatar}</div>
          <span>${player.name}${player.isBot?"🤖":""}${i===0?"👑":""}</span>
        </div>
        <div class="rank-value">
          Tổng tài sản<br><strong>$${player.totalAsset.toLocaleString()}</strong>
        </div>
      </div>`).join("");
  },

  /* ─── UTILITY ────────────────────────────────────────────── */
  addLog(msg) {
    const log = document.querySelector("#activityLog");
    if (!log) return;
    const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const item = document.createElement("div");
    item.className = "log-item";
    item.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    log.prepend(item);
  },

  showToast(message) {
    const toast = document.querySelector("#gameToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.add("hidden"), 2400);
  },

  /* ─── EVENT BINDINGS ─────────────────────────────────────── */
  bindEvents() {
    document.querySelector("#createRoomBtn")?.addEventListener("click", () => {
      const code  = window.RoomsModule.generateRoomCode();
      const label = document.querySelector("#roomCodeLabel");
      if (label) label.textContent = code;
      this.showToast(`Đã tạo phòng: ${code}`);
    });

    document.querySelector("#joinRoomBtn")?.addEventListener("click", () => {
      const input = document.querySelector("#joinCodeInput");
      const code  = (input?.value || "").trim().toUpperCase();
      if (!code) { alert("Vui lòng nhập mã phòng!"); return; }
      window.RoomsModule.joinRoom(code);
    });

    document.querySelector("#copyRoomBtn")?.addEventListener("click", async () => {
      const code = document.querySelector("#roomCodeLabel")?.textContent || "";
      await navigator.clipboard?.writeText(code);
      const btn = document.querySelector("#copyRoomBtn");
      if (btn) { btn.textContent = "✓ Đã sao chép!"; setTimeout(() => btn.textContent = "📋 Mã phòng", 1300); }
    });

    document.querySelector("#copyLinkBtn")?.addEventListener("click", () => window.RoomsModule.copyInviteLink());

    document.querySelector("#rulesBtn")?.addEventListener("click", () => document.querySelector("#rulesModal")?.classList.remove("hidden"));
    document.querySelector("#closeRulesBtn")?.addEventListener("click", () => document.querySelector("#rulesModal")?.classList.add("hidden"));

    document.querySelector("#cameraLockBtn")?.addEventListener("click", () => window.BoardModule?.toggleCameraLock());
    document.querySelector("#startGameBtn")?.addEventListener("click", () => window.RoomsModule.triggerStartGame());
    document.querySelector("#rollDiceBtn")?.addEventListener("click", () => this.rollDice());
    document.querySelector("#leaveRoomBtn")?.addEventListener("click", () => window.RoomsModule.leaveRoom());
  }
};
