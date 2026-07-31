/* =========================================================
   BOT MODULE (bot.js)
   AI Bot Decision Engine:
   - Automated dice rolling via Host execution
   - Beach priority buying strategy
   - World Tour destination strategy
   - Property upgrading & x5 Festival selection
   ========================================================= */

window.BotModule = {
  async handleBotTurn(player) {
    if (!player || !player.isBot || player.bankrupt) return;
    if (!window.RoomsModule || !window.RoomsModule.isHost) return;

    const difficulty = window.gameState.botDifficulty || "normal";
    const thinkDelay = difficulty === "easy" ? 1200 : difficulty === "hard" ? 600 : 900;

    if (window.UIModule) {
      window.UIModule.showToast(`🤖 ${player.name} đang suy nghĩ...`);
    }

    await this.delay(thinkDelay);

    // Roll dice automatically via host
    if (window.UIModule && typeof window.UIModule.handleHostRollDice === "function") {
      await window.UIModule.handleHostRollDice(player.id);
    }
  },

  decidePropertyPurchase(player, cell) {
    if (this.shouldBuyProperty(player, cell)) {
      window.UIModule.buyProperty(player, cell);
    } else {
      window.UIModule.nextTurn();
    }
  },

  decideUpgradeProperty(player, cell) {
    if (this.shouldUpgradeProperty(player, cell)) {
      const upgradeCost = window.calculateUpgradeCost(cell);
      if (player.money >= upgradeCost) {
        player.money -= upgradeCost;
        cell.level = (cell.level || 0) + 1;
        window.UIModule.showToast(`🏰 ${player.name} (Bot) nâng cấp ${cell.title} lên Cấp ${cell.level}!`);
        if (window.RoomsModule) window.RoomsModule.broadcastState();
        window.BoardModule.renderBoard();
        window.UIModule.renderPlayerRail();
      }
    }
    window.UIModule.nextTurn();
  },

  decideWorldTour(player) {
    const targetIdx = this.selectWorldTourDestination(player);
    player.money -= window.GameConfig.WORLD_TOUR_FEE;
    if (targetIdx < player.position) player.money += window.GameConfig.PASS_START_BONUS;
    player.position = targetIdx;
    window.UIModule.showToast(`✈️ ${player.name} (Bot) đã bay đến ô ${targetIdx}!`);
    if (window.RoomsModule) window.RoomsModule.broadcastState();
    window.BoardModule.renderBoard();
    window.UIModule.renderPlayerRail();
    window.UIModule.nextTurn();
  },

  decideFestival(player) {
    const cell = this.selectBestFestivalProperty(player);
    if (cell) {
      cell.festivalUntil = window.gameState.round + window.GameConfig.FESTIVAL_DURATION_ROUNDS;
      window.UIModule.showToast(`🏆 ${player.name} (Bot) chọn ${cell.title} tổ chức Lễ Hội (x5 Thuê)!`);
      if (window.RoomsModule) window.RoomsModule.broadcastState();
      window.BoardModule.renderBoard();
    }
    window.UIModule.nextTurn();
  },

  shouldBuyProperty(player, cell) {
    if (!player || !cell || (cell.type !== "property" && cell.type !== "beach")) return false;
    const difficulty = window.gameState.botDifficulty || "normal";
    const cost = cell.cost || 200;

    if (player.money < cost) return false;

    // Always prioritize buying beaches for 4-beaches win!
    if (cell.type === "beach") return true;

    if (difficulty === "easy") {
      return Math.random() > 0.4;
    } else if (difficulty === "normal") {
      return (player.money - cost) >= 200;
    } else { // Hard
      return (player.money - cost) >= 120;
    }
  },

  shouldUpgradeProperty(player, cell) {
    if (!player || !cell || (cell.type !== "property" && cell.type !== "beach")) return false;
    if ((cell.level || 0) >= window.GameConfig.MAX_PROPERTY_LEVEL) return false;
    const upgradeCost = window.calculateUpgradeCost(cell);

    if (player.money < upgradeCost) return false;

    const difficulty = window.gameState.botDifficulty || "normal";
    if (difficulty === "easy") {
      return Math.random() > 0.5 && (player.money - upgradeCost) >= 300;
    } else if (difficulty === "normal") {
      return (player.money - upgradeCost) >= 250;
    } else { // Hard
      return (player.money - upgradeCost) >= 150;
    }
  },

  selectBestFestivalProperty(player) {
    if (!player || !player.properties || player.properties.length === 0) return null;

    const ownedCells = player.properties
      .map(index => window.boardCells[index])
      .filter(cell => cell && (cell.type === "property" || cell.type === "beach") && cell.ownerId === player.id);

    if (ownedCells.length === 0) return null;

    ownedCells.sort((a, b) => window.calculateEffectiveRent(b) - window.calculateEffectiveRent(a));
    return ownedCells[0];
  },

  selectWorldTourDestination(player) {
    const unownedBeach = window.boardCells.find(c => c.type === "beach" && c.ownerId === null);
    if (unownedBeach) return unownedBeach.id;

    const unownedProperties = window.boardCells
      .filter(c => (c.type === "property" || c.type === "beach") && c.ownerId === null)
      .sort((a, b) => (b.cost || 0) - (a.cost || 0));

    if (unownedProperties.length > 0) return unownedProperties[0].id;

    const ownProperty = window.boardCells.find(c => c.ownerId === player.id && (c.level || 0) < 3);
    if (ownProperty) return ownProperty.id;

    return 0;
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
