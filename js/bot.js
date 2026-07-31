/* =========================================================
   BOT MODULE (bot.js)
   AI Bot Decision Engine:
   - Automated dice rolling & 3-doubles handling
   - Beach priority buying strategy
   - World Tour destination strategy
   - Property upgrading & x5 Festival selection
   ========================================================= */

window.BotModule = {
  async handleBotTurn(player) {
    if (!player || !player.isBot || player.bankrupt) return;

    const difficulty = window.gameState.botDifficulty || "normal";
    const thinkDelay = difficulty === "easy" ? 1000 : difficulty === "hard" ? 600 : 800;

    if (window.UIModule) {
      window.UIModule.showToast(`${player.name} đang suy nghĩ...`);
    }

    await this.delay(thinkDelay);

    // Roll dice automatically
    if (window.UIModule && typeof window.UIModule.rollDice === "function") {
      await window.UIModule.rollDice();
    }
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
      return (player.money - cost) >= 150;
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
      return (player.money - upgradeCost) >= 350;
    } else { // Hard
      return (player.money - upgradeCost) >= 250;
    }
  },

  selectBestFestivalProperty(player) {
    if (!player || !player.properties || player.properties.length === 0) return null;

    const ownedCells = player.properties
      .map(index => window.boardCells[index])
      .filter(cell => cell && (cell.type === "property" || cell.type === "beach") && cell.ownerId === player.id);

    if (ownedCells.length === 0) return null;

    // Sort by effective rent descending
    ownedCells.sort((a, b) => window.calculateEffectiveRent(b) - window.calculateEffectiveRent(a));
    return ownedCells[0];
  },

  selectWorldTourDestination(player) {
    // 1st priority: Unowned Beach
    const unownedBeach = window.boardCells.find(c => c.type === "beach" && c.ownerId === null);
    if (unownedBeach) return unownedBeach.id;

    // 2nd priority: Unowned high value property
    const unownedProperties = window.boardCells
      .filter(c => (c.type === "property" || c.type === "beach") && c.ownerId === null)
      .sort((a, b) => (b.cost || 0) - (a.cost || 0));

    if (unownedProperties.length > 0) return unownedProperties[0].id;

    // 3rd priority: Own property to upgrade or Start cell for bonus
    const ownProperty = window.boardCells.find(c => c.ownerId === player.id && (c.level || 0) < 3);
    if (ownProperty) return ownProperty.id;

    return 0; // Fallback to Start cell
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
