/* =========================================================
   UI MODULE (ui.js)
   MonoConCard - Realtime In-Game Action Sync & View Engine
   ========================================================= */

window.UIModule = {
  toastTimer: null,

  showScreen(screenName) {
    window.gameState.screen = screenName;

    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });

    const target = document.querySelector(`#${screenName}Screen`);
    if (target) target.classList.add("active");

    const leaveBtn = document.querySelector("#leaveRoomBtn");
    if (leaveBtn) {
      if (screenName === "lobby") leaveBtn.classList.add("hidden");
      else leaveBtn.classList.remove("hidden");
    }

    if (screenName === "result") {
      this.renderResults();
      if (window.AnimationsModule) window.AnimationsModule.triggerConfetti();
    }
  },

  renderPlayerRail() {
    const rail = document.querySelector("#playerRail");
    if (!rail) return;

    rail.innerHTML = window.gameState.players.map((player, idx) => {
      const isCurrent = idx === window.gameState.currentPlayer;
      const ownedBeaches = (window.boardCells || []).filter(c => c.type === "beach" && c.ownerId === player.id).length;

      return `
        <article class="player-hud-card ${isCurrent ? "active-turn" : ""} ${player.bankrupt ? "bankrupt" : ""}" style="--player-accent:${player.color}">
          <div class="player-hud-left">
            <div class="avatar" style="--avatar-color:${player.color}">${player.avatar}</div>
          </div>
          <div class="player-hud-right">
            <div class="player-hud-name">
              <span>${player.name}</span>
              ${player.host ? '👑' : ''}
              ${player.isBot ? '🤖' : ''}
            </div>
            <div class="player-hud-money">$${(player.money || 0).toLocaleString()}</div>
            <div class="player-hud-stats">
              Tài sản: $${(player.asset || 0).toLocaleString()} | 🏖️ ${ownedBeaches}/4
            </div>
          </div>
        </article>
      `;
    }).join("");

    const nameEl = document.querySelector("#currentPlayerName");
    const current = window.gameState.players[window.gameState.currentPlayer];
    if (nameEl && current) {
      nameEl.textContent = `${current.name} ${current.isBot ? "(Bot)" : ""}`;
      nameEl.style.color = current.color;
    }

    this.updateTurnControls();
  },

  updateTurnControls() {
    const current = window.gameState.players[window.gameState.currentPlayer];
    const rollBtn = document.querySelector("#rollDiceBtn");
    if (!rollBtn || !current) return;

    const isMyTurn = current.id === window.myPlayerId;

    if (window.gameState.screen === "game" && !window.gameState.busy && !window.gameState.rolling) {
      if (isMyTurn) {
        rollBtn.disabled = false;
        rollBtn.textContent = "🎲 Đổ Xúc Xắc";
      } else {
        rollBtn.disabled = true;
        rollBtn.textContent = `⏳ Lượt của ${current.name}...`;
      }
    }
  },

  renderResults() {
    const listContainer = document.querySelector("#rankingList");
    if (!listContainer) return;

    const sorted = [...window.gameState.players]
      .map(p => ({
        ...p,
        totalAsset: p.money + (p.properties || []).reduce((acc, idx) => {
          const cell = window.boardCells[idx];
          return acc + (cell ? cell.cost : 0);
        }, 0)
      }))
      .sort((a, b) => b.totalAsset - a.totalAsset);

    const medals = ["🥇", "🥈", "🥉", "4"];
    listContainer.innerHTML = sorted.map((player, index) => `
      <div class="rank-row">
        <div class="rank-medal">${medals[index]}</div>
        <div class="rank-player">
          <div class="avatar" style="--avatar-color:${player.color}">${player.avatar}</div>
          <span>${player.name} ${player.isBot ? "🤖" : ""} ${index === 0 ? "👑" : ""}</span>
        </div>
        <div class="rank-value">
          Tổng tài sản
          <strong>$${player.totalAsset.toLocaleString()}</strong>
        </div>
      </div>
    `).join("");
  },

  async rollDice() {
    if (window.gameState.rolling || window.gameState.busy) return;

    const current = window.gameState.players[window.gameState.currentPlayer];
    if (!current || current.id !== window.myPlayerId) {
      this.showToast(`Chưa tới lượt của bạn! Đang chờ ${current?.name || "người chơi khác"}...`);
      return;
    }

    if (window.RoomsModule && !window.RoomsModule.isHost) {
      window.gameState.rolling = true;
      const rollBtn = document.querySelector("#rollDiceBtn");
      if (rollBtn) rollBtn.disabled = true;

      window.RoomsModule.publishCloudMessage({
        type: "REQ_ROLL_DICE",
        playerId: window.myPlayerId
      });
      return;
    }

    await this.handleHostRollDice(current.id);
  },

  async handleHostRollDice(playerId) {
    if (window.gameState.rolling || window.gameState.busy) return;

    const current = window.gameState.players.find(p => p.id === playerId) || window.gameState.players[window.gameState.currentPlayer];
    if (!current || current.bankrupt) {
      this.nextTurn();
      return;
    }

    window.gameState.rolling = true;
    window.gameState.busy = true;

    const rollBtn = document.querySelector("#rollDiceBtn");
    if (rollBtn) rollBtn.disabled = true;

    const diceA = document.querySelector("#diceA");
    const diceB = document.querySelector("#diceB");

    const result = await window.AnimationsModule.animateDiceRoll(diceA, diceB);
    window.gameState.stats.diceRolls++;

    const total = result.total;
    const isDouble = result.valA === result.valB;

    const logMsg = `${current.name} đổ xúc xắc: ${result.valA} + ${result.valB} = ${total} ${isDouble ? "(ĐỔ ĐÔI!)" : ""}`;
    this.addLog(logMsg);

    if (isDouble) {
      current.doubleRollCount = (current.doubleRollCount || 0) + 1;
      if (current.doubleRollCount >= 3) {
        current.doubleRollCount = 0;
        current.position = 24;
        current.inJail = true;
        this.showToast(`🚨 ${current.name} ĐỔ ĐÔI 3 LẦN LIÊN TIẾP! BỊ ĐƯA VÀO ĐẢO BỊ LẶNG QUÊN!`);
      }
    } else {
      current.doubleRollCount = 0;
    }

    await window.AnimationsModule.movePlayerStepByStep(current, total, (newPos, passedStart) => {
      if (passedStart) {
        current.money += window.GameConfig.PASS_START_BONUS;
        this.showToast(`🚩 ${current.name} qua ô Bắt Đầu: +$${window.GameConfig.PASS_START_BONUS}`);
        this.addLog(`🚩 ${current.name} đi qua ô Bắt Đầu và nhận +$${window.GameConfig.PASS_START_BONUS}`);
        this.renderPlayerRail();
      }
    });

    if (window.RoomsModule) {
      window.RoomsModule.publishCloudMessage({
        type: "GAME_STATE_UPDATE",
        valA: result.valA,
        valB: result.valB,
        total,
        isDouble,
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

  async applyGameStateUpdate(data) {
    const diceA = document.querySelector("#diceA");
    const diceB = document.querySelector("#diceB");
    if (diceA) diceA.setAttribute("data-value", data.valA);
    if (diceB) diceB.setAttribute("data-value", data.valB);

    const totalEl = document.querySelector("#diceTotal");
    const moveTextEl = document.querySelector("#moveText");

    if (totalEl) totalEl.textContent = `Tổng: ${data.total} ${data.isDouble ? "🎲 ĐÔI!" : ""}`;
    if (moveTextEl) moveTextEl.textContent = `Di chuyển ${data.total} ô`;

    if (data.players) window.gameState.players = data.players;
    if (data.boardCells) window.boardCells = data.boardCells;
    if (data.currentPlayer !== undefined) window.gameState.currentPlayer = data.currentPlayer;
    if (data.round !== undefined) window.gameState.round = data.round;

    if (data.logMsg) this.addLog(data.logMsg);

    if (window.BoardModule) window.BoardModule.renderBoard();
    this.renderPlayerRail();
    this.updateTurnControls();
  },

  handleCellAction(player) {
    const cellIndex = player.position;
    const cell = window.boardCells[cellIndex];

    if (!cell) {
      this.nextTurn();
      return;
    }

    this.addLog(`${player.name} dừng chân tại ô: ${cell.title}`);

    if (cell.type === "property" || cell.type === "beach") {
      if (cell.ownerId === null) {
        if (player.id === window.myPlayerId || player.isBot) {
          if (player.isBot) {
            window.BotModule.decidePropertyPurchase(player, cell);
          } else {
            this.openPropertyModal(cell, player);
          }
        } else {
          this.showToast(`⏳ Chờ ${player.name} chọn mua ${cell.title}...`);
        }
      } else if (cell.ownerId === player.id) {
        if (cell.type === "property" && (cell.level || 0) < window.GameConfig.MAX_PROPERTY_LEVEL) {
          if (player.id === window.myPlayerId || player.isBot) {
            if (player.isBot) {
              window.BotModule.decideUpgradeProperty(player, cell);
            } else {
              this.openUpgradeModal(cell, player);
            }
          }
        } else {
          this.nextTurn();
        }
      } else {
        const owner = window.gameState.players.find(p => p.id === cell.ownerId);
        const rentCost = window.calculateEffectiveRent(cell);

        if (owner && !owner.bankrupt) {
          player.money -= rentCost;
          owner.money += rentCost;
          this.showToast(`💸 ${player.name} trả $${rentCost} tiền thuê cho ${owner.name}`);
          this.addLog(`💸 ${player.name} trả $${rentCost} tiền thuê cho ${owner.name} tại ${cell.title}`);
          this.renderPlayerRail();
          this.checkBankruptcy(player);
        }
        setTimeout(() => this.nextTurn(), 1400);
      }
    } else if (cell.type === "tax") {
      const playerAssets = player.money + (player.properties || []).reduce((sum, idx) => {
        const c = window.boardCells[idx];
        return sum + (c ? c.cost : 0);
      }, 0);
      const taxAmount = Math.round(playerAssets * window.GameConfig.TAX_PERCENTAGE);

      player.money -= taxAmount;
      this.showToast(`📜 ${player.name} đóng Thuế Tài Sản 10%: -$${taxAmount}`);
      this.addLog(`📜 ${player.name} đóng -$${taxAmount} tiền Thuế Tài Sản`);
      this.renderPlayerRail();
      this.checkBankruptcy(player);
      setTimeout(() => this.nextTurn(), 1400);

    } else if (cell.type === "world_tour") {
      this.showToast(`✈️ ${player.name} đến CHUYẾN ĐI VÒNG QUANH THẾ GIỚI!`);
      if (player.id === window.myPlayerId || player.isBot) {
        if (player.isBot) {
          window.BotModule.decideWorldTour(player);
        } else {
          this.openWorldTourModal(player);
        }
      } else {
        setTimeout(() => this.nextTurn(), 1500);
      }

    } else if (cell.type === "festival") {
      this.showToast(`🏆 ${player.name} mở GIẢI ĐẤU THẾ GIỚI!`);
      if (player.id === window.myPlayerId || player.isBot) {
        if (player.isBot) {
          window.BotModule.decideFestival(player);
        } else {
          this.openFestivalModal(player);
        }
      } else {
        setTimeout(() => this.nextTurn(), 1500);
      }

    } else if (cell.type === "chance") {
      window.gameState.stats.chanceDrawn++;
      const cards = [
        { text: "🎁 Trúng thưởng xổ số! Nhận +$150", money: 150 },
        { text: "💸 Sửa chữa lâu đài: Trả -$100", money: -100 },
        { text: "🎉 Tổ chức lễ hội: Nhận +$200", money: 200 }
      ];
      const card = cards[Math.floor(Math.random() * cards.length)];
      player.money += card.money;
      this.showToast(card.text);
      this.addLog(`🎡 ${player.name} rút Cơ Hội: ${card.text}`);
      this.renderPlayerRail();
      this.checkBankruptcy(player);
      setTimeout(() => this.nextTurn(), 1400);

    } else {
      setTimeout(() => this.nextTurn(), 800);
    }
  },

  openPropertyModal(cell, player) {
    const modal = document.querySelector("#propertyModal");
    if (!modal) return;

    document.querySelector("#propertyHeaderName").textContent = cell.title.toUpperCase();
    document.querySelector("#propertyName").textContent = cell.title;
    document.querySelector("#propertyPrice").textContent = `$${cell.cost}`;
    document.querySelector("#propertyRent").textContent = `$${cell.rent}`;
    document.querySelector("#propertyOwnerText").textContent = "Chưa có chủ sở hữu";

    const buyBtn = document.querySelector("#buyPropertyBtn");
    const skipBtn = document.querySelector("#skipPropertyBtn");

    buyBtn.onclick = () => {
      this.buyProperty(player, cell);
      modal.classList.add("hidden");
    };

    skipBtn.onclick = () => {
      modal.classList.add("hidden");
      this.nextTurn();
    };

    modal.classList.remove("hidden");
  },

  buyProperty(player, cell) {
    if (player.money >= cell.cost) {
      player.money -= cell.cost;
      cell.ownerId = player.id;
      cell.level = 0;
      if (!player.properties) player.properties = [];
      player.properties.push(cell.id);

      window.gameState.stats.propertiesBought++;
      this.showToast(`🏰 ${player.name} đã mua ${cell.title} với giá $${cell.cost}!`);
      this.addLog(`🏰 ${player.name} đã sở hữu ${cell.title} ($${cell.cost})`);

      if (window.RoomsModule) {
        window.RoomsModule.broadcastState();
      }

      window.BoardModule.renderBoard();
      this.renderPlayerRail();

      if (window.checkBeachMonopolyWin(player)) {
        this.showToast(`🏆 ${player.name} SỞ HỮU ĐỦ 4 BÃI BIỂN VÀ THẮNG TUYỆT ĐỐI!`);
        this.addLog(`🏆 ${player.name} sở hữu trọn bộ 4 bãi biển và chiến thắng!`);
        setTimeout(() => this.showScreen("result"), 1200);
        return;
      }
    }
    this.nextTurn();
  },

  openUpgradeModal(cell, player) {
    const upgradeCost = window.calculateUpgradeCost(cell);
    const modal = document.querySelector("#propertyModal");
    if (!modal) return;

    document.querySelector("#propertyHeaderName").textContent = `NÂNG CẤP: ${cell.title.toUpperCase()}`;
    document.querySelector("#propertyName").textContent = `${cell.title} (Cấp ${(cell.level || 0) + 1})`;
    document.querySelector("#propertyPrice").textContent = `$${upgradeCost}`;
    document.querySelector("#propertyRent").textContent = `$${window.calculateEffectiveRent(cell)}`;
    document.querySelector("#propertyOwnerText").textContent = `Chủ sở hữu: ${player.name}`;

    const buyBtn = document.querySelector("#buyPropertyBtn");
    const skipBtn = document.querySelector("#skipPropertyBtn");

    buyBtn.textContent = `Nâng cấp ($${upgradeCost})`;
    buyBtn.onclick = () => {
      if (player.money >= upgradeCost) {
        player.money -= upgradeCost;
        cell.level = (cell.level || 0) + 1;
        this.showToast(`🏰 ${player.name} nâng cấp ${cell.title} lên Cấp ${cell.level}!`);
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        window.BoardModule.renderBoard();
        this.renderPlayerRail();
      }
      modal.classList.add("hidden");
      this.nextTurn();
    };

    skipBtn.onclick = () => {
      modal.classList.add("hidden");
      this.nextTurn();
    };

    modal.classList.remove("hidden");
  },

  openWorldTourModal(player) {
    if (player.money < window.GameConfig.WORLD_TOUR_FEE) {
      this.showToast(`💸 Không đủ $${window.GameConfig.WORLD_TOUR_FEE} để bay!`);
      this.nextTurn();
      return;
    }
    const dest = prompt("Nhập số thứ tự ô muốn bay đến (0 - 31):", "7");
    const targetIdx = parseInt(dest, 10);
    if (!isNaN(targetIdx) && targetIdx >= 0 && targetIdx < 32) {
      player.money -= window.GameConfig.WORLD_TOUR_FEE;
      if (targetIdx < player.position) player.money += window.GameConfig.PASS_START_BONUS;
      player.position = targetIdx;
      this.showToast(`✈️ ${player.name} đã bay đến ô số ${targetIdx}!`);
      if (window.RoomsModule) window.RoomsModule.broadcastState();
      window.BoardModule.updatePlayerTokens();
      this.renderPlayerRail();
    }
    this.nextTurn();
  },

  openFestivalModal(player) {
    const ownedProperties = (player.properties || []).map(idx => window.boardCells[idx]).filter(Boolean);
    if (ownedProperties.length === 0) {
      this.showToast(`⚠️ ${player.name} chưa sở hữu công trình nào để tổ chức Giải Đấu!`);
      this.nextTurn();
      return;
    }
    const cell = ownedProperties[0];
    cell.festivalUntil = window.gameState.round + window.GameConfig.FESTIVAL_DURATION_ROUNDS;
    this.showToast(`🏆 ${cell.title} được chọn làm GIẢI ĐẤU THẾ GIỚI (x5 Tiền thuê)!`);
    if (window.RoomsModule) window.RoomsModule.broadcastState();
    window.BoardModule.renderBoard();
    this.nextTurn();
  },

  checkBankruptcy(player) {
    if (player.money < 0 && !player.bankrupt) {
      player.bankrupt = true;
      window.gameState.stats.bankruptcies++;
      this.showToast(`💥 ${player.name} ĐÃ PHÁ SẢN!`);
      this.addLog(`💥 ${player.name} không còn đủ tiền và đã Phá Sản!`);

      player.properties.forEach(index => {
        const cell = window.boardCells[index];
        if (cell) {
          cell.ownerId = null;
          cell.level = 0;
          cell.festivalUntil = null;
        }
      });
      player.properties = [];

      if (window.RoomsModule) window.RoomsModule.broadcastState();
      window.BoardModule.renderBoard();
    }
  },

  nextTurn() {
    window.gameState.busy = false;
    window.gameState.rolling = false;

    const activePlayers = window.gameState.players.filter(p => !p.bankrupt);
    if (activePlayers.length <= 1) {
      this.addLog(`🏆 ${activePlayers[0]?.name || "Không ai"} đã giành chiến thắng!`);
      setTimeout(() => this.showScreen("result"), 800);
      return;
    }

    let nextIdx = window.gameState.currentPlayer;
    do {
      nextIdx = (nextIdx + 1) % window.gameState.players.length;
      if (nextIdx === 0) {
        window.gameState.round++;
      }
    } while (window.gameState.players[nextIdx].bankrupt);

    window.gameState.currentPlayer = nextIdx;

    if (window.RoomsModule) {
      window.RoomsModule.broadcastState();
    }

    this.renderPlayerRail();
    if (window.BoardModule) window.BoardModule.updateCameraPerspective();

    const current = window.gameState.players[nextIdx];
    if (current.isBot && window.RoomsModule && window.RoomsModule.isHost) {
      window.BotModule.handleBotTurn(current);
    }
  },

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
    this.toastTimer = setTimeout(() => toast.classList.add("hidden"), 2200);
  },

  bindEvents() {
    const createBtn = document.querySelector("#createRoomBtn");
    if (createBtn) {
      createBtn.onclick = () => {
        const code = window.RoomsModule.generateRoomCode();
        const label = document.querySelector("#roomCodeLabel");
        if (label) label.textContent = code;
        this.showToast(`Đã tạo phòng mới: ${code}`);
      };
    }

    const joinBtn = document.querySelector("#joinRoomBtn");
    if (joinBtn) {
      joinBtn.onclick = () => {
        const input = document.querySelector("#joinCodeInput");
        const code = input ? input.value.trim().toUpperCase() : "";
        if (!code) return alert("Vui lòng nhập mã phòng!");
        window.RoomsModule.joinRoom(code);
      };
    }

    const copyBtn = document.querySelector("#copyRoomBtn");
    if (copyBtn) {
      copyBtn.onclick = async () => {
        const code = document.querySelector("#roomCodeLabel")?.textContent || "";
        await navigator.clipboard?.writeText(code);
        copyBtn.textContent = "✓ Đã sao chép";
        setTimeout(() => copyBtn.textContent = "📋 Mã phòng", 1300);
      };
    }

    const copyLinkBtn = document.querySelector("#copyLinkBtn");
    if (copyLinkBtn) {
      copyLinkBtn.onclick = () => {
        window.RoomsModule.copyInviteLink();
      };
    }

    const rulesBtn = document.querySelector("#rulesBtn");
    const rulesModal = document.querySelector("#rulesModal");
    const closeRulesBtn = document.querySelector("#closeRulesBtn");

    if (rulesBtn && rulesModal) {
      rulesBtn.onclick = () => rulesModal.classList.remove("hidden");
    }
    if (closeRulesBtn && rulesModal) {
      closeRulesBtn.onclick = () => rulesModal.classList.add("hidden");
    }

    const cameraLockBtn = document.querySelector("#cameraLockBtn");
    if (cameraLockBtn) {
      cameraLockBtn.onclick = () => {
        if (window.BoardModule) window.BoardModule.toggleCameraLock();
      };
    }

    const startBtn = document.querySelector("#startGameBtn");
    if (startBtn) {
      startBtn.onclick = () => {
        window.RoomsModule.triggerStartGame();
      };
    }

    const rollBtn = document.querySelector("#rollDiceBtn");
    if (rollBtn) {
      rollBtn.onclick = () => this.rollDice();
    }

    const leaveBtn = document.querySelector("#leaveRoomBtn");
    if (leaveBtn) {
      leaveBtn.onclick = () => {
        window.RoomsModule.leaveRoom();
      };
    }
  }
};
