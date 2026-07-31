// Game Cờ Tỷ Phú - Monopoly Vietnam Edition Engine

// 40 Tiles Configuration
const BOARD_TILES = [
  { id: 0, name: "BẮT ĐẦU", type: "start", price: 0, color: "#10b981" },
  { id: 1, name: "Cần Thơ", type: "property", price: 100, rent: 10, color: "#8b5cf6", owner: null },
  { id: 2, name: "Khí Vận", type: "fate", price: 0, color: "#64748b" },
  { id: 3, name: "Cà Mau", type: "property", price: 120, rent: 12, color: "#8b5cf6", owner: null },
  { id: 4, name: "Thuế Thu Nhập", type: "tax", price: 200, color: "#ef4444" },
  { id: 5, name: "Bến Xe Miền Đông", type: "station", price: 200, rent: 25, color: "#6b7280", owner: null },
  { id: 6, name: "Vũng Tàu", type: "property", price: 140, rent: 14, color: "#3b82f6", owner: null },
  { id: 7, name: "Cơ Hội", type: "chance", price: 0, color: "#f59e0b" },
  { id: 8, name: "Phan Thiết", type: "property", price: 150, rent: 15, color: "#3b82f6", owner: null },
  { id: 9, name: "Đà Lạt", type: "property", price: 160, rent: 16, color: "#3b82f6", owner: null },
  
  { id: 10, name: "TÙ GIAM", type: "jail", price: 0, color: "#475569" },
  { id: 11, name: "Nha Trang", type: "property", price: 180, rent: 18, color: "#ec4899", owner: null },
  { id: 12, name: "Nhà Máy Điện", type: "utility", price: 150, rent: 15, color: "#eab308", owner: null },
  { id: 13, name: "Quy Nhơn", type: "property", price: 180, rent: 18, color: "#ec4899", owner: null },
  { id: 14, name: "Hội An", type: "property", price: 200, rent: 20, color: "#ec4899", owner: null },
  { id: 15, name: "Bến Xe Miền Tây", type: "station", price: 200, rent: 25, color: "#6b7280", owner: null },
  { id: 16, name: "Đà Nẵng", type: "property", price: 220, rent: 22, color: "#f97316", owner: null },
  { id: 17, name: "Khí Vận", type: "fate", price: 0, color: "#64748b" },
  { id: 18, name: "Huế", type: "property", price: 220, rent: 22, color: "#f97316", owner: null },
  { id: 19, name: "Vinh", type: "property", price: 240, rent: 24, color: "#f97316", owner: null },

  { id: 20, name: "ĐI DU LỊCH", type: "parking", price: 0, color: "#06b6d4" },
  { id: 21, name: "Hải Phòng", type: "property", price: 260, rent: 26, color: "#ef4444", owner: null },
  { id: 22, name: "Cơ Hội", type: "chance", price: 0, color: "#f59e0b" },
  { id: 23, name: "Hạ Long", type: "property", price: 260, rent: 26, color: "#ef4444", owner: null },
  { id: 24, name: "Sapa", type: "property", price: 280, rent: 28, color: "#ef4444", owner: null },
  { id: 25, name: "Ga Hà Nội", type: "station", price: 200, rent: 25, color: "#6b7280", owner: null },
  { id: 26, name: "Quảng Ninh", type: "property", price: 300, rent: 30, color: "#84cc16", owner: null },
  { id: 27, name: "Nhà Máy Nước", type: "utility", price: 150, rent: 15, color: "#0284c7", owner: null },
  { id: 28, name: "Bắc Ninh", type: "property", price: 300, rent: 30, color: "#84cc16", owner: null },
  { id: 29, name: "Phú Quốc", type: "property", price: 320, rent: 32, color: "#84cc16", owner: null },

  { id: 30, name: "VÀO TÙ", type: "go_to_jail", price: 0, color: "#dc2626" },
  { id: 31, name: "TP. Hồ Chí Minh", type: "property", price: 350, rent: 35, color: "#d97706", owner: null },
  { id: 32, name: "Thuế Giá Trị Gia Tăng", type: "tax", price: 150, color: "#ef4444" },
  { id: 33, name: "Thủ Đức", type: "property", price: 350, rent: 35, color: "#d97706", owner: null },
  { id: 34, name: "Khí Vận", type: "fate", price: 0, color: "#64748b" },
  { id: 35, name: "Sân Bay Tân Sơn Nhất", type: "station", price: 200, rent: 25, color: "#6b7280", owner: null },
  { id: 36, name: "Cơ Hội", type: "chance", price: 0, color: "#f59e0b" },
  { id: 37, name: "Hà Nội - Hoàn Kiếm", type: "property", price: 400, rent: 40, color: "#d97706", owner: null },
  { id: 38, name: "Thuế Đặc Biệt", type: "tax", price: 100, color: "#ef4444" },
  { id: 39, name: "Hà Nội - Ba Đình", type: "property", price: 400, rent: 40, color: "#d97706", owner: null }
];

