/* =========================================================
   ROOMS MODULE (rooms.js)
   Bulletproof Instant Realtime Multiplayer Engine
   ========================================================= */

window.RoomsModule = {
  mqttClient: null,
  peer: null,
  connections: [],
  hostConn: null,
  isHost: false,
  broadcastChannel: null,
  currentTopic: null,
  joinRetryTimer: null,

  initLobby() {
    this.initBroadcastChannel();
    this.checkUrlInviteCode();
    this.renderLobbyPlayers();
  },

  initBroadcastChannel() {
    if ("BroadcastChannel" in window) {
      this.broadcastChannel = new BroadcastChannel("monoconcard_channel");
      this.broadcastChannel.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };
    }

    window.addEventListener("storage", (e) => {
      if (e.key === "monoconcard_sync_data" && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          this.handleIncomingMessage(data);
        } catch (err) {}
      }
    });
  },

  initMQTTCloudRelay(roomCode) {
    if (typeof mqtt === "undefined") return;

    try {
      const topic = `monoconcard/room/${roomCode}`;
      this.currentTopic = topic;

      if (this.mqttClient) {
        try { this.mqttClient.end(); } catch (e) {}
      }

      // High-availability WSS Broker endpoint
      const brokerUrl = "wss://broker.emqx.io:8084/mqtt";
      this.mqttClient = mqtt.connect(brokerUrl, {
        clientId: `client_${window.myPlayerId}_${Math.random().toString(16).substring(2, 6)}`,
        keepalive: 20,
        reconnectPeriod: 1500
      });

      this.mqttClient.on("connect", () => {
        console.log("MQTT Cloud Relay connected for room:", roomCode);
        this.mqttClient.subscribe(topic, { qos: 0 });

        const status = document.querySelector("#roomStatusText");
        if (status) status.textContent = `🟢 Đã vào phòng ${roomCode}`;
      });

      this.mqttClient.on("message", (t, msg) => {
        try {
          const data = JSON.parse(msg.toString());
          this.handleIncomingMessage(data);
        } catch (e) {}
      });
    } catch (err) {
      console.warn("MQTT init exception:", err);
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

      this.joinRoom(cleanCode);
    } else {
      const freshCode = window.generateRandomCode();
      window.gameState.roomCode = freshCode;
      this.isHost = true;

      window.gameState.players = [
        {
          id: window.myPlayerId,
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
        }
      ];

      const label = document.querySelector("#roomCodeLabel");
      if (label) label.textContent = freshCode;

      this.initMQTTCloudRelay(freshCode);
      this.initPeerServer(freshCode);
    }
  },

  generateRoomCode() {
    const freshCode = window.generateRandomCode();
    window.gameState.roomCode = freshCode;
    this.isHost = true;

    const hostPlayer = {
      id: window.myPlayerId,
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
    this.initMQTTCloudRelay(freshCode);
    this.initPeerServer(freshCode);

    return freshCode;
  },

  initPeerServer(roomCode) {
    if (typeof Peer === "undefined") return;
    try {
      if (this.peer) this.peer.destroy();
      this.peer = new Peer(`monoconcard-${roomCode}`, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
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
        conn.on("data", (data) => this.handleIncomingMessage(data));
      });
    } catch (e) {}
  },

  joinRoom(code) {
    if (!code) return;
    const cleanCode = code.trim().toUpperCase();
    window.gameState.roomCode = cleanCode;
    this.updateUrlWithRoomCode(cleanCode);
    this.isHost = false;

    const label = document.querySelector("#roomCodeLabel");
    if (label) label.textContent = cleanCode;

    const status = document.querySelector("#roomStatusText");
    if (status) status.textContent = `🟢 Đã vào phòng ${cleanCode}`;

    // Guest local initial state: Set Guest player ONLY (not Host Player 1)
    window.gameState.players = [
      {
        id: window.myPlayerId,
        name: "Player 2",
        avatar: "👤",
        color: "#36a774",
        money: window.GameConfig.STARTING_MONEY,
        asset: 0,
        host: false,
        ready: false,
        position: 0,
        isBot: false,
        bankrupt: false,
        properties: []
      }
    ];

    this.renderLobbyPlayers();
    this.initMQTTCloudRelay(cleanCode);

    // Heartbeat Join Request retry until synced from Host
    clearInterval(this.joinRetryTimer);
    const sendJoin = () => {
      const joinPayload = {
        type: "JOIN_REQUEST",
        id: window.myPlayerId,
        name: "Player 2"
      };
      this.publishCloudMessage(joinPayload);
    };

    sendJoin();
    this.joinRetryTimer = setInterval(() => {
      if (window.gameState.players.length > 1) {
        clearInterval(this.joinRetryTimer);
      } else {
        sendJoin();
      }
    }, 1200);
  },

  handleIncomingMessage(data) {
    if (!data || !data.type) return;

    if (data.type === "JOIN_REQUEST" && this.isHost) {
      const existing = window.gameState.players.find(p => p.id === data.id);
      if (!existing && window.gameState.players.length < 4) {
        const colors = ["#f4b21f", "#36a774", "#438bd4", "#e56376"];
        const playerNum = window.gameState.players.filter(p => !p.isBot).length + 1;
        const newPlayer = {
          id: data.id,
          name: data.name || `Player ${playerNum}`,
          avatar: "👤",
          color: colors[window.gameState.players.length % colors.length],
          money: window.GameConfig.STARTING_MONEY,
          asset: 0,
          host: false,
          ready: false,
          position: 0,
          isBot: false,
          bankrupt: false,
          properties: []
        };
        window.gameState.players.push(newPlayer);
        this.renderLobbyPlayers();
        this.broadcastState();
        if (window.UIModule) window.UIModule.showToast(`🟢 ${newPlayer.name} đã gia nhập phòng!`);
      } else {
        // Re-broadcast state so joining player gets updated list
        this.broadcastState();
      }
    } else if (data.type === "UPDATE_NAME") {
      const player = window.gameState.players.find(p => p.id === data.id);
      if (player) {
        player.name = data.name;
        this.renderLobbyPlayers();
        if (this.isHost) this.broadcastState();
      }
    } else if (data.type === "TOGGLE_READY") {
      const player = window.gameState.players.find(p => p.id === data.id);
      if (player) {
        player.ready = data.ready;
        this.renderLobbyPlayers();
        if (this.isHost) this.broadcastState();
      }
    } else if (data.type === "SYNC_STATE") {
      if (data.players && Array.isArray(data.players) && data.players.length > 0) {
        window.gameState.players = data.players;
      }
      if (data.boardCells) window.boardCells = data.boardCells;
      if (data.currentPlayer !== undefined) window.gameState.currentPlayer = data.currentPlayer;
      if (data.round !== undefined) window.gameState.round = data.round;

      if (data.screen && data.screen !== window.gameState.screen && data.screen !== "game") {
        if (window.UIModule) window.UIModule.showScreen(data.screen);
      }

      this.renderLobbyPlayers();
      if (window.BoardModule) window.BoardModule.renderBoard();
      if (window.UIModule) window.UIModule.renderPlayerRail();
    } else if (data.type === "START_COUNTDOWN") {
      this.playCountdownAndStart();
    }
  },

  publishCloudMessage(payload) {
    if (this.mqttClient && this.currentTopic) {
      try {
        this.mqttClient.publish(this.currentTopic, JSON.stringify(payload), { qos: 0 });
      } catch (e) {}
    }

    if (this.broadcastChannel) {
      try { this.broadcastChannel.postMessage(payload); } catch (e) {}
    }

    try {
      localStorage.setItem("monoconcard_sync_data", JSON.stringify({ ...payload, timestamp: Date.now() }));
    } catch (e) {}
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

    this.publishCloudMessage(payload);
  },

  updateMyPlayerName(newName) {
    const cleanName = newName.trim() || "Player";
    let me = window.gameState.players.find(p => p.id === window.myPlayerId);

    if (me) {
      me.name = cleanName;
      this.renderLobbyPlayers();

      const msg = { type: "UPDATE_NAME", id: me.id, name: cleanName };
      this.publishCloudMessage(msg);

      if (window.UIModule) {
        window.UIModule.showToast(`Đã đổi tên thành: ${cleanName}`);
        window.UIModule.renderPlayerRail();
      }
    }
  },

  toggleMyReady() {
    let me = window.gameState.players.find(p => p.id === window.myPlayerId);
    if (!me && window.gameState.players.length > 0) me = window.gameState.players[0];

    if (me) {
      me.ready = !me.ready;
      this.renderLobbyPlayers();

      const msg = { type: "TOGGLE_READY", id: me.id, ready: me.ready };
      this.publishCloudMessage(msg);

      if (window.UIModule) {
        window.UIModule.showToast(me.ready ? "⚡ BẠN ĐÃ SẴN SÀNG!" : "⏳ BẠN ĐÃ HỦY SẴN SÀNG!");
      }
    }
  },

  triggerStartGame() {
    if (!this.isHost) {
      if (window.UIModule) window.UIModule.showToast("Chỉ Chủ phòng mới có quyền bấm Bắt đầu!");
      return;
    }

    const activePlayers = window.gameState.players.filter(p => !p.bankrupt);
    const allReady = activePlayers.length >= 2 && activePlayers.every(p => p.ready);

    if (!allReady) {
      if (window.UIModule) window.UIModule.showToast("Cần tất cả người chơi bấm Sẵn Sàng!");
      return;
    }

    const payload = { type: "START_COUNTDOWN" };
    this.publishCloudMessage(payload);
    this.playCountdownAndStart();
  },

  playCountdownAndStart() {
    const overlay = document.querySelector("#countdownOverlay");
    const numEl = document.querySelector("#countdownNumber");
    if (!overlay || !numEl) {
      this.launchGameScreen();
      return;
    }

    overlay.classList.remove("hidden");
    let count = 3;
    numEl.textContent = count;

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        numEl.textContent = count;
      } else if (count === 0) {
        numEl.textContent = "BẮT ĐẦU! 🎲";
      } else {
        clearInterval(timer);
        overlay.classList.add("hidden");
        this.launchGameScreen();
      }
    }, 900);
  },

  launchGameScreen() {
    if (window.UIModule) {
      window.UIModule.showScreen("game");
      window.BoardModule.renderBoard();
      window.UIModule.renderPlayerRail();

      const firstPlayer = window.gameState.players[window.gameState.currentPlayer];
      const rollBtn = document.querySelector("#rollDiceBtn");
      if (rollBtn) rollBtn.disabled = firstPlayer ? firstPlayer.isBot : false;

      if (firstPlayer && firstPlayer.isBot) {
        window.BotModule.handleBotTurn(firstPlayer);
      }
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

    container.innerHTML = window.gameState.players.map((player, index) => {
      const isMe = player.id === window.myPlayerId;

      return `
        <div class="lobby-player" style="animation-delay:${index * 70}ms">
          <div class="avatar" style="--avatar-color:${player.color}">${player.avatar}</div>
          <div class="player-details">
            <div class="player-name">
              ${isMe && !player.isBot ? `
                <input class="player-name-input" value="${player.name}" onchange="window.RoomsModule.updateMyPlayerName(this.value)" placeholder="Nhập tên của bạn..." title="Bấm để chỉnh sửa tên của bạn" />
                <span class="edit-icon" title="Sửa tên của bạn">✏️</span>
              ` : `
                <span style="font-weight:900;">${player.name}</span>
              `}
              ${player.isBot ? '<span class="bot-badge">🤖 Bot</span>' : ''}
              ${player.host ? '<span>👑</span>' : ''}
            </div>
            ${player.host ? '<div class="host-tag">👑 Chủ phòng</div>' : ''}
          </div>
          <div class="lobby-player-actions">
            <div class="${player.ready ? 'ready-tag' : 'wait-tag'}">
              ${player.ready ? '✓ Sẵn sàng' : '⏳ Chưa sẵn sàng'}
            </div>
            ${this.isHost && !player.host ? `
              <button class="btn-remove-player" onclick="window.RoomsModule.removePlayer(${player.id})" title="Xóa người chơi">✕</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join("");

    // Toggle Ready Button state for current device user
    const me = window.gameState.players.find(p => p.id === window.myPlayerId) || window.gameState.players[0];
    const toggleReadyBtn = document.querySelector("#toggleReadyBtn");
    if (toggleReadyBtn && me) {
      if (me.ready) {
        toggleReadyBtn.classList.add("ready-btn-active");
        toggleReadyBtn.textContent = "✓ Đã Sẵn Sàng";
      } else {
        toggleReadyBtn.classList.remove("ready-btn-active");
        toggleReadyBtn.textContent = "⚡ Sẵn Sàng";
      }
    }

    const activePlayers = window.gameState.players.filter(p => !p.bankrupt);
    const allReady = activePlayers.length >= 2 && activePlayers.every(p => p.ready);

    const startBtn = document.querySelector("#startGameBtn");
    const hintText = document.querySelector("#roomHintText");

    if (startBtn) {
      if (!this.isHost) {
        startBtn.textContent = "⏳ Đang chờ Chủ phòng bấm Bắt đầu...";
        startBtn.disabled = true;
      } else {
        startBtn.textContent = "🚀 Bắt đầu trò chơi";
        startBtn.disabled = !allReady;
      }
    }

    if (hintText) {
      if (activePlayers.length < 2) {
        hintText.textContent = "Cần ít nhất 2 người chơi để bắt đầu!";
      } else if (!allReady) {
        hintText.textContent = "Chờ tất cả người chơi bấm Sẵn Sàng (Ready)!";
      } else {
        hintText.textContent = "Tất cả đã sẵn sàng! Chủ phòng bấm Bắt đầu trò chơi!";
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
