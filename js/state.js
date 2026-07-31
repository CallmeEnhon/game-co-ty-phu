/* =========================================================
   STATE MODULE (state.js)  v4.1.0
   Dựa theo "Bộ Luật Game Office Business Tour"
   - Tiền khởi điểm 2.000.000
   - Qua START: +200.000 | Dừng chính xác +100.000 thêm
   - Phí bảo lãnh Đảo Hoang: 150.000
   - Phí World Tour: tự do (không phí cố định)
   - Thuế: 10% tiền mặt + 20K/khu đất
   - Lễ hội: x2 tiền thuê trong 3 vòng
   - 4 cấp công trình
   - 8 nhóm màu liên tục, 4 bãi biển
   ========================================================= */

window.GameConfig = {
  STARTING_MONEY:      2000000,
  PASS_START_BONUS:    200000,
  PASS_START_EXACT:    100000,  // thưởng thêm nếu dừng chính xác tại START
  WORLD_TOUR_FEE:      0,       // World Tour miễn phí theo luật gốc
  FESTIVAL_DURATION_ROUNDS:  3,
  FESTIVAL_RENT_MULTIPLIER:  2, // x2 theo luật gốc (không phải x5)
  MAX_PROPERTY_LEVEL:  4,       // 4 cấp: văn phòng nhỏ → landmark
  TAX_CASH_RATE:       0.10,    // 10% tiền mặt
  TAX_PER_LAND:        20000,   // +20k mỗi khu đất
  TAX_PER_LANDMARK:    30000,   // +30k mỗi landmark (cấp 4)
  JAIL_FINE:           150000,  // phí bảo lãnh thoát Đảo Hoang
  JAIL_MAX_TURNS:      3,
  SELL_LAND_RATE:      0.70,    // bán đất 70% giá mua
  SELL_BUILD_RATE:     0.50,    // hoàn 50% chi phí nâng cấp
  DOUBLE_JAIL_LIMIT:   3        // đôi 3 lần → vào đảo hoang
};

window.gameSettings = {
  beachWinEnabled:     true,
  monopolyWinEnabled:  true,    // thắng khi độc quyền 1 cạnh
  startingMoney:       2000000
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
    id:              window.myPlayerId,
    name:            "Player 1",
    avatar:          "👑",
    color:           "#f4b21f",
    money:           2000000,
    asset:           0,
    host:            true,
    ready:           true,
    position:        0,
    isBot:           false,
    bankrupt:        false,
    inJail:          false,
    jailTurns:       0,
    doubleRollCount: 0,
    properties:      [],
    skipTurns:       0   // mất lượt (rút cơ hội Burnout)
  }
];

/*
  BÀN CỜ 32 Ô – Chuẩn Office Business Tour
  Phân bố theo chiều kim đồng hồ:
  Bottom (←→): ô 0..8, Right (↑): 9..15, Top (→←): 16..24, Left (↓): 25..31

  NHÓM MÀU (thứ tự từ rẻ đến đắt, không tách quãng):
  🟤 group_brown   : 1,3        (Hà Nội, TP.HCM)
  🔵 group_blue    : 5,6        (Bangkok, Singapore)
  🌊 beach         : 7,19,23,28 (4 bãi biển – điều kiện chiến thắng đặc biệt)
  🔴 group_red     : 9,10,11    (Dubai, Mumbai, Tokyo)
  🟠 group_orange  : 13,14,15   (Sydney, Auckland, Melbourne)
  🟢 group_green   : 17,18      (Paris, Amsterdam)
  🟡 group_yellow  : 21,22      (Roma, Madrid)
  🟣 group_purple  : 25,26,27   (New York, Las Vegas, Chicago)
  ⬛ group_dark    : 29,30,31   (Thượng Hải, Hồng Kông, Bắc Kinh)
  
  TIỀN THUÊ theo 4 cấp (tính từ base rent):
  Cấp 0 (base): rent
  Cấp 1 (+1 văn phòng nhỏ): rent × 2
  Cấp 2 (+1 mở rộng):       rent × 3.5
  Cấp 3 (+1 tòa nhà):       rent × 5
  Cấp 4 (landmark):         rent × 7
  Độc quyền nhóm màu:       × 2 toàn bộ nhóm
*/

