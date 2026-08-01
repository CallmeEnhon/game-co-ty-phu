/* =========================================================
   UI MODULE (ui.js)  v4.1.0
   MonoConCard – Theo đúng Bộ Luật Office Business Tour
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
    rulesBtn?.classList.toggle("hidden", !inGame);
    cameraLockBtn?.classList.toggle("hidden", !inGame);
    leaveBtn?.classList.toggle("hidden", !inGame);

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
      const isCurrent = idx === window.gameState.currentPlayer;
      const beaches   = window.boardCells.filter(c => c.type === "beach" && c.ownerId === player.id).length;
      const propCount = (player.properties || []).length;
      const groups    = [...new Set((player.properties||[]).map(i => window.boardCells[i]?.group).filter(Boolean))];
      const monopolies = groups.filter(g => g !== "beach" && window.checkColorMonopoly(player.id, g));
      const jailBadge = player.inJail ? `<span class="jail-badge">⛓️ Đảo Hoang (${player.jailTurns||0}/${window.GameConfig.JAIL_MAX_TURNS})</span>` : "";

      return `
        <article class="player-hud-card ${isCurrent ? "active-turn" : ""} ${player.bankrupt ? "bankrupt" : ""}"
                 style="--player-accent:${player.color}">
          <div class="player-hud-left">
            <div class="avatar" style="--avatar-color:${player.color}">${player.avatar}</div>
          </div>
          <div class="player-hud-right">
            <div class="player-hud-name">
              <span>${player.name}</span>${player.host?"👑":""}${player.isBot?"🤖":""}
            </div>
            ${jailBadge}
            <div class="player-hud-money">${window.fmtMoney(player.money||0)}</div>
            <div class="player-hud-stats">🏢 ${propCount} đất · 🏆 ${monopolies.length} nhóm · 🏖️ ${beaches}/4</div>
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
      rollBtn.disabled   = !isMyTurn;
      rollBtn.textContent = isMyTurn ? "🎲 Tung Xúc Xắc" : `⏳ Lượt ${current.name}...`;
    }
  },

  /* ─── ROLL DICE (Human entry point) ────────────────────── */
  async rollDice() {
    if (window.gameState.rolling || window.gameState.busy) return;
    const current = window.gameState.players[window.gameState.currentPlayer];
    if (!current || current.id !== window.myPlayerId) {
      this.showToast("Chưa đến lượt của bạn!"); return;
    }
    // Mất lượt do thẻ Burnout
    if ((current.skipTurns || 0) > 0) {
      current.skipTurns--;
      this.showToast(`😴 ${current.name} bị mất lượt này (còn ${current.skipTurns} lượt mất tiếp)`);
      this.addLog(`😴 ${current.name} bị mất lượt (Burnout)`);
      if (window.RoomsModule) window.RoomsModule.broadcastState();
      this.nextTurn(); return;
    }
    // Nếu đang bị giam → hiện modal Đảo Hoang
    if (current.inJail) { this.openJailModal(current); return; }

    if (window.RoomsModule && !window.RoomsModule.isHost) {
      window.gameState.rolling = true;
      document.querySelector("#rollDiceBtn").disabled = true;
      window.RoomsModule.publishCloudMessage({ type: "REQ_ROLL_DICE", playerId: window.myPlayerId });
      return;
    }
    await this.handleHostRollDice(current.id);
  },

  /* ─── HOST ROLL LOGIC ───────────────────────────────────── */
  async handleHostRollDice(playerId) {
    if (window.gameState.rolling || window.gameState.busy) return;
    const current = window.gameState.players.find(p => p.id === playerId)
                 || window.gameState.players[window.gameState.currentPlayer];
    if (!current || current.bankrupt) { this.nextTurn(); return; }

    window.gameState.rolling = true;
    window.gameState.busy    = true;
    const rollBtn = document.querySelector("#rollDiceBtn");
    if (rollBtn) rollBtn.disabled = true;

    const diceA  = document.querySelector("#diceA");
    const diceB  = document.querySelector("#diceB");
    const result = await window.AnimationsModule.animateDiceRoll(diceA, diceB);
    const total    = result.total;
    const isDouble = result.valA === result.valB;
    window.gameState.stats.diceRolls++;

    // Kiểm tra tung đôi 3 lần → vào Đảo Hoang
    if (isDouble) {
      current.doubleRollCount = (current.doubleRollCount || 0) + 1;
      if (current.doubleRollCount >= window.GameConfig.DOUBLE_JAIL_LIMIT) {
        current.doubleRollCount = 0;
        current.position  = 24;
        current.inJail    = true;
        current.jailTurns = 0;
        this.showToast(`🚨 ${current.name} tung Đôi 3 lần – bị đưa đến Đảo Hoang!`);
        this.addLog(`🚨 ${current.name} tung đôi 3 lần, vào Đảo Hoang!`);
        window.gameState.rolling = false; window.gameState.busy = false;
        window.BoardModule?.renderBoard(); this.renderPlayerRail();
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        this.nextTurn(); return;
      }
    } else {
      current.doubleRollCount = 0;
    }

    const logMsg = `${current.name}: ${result.valA}+${result.valB}=${total}${isDouble ? " 🎲ĐÔI!" : ""}`;
    this.addLog(logMsg);

    // Di chuyển từng ô
    const oldPos = current.position;
    await window.AnimationsModule.movePlayerStepByStep(current, total, (newPos, passedStart) => {
      if (passedStart && newPos !== 0) {
        // Qua ô BẮT ĐẦU nhưng không dừng chính xác
        current.money += window.GameConfig.PASS_START_BONUS;
        this.showToast(`🚩 Qua ô Bắt Đầu: +${window.fmtMoney(window.GameConfig.PASS_START_BONUS)}!`);
        this.addLog(`🚩 ${current.name} qua Bắt Đầu, nhận +${window.fmtMoney(window.GameConfig.PASS_START_BONUS)}`);
        this.renderPlayerRail();
      }
    });

    // Nếu dừng chính xác tại ô START (id=0)
    if (current.position === 0) {
      current.money += window.GameConfig.PASS_START_BONUS + window.GameConfig.PASS_START_EXACT;
      this.showToast(`🎯 Dừng chính xác ô Bắt Đầu: +${window.fmtMoney(window.GameConfig.PASS_START_BONUS + window.GameConfig.PASS_START_EXACT)}!`);
      this.addLog(`🎯 ${current.name} dừng đúng ô Bắt Đầu, nhận +${window.fmtMoney(window.GameConfig.PASS_START_BONUS + window.GameConfig.PASS_START_EXACT)}`);
    }

    if (window.RoomsModule) {
      window.RoomsModule.publishCloudMessage({
        type: "GAME_STATE_UPDATE",
        valA: result.valA, valB: result.valB, total, isDouble,
        players: window.gameState.players,
        boardCells: window.boardCells,
        currentPlayer: window.gameState.currentPlayer,
        round: window.gameState.round, logMsg
      });
    }

    window.gameState.rolling = false;
    this.renderPlayerRail();
    this.handleCellAction(current, isDouble);
  },

  applyGameStateUpdate(data) {
    const dA = document.querySelector("#diceA"), dB = document.querySelector("#diceB");
    if (dA) dA.setAttribute("data-value", data.valA);
    if (dB) dB.setAttribute("data-value", data.valB);
    if (data.players)  window.gameState.players  = data.players;
    if (data.boardCells) window.boardCells       = data.boardCells;
    if (data.currentPlayer !== undefined) window.gameState.currentPlayer = data.currentPlayer;
    if (data.round !== undefined)         window.gameState.round         = data.round;
    if (data.logMsg) this.addLog(data.logMsg);
    window.BoardModule?.renderBoard();
    this.renderPlayerRail();
    this.updateTurnControls();
  },

  /* ─── CELL ACTION DISPATCHER ────────────────────────────── */
  handleCellAction(player, rolledDouble = false) {
    const cell    = window.boardCells[player.position];
    const isMyTurn = player.id === window.myPlayerId;
    if (!cell) { window.gameState.busy = false; this.nextTurn(); return; }

    this.addLog(`📍 ${player.name} dừng tại: ${cell.icon} ${cell.title}`);

    // If Host is handling a human Guest's turn on a decision cell, request Guest's decision
    const isHumanGuest = window.RoomsModule?.isHost && player.id !== window.myPlayerId && !player.isBot;
    const isDecisionCell = (cell.type === "property" || cell.type === "beach" || cell.type === "world_tour" || cell.type === "festival");

    if (isHumanGuest && isDecisionCell) {
      // Check if property is already owned by someone else (automatic rent payment, no decision needed)
      const isOpponentLand = (cell.type === "property" || cell.type === "beach") && cell.ownerId && cell.ownerId !== player.id;
      if (!isOpponentLand) {
        window.gameState.busy = false;
        this.showToast(`⏳ ${player.name} đang xem xét...`);
        if (window.RoomsModule) {
          window.RoomsModule.publishCloudMessage({
            type: "CELL_ACTION_REQ",
            playerId: player.id,
            position: player.position,
            cellType: cell.type
          });
        }
        return;
      }
    }

    switch (cell.type) {
      case "property":
      case "beach":
        this._handlePropertyCell(cell, player, isMyTurn); break;

      case "tax":
        this._handleTaxCell(player); break;

      case "world_tour":
        if (isMyTurn) this.openWorldTourModal(player);
        else if (player.isBot && window.RoomsModule?.isHost) window.BotModule.decideWorldTour(player);
        else { window.gameState.busy = false; this.showToast(`✈️ ${player.name} đang chọn điểm bay...`); setTimeout(()=>this.nextTurn(),1200); }
        break;

      case "festival":
        if (isMyTurn) this.openFestivalModal(player);
        else if (player.isBot && window.RoomsModule?.isHost) window.BotModule.decideFestival(player);
        else { window.gameState.busy = false; this.showToast(`🏆 ${player.name} đang chọn đất tổ chức...`); setTimeout(()=>this.nextTurn(),1200); }
        break;

      case "jail":
        this.addLog(`${player.name} thăm Đảo Hoang (chỉ thăm, không bị giam)`);
        window.gameState.busy = false;
        setTimeout(() => this.nextTurn(), 800);
        break;

      case "start":
        // Đã xử lý ở trên rồi
        window.gameState.busy = false;
        setTimeout(() => this.nextTurn(), 600);
        break;

      case "chance":
        this._handleChanceCell(player); break;

      default:
        window.gameState.busy = false;
        setTimeout(() => this.nextTurn(), 800);
    }
  },

  /* ─── PROPERTY CELL ─────────────────────────────────────── */
  _handlePropertyCell(cell, player, isMyTurn) {
    if (!cell.ownerId) {
      // Đất trống → mua
      if (isMyTurn) this.openPropertyModal(cell, player);
      else if (player.isBot && window.RoomsModule?.isHost) window.BotModule.decidePropertyPurchase(player, cell);
      else { window.gameState.busy = false; setTimeout(() => this.nextTurn(), 800); }

    } else if (cell.ownerId === player.id) {
      // Đất của mình → nâng cấp
      const nextLevel = (cell.level || 0) + 1;
      if (nextLevel <= window.GameConfig.MAX_PROPERTY_LEVEL && cell.type === "property") {
        if (isMyTurn) this.openUpgradeModal(cell, player);
        else if (player.isBot && window.RoomsModule?.isHost) window.BotModule.decideUpgradeProperty(player, cell);
        else { window.gameState.busy = false; setTimeout(() => this.nextTurn(), 800); }
      } else {
        window.gameState.busy = false; this.nextTurn();
      }

    } else {
      // Đất của đối thủ → trả tiền thuê
      const owner = window.gameState.players.find(p => p.id === cell.ownerId);
      if (owner && !owner.bankrupt) {
        const rent = window.calculateEffectiveRent(cell);
        player.money -= rent;
        owner.money  += rent;
        this.showToast(`💸 ${player.name} trả ${window.fmtMoney(rent)} cho ${owner.name}`);
        this.addLog(`💸 ${player.name} trả ${window.fmtMoney(rent)} thuê ${cell.icon} ${cell.title} cho ${owner.name}`);
        this.renderPlayerRail();
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        this.checkBankruptcy(player, owner);
      }
      window.gameState.busy = false;
      setTimeout(() => this.nextTurn(), 1400);
    }
  },

  /* ─── TAX CELL – 10% tiền mặt + 20K/đất ────────────────── */
  _handleTaxCell(player) {
    const taxCash  = Math.round((player.money || 0) * window.GameConfig.TAX_CASH_RATE);
    const taxLand  = (player.properties || []).length * window.GameConfig.TAX_PER_LAND;
    const taxLMark = (player.properties || []).filter(i => (window.boardCells[i]?.level||0) >= 4).length * window.GameConfig.TAX_PER_LANDMARK;
    const totalTax = taxCash + taxLand + taxLMark;

    player.money -= totalTax;
    this.showToast(`📜 Nộp thuế: ${window.fmtMoney(taxCash)} (tiền mặt) + ${window.fmtMoney(taxLand)} (đất) = ${window.fmtMoney(totalTax)}`);
    this.addLog(`📜 ${player.name} nộp thuế tổng cộng ${window.fmtMoney(totalTax)}`);
    this.renderPlayerRail();
    if (window.RoomsModule) window.RoomsModule.broadcastState();
    this.checkBankruptcy(player, null);
    window.gameState.busy = false;
    setTimeout(() => this.nextTurn(), 1600);
  },

  /* ─── CHANCE CELL – Sự kiện bất ngờ ────────────────────── */
  _handleChanceCell(player) {
    window.gameState.stats.chanceDrawn++;
    const events = [
      // Có lợi
      { icon:"🎁", text:"Thưởng dự án!",              effect: p => { p.money += 200000; this.showToast("🎁 Nhận +200K thưởng dự án!"); } },
      { icon:"💰", text:"Tăng lương!",                 effect: p => { p.money += 100000; this.showToast("💰 Nhận +100K tăng lương!"); } },
      { icon:"🎂", text:"Sinh nhật! Mỗi đối thủ trả 50K", effect: p => {
          const others = window.gameState.players.filter(x => x.id !== p.id && !x.bankrupt);
          others.forEach(o => { o.money -= 50000; p.money += 50000; });
          this.showToast(`🎂 ${player.name} sinh nhật! Mỗi đối thủ trả 50K!`);
      }},
      { icon:"🛡️", text:"Bảo hiểm tài sản – miễn tiền thuê lần sau!", effect: p => { p.shieldTurns = (p.shieldTurns||0)+1; this.showToast("🛡️ Miễn tiền thuê 1 lần!"); } },
      { icon:"✈️", text:"Vé World Tour miễn phí!",    effect: p => { this.openWorldTourModal(p); } },
      // Bất lợi
      { icon:"📉", text:"Trễ deadline! Mất 100K",      effect: p => { p.money -= 100000; this.showToast("📉 Mất 100K vì trễ deadline!"); } },
      { icon:"🛠️", text:"Thiết bị hư! Trả 150K",       effect: p => { p.money -= 150000; this.showToast("🛠️ Mất 150K sửa thiết bị!"); } },
      { icon:"😴", text:"Burnout! Mất lượt tiếp theo!", effect: p => { p.skipTurns = (p.skipTurns||0)+1; this.showToast("😴 Burnout! Mất 1 lượt!"); } },
      { icon:"🌋", text:"Đi công tác – đến Đảo Hoang!", effect: p => {
          p.position = 24; p.inJail = true; p.jailTurns = 0;
          this.showToast(`🌋 ${p.name} bị điều đến Đảo Hoang!`);
          window.BoardModule?.renderBoard();
      }},
      { icon:"💸", text:"Dự án bị hủy! Mất 15% tiền mặt", effect: p => {
          const loss = Math.round((p.money||0)*0.15);
          p.money -= loss;
          this.showToast(`💸 Mất ${window.fmtMoney(loss)} vì dự án bị hủy!`);
      }}
    ];

    const ev = events[Math.floor(Math.random() * events.length)];
    this.addLog(`🎡 ${player.name} rút Cơ Hội: ${ev.icon} ${ev.text}`);
    ev.effect(player);
    this.renderPlayerRail();
    if (window.RoomsModule) window.RoomsModule.broadcastState();
    this.checkBankruptcy(player, null);

    // Nếu cơ hội là World Tour thì không cần nextTurn ở đây (modal sẽ gọi)
    if (!ev.text.includes("World Tour")) {
      window.gameState.busy = false;
      setTimeout(() => this.nextTurn(), 1400);
    }
  },

  /* ─── JAIL MODAL ─────────────────────────────────────────── */
  openJailModal(player) {
    const modal = document.querySelector("#jailModal");
    if (!modal) { this.nextTurn(); return; }
    modal.classList.remove("hidden");
    window.gameState.busy = true;

    // Cập nhật nội dung modal
    const titleEl  = modal.querySelector("#jailModalTitle") || modal.querySelector("h2");
    const descEl   = modal.querySelector("#jailModalDesc")  || modal.querySelector("p");
    if (titleEl) titleEl.textContent = `⛓️ Bạn đang ở Đảo Hoang (Lượt ${(player.jailTurns||0)+1}/${window.GameConfig.JAIL_MAX_TURNS})`;
    if (descEl)  descEl.textContent  = `Tung Đôi để thoát hoặc trả phí ${window.fmtMoney(window.GameConfig.JAIL_FINE)}`;

    const payBtn  = modal.querySelector("#payJailBtn");
    const rollBtn = modal.querySelector("#rollJailBtn");
    if (payBtn)  payBtn.textContent  = `Trả ${window.fmtMoney(window.GameConfig.JAIL_FINE)} – Ra ngay`;
    if (rollBtn) rollBtn.textContent = `🎲 Tung Xúc Xắc – Thử Vận May`;

    const handlePay = () => {
      cleanup();
      modal.classList.add("hidden");
      if (window.RoomsModule && !window.RoomsModule.isHost) {
        window.RoomsModule.publishCloudMessage({ type: "REQ_JAIL_PAY", playerId: window.myPlayerId });
        return;
      }
      if ((player.money||0) >= window.GameConfig.JAIL_FINE) {
        player.money    -= window.GameConfig.JAIL_FINE;
        player.inJail    = false;
        player.jailTurns = 0;
        this.showToast(`✅ ${player.name} trả ${window.fmtMoney(window.GameConfig.JAIL_FINE)} – thoát Đảo Hoang!`);
        this.addLog(`✅ ${player.name} nộp phạt ${window.fmtMoney(window.GameConfig.JAIL_FINE)}, được thả`);
        window.gameState.busy = false;
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        this.renderPlayerRail();
        this.handleHostRollDice(player.id);
      } else {
        this.showToast(`❌ Không đủ ${window.fmtMoney(window.GameConfig.JAIL_FINE)}!`);
      }
    };

    const handleRoll = async () => {
      cleanup();
      modal.classList.add("hidden");
      if (window.RoomsModule && !window.RoomsModule.isHost) {
        window.RoomsModule.publishCloudMessage({ type: "REQ_JAIL_ROLL", playerId: window.myPlayerId });
        return;
      }
      window.gameState.busy = false;

      const diceA = document.querySelector("#diceA"), diceB = document.querySelector("#diceB");
      const result   = await window.AnimationsModule.animateDiceRoll(diceA, diceB);
      const isDouble = result.valA === result.valB;
      this.addLog(`${player.name} tung thử vận: ${result.valA}+${result.valB}=${result.total} ${isDouble?"✅ĐÔI":"❌ Trượt"}`);

      if (isDouble) {
        player.inJail    = false;
        player.jailTurns = 0;
        this.showToast(`🎉 Tung Đôi! ${player.name} thoát Đảo Hoang – di chuyển ${result.total} ô!`);
        window.gameState.rolling = true; window.gameState.busy = true;
        await window.AnimationsModule.movePlayerStepByStep(player, result.total, (newPos, passedStart) => {
          if (passedStart) { player.money += window.GameConfig.PASS_START_BONUS; this.renderPlayerRail(); }
        });
        window.gameState.rolling = false; window.gameState.busy = false;
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        window.BoardModule?.renderBoard();
        this.renderPlayerRail();
        this.handleCellAction(player, true);
      } else {
        player.jailTurns = (player.jailTurns || 0) + 1;
        if (player.jailTurns >= window.GameConfig.JAIL_MAX_TURNS) {
          const canPay = (player.money||0) >= window.GameConfig.JAIL_FINE;
          player.money    -= canPay ? window.GameConfig.JAIL_FINE : (player.money||0);
          player.inJail    = false;
          player.jailTurns = 0;
          this.showToast(`⚠️ ${player.name} bị trừ ${window.fmtMoney(window.GameConfig.JAIL_FINE)} sau ${window.GameConfig.JAIL_MAX_TURNS} lượt!`);
          this.addLog(`⚠️ ${player.name} bị trừ phí cưỡng chế sau ${window.GameConfig.JAIL_MAX_TURNS} lượt`);
          this.checkBankruptcy(player, null);
        } else {
          this.showToast(`😔 ${player.name} chưa tung Đôi – còn ${window.GameConfig.JAIL_MAX_TURNS - player.jailTurns} lượt`);
          this.addLog(`😔 ${player.name} thất bại (${player.jailTurns}/${window.GameConfig.JAIL_MAX_TURNS} lượt ở Đảo Hoang)`);
        }
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        this.renderPlayerRail();
        this.nextTurn();
      }
    };

    const cleanup = () => {
      payBtn?.removeEventListener("click", handlePay);
      rollBtn?.removeEventListener("click", handleRoll);
    };

    payBtn?.addEventListener("click",  handlePay,  {once:true});
    rollBtn?.addEventListener("click", handleRoll, {once:true});
  },

  /* ─── WORLD TOUR – CHUYẾN CÔNG TÁC ─────────────────────── */
  openWorldTourModal(player) {
    const existing = document.querySelector("#worldTourInlineModal");
    if (existing) existing.remove();

    const cities = window.boardCells
      .filter(c => c.type === "property" || c.type === "beach")
      .map(c => {
        const owner = c.ownerId ? window.gameState.players.find(p=>p.id===c.ownerId) : null;
        const rentInfo = window.calculateEffectiveRent(c);
        return `<option value="${c.id}">${c.icon} ${c.title} | Thuê: ${window.fmtMoney(rentInfo)} ${owner ? "| Chủ: "+owner.name : "| Trống"}</option>`;
      }).join("");

    const div = document.createElement("div");
    div.id = "worldTourInlineModal";
    div.className = "modal-backdrop";
    div.innerHTML = `
      <article class="property-modal" style="max-width:420px;">
        <header class="property-modal-header">✈️ CHUYẾN CÔNG TÁC ĐẶC BIỆT</header>
        <div class="property-modal-body" style="display:block;padding:14px 0;color:#cfd8dc;">
          <p style="font-size:13px;margin-bottom:12px;">Chọn địa điểm để di chuyển đến – <strong style="color:#27ae60">Miễn phí!</strong></p>
          <p style="font-size:11px;color:#7f8c8d;margin-bottom:10px;">⚠️ Bạn vẫn phải thực hiện hành động tại ô đến.</p>
          <select id="worldTourSelect" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(244,196,83,0.4);background:rgba(4,15,27,0.95);color:white;font-size:12px;outline:none;">${cities}</select>
        </div>
        <footer class="property-modal-actions" style="flex-direction:column;gap:8px;">
          <button id="worldTourConfirmBtn" class="btn btn-primary" style="width:100%;">🛫 Di Chuyển Ngay</button>
          <button id="worldTourCancelBtn" class="btn btn-light" style="width:100%;">Bỏ qua lượt này</button>
        </footer>
      </article>`;
    document.body.appendChild(div);

    document.querySelector("#worldTourConfirmBtn").onclick = () => {
      const destId   = parseInt(document.querySelector("#worldTourSelect").value, 10);
      div.remove();
      if (window.RoomsModule && !window.RoomsModule.isHost) {
        window.RoomsModule.publishCloudMessage({ type: "REQ_WORLD_TOUR", playerId: window.myPlayerId, destId });
        return;
      }
      const destCell = window.boardCells[destId];
      if (!destCell) return;

      const oldPos = player.position;
      if (destId < oldPos || destId === 0) {
        player.money += window.GameConfig.PASS_START_BONUS;
        this.showToast(`🚩 Qua Bắt Đầu trong chuyến bay: +${window.fmtMoney(window.GameConfig.PASS_START_BONUS)}`);
      }
      player.position = destId;

      this.showToast(`✈️ ${player.name} bay đến ${destCell.icon} ${destCell.title}!`);
      this.addLog(`✈️ ${player.name} chọn Chuyến Công Tác → ${destCell.title} (ô ${destId})`);

      window.BoardModule?.updatePlayerTokens?.();
      this.renderPlayerRail();
      if (window.RoomsModule) window.RoomsModule.broadcastState();
      window.gameState.busy = false;
      this.handleCellAction(player);
    };

    document.querySelector("#worldTourCancelBtn").onclick = () => {
      div.remove();
      if (window.RoomsModule && !window.RoomsModule.isHost) {
        window.RoomsModule.publishCloudMessage({ type: "REQ_SKIP_PROPERTY", playerId: window.myPlayerId });
        return;
      }
      window.gameState.busy = false;
      this.nextTurn();
    };
  },

  /* ─── FESTIVAL – TỔ CHỨC SỰ KIỆN ───────────────────────── */
  openFestivalModal(player) {
    const owned = (player.properties || []).map(i => window.boardCells[i]).filter(c => c && c.type === "property");

    if (owned.length === 0) {
      const emptyProps = window.boardCells.filter(c => c.type === "property" && !c.ownerId);
      if (emptyProps.length === 0) {
        this.showToast(`⚠️ Không có đất nào để tổ chức sự kiện!`);
        if (window.RoomsModule && !window.RoomsModule.isHost) {
          window.RoomsModule.publishCloudMessage({ type: "REQ_SKIP_PROPERTY", playerId: window.myPlayerId });
        } else {
          window.gameState.busy = false; this.nextTurn();
        }
        return;
      }
    }

    const validCells = window.boardCells.filter(c =>
      c.type === "property" && (c.ownerId === player.id || !c.ownerId)
    );

    if (validCells.length === 0) {
      this.showToast(`⚠️ Không có đất hợp lệ để tổ chức!`);
      if (window.RoomsModule && !window.RoomsModule.isHost) {
        window.RoomsModule.publishCloudMessage({ type: "REQ_SKIP_PROPERTY", playerId: window.myPlayerId });
      } else {
        window.gameState.busy = false; this.nextTurn();
      }
      return;
    }

    this.showToast("🏆 Chọn khu đất để tổ chức Sự Kiện Công Ty!");
    this.addLog(`🏆 ${player.name} đang chọn khu đất tổ chức Lễ Hội (x2 thuê, ${window.GameConfig.FESTIVAL_DURATION_ROUNDS} vòng)`);

    const boardCellEls = document.querySelectorAll(".board-cell");
    boardCellEls.forEach(el => {
      const cid  = parseInt(el.dataset.cellId, 10);
      const cell = window.boardCells[cid];
      if (cell && (cell.ownerId === player.id || !cell.ownerId) && cell.type === "property") {
        el.classList.add("festival-selectable");

        const handler = () => {
          document.querySelectorAll(".festival-selectable").forEach(x => {
            x.classList.remove("festival-selectable");
            x._festHandler && x.removeEventListener("click", x._festHandler);
          });

          if (window.RoomsModule && !window.RoomsModule.isHost) {
            window.RoomsModule.publishCloudMessage({ type: "REQ_FESTIVAL", playerId: window.myPlayerId, cellId: cell.id });
            return;
          }

          cell.festivalUntil = window.gameState.round + window.GameConfig.FESTIVAL_DURATION_ROUNDS;
          el.classList.add("festival-active-cell");

          this.showToast(`🎊 ${cell.title} tổ chức Sự Kiện! Thuê x${window.GameConfig.FESTIVAL_RENT_MULTIPLIER} (${window.GameConfig.FESTIVAL_DURATION_ROUNDS} vòng)`);
          this.addLog(`🎊 ${player.name} chọn ${cell.title} → Thuê x${window.GameConfig.FESTIVAL_RENT_MULTIPLIER} trong ${window.GameConfig.FESTIVAL_DURATION_ROUNDS} vòng`);

          if (window.RoomsModule) window.RoomsModule.broadcastState();
          window.BoardModule?.renderBoard();
          window.gameState.busy = false;
          this.nextTurn();
        };

        el._festHandler = handler;
        el.addEventListener("click", handler, {once: true});
      }
    });
  },

  /* ─── PROPERTY MODAL ────────────────────────────────────── */
  openPropertyModal(cell, player) {
    const modal = document.querySelector("#propertyModal");
    if (!modal) return;

    const levelLabels = ["Trống","Văn phòng nhỏ","Mở rộng","Tòa nhà","Landmark"];
    const nextRents = [1,2,3.5,5,7].map(f => Math.round((cell.rent||0)*f));

    document.querySelector("#propertyHeaderName").textContent = cell.title.toUpperCase();
    document.querySelector("#propertyName").textContent       = `${cell.icon} ${cell.title}`;
    document.querySelector("#propertyPrice").textContent      = window.fmtMoney(cell.cost);
    document.querySelector("#propertyRent").textContent       = window.fmtMoney(cell.rent);
    document.querySelector("#propertyOwnerText").textContent  = "Chưa có chủ sở hữu";

    const detailEl = modal.querySelector("#propertyLevels") || modal.querySelector(".property-levels");
    if (detailEl) {
      detailEl.innerHTML = levelLabels.slice(1).map((label,i)=>`
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#95a5a6;padding:3px 0;">
          <span>Cấp ${i+1} – ${label}</span>
          <span style="color:#f4b21f">Thuê: ${window.fmtMoney(nextRents[i+1])}</span>
        </div>`).join("");
    }

    const canBuy = (player.money||0) >= cell.cost;
    const buyBtn = document.querySelector("#buyPropertyBtn");
    if (buyBtn) {
      buyBtn.textContent = canBuy ? `Mua (${window.fmtMoney(cell.cost)})` : `❌ Không đủ tiền`;
      buyBtn.disabled    = !canBuy;
      buyBtn.onclick     = canBuy ? () => {
        modal.classList.add("hidden");
        if (window.RoomsModule && !window.RoomsModule.isHost) {
          window.RoomsModule.publishCloudMessage({ type: "REQ_BUY_PROPERTY", playerId: window.myPlayerId, cellId: cell.id });
        } else {
          this.buyProperty(player, cell);
        }
      } : null;
    }
    document.querySelector("#skipPropertyBtn").onclick = () => {
      modal.classList.add("hidden");
      if (window.RoomsModule && !window.RoomsModule.isHost) {
        window.RoomsModule.publishCloudMessage({ type: "REQ_SKIP_PROPERTY", playerId: window.myPlayerId });
      } else {
        window.gameState.busy = false; this.nextTurn();
      }
    };
    modal.classList.remove("hidden");
  },

  buyProperty(player, cell) {
    player.money -= cell.cost;
    cell.ownerId  = player.id;
    cell.level    = 0;
    player.properties = [...(player.properties||[]), cell.id];
    window.gameState.stats.propertiesBought++;

    this.showToast(`🏢 ${player.name} mua ${cell.icon} ${cell.title} (${window.fmtMoney(cell.cost)})!`);
    this.addLog(`🏢 ${player.name} mua ${cell.title}`);
    if (window.RoomsModule) window.RoomsModule.broadcastState();
    window.BoardModule?.renderBoard();
    this.renderPlayerRail();

    if (window.checkBeachMonopolyWin(player)) {
      this.showToast(`🏆 ${player.name} sở hữu đủ 4 Bãi Biển – THẮNG!`);
      setTimeout(() => this.showScreen("result"), 1000);
      return;
    }
    this._checkEdgeMonopolyWin(player);

    window.gameState.busy = false;
    this.nextTurn();
  },

  _checkEdgeMonopolyWin(player) {
    if (!window.gameSettings.monopolyWinEnabled) return;
    const edges = [[1,3,5,6,7],[9,10,11,13,14,15],[17,18,19,21,22,23],[25,26,27,28,29,30,31]];
    for (const edge of edges) {
      const landEdge = edge.filter(i => window.boardCells[i]?.type === "property" || window.boardCells[i]?.type === "beach");
      if (landEdge.length > 0 && landEdge.every(i => window.boardCells[i]?.ownerId === player.id)) {
        this.showToast(`🏆 ${player.name} độc quyền cả cạnh bàn cờ – THẮNG TUYỆT ĐỐI!`);
        this.addLog(`🏆 ${player.name} thắng bằng độc quyền cả cạnh!`);
        setTimeout(() => this.showScreen("result"), 1200);
      }
    }
  },

  /* ─── UPGRADE MODAL ─────────────────────────────────────── */
  openUpgradeModal(cell, player) {
    const modal = document.querySelector("#propertyModal");
    if (!modal) return;

    const nextLevel   = (cell.level || 0) + 1;
    const upgradeCost = window.calculateUpgradeCost(cell);
    const levelLabels = ["Trống","Văn phòng nhỏ","Mở rộng","Tòa nhà","Landmark"];
    const newRentFact = [1,2,3.5,5,7][nextLevel] || 7;
    const newRent     = Math.round((cell.rent||0) * newRentFact);

    document.querySelector("#propertyHeaderName").textContent = `NÂNG CẤP: ${cell.title.toUpperCase()}`;
    document.querySelector("#propertyName").textContent       = `${cell.icon} ${cell.title} → ${levelLabels[nextLevel] || "MAX"}`;
    document.querySelector("#propertyPrice").textContent      = window.fmtMoney(upgradeCost);
    document.querySelector("#propertyRent").textContent       = `${window.fmtMoney(window.calculateEffectiveRent(cell))} → ${window.fmtMoney(newRent)}`;
    document.querySelector("#propertyOwnerText").textContent  = `Chủ: ${player.name} | Cấp hiện tại: ${levelLabels[cell.level||0]}`;

    const canUpgrade = (player.money||0) >= upgradeCost;
    const buyBtn = document.querySelector("#buyPropertyBtn");
    if (buyBtn) {
      buyBtn.textContent = canUpgrade ? `⬆️ Nâng cấp (${window.fmtMoney(upgradeCost)})` : `❌ Không đủ tiền (${window.fmtMoney(upgradeCost)})`;
      buyBtn.disabled    = !canUpgrade;
      buyBtn.onclick = canUpgrade ? () => {
        modal.classList.add("hidden");
        if (window.RoomsModule && !window.RoomsModule.isHost) {
          window.RoomsModule.publishCloudMessage({ type: "REQ_UPGRADE_PROPERTY", playerId: window.myPlayerId, cellId: cell.id });
        } else {
          player.money -= upgradeCost;
          cell.level    = nextLevel;
          this.showToast(`⬆️ ${player.name} nâng cấp ${cell.title} → ${levelLabels[nextLevel]}`);
          this.addLog(`⬆️ ${player.name} nâng cấp ${cell.title} lên ${levelLabels[nextLevel]}`);
          if (window.RoomsModule) window.RoomsModule.broadcastState();
          window.BoardModule?.renderBoard();
          this.renderPlayerRail();
          window.gameState.busy = false;
          this.nextTurn();
        }
      } : null;
    }
    document.querySelector("#skipPropertyBtn").onclick = () => {
      modal.classList.add("hidden");
      if (window.RoomsModule && !window.RoomsModule.isHost) {
        window.RoomsModule.publishCloudMessage({ type: "REQ_SKIP_PROPERTY", playerId: window.myPlayerId });
      } else {
        window.gameState.busy = false; this.nextTurn();
      }
    };
    modal.classList.remove("hidden");
  },

  /* ─── BANKRUPTCY ─────────────────────────────────────────── */
  checkBankruptcy(debtor, creditor) {
    if (!debtor || debtor.money >= 0 || debtor.bankrupt) return;
    debtor.bankrupt = true;
    window.gameState.stats.bankruptcies++;
    this.showToast(`💥 ${debtor.name} PHÁ SẢN!`);
    this.addLog(`💥 ${debtor.name} phá sản!`);

    // Tài sản chuyển cho chủ nợ hoặc về ngân hàng
    (debtor.properties||[]).forEach(idx => {
      const c = window.boardCells[idx];
      if (!c) return;
      if (creditor && !creditor.bankrupt) {
        c.ownerId = creditor.id;
        creditor.properties = [...(creditor.properties||[]), idx];
      } else {
        c.ownerId = null; c.level = 0; c.festivalUntil = null;
      }
    });
    debtor.properties = [];
    debtor.money = 0;

    if (window.RoomsModule) window.RoomsModule.broadcastState();
    window.BoardModule?.renderBoard();
    this.renderPlayerRail();
  },

  /* ─── NEXT TURN ──────────────────────────────────────────── */
  nextTurn() {
    window.gameState.busy    = false;
    window.gameState.rolling = false;

    const active = window.gameState.players.filter(p => !p.bankrupt);
    if (active.length <= 1) {
      const winner = active[0];
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
    window.BoardModule?.updateCameraPerspective?.();

    const current = window.gameState.players[nextIdx];
    if (current.isBot && window.RoomsModule?.isHost) {
      setTimeout(() => window.BotModule.handleBotTurn(current), 900);
    }
  },

  /* ─── RESULTS ────────────────────────────────────────────── */
  renderResults() {
    const listContainer = document.querySelector("#rankingList");
    if (!listContainer) return;
    const sorted = [...window.gameState.players]
      .map(p => ({
        ...p,
        totalAsset: (p.money||0) + (p.properties||[]).reduce((s,i) => {
          const c = window.boardCells[i];
          if (!c) return s;
          const buildValue = (c.upgradeCosts||[]).slice(0, c.level||0).reduce((a,b)=>a+b,0) * 0.5;
          return s + c.cost + buildValue;
        }, 0)
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
          <span style="font-size:11px;color:#7f8c8d">Tổng tài sản</span><br>
          <strong style="color:#f4b21f">${window.fmtMoney(player.totalAsset)}</strong>
        </div>
      </div>`).join("");
  },

  /* ─── UTILITY ────────────────────────────────────────────── */
  addLog(msg) {
    const log = document.querySelector("#activityLog");
    if (!log) return;
    const time = new Date().toLocaleTimeString("vi-VN", {hour:"2-digit",minute:"2-digit",second:"2-digit"});
    const item = document.createElement("div");
    item.className = "log-item";
    item.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    log.prepend(item);
    // Giới hạn 50 dòng
    while (log.children.length > 50) log.removeChild(log.lastChild);
  },

  showToast(message) {
    const toast = document.querySelector("#gameToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.add("hidden"), 2600);
  },

  /* ─── EVENTS ─────────────────────────────────────────────── */
  bindEvents() {
    document.querySelector("#createRoomBtn")?.addEventListener("click", () => {
      const code = window.RoomsModule?.generateRoomCode?.() || window.generateRandomCode();
      const lbl  = document.querySelector("#roomCodeLabel");
      if (lbl) lbl.textContent = code;
      this.showToast(`Đã tạo phòng: ${code}`);
    });

    document.querySelector("#joinRoomBtn")?.addEventListener("click", () => {
      const input = document.querySelector("#joinCodeInput");
      const code  = (input?.value||"").trim().toUpperCase();
      if (!code) { alert("Vui lòng nhập mã phòng!"); return; }
      window.RoomsModule?.joinRoom?.(code);
    });

    document.querySelector("#copyRoomBtn")?.addEventListener("click", async () => {
      const code = document.querySelector("#roomCodeLabel")?.textContent || "";
      await navigator.clipboard?.writeText(code).catch(()=>{});
      const btn = document.querySelector("#copyRoomBtn");
      if (btn) { btn.textContent = "✓ Đã sao chép!"; setTimeout(()=>btn.textContent="📋 Sao chép mã",1400); }
    });

    document.querySelector("#copyLinkBtn")?.addEventListener("click", () => window.RoomsModule?.copyInviteLink?.());
    document.querySelector("#rulesBtn")?.addEventListener("click", () => document.querySelector("#rulesModal")?.classList.remove("hidden"));
    document.querySelector("#closeRulesBtn")?.addEventListener("click", () => document.querySelector("#rulesModal")?.classList.add("hidden"));
    document.querySelector("#cameraLockBtn")?.addEventListener("click", () => window.BoardModule?.toggleCameraLock?.());
    document.querySelector("#startGameBtn")?.addEventListener("click", () => window.RoomsModule?.triggerStartGame?.());
    document.querySelector("#rollDiceBtn")?.addEventListener("click", () => this.rollDice());
    document.querySelector("#leaveRoomBtn")?.addEventListener("click", () => window.RoomsModule?.leaveRoom?.());
  }
};
