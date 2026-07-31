/* =========================================================
   ROOMS MODULE (rooms.js)
   Realtime P2P Synchronization Engine & Dynamic Room Codes
   ========================================================= */

window.RoomsModule = {
  peer: null,
  connections: [],
  hostConn: null,
  isHost: false,
  broadcastChannel: null,

  initLobby() {
    this.initBroadcastChannel();
    this.checkUrlInviteCode();
    this.renderLobbyPlayers();
  },

  initBroadcastChannel() {
    if ("BroadcastChannel" in window) {
      this.broadcastChannel = new BroadcastChannel("monoconcard_channel");
      this.broadcastChannel.onmessage = (event) => {
        this.handleIncomingP2PMessage(event.data);
      };
    }
  },

  checkUrlInviteCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get("room");

    if (roomCode) {
      // Joined via explicit invite link
      const cleanCode = roomCode.trim().toUpperCase();
      window.gameState.roomCode = cleanCode;
      const label = document.querySelector("#roomCodeLabel");
      if (label) label.textContent = cleanCode;

      const input = document.querySelector("#joinCodeInput");
      if (input) input.value = cleanCode;

      setTimeout(() => this.joinRoom(cleanCode), 400);
    } else {
      // Direct access to main link: Generate a fresh unique random room code
      const freshCode = window.generateRandomCode();
      window.gameState.roomCode = freshCode;
      this.isHost = true;

      const label = document.querySelector("#roomCodeLabel");
      if (label) label.textContent = freshCode;

      this.startPeerServer(freshCode);
    }
  },

  generateRoomCode() {
    const freshCode = window.generateRandomCode();
    window.gameState.roomCode = freshCode;
    this.isHost = true;

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

    const label = document.querySelector("#roomCodeLabel");
    if (label) label.textContent = freshCode;

    this.updateUrlWithRoomCode(freshCode);
    this.renderLobbyPlayers();
    this.startPeerServer(freshCode);

    return freshCode;
  },

  startPeerServer(roomCode) {
    if (typeof Peer === "undefined") return;

    try {
      const peerId = `monoconcard-${roomCode}`;
      if (this.peer) this.peer.destroy();

      this.peer = new Peer(peerId);

      this.peer.on("open", () => {
        const status = document.querySelector("#roomStatusText");
        if (status) status.textContent = "Sẵn sàng • Chờ người chơi...";
      });

      this.peer.on("connection", (conn) => {
        this.connections.push(conn);

        conn.on("open", () => {
          conn.send({
            type: "SYNC_STATE",
            players: window.gameState.players,
            boardCells: window.boardCells,
            screen: window.gameState.screen,
            currentPlayer: window.gameState.currentPlayer,
            round: window.gameState.round
          });
        });

        conn.on("data", (data) => {
          this.handleIncomingP2PMessage(data);
        });

        conn.on("close", () => {
          this.connections = this.connections.filter(c => c !== conn);
        });
      });

      this.peer.on("error", (err) => {
        console.warn("P2P Host error (fallback to local):", err);
      });
    } catch (e) {
      console.warn("PeerJS init exception:", e);
    }
  },

  joinRoom(code) {
    window.gameState.roomCode = code;
    this.updateUrlWithRoomCode(code);
    this.isHost = false;

    const myId = window.myPlayerId || Date.now();
    window.myPlayerId = myId;

    if (typeof Peer !== "undefined") {
      try {
        if (this.peer) this.peer.destroy();
        this.peer = new Peer();

        this.peer.on("open", () => {
          const hostPeerId = `monoconcard-${code}`;
          this.hostConn = this.peer.connect(hostPeerId);

          this.hostConn.on("open", () => {
            const status = document.querySelector("#roomStatusText");
            if (status) status.textContent = "🟢 Đã kết nối với Chủ phòng!";

            this.hostConn.send({
              type: "JOIN_REQUEST",
              id: myId,
              name: `Player ${window.gameState.players.length + 1}`
            });
          });

          this.hostConn.on("data", (data) => {
            this.handleIncomingP2PMessage(data);
          });
        });

        this.peer.on("error", () => {
          this.addHumanPlayerLocally(myId);
        });
      } catch (e) {
        this.addHumanPlayerLocally(myId);
      }
    } else {
      this.addHumanPlayerLocally(myId);
    }
  },

  handleIncomingP2PMessage(data) {
    if (!data || !data.type) return;

    if (data.type === "JOIN_REQUEST" && this.isHost) {
      const existing = window.gameState.players.find(p => p.id === data.id);
      if (!existing && window.gameState.players.length < 4) {
        const colors = ["#f4b21f", "#36a774", "#438bd4", "#e56376"];
        const newPlayer = {
          id: data.id,
          name: data.name || `Player ${window.gameState.players.length + 1}`,
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
        this.renderLobbyPlayers();
        this.broadcastState();
        if (window.UIModule) window.UIModule.showToast(`🟢 ${newPlayer.name} đã gia nhập phòng!`);
      }
    } else if (data.type === "SYNC_STATE") {
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
  },

  broadcastState() {
    const payload = {
      type: "SYNC_STATE",
      players: window.gameState.players,
      boardCells: window.boardCells,
      screen: window.gameState.screen,
      currentPlayer: window.gameState.currentPlayer,
      round: window.gameState.round
    };

    this.connections.forEach(conn => {
      if (conn && conn.open) conn.send(payload);
    });

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(payload);
    }
  },

  addHumanPlayerLocally(myId) {
    const existing = window.gameState.players.find(p => p.id === myId);
    if (!existing && window.gameState.players.length < 4) {
      const colors = ["#f4b21f", "#36a774", "#438bd4", "#e56376"];
      const newPlayer = {
        id: myId,
        name: `Player ${window.gameState.players.length + 1}`,
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
      this.renderLobbyPlayers();
    }
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
      if (window.UIModule) window.UIModule.showToast("🔗 Đã sao chép link mời chơi!");
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
      this.broadcastState();
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
    this.broadcastState();
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
    this.broadcastState();
  },

  removePlayer(playerId) {
    window.gameState.players = window.gameState.players.filter(p => p.id !== playerId);
    this.renderLobbyPlayers();
    this.broadcastState();
  },

  setBotDifficulty(difficulty) {
    window.gameState.botDifficulty = difficulty;
    if (window.UIModule) window.UIModule.showToast(`Đã chọn độ khó Bot: ${difficulty.toUpperCase()}`);
    this.broadcastState();
  },

  setBeachWinSetting(enabled) {
    window.gameSettings.beachWinEnabled = enabled;
    if (window.UIModule) window.UIModule.showToast(`Luật 4 Bãi Biển Thắng: ${enabled ? "BẬT 🏖️" : "TẮT ❌"}`);
    this.broadcastState();
  }
};