// Players Configuration
const PLAYERS = [
  { id: 1, name: "Người chơi 1", money: 1500, position: 0, color: "#ef4444", cssClass: "token-p1", classBadge: "p1" },
  { id: 2, name: "Người chơi 2", money: 1500, position: 0, color: "#3b82f6", cssClass: "token-p2", classBadge: "p2" }
];

let currentPlayerIndex = 0;
let hasRolled = false;

// DOM Elements
const boardEl = document.getElementById("monopoly-board");
const playersListEl = document.getElementById("players-list");
const turnIndicatorEl = document.getElementById("turn-indicator");
const gameLogEl = document.getElementById("game-log");
const dice1El = document.getElementById("dice1");
const dice2El = document.getElementById("dice2");
const btnRollEl = document.getElementById("btn-roll-dice");
const btnBuyEl = document.getElementById("btn-buy-property");
const btnEndTurnEl = document.getElementById("btn-end-turn");

// Modal Elements
const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalActions = document.getElementById("modal-actions");
const btnModalClose = document.getElementById("btn-modal-close");

// Initialize Game
function initGame() {
  renderBoard();
  renderPlayers();
  updateControls();
  addLog("Game bắt đầu! Người chơi 1 sẽ đi trước.", "system");
}

// Render Board Grid
function renderBoard() {
  // Clear existing tiles except center
  const centerEl = document.querySelector(".board-center");
  boardEl.innerHTML = "";
  boardEl.appendChild(centerEl);

  BOARD_TILES.forEach((tile, index) => {
    const tileEl = document.createElement("div");
    tileEl.className = `tile tile-${index}`;
    tileEl.id = `tile-${index}`;

    // Map index to grid row & col for Monopoly 11x11 perimeter
    const coords = getTileGridCoords(index);
    tileEl.style.gridColumn = coords.col;
    tileEl.style.gridRow = coords.row;

    let tileHeaderHTML = "";
    if (tile.color && tile.type === "property") {
      tileHeaderHTML = `<div class="tile-header" style="background-color: ${tile.color}"></div>`;
    }

    tileEl.innerHTML = `
      ${tileHeaderHTML}
      <div class="tile-name">${tile.name}</div>
      ${tile.price > 0 ? `<div class="tile-price">$${tile.price}k</div>` : ""}
      <div class="player-tokens" id="tokens-${index}"></div>
    `;

    boardEl.appendChild(tileEl);
  });

  updatePlayerTokensOnBoard();
}

// Get Grid coordinates for 11x11 perimeter
function getTileGridCoords(index) {
  if (index >= 0 && index <= 10) {
    return { row: 11, col: 11 - index };
  } else if (index >= 11 && index <= 20) {
    return { row: 11 - (index - 10), col: 1 };
  } else if (index >= 21 && index <= 30) {
    return { row: 1, col: 1 + (index - 20) };
  } else {
    return { row: 1 + (index - 30), col: 11 };
  }
}

// Render Players Sidebar
function renderPlayers() {
  playersListEl.innerHTML = "";
  PLAYERS.forEach((player, index) => {
    const isCurrent = index === currentPlayerIndex;
    const item = document.createElement("div");
    item.className = `player-item ${isCurrent ? "active" : ""}`;
    item.innerHTML = `
      <div class="player-info">
        <div class="player-badge" style="background-color: ${player.color}"></div>
        <span>${player.name}</span>
      </div>
      <div class="player-money">$${player.money}k</div>
    `;
    playersListEl.appendChild(item);
  });

  const activePlayer = PLAYERS[currentPlayerIndex];
  turnIndicatorEl.innerHTML = `Lượt của: <strong style="color:${activePlayer.color}">${activePlayer.name}</strong>`;
}

// Update Tokens on Board
function updatePlayerTokensOnBoard() {
  document.querySelectorAll(".player-tokens").forEach(el => el.innerHTML = "");
  PLAYERS.forEach((player) => {
    const tokenContainer = document.getElementById(`tokens-${player.position}`);
    if (tokenContainer) {
      const token = document.createElement("div");
      token.className = `token ${player.cssClass}`;
      tokenContainer.appendChild(token);
    }
  });
}

