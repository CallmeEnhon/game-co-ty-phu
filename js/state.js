/* =========================================================
   STATE MODULE (state.js)
   MonoConCard - Business Tour Inspired Layout
   32 Tiles, Grouped Colors, Beaches, Proper Money & Rent
   ========================================================= */

window.GameConfig = {
  STARTING_MONEY: 2000,
  PASS_START_BONUS: 500,
  WORLD_TOUR_FEE: 250,
  FESTIVAL_DURATION_ROUNDS: 3,
  FESTIVAL_RENT_MULTIPLIER: 5,
  MAX_PROPERTY_LEVEL: 3,
  TAX_PERCENTAGE: 0.10,
  JAIL_FINE: 150
};

window.gameSettings = {
  beachWinEnabled: true
};

if (!localStorage.getItem("monoconcard_my_id")) {
  localStorage.setItem("monoconcard_my_id", "p_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7));
}
window.myPlayerId = localStorage.getItem("monoconcard_my_id");

window.generateRandomCode = function() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

window.initialPlayers = [
  {
    id: window.myPlayerId,
    name: "Player 1",
    avatar: "👑",
    color: "#f4b21f",
    money: 2000,
    asset: 0,
    host: true,
    ready: true,
    position: 0,
    isBot: false,
    bankrupt: false,
    inJail: false,
    jailTurns: 0,
    doubleRollCount: 0,
    properties: []
  }
];

/*
  BUSINESS TOUR INSPIRED BOARD LAYOUT (32 Cells)
  Bottom row →  Right col ↑  Top row ←  Left col ↓
  
  COLOR GROUPS (sequential, no jumping):
  - 🟤 Brown (group_brown):  Tiles 1-2   (cheapest, starter)
  - 🔵 Blue  (group_blue):   Tiles 5-6
  - 🔴 Red   (group_red):    Tiles 9-11
  - 🟠 Orange(group_orange): Tiles 13-15
  - 🟢 Green (group_green):  Tiles 17-18
  - 🟡 Yellow(group_yellow): Tiles 21-22
  - 🟣 Purple(group_purple): Tiles 25-27
  - 🟥 Dark  (group_dark):   Tiles 29-31
  - 🏖️ Beach (beach):        Tiles 7, 19, 23, 28
  
  SPECIALS: start(0), tax(2,20), chance(4,12), world_tour(8), festival(16), jail(24)
*/

window.boardCells = [
  // --- BOTTOM ROW (left→right, pos 0..8) ---
  { id: 0,  title: "BẮT ĐẦU",            type: "start",      icon: "🚩",  subtitle: "Qua đây nhận +$500" },
  { id: 1,  title: "Hà Nội",              type: "property",   icon: "🌉",  price: "$100", cost: 100,  rent: 14,  color: "#c0392b", group: "group_brown", ownerId: null, level: 0 },
  { id: 2,  title: "Thuế Tài Sản",        type: "tax",        icon: "📜",  subtitle: "Nộp 10% tài sản" },
  { id: 3,  title: "TP. Hồ Chí Minh",    type: "property",   icon: "🏙️",  price: "$120", cost: 120,  rent: 18,  color: "#c0392b", group: "group_brown", ownerId: null, level: 0 },
  { id: 4,  title: "Cơ Hội",              type: "chance",     icon: "🎡" },
  { id: 5,  title: "Bangkok",             type: "property",   icon: "🛕",  price: "$160", cost: 160,  rent: 24,  color: "#2980b9", group: "group_blue",  ownerId: null, level: 0 },
  { id: 6,  title: "Singapore",           type: "property",   icon: "🦁",  price: "$180", cost: 180,  rent: 28,  color: "#2980b9", group: "group_blue",  ownerId: null, level: 0 },
  { id: 7,  title: "Bali 🏖️",            type: "beach",      icon: "🏝️",  price: "$200", cost: 200,  rent: 40,  color: "#00d2d3", group: "beach",       ownerId: null, level: 0 },
  { id: 8,  title: "VÒNG QUANH THẾ GIỚI",type: "world_tour", icon: "✈️",  subtitle: "Bay tự do ($250)" },
  
  // --- RIGHT COL (bottom→top, pos 9..15) ---
  { id: 9,  title: "Dubai",               type: "property",   icon: "🕌",  price: "$220", cost: 220,  rent: 34,  color: "#e74c3c", group: "group_red",   ownerId: null, level: 0 },
  { id: 10, title: "Mumbai",              type: "property",   icon: "🕍",  price: "$240", cost: 240,  rent: 38,  color: "#e74c3c", group: "group_red",   ownerId: null, level: 0 },
  { id: 11, title: "Tokyo",               type: "property",   icon: "⛩️",  price: "$260", cost: 260,  rent: 42,  color: "#e74c3c", group: "group_red",   ownerId: null, level: 0 },
  { id: 12, title: "Cơ Hội",              type: "chance",     icon: "🎡" },
  { id: 13, title: "Sydney",              type: "property",   icon: "🦘",  price: "$300", cost: 300,  rent: 50,  color: "#e67e22", group: "group_orange",ownerId: null, level: 0 },
  { id: 14, title: "Auckland",            type: "property",   icon: "🐑",  price: "$320", cost: 320,  rent: 54,  color: "#e67e22", group: "group_orange",ownerId: null, level: 0 },
  { id: 15, title: "Melbourne",           type: "property",   icon: "🏏",  price: "$340", cost: 340,  rent: 58,  color: "#e67e22", group: "group_orange",ownerId: null, level: 0 },
  
  // --- TOP ROW (right→left, pos 16..24) ---
  { id: 16, title: "GIẢI ĐẤU THẾ GIỚI",  type: "festival",   icon: "🏆",  subtitle: "Chọn đất tổ chức Lễ Hội" },
  { id: 17, title: "Paris",               type: "property",   icon: "🗼",  price: "$360", cost: 360,  rent: 64,  color: "#27ae60", group: "group_green", ownerId: null, level: 0 },
  { id: 18, title: "Amsterdam",           type: "property",   icon: "🌷",  price: "$380", cost: 380,  rent: 68,  color: "#27ae60", group: "group_green", ownerId: null, level: 0 },
  { id: 19, title: "Nice 🏖️",            type: "beach",      icon: "🏝️",  price: "$200", cost: 200,  rent: 40,  color: "#00d2d3", group: "beach",       ownerId: null, level: 0 },
  { id: 20, title: "Thuế Xa Xỉ",         type: "tax",        icon: "💎",  subtitle: "Nộp 10% tài sản" },
  { id: 21, title: "Roma",                type: "property",   icon: "🏛️",  price: "$400", cost: 400,  rent: 72,  color: "#f1c40f", group: "group_yellow",ownerId: null, level: 0 },
  { id: 22, title: "Madrid",              type: "property",   icon: "💃",  price: "$420", cost: 420,  rent: 76,  color: "#f1c40f", group: "group_yellow",ownerId: null, level: 0 },
  { id: 23, title: "Venice 🏖️",          type: "beach",      icon: "🛶",  price: "$200", cost: 200,  rent: 40,  color: "#00d2d3", group: "beach",       ownerId: null, level: 0 },
  { id: 24, title: "ĐẢO BỊ LÃNG QUÊN",  type: "jail",       icon: "⛓️",  subtitle: "Trả $150 hoặc đổ Đôi" },
  
  // --- LEFT COL (top→bottom, pos 25..31) ---
  { id: 25, title: "New York",            type: "property",   icon: "🗽",  price: "$440", cost: 440,  rent: 82,  color: "#8e44ad", group: "group_purple",ownerId: null, level: 0 },
  { id: 26, title: "Las Vegas",           type: "property",   icon: "🎰",  price: "$460", cost: 460,  rent: 86,  color: "#8e44ad", group: "group_purple",ownerId: null, level: 0 },
  { id: 27, title: "Chicago",             type: "property",   icon: "🏙️",  price: "$480", cost: 480,  rent: 90,  color: "#8e44ad", group: "group_purple",ownerId: null, level: 0 },
  { id: 28, title: "Sydney 🏖️",          type: "beach",      icon: "🏝️",  price: "$200", cost: 200,  rent: 40,  color: "#00d2d3", group: "beach",       ownerId: null, level: 0 },
  { id: 29, title: "Thượng Hải",          type: "property",   icon: "🌆",  price: "$500", cost: 500,  rent: 96,  color: "#2c3e50", group: "group_dark",  ownerId: null, level: 0 },
  { id: 30, title: "Hồng Kông",           type: "property",   icon: "🌃",  price: "$520", cost: 520,  rent: 100, color: "#2c3e50", group: "group_dark",  ownerId: null, level: 0 },
  { id: 31, title: "Bắc Kinh",            type: "property",   icon: "🏯",  price: "$540", cost: 540,  rent: 104, color: "#2c3e50", group: "group_dark",  ownerId: null, level: 0 }
];

// Grid positions map each tile id → [row, col] in 9x9 grid (1-indexed)
window.gridPositions = [
  [9,9], [9,8], [9,7], [9,6], [9,5], [9,4], [9,3], [9,2], [9,1],
  [8,1], [7,1], [6,1], [5,1], [4,1], [3,1], [2,1],
  [1,1], [1,2], [1,3], [1,4], [1,5], [1,6], [1,7], [1,8], [1,9],
  [2,9], [3,9], [4,9], [5,9], [6,9], [7,9], [8,9]
];

window.gameState = {
  screen: "lobby",
  currentPlayer: 0,
  round: 1,
  turnCount: 0,
  rolling: false,
  busy: false,
  cameraLocked: false,
  roomCode: window.generateRandomCode(),
  botDifficulty: "normal",
  players: JSON.parse(JSON.stringify(window.initialPlayers)),
  stats: {
    startTime: Date.now(),
    diceRolls: 0,
    propertiesBought: 0,
    chanceDrawn: 0,
    bankruptcies: 0
  }
};

window.checkColorMonopoly = function(ownerId, groupName) {
  if (!groupName || groupName === "beach") return false;
  const groupCells = window.boardCells.filter(c => c.group === groupName);
  return groupCells.every(c => c.ownerId === ownerId);
};

window.calculateEffectiveRent = function(cell) {
  if ((cell.type !== "property" && cell.type !== "beach") || cell.ownerId === null) return 0;
  const level = cell.level || 0;
  const baseRent = cell.rent || 20;
  let multiplier = 1 + level * 0.7;
  if (cell.group && window.checkColorMonopoly(cell.ownerId, cell.group)) {
    multiplier *= 2;
  }
  let rent = Math.round(baseRent * multiplier);
  if (cell.festivalUntil && cell.festivalUntil >= window.gameState.round) {
    rent *= window.GameConfig.FESTIVAL_RENT_MULTIPLIER;
  }
  return rent;
};

window.calculateUpgradeCost = function(cell) {
  if (cell.type !== "property") return 0;
  const level = cell.level || 0;
  return Math.round(cell.cost * 0.5 * (1 + level * 0.4));
};

window.checkBeachMonopolyWin = function(player) {
  if (!window.gameSettings.beachWinEnabled) return false;
  const ownedBeaches = window.boardCells.filter(c => c.type === "beach" && c.ownerId === player.id);
  return ownedBeaches.length >= 4;
};