window.boardCells = [
  // --- BOTTOM ROW (ô 0 → 8) ---
  {
    id: 0, title: "BẮT ĐẦU", type: "start",
    icon: "🚩", subtitle: "Qua đây: +200k | Dừng: +300k"
  },
  {
    id: 1, title: "Hà Nội", type: "property",
    icon: "🌉", price: "$100K", cost: 100000, rent: 14000,
    color: "#c0392b", group: "group_brown",
    upgradeCosts: [60000, 90000, 120000],
    ownerId: null, level: 0
  },
  {
    id: 2, title: "Thuế Tài Sản", type: "tax",
    icon: "📜", subtitle: "10% tiền mặt + 20K/đất"
  },
  {
    id: 3, title: "TP. Hồ Chí Minh", type: "property",
    icon: "🏙️", price: "$120K", cost: 120000, rent: 18000,
    color: "#c0392b", group: "group_brown",
    upgradeCosts: [70000, 110000, 140000],
    ownerId: null, level: 0
  },
  {
    id: 4, title: "Cơ Hội", type: "chance", icon: "🎡"
  },
  {
    id: 5, title: "Bangkok", type: "property",
    icon: "🛕", price: "$160K", cost: 160000, rent: 24000,
    color: "#2980b9", group: "group_blue",
    upgradeCosts: [90000, 140000, 180000],
    ownerId: null, level: 0
  },
  {
    id: 6, title: "Singapore", type: "property",
    icon: "🦁", price: "$180K", cost: 180000, rent: 28000,
    color: "#2980b9", group: "group_blue",
    upgradeCosts: [100000, 160000, 200000],
    ownerId: null, level: 0
  },
  {
    id: 7, title: "Bali 🏖️", type: "beach",
    icon: "🏝️", price: "$200K", cost: 200000, rent: 40000,
    color: "#16a085", group: "beach",
    ownerId: null, level: 0
  },
  {
    id: 8, title: "CHUYẾN CÔNG TÁC", type: "world_tour",
    icon: "✈️", subtitle: "Bay đến bất kỳ ô nào miễn phí"
  },

  // --- RIGHT COL (ô 9 → 15) ---
  {
    id: 9, title: "Dubai", type: "property",
    icon: "🕌", price: "$220K", cost: 220000, rent: 34000,
    color: "#e74c3c", group: "group_red",
    upgradeCosts: [120000, 190000, 240000],
    ownerId: null, level: 0
  },
  {
    id: 10, title: "Mumbai", type: "property",
    icon: "🕍", price: "$240K", cost: 240000, rent: 38000,
    color: "#e74c3c", group: "group_red",
    upgradeCosts: [130000, 210000, 260000],
    ownerId: null, level: 0
  },
  {
    id: 11, title: "Tokyo", type: "property",
    icon: "⛩️", price: "$260K", cost: 260000, rent: 42000,
    color: "#e74c3c", group: "group_red",
    upgradeCosts: [140000, 230000, 280000],
    ownerId: null, level: 0
  },
  {
    id: 12, title: "Cơ Hội", type: "chance", icon: "🎡"
  },
  {
    id: 13, title: "Sydney", type: "property",
    icon: "🦘", price: "$300K", cost: 300000, rent: 50000,
    color: "#e67e22", group: "group_orange",
    upgradeCosts: [160000, 260000, 320000],
    ownerId: null, level: 0
  },
  {
    id: 14, title: "Auckland", type: "property",
    icon: "🐑", price: "$320K", cost: 320000, rent: 54000,
    color: "#e67e22", group: "group_orange",
    upgradeCosts: [170000, 280000, 340000],
    ownerId: null, level: 0
  },
  {
    id: 15, title: "Melbourne", type: "property",
    icon: "🏏", price: "$340K", cost: 340000, rent: 58000,
    color: "#e67e22", group: "group_orange",
    upgradeCosts: [180000, 300000, 360000],
    ownerId: null, level: 0
  },

  // --- TOP ROW (ô 16 → 24) ---
  {
    id: 16, title: "TỔ CHỨC SỰ KIỆN", type: "festival",
    icon: "🏆", subtitle: "Chọn khu đất → Thuê x2 trong 3 vòng"
  },
  {
    id: 17, title: "Paris", type: "property",
    icon: "🗼", price: "$360K", cost: 360000, rent: 64000,
    color: "#27ae60", group: "group_green",
    upgradeCosts: [190000, 320000, 390000],
    ownerId: null, level: 0
  },
  {
    id: 18, title: "Amsterdam", type: "property",
    icon: "🌷", price: "$380K", cost: 380000, rent: 68000,
    color: "#27ae60", group: "group_green",
    upgradeCosts: [200000, 340000, 410000],
    ownerId: null, level: 0
  },
  {
    id: 19, title: "Nice 🏖️", type: "beach",
    icon: "🏝️", price: "$200K", cost: 200000, rent: 40000,
    color: "#16a085", group: "beach",
    ownerId: null, level: 0
  },
  {
    id: 20, title: "Thuế Xa Xỉ", type: "tax",
    icon: "💎", subtitle: "10% tiền mặt + 20K/đất"
  },
  {
    id: 21, title: "Roma", type: "property",
    icon: "🏛️", price: "$400K", cost: 400000, rent: 72000,
    color: "#f1c40f", group: "group_yellow",
    upgradeCosts: [210000, 360000, 430000],
    ownerId: null, level: 0
  },
  {
    id: 22, title: "Madrid", type: "property",
    icon: "💃", price: "$420K", cost: 420000, rent: 76000,
    color: "#f1c40f", group: "group_yellow",
    upgradeCosts: [220000, 380000, 450000],
    ownerId: null, level: 0
  },
  {
    id: 23, title: "Venice 🏖️", type: "beach",
    icon: "🛶", price: "$200K", cost: 200000, rent: 40000,
    color: "#16a085", group: "beach",
    ownerId: null, level: 0
  },
  {
    id: 24, title: "ĐẢO HOANG", type: "jail",
    icon: "🏝️⛓️", subtitle: "Tung Đôi hoặc trả $150K để thoát"
  },

  // --- LEFT COL (ô 25 → 31) ---
  {
    id: 25, title: "New York", type: "property",
    icon: "🗽", price: "$440K", cost: 440000, rent: 82000,
    color: "#8e44ad", group: "group_purple",
    upgradeCosts: [230000, 400000, 480000],
    ownerId: null, level: 0
  },
  {
    id: 26, title: "Las Vegas", type: "property",
    icon: "🎰", price: "$460K", cost: 460000, rent: 86000,
    color: "#8e44ad", group: "group_purple",
    upgradeCosts: [240000, 420000, 500000],
    ownerId: null, level: 0
  },
  {
    id: 27, title: "Chicago", type: "property",
    icon: "🏙️", price: "$480K", cost: 480000, rent: 90000,
    color: "#8e44ad", group: "group_purple",
    upgradeCosts: [250000, 440000, 520000],
    ownerId: null, level: 0
  },
  {
    id: 28, title: "Sydney 🏖️", type: "beach",
    icon: "🏝️", price: "$200K", cost: 200000, rent: 40000,
    color: "#16a085", group: "beach",
    ownerId: null, level: 0
  },
  {
    id: 29, title: "Thượng Hải", type: "property",
    icon: "🌆", price: "$500K", cost: 500000, rent: 96000,
    color: "#2c3e50", group: "group_dark",
    upgradeCosts: [260000, 460000, 550000],
    ownerId: null, level: 0
  },
  {
    id: 30, title: "Hồng Kông", type: "property",
    icon: "🌃", price: "$520K", cost: 520000, rent: 100000,
    color: "#2c3e50", group: "group_dark",
    upgradeCosts: [270000, 480000, 570000],
    ownerId: null, level: 0
  },
  {
    id: 31, title: "Bắc Kinh", type: "property",
    icon: "🏯", price: "$540K", cost: 540000, rent: 104000,
    color: "#2c3e50", group: "group_dark",
    upgradeCosts: [280000, 500000, 590000],
    ownerId: null, level: 0
  }
];

