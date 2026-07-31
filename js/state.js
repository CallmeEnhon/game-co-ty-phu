/* =========================================================
   STATE MODULE (state.js)
   Manages game state, board data, player models, and rules.
   ========================================================= */

window.GameConfig = {
  STARTING_MONEY: 1500,
  PASS_START_BONUS: 200,
  FESTIVAL_DURATION_ROUNDS: 3,
  FESTIVAL_RENT_MULTIPLIER: 2,
  MAX_PROPERTY_LEVEL: 3
};

window.initialPlayers = [
  { id: 0, name: "Sếp Lớn", avatar: "👨🏻‍💼", color: "#f0a43b", money: 1500, asset: 0, host: true, ready: true, position: 0, isBot: false, bankrupt: false, properties: [] },
  { id: 1, name: "Marketing Tina", avatar: "👩🏻‍💼", color: "#e56376", money: 1500, asset: 0, host: false, ready: true, position: 0, isBot: true, bankrupt: false, properties: [] },
  { id: 2, name: "Kế Toán Nam", avatar: "👨🏻‍💻", color: "#36a774", money: 1500, asset: 0, host: false, ready: true, position: 0, isBot: true, bankrupt: false, properties: [] },
  { id: 3, name: "Dev Huy", avatar: "👨🏻‍🔬", color: "#438bd4", money: 1500, asset: 0, host: false, ready: false, position: 0, isBot: true, bankrupt: false, properties: [] }
];

window.boardCells = [
  { id: 0, title: "Bắt đầu", type: "start", icon: "↩️", subtitle: "Nhận $200" },
  { id: 1, title: "Thuế VAT", type: "tax", price: "Trả $150", amount: 150 },
  { id: 2, title: "Phòng Giám Đốc", type: "property", price: "$220", cost: 220, rent: 35, color: "#e36e64", ownerId: null, level: 0 },
  { id: 3, title: "Cơ hội", type: "chance", icon: "❓" },
  { id: 4, title: "Phòng Họp", type: "property", price: "$240", cost: 240, rent: 40, color: "#c9a54a", ownerId: null, level: 0 },
  { id: 5, title: "Thuế tài sản", type: "tax", price: "Trả $100", amount: 100 },
  { id: 6, title: "Phòng Kinh Doanh", type: "property", price: "$200", cost: 200, rent: 30, color: "#49a86a", ownerId: null, level: 0 },
  { id: 7, title: "Đi công tác", type: "corner", icon: "✈️", subtitle: "Ghé thăm" },
  { id: 8, title: "Phòng Pháp Chế", type: "property", price: "$200", cost: 200, rent: 30, color: "#8c6bb0", ownerId: null, level: 0 },
  { id: 9, title: "Phòng Nhân Sự", type: "property", price: "$220", cost: 220, rent: 35, color: "#8c6bb0", ownerId: null, level: 0 },
  { id: 10, title: "Cơ hội", type: "chance", icon: "❓" },
  { id: 11, title: "Bãi đỗ xe", type: "corner", icon: "🚗" },
  { id: 12, title: "Phòng Marketing", type: "property", price: "$200", cost: 200, rent: 30, color: "#efc42b", ownerId: null, level: 0 },
  { id: 13, title: "Phòng Kế Toán", type: "property", price: "$200", cost: 200, rent: 30, color: "#efc42b", ownerId: null, level: 0 },
  { id: 14, title: "Thuế thu nhập", type: "tax", price: "Trả $200", amount: 200 },
  { id: 15, title: "Phòng R&D", type: "property", price: "$240", cost: 240, rent: 40, color: "#d8574e", ownerId: null, level: 0 },
  { id: 16, title: "Cơ hội", type: "chance", icon: "❓" },
  { id: 17, title: "Phòng Dev", type: "property", price: "$220", cost: 220, rent: 35, color: "#3f89d4", ownerId: null, level: 0 },
  { id: 18, title: "Nhà tù", type: "corner", icon: "🏚️", subtitle: "Tạm giam" },
  { id: 19, title: "Cơ hội", type: "chance", icon: "❓" },
  { id: 20, title: "Phòng Kho", type: "property", price: "$200", cost: 200, rent: 30, color: "#5c9a6b", ownerId: null, level: 0 },
  { id: 21, title: "Cơ hội", type: "chance", icon: "❓" },
  { id: 22, title: "Lễ hội công ty", type: "festival", icon: "🎉", subtitle: "Tăng giá công trình" },
  { id: 23, title: "Cơ hội", type: "chance", icon: "❓" }
];

window.gridPositions = [
  [6,8],[6,7],[6,6],[6,5],[6,4],[6,3],[6,2],[6,1],
  [5,1],[4,1],[3,1],[2,1],
  [1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],[1,8],
  [2,8],[3,8],[4,8],[5,8]
];

window.gameState = {
  screen: "lobby",
  currentPlayer: 0,
  round: 1,
  turnCount: 0,
  rolling: false,
  busy: false,
  roomCode: "4F7A",
  botDifficulty: "normal", // easy, normal, hard
  players: JSON.parse(JSON.stringify(window.initialPlayers)),
  stats: {
    startTime: Date.now(),
    diceRolls: 0,
    propertiesBought: 0,
    chanceDrawn: 0,
    bankruptcies: 0
  }
};

window.calculateEffectiveRent = function(cell) {
  if (cell.type !== "property" || cell.ownerId === null) return 0;
  const level = cell.level || 0;
  const baseRent = cell.rent || 30;
  let rent = Math.round(baseRent * (1 + level * 0.6));
  
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
