'use strict';

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.resolve(__dirname, '..', 'redencao.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

function init() {
  // Saves table - one row per save slot
  db.exec(`
    CREATE TABLE IF NOT EXISTS saves (
      slot INTEGER PRIMARY KEY,
      gameMode TEXT NOT NULL,
      scene TEXT NOT NULL,
      introIndex INTEGER DEFAULT 0,
      currentRoom TEXT,
      currentInteraction TEXT,
      examined TEXT NOT NULL, -- JSON array
      flags TEXT NOT NULL, -- JSON object
      letterRoom TEXT,
      letterHost TEXT,
      combat TEXT, -- JSON object
      ending TEXT,
      over INTEGER DEFAULT 0,
      updatedAt INTEGER NOT NULL
    );
  `);

  // Inventory table - persistent across runs
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      coins INTEGER DEFAULT 0,
      weapon TEXT, -- 'revolver38' | 'revolver357' | 'metralhadora'
      ownedWeapons TEXT DEFAULT '[]', -- JSON array of purchased weapon IDs
      seringas INTEGER DEFAULT 0,
      kitsMedicos INTEGER DEFAULT 0,
      updatedAt INTEGER NOT NULL
    );
  `);
  
  // Migration: add ownedWeapons column if missing
  const invCols = db.prepare("PRAGMA table_info(inventory)").all().map(c => c.name);
  if (!invCols.includes('ownedWeapons')) {
    db.exec("ALTER TABLE inventory ADD COLUMN ownedWeapons TEXT DEFAULT '[]'");
  }

  // Achievements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      unlocked INTEGER DEFAULT 0,
      unlockedAt INTEGER,
      progress INTEGER DEFAULT 0 -- for incremental achievements
    );
  `);

  // Stats table - aggregate statistics
  db.exec(`
    CREATE TABLE IF NOT EXISTS stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      totalWins INTEGER DEFAULT 0,
      totalLosses INTEGER DEFAULT 0,
      totalPlayTime INTEGER DEFAULT 0, -- seconds
      bestTime INTEGER, -- seconds
      cluesFound INTEGER DEFAULT 0,
      lettersFound INTEGER DEFAULT 0,
      seringaUsed INTEGER DEFAULT 0,
      kitUsed INTEGER DEFAULT 0,
      updatedAt INTEGER NOT NULL
    );
  `);

  // Insert default rows if not exist
  const insertDefaults = db.transaction(() => {
    // Default inventory
    const inv = db.prepare('SELECT * FROM inventory WHERE id = 1').get();
    if (!inv) {
      db.prepare("INSERT INTO inventory (id, coins, weapon, ownedWeapons, seringas, kitsMedicos, updatedAt) VALUES (1, 0, NULL, '[]', 0, 0, ?)").run(Date.now());
    }

    // Default stats
    const st = db.prepare('SELECT * FROM stats WHERE id = 1').get();
    if (!st) {
      db.prepare('INSERT INTO stats (id, totalWins, totalLosses, totalPlayTime, cluesFound, lettersFound, seringaUsed, kitUsed, updatedAt) VALUES (1, 0, 0, 0, 0, 0, 0, 0, ?)').run(Date.now());
    }

    // Default achievements
    const achievementIds = [
      'primeiro_investimento', 'arsenal_completo', 'farmaceutico', 'medico_campo', 'carniceiro',
      'primeiro_caso', 'sem_piedade', 'roleta_russa', 'detetive_obsessivo', 'leitor_atento',
      'sobrevivente_nato', 'speedrunner'
    ];
    const stmt = db.prepare('INSERT OR IGNORE INTO achievements (id, unlocked, progress) VALUES (?, 0, 0)');
    for (const id of achievementIds) {
      stmt.run(id);
    }
  });
  insertDefaults();
}

init();

