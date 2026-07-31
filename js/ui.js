/* =========================================================
   UI MODULE (ui.js)
   MonoConCard Edition with Perspective Camera Support
   ========================================================= */

window.UIModule = {
  init() {
    this.bindEvents();
    this.renderPlayerRail();
    if (window.BoardModule) window.BoardModule.renderBoard();
    if (window.RoomsModule) window.RoomsModule.initLobby();
  },

  showScreen(name) {
    document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
    const target = document.querySelector(`#${name}Screen`);
    if (target) target.classList.add("active");

    const leaveBtn = document.querySelector("#leaveRoomBtn");
    if (leaveBtn) leaveBtn.classList.toggle("hidden", name === "lobby");
    window.gameState.screen = name;

    if (name === "result") {
      this.renderRankings();
      if (window.AnimationsModule) window.AnimationsModule.createConfetti();
    }
  },

  renderPlayerRail() {
    const container = document.querySelector("#playerRail");
    if (!container) return;

    container.innerHTML = window.gameState.players.map((player, index) => {
      const isActive = index === window.gameState.currentPlayer && !player.bankrupt;
      const isBankrupt = player.bankrupt;
      return `
        <article class="player-hud ${isActive ? "active" : ""} ${isBankrupt ? "bankrupt" : ""}" style="--player-color:${player.color}">
          <div class="player-hud-top">
            <div class="avatar" style="--avatar-color:${player.color}">${player.avatar}</div>
            <div>
              <div class="player-hud-name">
                ${player.name}
                ${player.isBot ? "🤖" : ""}
                ${player.host ? "👑" : ""}
              </div>
              <div class="player-hud-money">$${player.money.toLocaleString()}</div>
            </div>
          </div>
          <div class="player-hud-asset">
            ${isBankrupt ? "<span style='color:#ef4f43;font-weight:900;'>PHÁ SẢN</span>" : `Tài sản: $${player.asset.toLocaleString()}`}
          </div>
        </article>
      `;
    }).join("");

    const current = window.gameState.players[window.gameState.currentPlayer];
    const nameLabel = document.querySelector("#currentPlayerName");
    if (nameLabel && current) {
      nameLabel.textContent = current.name;
      nameLabel.style.color = current.color;
    }
  },

  renderRankings() {
    const listContainer = document.querySelector("#rankingList");
    if (!listContainer) return;

    const sorted = [...window.gameState.players]
      .map(player => ({
        ...player,
        totalAsset: player.money + player.asset + player.properties.reduce((sum, idx) => {
          const cell = window.boardCells[idx];
          return sum + (cell ? (cell.cost || 200) + (cell.level || 0) * window.calculateUpgradeCost(cell) : 0);
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
    if (current.bankrupt) {
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
    const totalEl = document.querySelector("#diceTotal");
    const moveTextEl = document.querySelector("#moveText");

    if (totalEl) totalEl.textContent = `Tổng: ${total}`;
    if (moveTextEl) moveTextEl.textContent = `Di chuyển ${total} ô`;

    this.addLog(`${current.name} đổ xúc xắc: ${result.valA} + ${result.valB} = ${total}`);

    await window.AnimationsModule.animatePlayerMove(current, total);
    await this.delay(250);

    const landedCell = window.boardCells[current.position];
    this.showToast(`${current.name} dừng tại: ${landedCell.title.toUpperCase()}`);

    await this.handleCellAction(current, landedCell);

    window.gameState.turnCount++;
    window.gameState.rolling = false;
  },

  async handleCellAction(player, cell) {
    if (cell.type === "property") {
      if (cell.ownerId === null || cell.ownerId === undefined) {
        if (player.isBot) {
          if (window.BotModule.shouldBuyProperty(player, cell)) {
            this.buyProperty(player, cell);
          } else {
            this.addLog(`${player.name} bỏ qua ${cell.title}.`);
          }
          await this.delay(600);
          this.nextTurn();
        } else {
          this.openPropertyModal(cell, "buy");
        }
      } else if (cell.ownerId === player.id) {
        if ((cell.level || 0) < window.GameConfig.MAX_PROPERTY_LEVEL) {
          if (player.isBot) {
            if (window.BotModule.shouldUpgradeProperty(player, cell)) {
              this.upgradeProperty(player, cell);
            } else {
              this.addLog(`${player.name} chưa nâng cấp ${cell.title}.`);
            }
            await this.delay(600);
            this.nextTurn();
          } else {
            this.openPropertyModal(cell, "upgrade");
          }
        } else {
          this.addLog(`${player.name} dừng tại ${cell.title} (đã đạt Lv.3 tối đa).`);
          await this.delay(600);
          this.nextTurn();
        }
      } else {
        const owner = window.gameState.players.find(p => p.id === cell.ownerId);
        if (owner && !owner.bankrupt) {
          const rent = window.calculateEffectiveRent(cell);
          this.payRent(player, owner, rent, cell);
        }
        await this.delay(700);
        this.nextTurn();
      }
    } else if (cell.type === "tax") {
      const taxAmount = cell.amount || 150;
      player.money -= taxAmount;
      this.addLog(`💸 ${player.name} nộp ${cell.title}: $${taxAmount}.`);
      window.AnimationsModule.spawnFloatingMoney(player.position, `-$${taxAmount}`, "#ef4f43");
      this.checkBankruptcy(player);
      this.renderPlayerRail();
      await this.delay(700);
      this.nextTurn();
    } else if (cell.type === "chance") {
      window.gameState.stats.chanceDrawn++;
      this.triggerChanceCard(player);
      await this.delay(800);
      this.nextTurn();
    } else if (cell.type === "festival") {
      if (player.isBot) {
        const bestProperty = window.BotModule.selectBestFestivalProperty(player);
        if (bestProperty) {
          this.applyFestivalToProperty(player, bestProperty);
        } else {
          this.addLog(`${player.name} tới Lễ Hội nhưng chưa có công trình.`);
        }
        await this.delay(600);
        this.nextTurn();
      } else {
        this.openFestivalModal(player);
      }
    } else {
      this.addLog(`${player.name} dừng tại ${cell.title}.`);
      await this.delay(600);
      this.nextTurn();
    }
  },

  buyProperty(player, cell) {
    if (player.money < cell.cost) return false;

    player.money -= cell.cost;
    player.asset += cell.cost;
    cell.ownerId = player.id;
    cell.level = 0;
    player.properties.push(cell.id);

    window.gameState.stats.propertiesBought++;
    this.addLog(`🏰 ${player.name} đã sở hữu ${cell.title} ($${cell.cost})!`);
    window.AnimationsModule.spawnFloatingMoney(cell.id, `-$${cell.cost}`, "#ef4f43");

    this.renderPlayerRail();
    window.BoardModule.renderBoard();
    return true;
  },

  upgradeProperty(player, cell) {
    const cost = window.calculateUpgradeCost(cell);
    if (player.money < cost) return false;

    player.money -= cost;
    player.asset += cost;
    cell.level = (cell.level || 0) + 1;

    this.addLog(`🏗️ ${player.name} nâng cấp ${cell.title} lên Lv.${cell.level} ($${cost})!`);
    window.AnimationsModule.spawnFloatingMoney(cell.id, `-$${cost}`, "#ef4f43");
    window.AnimationsModule.animateUpgradeBuilding(cell.id);

    this.renderPlayerRail();
    window.BoardModule.renderBoard();
    return true;
  },

  payRent(tenant, landlord, rentAmount, cell) {
    const actualRent = Math.min(tenant.money, rentAmount);
    tenant.money -= actualRent;
    landlord.money += actualRent;

    this.addLog(`⚠️ ${tenant.name} trả $${actualRent} tiền thuê cho ${landlord.name} tại ${cell.title}.`);
    window.AnimationsModule.spawnFloatingMoney(cell.id, `-$${actualRent}`, "#ef4f43");

    this.checkBankruptcy(tenant);
    this.renderPlayerRail();
  },

  triggerChanceCard(player) {
    const chanceEvents = [
      { text: "Vua ban phần thưởng Hoàng Gia!", amount: 300, type: "good" },
      { text: "Thương nhân đường xa trao kho báu!", amount: 250, type: "good" },
      { text: "Lễ hội Hoàng Gia trúng mùa!", amount: 150, type: "good" },
      { text: "Bão bùng hư hại lâu đài cổ!", amount: -150, type: "bad" },
      { text: "Nộp lệ phí tu sửa tháp cổ!", amount: -200, type: "bad" },
      { text: "Trả tiền bảo an cho thương đội!", amount: -100, type: "bad" }
    ];

    const event = chanceEvents[Math.floor(Math.random() * chanceEvents.length)];
    player.money += event.amount;

    const sign = event.amount >= 0 ? "+" : "";
    this.showToast(`🔮 CƠ HỘI: ${event.text} (${sign}$${event.amount})`);
    this.addLog(`🔮 ${player.name} rút thẻ Cơ Hội: ${event.text} (${sign}$${event.amount})`);
    window.AnimationsModule.spawnFloatingMoney(player.position, `${sign}$${event.amount}`, event.amount >= 0 ? "#22ac50" : "#ef4f43");

    this.checkBankruptcy(player);
    this.renderPlayerRail();
  },

  openFestivalModal(player) {
    const ownedProperties = player.properties
      .map(index => window.boardCells[index])
      .filter(cell => cell && cell.type === "property" && cell.ownerId === player.id);

    if (ownedProperties.length === 0) {
      this.showToast(`👑 ${player.name} đến Lễ Hội nhưng chưa sở hữu lâu đài nào.`);
      this.addLog(`${player.name} dừng tại Lễ Hội Hoàng Gia.`);
      this.nextTurn();
      return;
    }

    const modal = document.querySelector("#propertyModal");
    if (!modal) return;

    document.querySelector("#propertyHeaderName").textContent = "TỔ CHỨC LỄ HỘI HOÀNG GIA 👑";
    document.querySelector("#propertyName").textContent = "Chọn lâu đài để x2 Tiền Thuê";
    document.querySelector("#propertyPrice").textContent = "x2 Tiền Thuê";
    document.querySelector("#propertyRent").textContent = "Thời gian: 3 vòng";
    document.querySelector("#propertyOwnerText").textContent = "Công trình được chọn sẽ x2 tiền thuê trong 3 vòng!";
    document.querySelector("#propertyImage").textContent = "👑";

    const actions = document.querySelector(".property-modal-actions");
    actions.innerHTML = "";

    ownedProperties.forEach(cell => {
      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.textContent = `${cell.title} (Lv.${cell.level || 0})`;
      btn.onclick = () => {
        this.applyFestivalToProperty(player, cell);
        modal.classList.add("hidden");
        this.nextTurn();
      };
      actions.appendChild(btn);
    });

    modal.classList.remove("hidden");
  },

  applyFestivalToProperty(player, cell) {
    cell.festivalUntil = window.gameState.round + window.GameConfig.FESTIVAL_DURATION_ROUNDS - 1;
    this.showToast(`👑 LỄ HỘI: ${cell.title} x2 TIỀN THUÊ TRONG 3 VÒNG!`);
    this.addLog(`👑 ${player.name} tổ chức Lễ Hội tại ${cell.title}. Tiền thuê x2!`);
    window.AnimationsModule.animateFestivalGlow(cell.id);
    window.BoardModule.renderBoard();
  },

  openPropertyModal(cell, mode = "buy") {
    const player = window.gameState.players[window.gameState.currentPlayer];
    const modal = document.querySelector("#propertyModal");
    if (!modal) return;

    document.querySelector("#propertyHeaderName").textContent = cell.title.toUpperCase();
    document.querySelector("#propertyName").textContent = cell.title;
    
    let icon = "🏰";
    if (cell.title.includes("Thánh Đường") || cell.title.includes("Đức Bà") || cell.title.includes("Chartres") || cell.title.includes("Rouen") || cell.title.includes("Köln")) {
      icon = "⛪";
    } else if (cell.title.includes("Cung Điện") || cell.title.includes("Tổng Trấn") || cell.title.includes("Duomo")) {
      icon = "🏛️";
    }
    document.querySelector("#propertyImage").textContent = icon;

    const actions = document.querySelector(".property-modal-actions");
    actions.innerHTML = "";

    if (mode === "buy") {
      document.querySelector("#propertyPrice").textContent = `$${cell.cost}`;
      document.querySelector("#propertyRent").textContent = `$${cell.rent}`;
      document.querySelector("#propertyOwnerText").textContent = "Chưa có chủ sở hữu. Bạn có muốn mua?";

      const buyBtn = document.createElement("button");
      buyBtn.className = "btn btn-success";
      buyBtn.textContent = `Mua ($${cell.cost})`;
      buyBtn.disabled = player.money < cell.cost;
      buyBtn.onclick = () => {
        this.buyProperty(player, cell);
        modal.classList.add("hidden");
        this.nextTurn();
      };

      const skipBtn = document.createElement("button");
      skipBtn.className = "btn btn-danger";
      skipBtn.textContent = "Bỏ qua";
      skipBtn.onclick = () => {
        modal.classList.add("hidden");
        this.addLog(`${player.name} bỏ qua ${cell.title}.`);
        this.nextTurn();
      };

      actions.appendChild(buyBtn);
      actions.appendChild(skipBtn);
    } else if (mode === "upgrade") {
      const upgradeCost = window.calculateUpgradeCost(cell);
      const nextLevel = (cell.level || 0) + 1;
      const nextRent = Math.round(cell.rent * (1 + nextLevel * 0.6));

      document.querySelector("#propertyPrice").textContent = `Chi phí: $${upgradeCost}`;
      document.querySelector("#propertyRent").textContent = `Thuê mới: $${nextRent}`;
      document.querySelector("#propertyOwnerText").textContent = `Nâng cấp ${cell.title} lên Lv.${nextLevel}?`;

      const upgradeBtn = document.createElement("button");
      upgradeBtn.className = "btn btn-success";
      upgradeBtn.textContent = `Nâng cấp ($${upgradeCost})`;
      upgradeBtn.disabled = player.money < upgradeCost;
      upgradeBtn.onclick = () => {
        this.upgradeProperty(player, cell);
        modal.classList.add("hidden");
        this.nextTurn();
      };

      const skipBtn = document.createElement("button");
      skipBtn.className = "btn btn-danger";
      skipBtn.textContent = "Để sau";
      skipBtn.onclick = () => {
        modal.classList.add("hidden");
        this.nextTurn();
      };

      actions.appendChild(upgradeBtn);
      actions.appendChild(skipBtn);
    }

    modal.classList.remove("hidden");
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

      window.BoardModule.renderBoard();
    }
  },

  nextTurn() {
    window.gameState.busy = false;

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
        const roundBadge = document.querySelector("#roundBadge");
        if (roundBadge) roundBadge.textContent = `Vòng ${window.gameState.round}`;
      }
    } while (window.gameState.players[nextIdx].bankrupt);

    window.gameState.currentPlayer = nextIdx;
    const current = window.gameState.players[nextIdx];

    this.renderPlayerRail();
    if (window.BoardModule) window.BoardModule.updateCameraPerspective();

    const rollBtn = document.querySelector("#rollDiceBtn");
    if (rollBtn) rollBtn.disabled = current.isBot;

    if (current.isBot) {
      window.BotModule.handleBotTurn(current);
    }
  },

  addLog(message) {
    const logBox = document.querySelector("#activityLog");
    if (!logBox) return;

    const line = document.createElement("div");
    line.className = "log-line";
    line.textContent = message;
    logBox.prepend(line);

    while (logBox.children.length > 5) {
      logBox.lastChild.remove();
    }
  },

  showToast(message) {
    const toast = document.querySelector("#gameToast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("hidden");

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.add("hidden"), 2000);
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
        const label = document.querySelector("#roomCodeLabel");
        if (label) label.textContent = code;
        this.showToast(`Đã vào phòng: ${code}`);
      };
    }

    const copyBtn = document.querySelector("#copyRoomBtn");
    if (copyBtn) {
      copyBtn.onclick = async () => {
        const code = document.querySelector("#roomCodeLabel")?.textContent || "";
        await navigator.clipboard?.writeText(code);
        copyBtn.textContent = "✓ Đã sao chép";
        setTimeout(() => copyBtn.textContent = "📋 Sao chép mã", 1300);
      };
    }

    const startBtn = document.querySelector("#startGameBtn");
    if (startBtn) {
      startBtn.onclick = () => {
        window.gameState.busy = false;
        window.gameState.rolling = false;
        this.showScreen("game");
        window.BoardModule.renderBoard();
        this.renderPlayerRail();

        const rollBtn = document.querySelector("#rollDiceBtn");
        const firstPlayer = window.gameState.players[window.gameState.currentPlayer];
        if (rollBtn) rollBtn.disabled = firstPlayer ? firstPlayer.isBot : false;

        if (firstPlayer && firstPlayer.isBot) {
          window.BotModule.handleBotTurn(firstPlayer);
        }
      };
    }

    const leaveBtn = document.querySelector("#leaveRoomBtn");
    if (leaveBtn) leaveBtn.onclick = () => this.showScreen("lobby");

    const rollBtn = document.querySelector("#rollDiceBtn");
    if (rollBtn) {
      rollBtn.onclick = () => {
        if (!window.gameState.busy && !window.gameState.rolling) {
          this.rollDice();
        }
      };
    }

    const cameraBtn = document.querySelector("#cameraLockBtn");
    if (cameraBtn) cameraBtn.onclick = () => window.BoardModule.toggleCameraLock();

    const playAgainBtn = document.querySelector("#playAgainBtn");
    if (playAgainBtn) playAgainBtn.onclick = () => this.resetGame();

    const backLobbyBtn = document.querySelector("#backLobbyBtn");
    if (backLobbyBtn) backLobbyBtn.onclick = () => this.showScreen("lobby");

    const exitBtn = document.querySelector("#exitBtn");
    if (exitBtn) exitBtn.onclick = () => this.showScreen("lobby");
  },

  resetGame() {
    window.gameState.currentPlayer = 0;
    window.gameState.round = 1;
    window.gameState.turnCount = 0;
    window.gameState.busy = false;
    window.gameState.rolling = false;

    const rollBtn = document.querySelector("#rollDiceBtn");
    if (rollBtn) rollBtn.disabled = false;

    window.gameState.players.forEach(p => {
      p.money = window.GameConfig.STARTING_MONEY;
      p.asset = 0;
      p.position = 0;
      p.bankrupt = false;
      p.properties = [];
    });

    window.boardCells.forEach(cell => {
      cell.ownerId = null;
      cell.level = 0;
      cell.festivalUntil = null;
    });

    this.showScreen("game");
    window.BoardModule.renderBoard();
    this.renderPlayerRail();
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
