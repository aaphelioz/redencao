'use strict';

(() => {
  const API_BASE = '/api';

  async function request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ===== ARQUIVO 047 (campanha paralela) =====
  async function getArquivo047Progress() {
    return request('/arquivo047');
  }

  async function saveArquivo047Progress(partial) {
    return request('/arquivo047', {
      method: 'POST',
      body: JSON.stringify(partial || {}),
    });
  }

  async function resetArquivo047Progress() {
    return request('/arquivo047/reset', { method: 'POST' });
  }

  // ===== SAVES =====
  async function listSaves() {
    return request('/saves');
  }

  async function loadSave(slot) {
    return request(`/save/${slot}`);
  }

  async function saveGame(slot, state) {
    return request(`/save/${slot}`, {
      method: 'POST',
      body: JSON.stringify(state),
    });
  }

  async function deleteSave(slot) {
    return request(`/save/${slot}`, { method: 'DELETE' });
  }

  // ===== INVENTORY =====
  async function getInventory() {
    return request('/inventory');
  }

  async function useItem(item) {
    return request('/inventory/use', {
      method: 'POST',
      body: JSON.stringify({ item }),
    });
  }

  async function ensureStarterKit() {
    return request('/inventory/grant-kit', { method: 'POST' });
  }

  // ===== SHOP =====
  async function getShopItems() {
    return request('/shop');
  }

  async function buyItem(itemId) {
    return request('/shop/buy', {
      method: 'POST',
      body: JSON.stringify({ itemId }),
    });
  }

  // ===== ACHIEVEMENTS =====
  async function getAchievements() {
    return request('/achievements');
  }

  async function unlockAchievement(id) {
    return request('/achievements/unlock', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  }

  // ===== COINS =====
  async function rewardCoins(source) {
    return request('/coins/reward', {
      method: 'POST',
      body: JSON.stringify({ source }),
    });
  }

  // ===== STATS =====
  async function getStats() {
    return request('/stats');
  }

  async function recordGameEnd(outcome, playTime) {
    return request('/game/end', {
      method: 'POST',
      body: JSON.stringify({ outcome, playTime }),
    });
  }

  async function incrementStat(stat, amount = 1) {
    return request('/stats/increment', {
      method: 'POST',
      body: JSON.stringify({ stat, amount }),
    });
  }

  // Expose globally
  window.RedencaoAPI = {
    getArquivo047Progress,
    saveArquivo047Progress,
    resetArquivo047Progress,
    listSaves,
    loadSave,
    saveGame,
    deleteSave,
    getInventory,
    useItem,
    ensureStarterKit,
    getShopItems,
    buyItem,
    getAchievements,
    unlockAchievement,
    rewardCoins,
    getStats,
    recordGameEnd,
    incrementStat,
  };
})();