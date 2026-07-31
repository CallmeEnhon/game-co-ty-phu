/* =========================================================
   ROOMS MODULE (rooms.js)
   Player naming rules: Player 1, Player 2...
   Bot naming rules: Bot 1, Bot 2, Bot 3...
   ========================================================= */

window.RoomsModule = {
  initLobby() {
    this.renderLobbyPlayers();
  },

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    window.gameState.roomCode = code;

    // Reset room to 1 Host player (Player 1)
    const hostPlayer = {
      id: 0,
      name: "Player 1",
      avatar: "👑",
      color: "#f4b21f",
      money: window.GameConfig.STARTING_MONEY,
      asset: 0,
      host: true,
      ready: true,
      position: 0,
      isBot: false,
      bankrupt: false,
      properties: []
    };

    window.gameState.players = [hostPlayer];
    this.renderLobbyPlayers();

    return code;
  },

  renderLobbyPlayers() {
    const container = document.querySelector("#lobbyPlayers");
    if (!container) return;

    container.innerHTML = window.gameState.players.map((player, index) => `
      <div class="lobby-player" style="animation-delay:${index * 70}ms">
        <div class="avatar" style="--avatar-color:${player.color}">${player.avatar}</div>
        <div class="player-details">
          <div class="player-name">
            ${!player.isBot ? `
              <input class="player-name-input" value="${player.name}" onchange="window.RoomsModule.updatePlayerName(${player.id}, this.value)" placeholder="Nhập tên..." title="Bấm để đổi tên" />
              <span class="edit-icon" title="Bấm vào tên để chỉnh sửa">✏️</span>
            ` : `
              <span>${player.name}</span>
              <span class="bot-badge">🤖 Bot</span>
            `}
            ${player.host ? '<span>👑</span>' : ''}
          </div>
          ${player.host ? '<div class="host-tag">👑 Chủ phòng</div>' : ''}
        </div>
        <div class="lobby-player-actions">
          <div class="${player.ready ? 'ready-tag' : 'wait-tag'}">
            ${player.ready ? 'Sẵn sàng' : 'Đang chờ'}
          </div>
          ${!player.host ? `
            <button class="btn-remove-player" onclick="window.RoomsModule.removePlayer(${player.id})" title="Xóa người chơi">✕</button>
          ` : ''}
        </div>
      </div>
    `).join("");

    const startBtn = document.querySelector("#startGameBtn");
    if (startBtn) {
      const activeCount = window.gameState.players.filter(p => !p.bankrupt).length;
      startBtn.disabled = activeCount < 2;
    }
  },

  updatePlayerName(playerId, newName) {
    const cleanName = newName.trim() || `Player ${playerId + 1}`;
    const player = window.gameState.players.find(p => p.id === playerId);
    if (player) {
      player.name = cleanName;
      if (window.UIModule) {
        window.UIModule.showToast(`Đã đổi tên thành: ${cleanName}`);
        window.UIModule.renderPlayerRail();
      }
    }
  },

  addBot() {
    if (window.gameState.players.length >= 4) {
      if (window.UIModule) window.UIModule.showToast("Phòng đã đủ 4 người chơi!");
      return;
    }

    const currentBotCount = window.gameState.players.filter(p => p.isBot).length;
    const botNumber = currentBotCount + 1;
    const botName = `Bot ${botNumber}`;

    const botAvatars = ["🤖", "🏰", "⚔️", "🛡️", "📜"];
    const botColors = ["#e56376", "#36a774", "#438bd4", "#a36bd4"];
    const availableColor = botColors[window.gameState.players.length % botColors.length];

    const newBot = {
      id: Date.now(),
      name: botName,
      avatar: botAvatars[window.gameState.players.length % botAvatars.length],
      color: availableColor,
      money: window.GameConfig.STARTING_MONEY,
      asset: 0,
      host: false,
      ready: true,
      position: 0,
      isBot: true,
      bankrupt: false,
      properties: []
    };

    window.gameState.players.push(newBot);
    this.renderLobbyPlayers();
    if (window.UIModule) window.UIModule.showToast(`Đã thêm ${newBot.name} vào phòng!`);
  },

  addHumanPlayer() {
    if (window.gameState.players.length >= 4) {
      if (window.UIModule) window.UIModule.showToast("Phòng đã đủ 4 người chơi!");
      return;
    }

    const humanCount = window.gameState.players.filter(p => !p.isBot).length;
    const playerNumber = humanCount + 1;
    const playerName = `Player ${playerNumber}`;

    const playerAvatars = ["👨🏻‍💼", "👩🏻‍💼", "👨🏻‍💻", "👨🏻‍🔬"];
    const playerColors = ["#36a774", "#438bd4", "#a36bd4", "#e56376"];
    const color = playerColors[window.gameState.players.length % playerColors.length];

    const newPlayer = {
      id: Date.now(),
      name: playerName,
      avatar: playerAvatars[window.gameState.players.length % playerAvatars.length],
      color: color,
      money: window.GameConfig.STARTING_MONEY,
      asset: 0,
      host: false,
      ready: true,
      position: 0,
      isBot: false,
      bankrupt: false,
      properties: []
    };

    window.gameState.players.push(newPlayer);
    this.renderLobbyPlayers();
    if (window.UIModule) window.UIModule.showToast(`Đã vào phòng: ${newPlayer.name}!`);
  },

  removePlayer(playerId) {
    window.gameState.players = window.gameState.players.filter(p => p.id !== playerId);
    this.renderLobbyPlayers();
  },

  setBotDifficulty(difficulty) {
    window.gameState.botDifficulty = difficulty;
    if (window.UIModule) window.UIModule.showToast(`Đã chọn độ khó Bot: ${difficulty.toUpperCase()}`);
  }
};
