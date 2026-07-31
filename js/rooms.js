/* =========================================================
   ROOMS MODULE (rooms.js)
   Realtime Sync & Invite Link Support (Firebase & URL Params)
   ========================================================= */

window.RoomsModule = {
  db: null,
  roomListener: null,

  initLobby() {
    this.initFirebase();
    this.checkUrlInviteCode();
    this.renderLobbyPlayers();
  },

  initFirebase() {
    if (window.firebase && window.FIREBASE_CONFIG) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        console.log("Firebase initialized successfully for Realtime Multiplayer.");
      } catch (err) {
        console.warn("Firebase initialization error:", err);
      }
    }
  },

  checkUrlInviteCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get("room");
    if (roomCode) {
      const cleanCode = roomCode.trim().toUpperCase();
      window.gameState.roomCode = cleanCode;
      const label = document.querySelector("#roomCodeLabel");
      if (label) label.textContent = cleanCode;

      const input = document.querySelector("#joinCodeInput");
      if (input) input.value = cleanCode;

      // Auto join if joining via link
      this.joinRoom(cleanCode);
    }
  },

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    window.gameState.roomCode = code;

    const hostPlayer = {
      id: Date.now(),
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
    this.updateUrlWithRoomCode(code);
    this.renderLobbyPlayers();
    this.syncRoomToCloud();

    return code;
  },

  joinRoom(code) {
    window.gameState.roomCode = code;
    this.updateUrlWithRoomCode(code);

    // If joining as new player and not yet in list
    const myId = window.myPlayerId || Date.now();
    window.myPlayerId = myId;

    const existing = window.gameState.players.find(p => p.id === myId);
    if (!existing) {
      const playerNum = window.gameState.players.filter(p => !p.isBot).length + 1;
      const colors = ["#f4b21f", "#36a774", "#438bd4", "#e56376"];
      const newPlayer = {
        id: myId,
        name: `Player ${playerNum}`,
        avatar: "👤",
        color: colors[window.gameState.players.length % colors.length],
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
    }

    this.renderLobbyPlayers();
    this.subscribeToRoomCloud(code);
    this.syncRoomToCloud();
  },

  updateUrlWithRoomCode(code) {
    if (window.history && window.history.replaceState) {
      const newUrl = `${window.location.pathname}?room=${code}`;
      window.history.replaceState({ path: newUrl }, "", newUrl);
    }
  },

  copyInviteLink() {
    const code = window.gameState.roomCode || "4F7A";
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;

    navigator.clipboard?.writeText(inviteUrl).then(() => {
      if (window.UIModule) window.UIModule.showToast("🔗 Đã sao chép link mời bạn!");
    }).catch(() => {
      prompt("Sao chép link mời gửi cho bạn bè:", inviteUrl);
    });
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
      this.syncRoomToCloud();
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
    this.syncRoomToCloud();
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
    this.syncRoomToCloud();
  },

  removePlayer(playerId) {
    window.gameState.players = window.gameState.players.filter(p => p.id !== playerId);
    this.renderLobbyPlayers();
    this.syncRoomToCloud();
  },

  setBotDifficulty(difficulty) {
    window.gameState.botDifficulty = difficulty;
    if (window.UIModule) window.UIModule.showToast(`Đã chọn độ khó Bot: ${difficulty.toUpperCase()}`);
    this.syncRoomToCloud();
  },

  // Realtime Cloud Sync Methods
  syncRoomToCloud() {
    if (!this.db || !window.gameState.roomCode) return;

    try {
      const roomRef = this.db.collection("rooms").doc(window.gameState.roomCode);
      roomRef.set({
        roomCode: window.gameState.roomCode,
        screen: window.gameState.screen,
        currentPlayer: window.gameState.currentPlayer,
        round: window.gameState.round,
        players: window.gameState.players,
        boardCells: window.boardCells,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn("Error syncing to Firestore:", err);
    }
  },

  subscribeToRoomCloud(code) {
    if (!this.db || !code) return;
    if (this.roomListener) this.roomListener(); // Unsubscribe existing

    try {
      this.roomListener = this.db.collection("rooms").doc(code).onSnapshot(doc => {
        if (doc.exists) {
          const data = doc.data();
          if (data.players) window.gameState.players = data.players;
          if (data.boardCells) window.boardCells = data.boardCells;
          if (data.currentPlayer !== undefined) window.gameState.currentPlayer = data.currentPlayer;
          if (data.round !== undefined) window.gameState.round = data.round;

          if (data.screen && data.screen !== window.gameState.screen) {
            if (window.UIModule) window.UIModule.showScreen(data.screen);
          }

          this.renderLobbyPlayers();
          if (window.BoardModule) window.BoardModule.renderBoard();
          if (window.UIModule) window.UIModule.renderPlayerRail();
        }
      });
    } catch (err) {
      console.warn("Error subscribing to Firestore room:", err);
    }
  }
};
