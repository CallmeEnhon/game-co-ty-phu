/* =========================================================
   STATE MODULE (state.js)
   MonoConCard - Dynamic Room Code, Identity & 3D Tile Icons
   ========================================================= */

window.GameConfig = {
  STARTING_MONEY: 2000,
  PASS_START_BONUS: 300,
  WORLD_TOUR_FEE: 50,
  FESTIVAL_DURATION_ROUNDS: 3,
  FESTIVAL_RENT_MULTIPLIER: 5,
  MAX_PROPERTY_LEVEL: 3,
  TAX_PERCENTAGE: 0.10
};

// Default Room Settings
window.gameSettings = {
  beachWinEnabled: true
};

// Initialize persistent Local Device Player ID
if (!localStorage.getItem("monoconcard_my_id")) {
  localStorage.setItem("monoconcard_my_id", "p_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7));
}
window.myPlayerId = localStorage.getItem("monoconcard_my_id");

// Helper: Generate Random 4-letter Room Code
window.generateRandomCode = function() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Initial Player state for Host
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

// Official 32 Tiles with Unique 3D Isometric Icons
window.boardCells = [
  { id: 0, title: "BẮT ĐẦU", type: "start", icon: "🚩", subtitle: "Nhận +$300" },
  { id: 1, title: "Moskva", type: "property", price: "$120", cost: 120, rent: 20, color: "#f78da7", group: "pink", ownerId: null, level: 0, icon: "🏛️" },
  { id: 2, title: "Thuế Tài Sản", type: "tax", icon: "📜", price: "10% Tài sản", subtitle: "Thuế 10%" },
  { id: 3, title: "Sochi", type: "property", price: "$140", cost: 140, rent: 25, color: "#f78da7", group: "pink", ownerId: null, level: 0, icon: "🏔️" },
  { id: 4, title: "Cơ Hội", type: "chance", icon: "🎡" },
  { id: 5, title: "Lyon", type: "property", price: "$160", cost: 160, rent: 30, color: "#54a0ff", group: "blue", ownerId: null, level: 0, icon: "🍇" },
  { id: 6, title: "Paris", type: "property", price: "$180", cost: 180, rent: 35, color: "#54a0ff", group: "blue", ownerId: null, level: 0, icon: "🗼" },
  { id: 7, title: "Nice 🏖️", type: "beach", price: "$200", cost: 200, rent: 40, color: "#00d2d3", group: "beach", ownerId: null, level: 0, icon: "🏝️" },
  { id: 8, title: "VÒNG QUANH THẾ GIỚI", type: "world_tour", icon: "✈️", subtitle: "Bay tự do ($50)" },
  { id: 9, title: "New York", type: "property", price: "$220", cost: 220, rent: 45, color: "#9c88ff", group: "purple", ownerId: null, level: 0, icon: "🗽" },
  { id: 10, title: "Las Vegas", type: "property", price: "$240", cost: 240, rent: 50, color: "#9c88ff", group: "purple", ownerId: null, level: 0, icon: "🎰" },
  { id: 11, title: "Chicago", type: "property", price: "$260", cost: 260, rent: 55, color: "#9c88ff", group: "purple", ownerId: null, level: 0, icon: "🏙️" },
  { id: 12, title: "Cơ Hội", type: "chance", icon: "🎡" },
  { id: 13, title: "Sydney", type: "property", price: "$280", cost: 280, rent: 60, color: "#8395a7", group: "gray", ownerId: null, level: 0, icon: "🦘" },
  { id: 14, title: "Dubai", type: "property", price: "$300", cost: 300, rent: 65, color: "#8395a7", group: "gray", ownerId: null, level: 0, icon: "🕌" },
  { id: 15, title: "London", type: "property", price: "$320", cost: 320, rent: 70, color: "#8395a7", group: "gray", ownerId: null, level: 0, icon: "🏰" },
  { id: 16, title: "GIẢI ĐẤU THẾ GIỚI", type: "festival", icon: "🏆", subtitle: "Lễ hội x5 Thuê" },
  { id: 17, title: "Berlin", type: "property", price: "$340", cost: 340, rent: 75, color: "#1dd1a1", group: "green", ownerId: null, level: 0, icon: "🏛️" },
  { id: 18, title: "Hamburg", type: "property", price: "$360", cost: 360, rent: 80, color: "#1dd1a1", group: "green", ownerId: null, level: 0, icon: "⚓" },
  { id: 19, title: "Síp (Cyprus) 🏖️", type: "beach", price: "$200", cost: 200, rent: 40, color: "#00d2d3", group: "beach", ownerId: null, level: 0, icon: "🏝️" },
  { id: 20, title: "Cơ Hội", type: "chance", icon: "🎡" },
  { id: 21, title: "Roma", type: "property", price: "$380", cost: 380, rent: 85, color: "#c8d6e5", group: "lime", ownerId: null, level: 0, icon: "🏛️" },
  { id: 22, title: "Milan", type: "property", price: "$400", cost: 400, rent: 90, color: "#c8d6e5", group: "lime", ownerId: null, level: 0, icon: "👗" },
  { id: 23, title: "Venice 🏖️", type: "beach", price: "$200", cost: 200, rent: 40, color: "#00d2d3", group: "beach", ownerId: null, level: 0, icon: "🛶" },
  { id: 24, title: "ĐẢO BỊ LẶNG QUÊN", type: "jail", icon: "🏝️", subtitle: "Mắc kẹt 3 lượt" },
  { id: 25, title: "Thượng Hải", type: "property", price: "$420", cost: 420, rent: 95, color: "#feca57", group: "white", ownerId: null, level: 0, icon: "🏙️" },
  { id: 26, title: "Bắc Kinh", type: "property", price: "$440", cost: 440, rent: 100, color: "#feca57", group: "white", ownerId: null, level: 0, icon: "⛩️" },
  { id: 27, title: "Hồng Kông", type: "property", price: "$460", cost: 460, rent: 105, color: "#feca57", group: "white", ownerId: null, level: 0, icon: "🌃" },
  { id: 28, title: "Bali 🏖️", type: "beach", price: "$200", cost: 200, rent: 40, color: "#00d2d3", group: "beach", ownerId: null, level: 0, icon: "🏝️" },
  { id: 29, title: "Madrid", type: "property", price: "$480", cost: 480, rent: 110, color: "#ff9f43", group: "rich_orange", ownerId: null, level: 0, icon: "💃" },
  { id: 30, title: "Seville", type: "property", price: "$500", cost: 500, rent: 115, color: "#ff9f43", group: "rich_orange", ownerId: null, level: 0, icon: "🏰" },
  { id: 31, title: "Granada", type: "property", price: "$520", cost: 520, rent: 120, color: "#ff9f43", group: "rich_orange", ownerId: null, level: 0, icon: "🏛️" }
];

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
  const baseRent = cell.rent || 30;

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
  if (cell.type !== "property" && cell.type !== "beach") return 0;
  const level = cell.level || 0;
  return Math.round(cell.cost * 0.6 * (1 + level * 0.5));
};

window.checkBeachMonopolyWin = function(player) {
  if (!window.gameSettings.beachWinEnabled) return false;
  const ownedBeaches = window.boardCells.filter(c => c.type === "beach" && c.ownerId === player.id);
  return ownedBeaches.length >= 4;
};