// ===== SAVE OPERATIONS =====
const saveStmt = db.prepare(`
  INSERT OR REPLACE INTO saves (slot, gameMode, scene, introIndex, currentRoom, currentInteraction, examined, flags, letterRoom, letterHost, combat, ending, over, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const loadStmt = db.prepare('SELECT * FROM saves WHERE slot = ?');
const deleteSaveStmt = db.prepare('DELETE FROM saves WHERE slot = ?');
const listSavesStmt = db.prepare('SELECT slot, gameMode, scene, updatedAt FROM saves ORDER BY slot');

function saveGame(slot, state) {
  saveStmt.run(
    slot,
    state.gameMode,
    state.scene,
    state.introIndex,
    state.currentRoom,
    state.currentInteraction,
    JSON.stringify([...state.examined]),
    JSON.stringify(state.flags),
    state.letterRoom,
    state.letterHost,
    state.combat ? JSON.stringify(state.combat) : null,
    state.ending,
    state.over ? 1 : 0,
    Date.now()
  );
}

function loadGame(slot) {
  const row = loadStmt.get(slot);
  if (!row) return null;
  return {
    ...row,
    examined: new Set(JSON.parse(row.examined)),
    flags: JSON.parse(row.flags),
    combat: row.combat ? JSON.parse(row.combat) : null,
    over: Boolean(row.over),
  };
}

function deleteSave(slot) {
  deleteSaveStmt.run(slot);
}

function listSaves() {
  return listSavesStmt.all();
}

// ===== INVENTORY OPERATIONS =====
const getInventoryStmt = db.prepare('SELECT * FROM inventory WHERE id = 1');
const updateInventoryStmt = db.prepare(`
  UPDATE inventory SET coins = ?, weapon = ?, ownedWeapons = ?, seringas = ?, kitsMedicos = ?, updatedAt = ? WHERE id = 1
`);

function getInventory() {
  const row = getInventoryStmt.get();
  if (!row) return { coins: 0, weapon: null, ownedWeapons: [], seringas: 0, kitsMedicos: 0 };
  return {
    ...row,
    ownedWeapons: JSON.parse(row.ownedWeapons || '[]'),
  };
}

function updateInventory(data) {
  const current = getInventory();
  const next = { ...current, ...data, updatedAt: Date.now() };
  updateInventoryStmt.run(next.coins, next.weapon, JSON.stringify(next.ownedWeapons || []), next.seringas, next.kitsMedicos, next.updatedAt);
  return next;
}

function addCoins(amount) {
  const inv = getInventory();
  inv.coins += amount;
  updateInventory(inv);
  return inv.coins;
}

// Recompensas em moedas: vitória, abate de inimigo e conquista rendem
// um valor aleatório entre 50 e 200 moedas.
const COIN_REWARD_MIN = 50;
const COIN_REWARD_MAX = 200;

function rollCoinReward(min = COIN_REWARD_MIN, max = COIN_REWARD_MAX) {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function awardCoins(min = COIN_REWARD_MIN, max = COIN_REWARD_MAX) {
  const amount = rollCoinReward(min, max);
  const coins = addCoins(amount);
  return { amount, coins };
}

function spendCoins(amount) {
  const inv = getInventory();
  if (inv.coins < amount) return false;
  inv.coins -= amount;
  updateInventory(inv);
  return true;
}

function addItem(itemType, quantity = 1) {
  const inv = getInventory();
  if (itemType === 'seringa') {
    inv.seringas = Math.min(3, inv.seringas + quantity);
  } else if (itemType === 'kit') {
    inv.kitsMedicos = Math.min(3, inv.kitsMedicos + quantity);
  } else if (['revolver38', 'revolver357', 'metralhadora'].includes(itemType)) {
    inv.weapon = itemType;
  }
  updateInventory(inv);
  return inv;
}

function useItem(itemType) {
  const inv = getInventory();
  if (itemType === 'seringa' && inv.seringas > 0) {
    inv.seringas--;
    updateInventory(inv);
    return true;
  }
  if (itemType === 'kit' && inv.kitsMedicos > 0) {
    inv.kitsMedicos--;
    updateInventory(inv);
    return true;
  }
  return false;
}

// Grants the mandatory NO MERCY starter kit only when the player has none.
function ensureStarterKit() {
  const inv = getInventory();
  if (inv.kitsMedicos > 0) {
    return { granted: false, inventory: inv };
  }

  inv.kitsMedicos = 1;
  updateInventory(inv);
  return { granted: true, inventory: inv };
}

// ===== ACHIEVEMENTS OPERATIONS =====
const getAchievementStmt = db.prepare('SELECT * FROM achievements WHERE id = ?');
const getAllAchievementsStmt = db.prepare('SELECT * FROM achievements');
const unlockAchievementStmt = db.prepare('UPDATE achievements SET unlocked = 1, unlockedAt = ?, progress = ? WHERE id = ?');
const updateAchievementProgressStmt = db.prepare('UPDATE achievements SET progress = ? WHERE id = ?');

function getAchievement(id) {
  return getAchievementStmt.get(id);
}

function getAllAchievements() {
  return getAllAchievementsStmt.all();
}

function unlockAchievement(id, progress = 100) {
  const ach = getAchievement(id);
  if (!ach || ach.unlocked) return false;
  unlockAchievementStmt.run(Date.now(), progress, id);
  return true;
}

function updateAchievementProgress(id, progress) {
  const ach = getAchievement(id);
  if (ach && ach.unlocked) return;
  updateAchievementProgressStmt.run(progress, id);
}

// ===== STATS OPERATIONS =====
const getStatsStmt = db.prepare('SELECT * FROM stats WHERE id = 1');
const updateStatsStmt = db.prepare(`
  UPDATE stats SET totalWins = ?, totalLosses = ?, totalPlayTime = ?, bestTime = ?, cluesFound = ?, lettersFound = ?, seringaUsed = ?, kitUsed = ?, updatedAt = ? WHERE id = 1
`);

function getStats() {
  return getStatsStmt.get();
}

function updateStats(data) {
  const current = getStats();
  const next = { ...current, ...data, updatedAt: Date.now() };
  updateStatsStmt.run(next.totalWins, next.totalLosses, next.totalPlayTime, next.bestTime, next.cluesFound, next.lettersFound, next.seringaUsed, next.kitUsed, next.updatedAt);
  return next;
}

function recordWin(playTime) {
  const stats = getStats();
  stats.totalWins++;
  stats.totalPlayTime += playTime;
  if (!stats.bestTime || playTime < stats.bestTime) {
    stats.bestTime = playTime;
  }
  updateStats(stats);
}

function recordLoss() {
  const stats = getStats();
  stats.totalLosses++;
  updateStats(stats);
}

function incrementStat(stat, amount = 1) {
  const stats = getStats();
  stats[stat] = (stats[stat] || 0) + amount;
  updateStats(stats);
}

// ===== SHOP DEFINITIONS =====
const SHOP_ITEMS = [
  {
    id: 'kit',
    name: 'Kit Médico',
    description: 'Cura 3 HP fora de combate. Máximo 3.',
    price: 50,
    max: 3,
    type: 'consumable',
    icon: '🩹',
  },
  {
    id: 'seringa',
    name: 'Seringa de Adrenalina',
    description: 'Garante esquiva perfeita no próximo ataque (qualquer combate). Máximo 3.',
    price: 80,
    max: 3,
    type: 'consumable',
    icon: '💉',
  },
  {
    id: 'revolver38',
    name: 'Revólver .38 Special',
    description: '+10% chance de acerto. Substitui arma atual.',
    price: 150,
    max: 1,
    type: 'weapon',
    icon: '🔫',
    replaces: 'weapon',
  },
  {
    id: 'revolver357',
    name: 'Revólver .357 Magnum',
    description: '+25% chance de acerto e +1 de dano. Substitui arma atual.',
    price: 400,
    max: 1,
    type: 'weapon',
    icon: '🔫',
    replaces: 'weapon',
  },
  {
    id: 'metralhadora',
    name: 'Metralhadora Thompson',
    description: 'Ataque duplo por turno. Custa 200.000 moedas. Desbloqueia conquista "O Carniceiro".',
    price: 200000,
    max: 1,
    type: 'weapon',
    icon: '🎯',
    replaces: 'weapon',
    achievement: 'carniceiro',
  },
];

function getShopItems() {
  const inv = getInventory();
  return SHOP_ITEMS.map(item => ({
    ...item,
    owned: item.type === 'weapon' 
      ? (inv.ownedWeapons.includes(item.id) ? 'owned' : (inv.weapon === item.id ? 'equipped' : false))
      : (item.id === 'seringa' ? inv.seringas : inv.kitsMedicos),
    canAfford: inv.coins >= item.price,
    atMax: item.type === 'weapon' 
      ? inv.ownedWeapons.includes(item.id)
      : (item.id === 'seringa' ? inv.seringas >= item.max : inv.kitsMedicos >= item.max),
  }));
}

function buyItem(itemId) {
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return { success: false, error: 'Item não encontrado' };

  let inv = getInventory();
  if (inv.coins < item.price) return { success: false, error: 'Moedas insuficientes' };

  // Check max
  if (item.type === 'weapon' && inv.weapon === item.id) {
    return { success: false, error: 'Já possui esta arma' };
  }
  if (item.id === 'seringa' && inv.seringas >= item.max) {
    return { success: false, error: 'Limite máximo atingido (3)' };
  }
  if (item.id === 'kit' && inv.kitsMedicos >= item.max) {
    return { success: false, error: 'Limite máximo atingido (3)' };
  }

  // Spend coins
  if (!spendCoins(item.price)) {
    return { success: false, error: 'Erro ao processar pagamento' };
  }

  // Get fresh inventory after spending coins
  inv = getInventory();

  // Add item
  if (item.type === 'weapon') {
    inv.weapon = item.id;
    // Track purchased weapon
    if (!inv.ownedWeapons.includes(item.id)) {
      inv.ownedWeapons.push(item.id);
    }
  } else if (item.id === 'seringa') {
    inv.seringas++;
  } else if (item.id === 'kit') {
    inv.kitsMedicos++;
  }
  updateInventory(inv);

  // Unlock achievement if applicable
  const unlockedNow = [];
  if (item.achievement && unlockAchievement(item.achievement)) {
    unlockedNow.push(item.achievement);
  }

  // First purchase achievement
  if (unlockAchievement('primeiro_investimento')) {
    unlockedNow.push('primeiro_investimento');
  }

  // Check arsenal completo (all 3 weapons purchased)
  const allWeapons = ['revolver38', 'revolver357', 'metralhadora'];
  const hasAllWeapons = allWeapons.every(w => inv.ownedWeapons.includes(w));
  if (hasAllWeapons && unlockAchievement('arsenal_completo')) {
    unlockedNow.push('arsenal_completo');
  }

  // Check farmaceutico (10+ seringas purchased total)
  // We'd need to track total purchased, for now just track current + approximate
  // Check medico_campo (15+ kits purchased total)

  // Cada conquista nova rende uma recompensa aleatória de moedas.
  let rewardAmount = 0;
  for (let i = 0; i < unlockedNow.length; i += 1) {
    rewardAmount += awardCoins().amount;
  }

  return {
    success: true,
    inventory: getInventory(),
    achievementUnlocked: unlockedNow[0] || null,
    achievementsUnlocked: unlockedNow,
    reward: rewardAmount > 0 ? { amount: rewardAmount } : null,
  };
}

module.exports = {
  db,
  saveGame,
  loadGame,
  deleteSave,
  listSaves,
  getInventory,
  updateInventory,
  addCoins,
  awardCoins,
  rollCoinReward,
  spendCoins,
  addItem,
  useItem,
  ensureStarterKit,
  getAchievement,
  getAllAchievements,
  unlockAchievement,
  updateAchievementProgress,
  getStats,
  updateStats,
  recordWin,
  recordLoss,
  incrementStat,
  getShopItems,
  buyItem,
  SHOP_ITEMS,
};
