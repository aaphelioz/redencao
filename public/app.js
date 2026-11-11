'use strict';

(() => {
  const STORAGE_KEY = 'redencao:volumes';
  const DEFAULT_VOLUMES = Object.freeze({ master: 0.7, ambient: 0.6 });
  const TOTAL_ACHIEVEMENTS = 14;

  const audio = window.RedencaoAudio;
  const api = window.RedencaoAPI;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function normalizeVolume(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return clamp(number, 0, 1);
  }

  function loadVolumes() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { ...DEFAULT_VOLUMES };
      const parsed = JSON.parse(stored);
      return {
        master: normalizeVolume(parsed?.master, DEFAULT_VOLUMES.master),
        ambient: normalizeVolume(parsed?.ambient, DEFAULT_VOLUMES.ambient),
      };
    } catch {
      return { ...DEFAULT_VOLUMES };
    }
  }

  function saveVolumes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
    } catch { /* ignore */ }
  }

  const volumes = loadVolumes();
  if (audio) audio.setVolumes(volumes);

  // DOM Elements
  const status = document.getElementById('menu-status');
  const menu = document.getElementById('main-menu');
  const masterInput = document.getElementById('master-volume');
  const ambientInput = document.getElementById('ambient-volume');
  const masterValue = document.getElementById('master-value');
  const ambientValue = document.getElementById('ambient-value');
  const coinsDisplay = document.getElementById('menu-coins');

  const panels = {
    options: document.getElementById('panel-options'),
    store: document.getElementById('panel-store'),
    achievements: document.getElementById('panel-achievements'),
    exit: document.getElementById('panel-exit'),
    mode: document.getElementById('panel-mode'),
    modeResult: document.getElementById('panel-mode-result'),
  };

  const arquivoScreen = document.getElementById('arquivo-047-screen');
  const arquivoStart = document.getElementById('arquivo-047-start');
  const arquivoContinue = document.getElementById('arquivo-047-continue');
  const arquivoBack = document.getElementById('arquivo-047-back');
  const arquivoReset = document.getElementById('arquivo-047-reset');
  const arquivoChapters = document.getElementById('arquivo-047-chapters');
  const arquivoStatus = document.getElementById('arquivo-047-status');

  const ARQUIVO047_CHAPTER_NAMES = [
    'A Casa em Ordem',
    'Correspondências',
    'O Esquema',
    'O Que Nem Ela Sabe',
    'A Última Correspondência',
  ];

  let pendingMode = null;

  // ===== PANEL MANAGEMENT =====
  function openPanel(panel) {
    if (!panel || panel.open) return;
    panel.showModal?.() || panel.setAttribute('open', '');
  }

  function closePanel(panel) {
    if (!panel || !panel.open) return;
    panel.close();
  }

  function showStatus(message) {
    if (!status) return;
    status.textContent = message;
    status.classList.add('is-visible');
  }

  // ===== VOLUME =====
  function updateVolume(channel, input, output) {
    const percent = clamp(Math.round(Number(input.value) || 0), 0, 100);
    volumes[channel] = percent / 100;
    output.textContent = `${percent}%`;
    if (audio) audio.setVolumes(volumes);
    saveVolumes();
  }

  function initializeVolumes() {
    if (!masterInput || !ambientInput || !masterValue || !ambientValue) return;
    masterInput.value = String(Math.round(volumes.master * 100));
    ambientInput.value = String(Math.round(volumes.ambient * 100));
    masterValue.textContent = `${masterInput.value}%`;
    ambientValue.textContent = `${ambientInput.value}%`;
    masterInput.addEventListener('input', () => updateVolume('master', masterInput, masterValue));
    ambientInput.addEventListener('input', () => updateVolume('ambient', ambientInput, ambientValue));
  }

  // ===== COINS DISPLAY =====
  function formatCoins(value) {
    return Number(value || 0).toLocaleString('pt-BR');
  }

  async function refreshCoinsDisplay() {
    if (!coinsDisplay) return;
    try {
      const inv = await api.getInventory();
      coinsDisplay.textContent = `💰 ${formatCoins(inv.coins)}`;
    } catch {
      coinsDisplay.textContent = '💰 —';
    }
  }

  // ===== SHOP =====
  async function refreshStore() {
    const body = panels.store.querySelector('.panel__body');
    if (!body) return;

    try {
      const items = await api.getShopItems();
      const inv = await api.getInventory();
      
      const fragment = document.createDocumentFragment();
      
      // Coins header
      const coinsHeader = document.createElement('div');
      coinsHeader.className = 'store__coins';
      coinsHeader.innerHTML = `<span class="store__coins-icon">💰</span> <span class="store__coins-value">${formatCoins(inv.coins)}</span> Moedas`;
      fragment.appendChild(coinsHeader);

      const grid = document.createElement('div');
      grid.className = 'store__grid';

      items.forEach(item => {
        const card = createShopCard(item);
        grid.appendChild(card);
      });

      fragment.appendChild(grid);
      body.replaceChildren(fragment);
    } catch (e) {
      body.innerHTML = '<p class="panel__empty">Erro ao carregar a loja.</p>';
    }
  }

  function createShopCard(item) {
    const card = document.createElement('div');
    card.className = `store__card${item.atMax ? ' store__card--owned' : ''}${!item.canAfford ? ' store__card--unaffordable' : ''}`;
    card.dataset.itemId = item.id;

    let ownedText;
    let isEquipped = false;
    if (item.type === 'weapon') {
      if (item.owned === 'equipped') {
        ownedText = 'EQUIPADO';
        isEquipped = true;
      } else if (item.owned === 'owned') {
        ownedText = 'ADQUIRIDO';
      } else {
        ownedText = 'COMPRAR';
      }
    } else {
      ownedText = `${item.owned}/${item.max}`;
    }

    const canBuy = item.canAfford && !item.atMax;
    const buttonClass = canBuy ? 'btn btn--primary' : 'btn btn--ghost';
    let buttonText;
    if (item.atMax) {
      buttonText = isEquipped ? 'Equipado' : 'Adquirido';
    } else if (item.canAfford) {
      buttonText = `Comprar (${formatCoins(item.price)}💰)`;
    } else {
      buttonText = 'Moedas insuficientes';
    }

    card.innerHTML = `
      <div class="store__card-icon" aria-hidden="true">${item.icon}</div>
      <h4 class="store__card-name">${item.name}</h4>
      <p class="store__card-desc">${item.description}</p>
      <div class="store__card-footer">
        <span class="store__card-price">${formatCoins(item.price)} 💰</span>
        <span class="store__card-owned">${ownedText}</span>
      </div>
      <button class="${buttonClass} store__buy-btn" ${canBuy ? '' : 'disabled'} data-buy="${item.id}">
        ${buttonText}
      </button>
    `;

    const buyBtn = card.querySelector('[data-buy]');
    buyBtn.addEventListener('click', async () => {
      if (!canBuy) return;
      buyBtn.disabled = true;
      buyBtn.textContent = 'Comprando...';
      try {
        const result = await api.buyItem(item.id);
        if (result.success) {
          showStatus(`Comprado: ${item.name}!`);
          if (result.achievementUnlocked) {
            const bonus = result.reward ? ` (+${result.reward.amount} moedas)` : '';
            setTimeout(() => showStatus(`Conquista desbloqueada: ${getAchievementName(result.achievementUnlocked)}${bonus}`), 500);
          }
          await refreshStore();
          await refreshCoinsDisplay();
          await refreshAchievements();
        } else {
          showStatus(result.error || 'Erro na compra');
          buyBtn.disabled = false;
          buyBtn.textContent = `Comprar (${formatCoins(item.price)}💰)`;
        }
      } catch (e) {
        showStatus('Erro de conexão');
        buyBtn.disabled = false;
        buyBtn.textContent = `Comprar (${formatCoins(item.price)}💰)`;
      }
    });

    return card;
  }

  // ===== ACHIEVEMENTS =====
  const ACHIEVEMENT_DEFS = {
    primeiro_investimento: { name: 'Primeiro Investimento', desc: 'Compre qualquer item na loja', icon: '💰' },
    arsenal_completo: { name: 'Arsenal Completo', desc: 'Compre todas as 3 armas', icon: '🔫' },
    farmaceutico: { name: 'Farmacêutico', desc: 'Compre 10+ Seringas de Adrenalina', icon: '💉' },
    medico_campo: { name: 'Médico de Campo', desc: 'Compre 15+ Kits Médicos', icon: '🩹' },
    carniceiro: { name: 'O Carniceiro', desc: 'Compre a Metralhadora (200.000 moedas)', icon: '🎯' },
    primeiro_caso: { name: 'Primeiro Caso', desc: 'Zere no modo STANDARD', icon: '📋' },
    sem_piedade: { name: 'Sem Piedade', desc: 'Zere no modo NO MERCY', icon: '💀' },
    roleta_russa: { name: 'Roleta Russa', desc: 'Zere no modo ME SURPREENDA', icon: '🎲' },
    detetive_obsessivo: { name: 'Detetive Obsessivo', desc: 'Encontre todas as 23 pistas em uma run', icon: '🔍' },
    leitor_atento: { name: 'Leitor Atento', desc: 'Leia a carta de Helena antes de abrir o cofre', icon: '📜' },
    sobrevivente_nato: { name: 'Sobrevivente Nato', desc: 'Vença o combate final com 1 HP', icon: '❤️' },
    speedrunner: { name: 'Speedrunner', desc: 'Zere o jogo em menos de 15 minutos', icon: '⏱️' },
    arquivos_esquecidos: { name: 'Arquivos Esquecidos', desc: 'Você encontrou uma conexão que deveria permanecer oculta.', icon: '🗂️' },
    arquivo_047: { name: 'ARQUIVO 047', desc: 'Descubra a verdade escondida entre os muros da Mansão Albrecht.', icon: '📁' },
  };

  function getAchievementName(id) {
    return ACHIEVEMENT_DEFS[id]?.name || id;
  }

  async function refreshAchievements() {
    const list = document.getElementById('medals');
    const counter = document.getElementById('achievements-count');
    if (!list) return;

    try {
      const achievements = await api.getAchievements();
      const unlockedCount = achievements.filter(a => a.unlocked).length;

      const fragment = document.createDocumentFragment();
      let index = 0;

      for (const [id, def] of Object.entries(ACHIEVEMENT_DEFS)) {
        const ach = achievements.find(a => a.id === id) || { unlocked: false, progress: 0 };
        const item = document.createElement('li');
        item.className = `medal${ach.unlocked ? ' medal--unlocked' : ''}`;
        item.setAttribute('aria-label', ach.unlocked ? def.name : `${def.name} (bloqueada)`);

        const disc = document.createElement('span');
        disc.className = 'medal__disc';
        disc.setAttribute('aria-hidden', 'true');
        disc.innerHTML = ach.unlocked ? `<span class="medal__icon">${def.icon}</span>` : '';

        const tooltip = document.createElement('span');
        tooltip.className = 'medal__tooltip';
        tooltip.textContent = `${def.name}: ${def.desc}${ach.unlocked ? ' ✓' : ` (${ach.progress || 0}%)`}`;

        item.append(disc, tooltip);
        fragment.append(item);
        index++;
      }

      list.replaceChildren(fragment);
      if (counter) counter.textContent = `${unlockedCount} / ${TOTAL_ACHIEVEMENTS}`;
    } catch (e) {
      console.error('Failed to load achievements', e);
    }
  }

  // ===== MODE SELECTION =====
  function showModeSelection() {
    closePanel(panels.modeResult);
    openPanel(panels.mode);
  }

  function showModeResult(resolvedMode) {
    closePanel(panels.mode);
    const iconEl = document.getElementById('mode-result-icon');
    const modeEl = document.getElementById('mode-result-mode');
    const descEl = document.getElementById('mode-result-desc');

    const configs = {
      'standard': { icon: '📋', title: 'STANDARD', desc: 'A experiência original.' },
      'no-mercy': { icon: '💀', title: 'NO MERCY', desc: 'A casa não terá piedade.' }
    };

    const cfg = configs[resolvedMode] || configs.standard;
    iconEl.textContent = cfg.icon;
    modeEl.textContent = cfg.title;
    descEl.textContent = cfg.desc;
    openPanel(panels.modeResult);
  }

  function resolveSurpriseMode() {
    return Math.random() < 0.5 ? 'standard' : 'no-mercy';
  }

  function startGameWithMode(mode) {
    if (status) { status.textContent = ''; status.classList.remove('is-visible'); }
    closePanel(panels.mode); closePanel(panels.modeResult);
    if (window.RedencaoGame) window.RedencaoGame.start(mode);
    else showStatus('Caso em andamento...');
  }

  // ===== ARQUIVO 047 (campanha paralela) =====
  function openArquivo047Screen() {
    if (!arquivoScreen) return;
    renderArquivo047Progress();
    arquivoScreen.hidden = false;
    if (menu) menu.hidden = true;
    if (arquivoStart) window.requestAnimationFrame(() => arquivoStart.focus({ preventScroll: true }));
  }

  function closeArquivo047Screen() {
    if (!arquivoScreen) return;
    arquivoScreen.hidden = true;
    if (menu) {
      menu.hidden = false;
      const arquivoButton = menu.querySelector('[data-action="arquivo047"]');
      if (arquivoButton) arquivoButton.focus({ preventScroll: true });
    }
  }

  async function renderArquivo047Progress() {
    if (!arquivoChapters || !arquivoStatus) return;
    let progress = null;
    try {
      progress = await api.getArquivo047Progress();
    } catch (e) {
      console.error('Não foi possível carregar o progresso de ARQUIVO 047', e);
    }

    const done = Boolean(progress && progress.done);
    const currentChapter = progress && Number(progress.chapter) ? Math.min(5, Math.max(1, Number(progress.chapter))) : 1;
    const completed = (progress && progress.completed) || {};
    const started = done || currentChapter > 1 || Object.keys(completed).length > 0 || (Array.isArray(progress && progress.examined) && progress.examined.length > 0);

    arquivoChapters.replaceChildren(...ARQUIVO047_CHAPTER_NAMES.map((name, index) => {
      const n = index + 1;
      const isDone = done || Boolean(completed[n]);
      const isCurrent = !done && started && n === currentChapter;
      const isAvailable = !done && !started && n === 1;
      const item = document.createElement('li');
      item.className = `arquivo-screen__chapter${isDone ? ' arquivo-screen__chapter--done' : ''}${isCurrent || isAvailable ? ' arquivo-screen__chapter--current' : ''}`;

      const numeral = document.createElement('span');
      numeral.className = 'arquivo-screen__chapter-numeral';
      numeral.setAttribute('aria-hidden', 'true');
      numeral.textContent = ['I', 'II', 'III', 'IV', 'V'][index];

      const label = document.createElement('span');
      label.className = 'arquivo-screen__chapter-name';
      label.textContent = name;

      const stateIcon = document.createElement('span');
      stateIcon.className = 'arquivo-screen__chapter-state';
      stateIcon.textContent = isDone ? 'Concluído' : (isCurrent ? 'Em andamento' : (isAvailable ? 'Disponível' : 'Bloqueado'));

      item.append(numeral, label, stateIcon);
      return item;
    }));

    if (done) {
      arquivoStatus.textContent = 'Campanha concluída. O Arquivo 047 não guarda mais segredos de você.';
    } else if (started) {
      arquivoStatus.textContent = `Em andamento — Capítulo ${['I', 'II', 'III', 'IV', 'V'][currentChapter - 1]}. O progresso foi salvo neste servidor.`;
    } else {
      arquivoStatus.textContent = 'Não iniciada. Cinco capítulos à frente.';
    }

    if (arquivoContinue) arquivoContinue.hidden = !started || done;
    if (arquivoReset) arquivoReset.hidden = !started || done;
  }

  async function startArquivo047FromScreen() {
    if (arquivoScreen) arquivoScreen.hidden = true;
    if (window.RedencaoGame && typeof window.RedencaoGame.startArquivo047 === 'function') {
      try {
        await window.RedencaoGame.startArquivo047();
      } catch (e) {
        console.error('Erro ao iniciar ARQUIVO 047', e);
        if (menu) menu.hidden = false;
      }
    } else if (menu) {
      menu.hidden = false;
      showStatus('Caso em andamento...');
    }
  }

  async function resetArquivo047FromScreen() {
    try {
      await api.resetArquivo047Progress();
    } catch (e) {
      console.error('Não foi possível apagar o progresso de ARQUIVO 047', e);
    }
    await renderArquivo047Progress();
  }

  // ===== EVENT LISTENERS =====
  if (arquivoStart) arquivoStart.addEventListener('click', () => { startArquivo047FromScreen(); });
  if (arquivoBack) arquivoBack.addEventListener('click', () => { closeArquivo047Screen(); });
  if (arquivoReset) arquivoReset.addEventListener('click', () => { resetArquivo047FromScreen(); });


  if (menu) {
    menu.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button || !menu.contains(button)) return;

      switch (button.dataset.action) {
        case 'play': showModeSelection(); break;
        case 'arquivo047': openArquivo047Screen(); break;
        case 'options': openPanel(panels.options); break;
        case 'store': 
          openPanel(panels.store); 
          refreshStore(); 
          break;
        case 'achievements': 
          openPanel(panels.achievements); 
          refreshAchievements(); 
          break;
        case 'exit':
          try { window.close(); } catch {}
          openPanel(panels.exit);
          break;
      }
    });
  }

  document.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => {
      const mode = button.dataset.mode;
      if (mode === 'surprise') {
        pendingMode = 'surprise';
        const resolved = resolveSurpriseMode();
        pendingMode = resolved;
        showModeResult(resolved);
      } else {
        pendingMode = mode;
        showModeResult(mode);
      }
    });
  });

  document.querySelector('[data-mode-confirm]')?.addEventListener('click', () => {
    if (pendingMode) { startGameWithMode(pendingMode); pendingMode = null; }
  });

  document.querySelectorAll('[data-close]').forEach(button => {
    button.addEventListener('click', () => {
      const panel = button.closest('dialog');
      if (panel) panel.close();
    });
  });

  document.querySelectorAll('dialog.panel').forEach(panel => {
    panel.addEventListener('click', (event) => {
      if (event.target !== panel) return;
      const rect = panel.getBoundingClientRect();
      const isInside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!isInside) panel.close();
    });
  });

  // ===== INIT =====
  initializeVolumes();
  refreshCoinsDisplay();

  window.RedencaoApp = {
    refreshCoins: refreshCoinsDisplay,
  };

  // Rain animation (unchanged)
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.getElementById('rain');
  const drawingContext = canvas ? canvas.getContext('2d') : null;

  if (canvas && drawingContext) {
    const WIND = 0.16;
    let width = 0, height = 0, pixelRatio = 1, drops = [], frame = 0, previousTime = 0, resizeTimer = 0;

    function resetDrop(drop, spreadVertically) {
      drop.x = Math.random() * (width + 160) - 80;
      drop.y = spreadVertically ? Math.random() * height : -drop.length - Math.random() * height * 0.25;
      drop.length = 8 + Math.random() * 20;
      drop.speed = 320 + Math.random() * 460;
      drop.alpha = 0.05 + Math.random() * 0.17;
    }

    function createDrops() {
      const count = Math.round(clamp((width * height) / 11000, 60, 210));
      drops = Array.from({ length: count }, () => {
        const drop = { x: 0, y: 0, length: 12, speed: 400, alpha: 0.1 };
        resetDrop(drop, true);
        return drop;
      });
    }

    function draw() {
      drawingContext.clearRect(0, 0, width, height);
      drawingContext.lineCap = 'round';
      drawingContext.lineWidth = 0.8;
      for (const drop of drops) {
        drawingContext.strokeStyle = `rgba(154, 198, 228, ${drop.alpha})`;
        drawingContext.beginPath();
        drawingContext.moveTo(drop.x, drop.y);
        drawingContext.lineTo(drop.x + drop.length * WIND, drop.y + drop.length);
        drawingContext.stroke();
      }
    }

    function step(time) {
      if (!previousTime) previousTime = time;
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      for (const drop of drops) {
        drop.y += drop.speed * delta;
        drop.x += drop.speed * delta * WIND;
        if (drop.y - drop.length > height || drop.x - drop.length > width) resetDrop(drop, false);
      }
      draw();
      frame = window.requestAnimationFrame(step);
    }

    function startRain() {
      if (reduceMotion.matches) { draw(); return; }
      if (frame) return;
      previousTime = 0;
      frame = window.requestAnimationFrame(step);
    }

    function stopRain() {
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      draw();
    }

    function resizeCanvas() {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createDrops();
      draw();
    }

    resizeCanvas();
    startRain();
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeCanvas, 120);
    });

    const handleMotionPreference = () => {
      if (reduceMotion.matches) stopRain(); else startRain();
    };
    if (typeof reduceMotion.addEventListener === 'function') reduceMotion.addEventListener('change', handleMotionPreference);
    else if (typeof reduceMotion.addListener === 'function') reduceMotion.addListener(handleMotionPreference);
  }
})();