// Grid positions map each tile id → [row, col] in 9x9 grid (1-indexed)
window.gridPositions = [
  [9,9], [9,8], [9,7], [9,6], [9,5], [9,4], [9,3], [9,2], [9,1],
  [8,1], [7,1], [6,1], [5,1], [4,1], [3,1], [2,1],
  [1,1], [1,2], [1,3], [1,4], [1,5], [1,6], [1,7], [1,8], [1,9],
  [2,9], [3,9], [4,9], [5,9], [6,9], [7,9], [8,9]
];

window.gameState = {
  screen:        "lobby",
  currentPlayer: 0,
  round:         1,
  turnCount:     0,
  rolling:       false,
  busy:          false,
  cameraLocked:  false,
  roomCode:      window.generateRandomCode(),
  botDifficulty: "normal",
  players:       JSON.parse(JSON.stringify(window.initialPlayers)),
  stats: {
    startTime:        Date.now(),
    diceRolls:        0,
    propertiesBought: 0,
    chanceDrawn:      0,
    bankruptcies:     0
  }
};

/* ─── HELPER FUNCTIONS ─────────────────────────────────────── */

window.checkColorMonopoly = function(ownerId, groupName) {
  if (!groupName || groupName === "beach") return false;
  const groupCells = window.boardCells.filter(c => c.group === groupName);
  return groupCells.length > 0 && groupCells.every(c => c.ownerId === ownerId);
};

// Tiền thuê theo 4 cấp: base × [1, 2, 3.5, 5, 7]
window.calculateEffectiveRent = function(cell) {
  if ((cell.type !== "property" && cell.type !== "beach") || !cell.ownerId) return 0;
  const level    = cell.level || 0;
  const base     = cell.rent  || 10000;
  const factors  = [1, 2, 3.5, 5, 7];
  let   rent     = Math.round(base * (factors[level] || 1));

  // x2 nếu độc quyền nhóm màu
  if (cell.group && window.checkColorMonopoly(cell.ownerId, cell.group)) rent *= 2;

  // Lễ hội
  if (cell.festivalUntil && cell.festivalUntil >= window.gameState.round) {
    rent = Math.round(rent * window.GameConfig.FESTIVAL_RENT_MULTIPLIER);
  }
  return rent;
};

// Chi phí nâng cấp từ mảng upgradeCosts của ô
window.calculateUpgradeCost = function(cell) {
  if (cell.type !== "property") return 0;
  const level = cell.level || 0;
  if (!cell.upgradeCosts || level >= cell.upgradeCosts.length) return 0;
  return cell.upgradeCosts[level];
};

window.checkBeachMonopolyWin = function(player) {
  if (!window.gameSettings.beachWinEnabled) return false;
  return window.boardCells.filter(c => c.type === "beach" && c.ownerId === player.id).length >= 4;
};

// Định dạng tiền VN
window.fmtMoney = function(n) {
  if (n >= 1000000) return `$${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${Math.round(n/1000)}K`;
  return `$${n}`;
};