// Add Log Message
function addLog(message, type = "normal") {
  const p = document.createElement("p");
  p.className = `log-item ${type}`;
  p.textContent = message;
  gameLogEl.appendChild(p);
  gameLogEl.scrollTop = gameLogEl.scrollHeight;
}

// Roll Dice Handler
btnRollEl.addEventListener("click", () => {
  if (hasRolled) return;

  dice1El.classList.add("rolling");
  dice2El.classList.add("rolling");
  btnRollEl.disabled = true;

  setTimeout(() => {
    const val1 = Math.floor(Math.random() * 6) + 1;
    const val2 = Math.floor(Math.random() * 6) + 1;

    dice1El.textContent = val1;
    dice2El.textContent = val2;

    dice1El.classList.remove("rolling");
    dice2El.classList.remove("rolling");

    const totalSteps = val1 + val2;
    hasRolled = true;

    const player = PLAYERS[currentPlayerIndex];
    addLog(`${player.name} đổ xí ngầu được ${val1} và ${val2} (${totalSteps} bước).`);

    movePlayer(player, totalSteps);
  }, 600);
});

// Move Player
function movePlayer(player, steps) {
  let oldPos = player.position;
  let newPos = (oldPos + steps) % 40;

  // Passed GO
  if (newPos < oldPos) {
    player.money += 200;
    addLog(`🎉 ${player.name} đi qua ô BẮT ĐẦU và nhận $200k thưởng!`, "system");
  }

  player.position = newPos;
  updatePlayerTokensOnBoard();
  renderPlayers();

  handleTileAction(player, BOARD_TILES[newPos]);
  updateControls();
}

// Handle Tile Action
function handleTileAction(player, tile) {
  addLog(`${player.name} đến ô: ${tile.name}`);

  if (tile.type === "property" || tile.type === "station" || tile.type === "utility") {
    if (tile.owner === null) {
      if (player.money >= tile.price) {
        btnBuyEl.disabled = false;
      }
    } else if (tile.owner !== player.id) {
      const owner = PLAYERS.find(p => p.id === tile.owner);
      const rent = tile.rent;
      player.money -= rent;
      owner.money += rent;
      addLog(`⚠️ ${player.name} phải trả tiền xâu $${rent}k cho ${owner.name}.`, "system");
      renderPlayers();
    }
  } else if (tile.type === "tax") {
    player.money -= tile.price;
    addLog(`💸 ${player.name} đã nộp ${tile.name} là $${tile.price}k.`, "system");
    renderPlayers();
  } else if (tile.type === "go_to_jail") {
    player.position = 10;
    addLog(`🚨 ${player.name} vi phạm luật và bị VÀO TÙ!`, "system");
    updatePlayerTokensOnBoard();
  } else if (tile.type === "chance" || tile.type === "fate") {
    const reward = Math.floor(Math.random() * 100) + 20;
    player.money += reward;
    addLog(`🎁 ${player.name} rút thẻ ${tile.name} và nhận quà $${reward}k!`, "system");
    renderPlayers();
  }
}

// Buy Property Handler
btnBuyEl.addEventListener("click", () => {
  const player = PLAYERS[currentPlayerIndex];
  const tile = BOARD_TILES[player.position];

  if (tile && (tile.type === "property" || tile.type === "station" || tile.type === "utility") && tile.owner === null) {
    if (player.money >= tile.price) {
      player.money -= tile.price;
      tile.owner = player.id;
      addLog(`🏢 ${player.name} đã mua thành công ô ${tile.name} với giá $${tile.price}k!`, "system");
      btnBuyEl.disabled = true;
      renderPlayers();
    }
  }
});

// End Turn Handler
btnEndTurnEl.addEventListener("click", () => {
  currentPlayerIndex = (currentPlayerIndex + 1) % PLAYERS.length;
  hasRolled = false;
  btnRollEl.disabled = false;
  btnBuyEl.disabled = true;
  btnEndTurnEl.disabled = true;
  renderPlayers();
  addLog(`--- Chuyển lượt sang ${PLAYERS[currentPlayerIndex].name} ---`);
});

function updateControls() {
  btnEndTurnEl.disabled = !hasRolled;
}

// Modal Close
btnModalClose.addEventListener("click", () => {
  modalOverlay.classList.add("hidden");
});

// Start Game on load
window.addEventListener("DOMContentLoaded", initGame);
