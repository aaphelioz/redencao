'use strict';

(() => {
  const story = window.REDENCAO_STORY;
  const gameSection = document.getElementById('game');
  const stage = document.getElementById('game-stage');
  const menu = document.getElementById('main-menu');
  const progressLabel = document.getElementById('game-progress');
  const menuButton = document.querySelector('[data-game-menu]');
  const api = window.RedencaoAPI;

  if (!story || !gameSection || !stage) {
    return;
  }

  const LETTER_STORAGE_KEY = 'redencao:letter-room';

  // Track game start time for speedrun achievement
  let gameStartTime = 0;

  let state = createInitialState();

  function createInitialState() {
    return {
      active: false,
      over: false,
      gameMode: 'standard', // 'standard' | 'no-mercy'
      scene: 'intro',
      introIndex: 0,
      currentRoom: null,
      currentInteraction: null,
      examined: new Set(),
      flags: {
        hasKey: false,
        safeOpen: false,
        shedOpen: false,
        letterFound: false,
      },
      letterRoom: null,
      letterHost: null,
      combat: null,
      ending: null,
      runHp: null,
      encountersDone: 0,
      pendingEncounter: null,
      encounterReward: 0,
      runCoins: 0,
    };
  }

  function getModeConfig() {
    const mode = state.gameMode;
    const noMercy = mode === 'no-mercy';

    return {
      playerMaxHp: noMercy ? 7 : 5,
      helenaMaxHp: noMercy ? 10 : 8,
      explorationEncounters: 3,
      mendigoHpByStage: [3, 4, 5],
    };
  }

  function getModeLabel() {
    return state.gameMode === 'no-mercy' ? 'NO MERCY' : 'STANDARD';
  }

  function getRoomInteractions(roomId) {
    const room = story.rooms[roomId];

    if (!room) {
      return [];
    }

    if (state.gameMode !== 'no-mercy' || !story.noMercyInteractions) {
      return room.interactions;
    }

    const selectedIds = [...(story.noMercyInteractions[roomId] || [])];
    const letterHost = state.letterHost;
    const hostInThisRoom =
      letterHost && room.interactions.some((interaction) => interaction.id === letterHost);

    // O esconderijo da carta entra sempre, substituindo a última pista comum.
    if (hostInThisRoom && !selectedIds.includes(letterHost) && selectedIds.length > 0) {
      selectedIds[selectedIds.length - 1] = letterHost;
    }

    return selectedIds
      .map((id) => room.interactions.find((interaction) => interaction.id === id))
      .filter(Boolean);
  }

  function getTotalInteractions() {
    return story.roomOrder.reduce(
      (total, roomId) => total + getRoomInteractions(roomId).length,
      0,
    );
  }

  // Get weapon accuracy bonus
  function getWeaponBonus() {
    // This will be populated from API when combat starts
    return state.weaponBonus || { accuracy: 0, damage: 0, doubleAttack: false };
  }

  async function loadWeaponBonus() {
    try {
      const inv = await api.getInventory();
      let bonus = { accuracy: 0, damage: 0, doubleAttack: false };
      if (inv.weapon === 'revolver38') bonus.accuracy = 0.10;
      else if (inv.weapon === 'revolver357') { bonus.accuracy = 0.25; bonus.damage = 1; }
      else if (inv.weapon === 'metralhadora') { bonus.accuracy = 0.25; bonus.damage = 1; bonus.doubleAttack = true; }
      state.weaponBonus = bonus;
    } catch {
      state.weaponBonus = { accuracy: 0, damage: 0, doubleAttack: false };
    }
  }

  function showStatus(message) {
    const statusEl = document.getElementById('menu-status');
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.add('is-visible');
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);

    if (className) {
      node.className = className;
    }

    if (text !== undefined && text !== null) {
      node.textContent = text;
    }

    return node;
  }

  function pickLetterRoom() {
    const rooms = Object.keys(story.letterHosts);
    let previous = null;

    try {
      previous = localStorage.getItem(LETTER_STORAGE_KEY);
    } catch {
      previous = null;
    }

    const candidates = rooms.filter((roomId) => roomId !== previous);
    const pool = candidates.length > 0 ? candidates : rooms;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    try {
      localStorage.setItem(LETTER_STORAGE_KEY, chosen);
    } catch {
      /* Sem armazenamento local: o sorteio continua funcionando. */
    }

    return chosen;
  }

  function resetGame() {
    state = createInitialState();
    state.active = true;
    state.letterRoom = pickLetterRoom();
    state.letterHost = story.letterHosts[state.letterRoom];
    state.scene = 'intro';
    state.introIndex = 0;
  }

  function showGame() {
    if (menu) {
      menu.hidden = true;
    }

    gameSection.hidden = false;
    document.body.classList.add('is-playing');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  function returnToMenu() {
    gameSection.hidden = true;
    document.body.classList.remove('is-playing');

    if (menu) {
      menu.hidden = false;
      const playButton = menu.querySelector('[data-action="play"]');

      if (playButton) {
        playButton.focus({ preventScroll: true });
      }
    }

    // Atualiza o saldo exibido no menu após as recompensas da partida.
    if (window.RedencaoApp && typeof window.RedencaoApp.refreshCoins === 'function') {
      window.RedencaoApp.refreshCoins();
    }
  }

  // Recompensa aleatória de moedas (50-200) por abate de inimigo.
  async function awardCoins(source) {
    if (!api || typeof api.rewardCoins !== 'function') {
      return 0;
    }

    try {
      const result = await api.rewardCoins(source);
      const amount = result && result.reward ? result.reward.amount : 0;
      state.runCoins += amount;
      return amount;
    } catch {
      return 0;
    }
  }

  async function ensureNoMercyKit() {
    if (!api || typeof api.ensureStarterKit !== 'function') {
      return;
    }

    try {
      await api.ensureStarterKit();
    } catch {
      /* Sem servidor: o kit será tratado localmente ao iniciar o combate. */
    }
  }

  async function start(mode = 'standard') {
    const isNewRun = !state.active || state.over;

    if (isNewRun) {
      resetGame();
    }

    state.gameMode = mode;
    // Track original mode selection for achievements (surprise resolves to standard/no-mercy)
    state.originalMode = mode;
    gameStartTime = Date.now();

    const modeConfig = getModeConfig();

    if (isNewRun || state.runHp === null || state.runHp === undefined) {
      state.runHp = modeConfig.playerMaxHp;
    }

    showGame();

    const tasks = [loadWeaponBonus()];

    if (isNewRun && mode === 'no-mercy') {
      tasks.push(ensureNoMercyKit());
    }

    await Promise.all(tasks);
    renderCurrentScene();
  }

  function startNewGame() {
    // Go back to menu to select mode again
    returnToMenu();
  }

  function updateHeader() {
    if (!progressLabel) {
      return;
    }

    const parts = [`Pistas ${state.examined.size} / ${getTotalInteractions()}`];

    if (state.flags.letterFound) {
      parts.push('Carta encontrada');
    }

    progressLabel.textContent = parts.join(' · ');
  }

  function createActionButton(action) {
    const variant = action.variant ? ` btn--${action.variant}` : '';
    const button = el('button', `btn scene__button${variant}`);
    button.type = 'button';

    if (action.data) {
      Object.entries(action.data).forEach(([key, value]) => {
        button.dataset[key] = value;
      });
    }

    button.append(el('span', 'scene__button-label', action.label));

    if (action.hint) {
      button.append(el('span', 'scene__button-hint', action.hint));
    }

    if (typeof action.onClick === 'function') {
      button.addEventListener('click', action.onClick);
    }

    return button;
  }

  function renderScene({
    eyebrow,
    title,
    subtitle,
    paragraphs = [],
    content = null,
    clue,
    actions = [],
    variant = '',
    focus = 'title',
  }) {
    const scene = el('article', `scene${variant ? ` ${variant}` : ''}`);

    if (eyebrow) {
      scene.append(el('p', 'scene__eyebrow', eyebrow));
    }

    const heading = el('h2', 'scene__title', title);
    heading.tabIndex = -1;
    scene.append(heading);

    if (subtitle) {
      scene.append(el('p', 'scene__subtitle', subtitle));
    }

    if (paragraphs.length > 0) {
      const text = el('div', 'scene__text');

      paragraphs.forEach((paragraph) => {
        text.append(el('p', '', paragraph));
      });

      scene.append(text);
    }

    if (content) {
      scene.append(content);
    }

    if (clue) {
      scene.append(el('p', 'scene__clue', `Pista: ${clue}`));
    }

    let firstAction = null;

    if (actions.length > 0) {
      const actionWrap = el('div', 'scene__actions');

      actions.forEach((action) => {
        const button = createActionButton(action);

        if (!firstAction) {
          firstAction = button;
        }

        actionWrap.append(button);
      });

      scene.append(actionWrap);
    }

    stage.replaceChildren(scene);
    updateHeader();

    if (focus === 'title') {
      window.requestAnimationFrame(() => heading.focus({ preventScroll: true }));
    } else if (focus === 'first-action' && firstAction) {
      window.requestAnimationFrame(() => firstAction.focus({ preventScroll: true }));
    }
  }

  function renderCurrentScene() {
    switch (state.scene) {
      case 'intro':
        renderIntro();
        break;
      case 'hub':
        renderHub();
        break;
      case 'room':
        renderRoom();
        break;
      case 'interaction':
        renderInteraction();
        break;
      case 'safe':
        renderSafe();
        break;
      case 'well':
        renderWell();
        break;
      case 'combat-intro':
        renderCombatIntro();
        break;
      case 'encounter-intro':
        renderEncounterIntro();
        break;
      case 'encounter-victory':
        renderEncounterVictory();
        break;
      case 'combat':
        renderCombat();
        break;
      case 'ending':
        renderEnding();
        break;
      default:
        renderIntro();
        break;
    }
  }

  function renderIntro() {
    const beat = story.intro[state.introIndex];
    const isLast = state.introIndex === story.intro.length - 1;

    renderScene({
      eyebrow: `Prólogo — ${state.introIndex + 1} / ${story.intro.length}`,
      title: beat.title,
      paragraphs: beat.text,
      actions: [
        {
          label: beat.action || (isLast ? 'Entrar na mansão' : 'Continuar'),
          hint: isLast ? 'A investigação começa' : 'Enter, Espaço ou W',
          variant: 'primary',
          data: { gameAction: 'intro-next' },
          onClick: advanceIntro,
        },
      ],
    });
  }

  function advanceIntro() {
    if (!state.active || state.scene !== 'intro') {
      return;
    }

    if (state.introIndex < story.intro.length - 1) {
      state.introIndex += 1;
      renderIntro();
      return;
    }

    state.scene = 'hub';
    state.currentRoom = null;
    renderHub();
  }

  function getRoomStats(roomId) {
    const interactions = getRoomInteractions(roomId);
    const total = interactions.length;
    const examined = interactions.reduce(
      (count, interaction) => count + (state.examined.has(interaction.id) ? 1 : 0),
      0,
    );

    return { total, examined };
  }

  function renderHub() {
    const allDone = story.roomOrder.every((roomId) => {
      const stats = getRoomStats(roomId);
      return stats.examined === stats.total;
    });

    const actions = story.roomOrder.map((roomId) => {
      const room = story.rooms[roomId];
      const stats = getRoomStats(roomId);
      const done = stats.examined === stats.total;

      return {
        label: room.name,
        hint: done ? 'concluído' : `${stats.examined} / ${stats.total} pistas`,
        data: { room: roomId },
        onClick: () => openRoom(roomId),
      };
    });

    const paragraphs = [story.hub.description];

    if (allDone) {
      paragraphs.push(story.hub.allRooms);
    }

    renderScene({
      eyebrow: story.hub.eyebrow,
      title: story.hub.title,
      subtitle: state.flags.letterFound ? story.hub.letterFound : story.hub.prompt,
      paragraphs,
      actions,
    });
  }

  function openRoom(roomId) {
    state.currentRoom = roomId;
    state.scene = 'room';
    renderRoom();
  }

  function renderRoom() {
    const room = story.rooms[state.currentRoom];
    const stats = getRoomStats(state.currentRoom);

    const actions = getRoomInteractions(state.currentRoom).map((interaction) => {
      const examined = state.examined.has(interaction.id);
      const locked = interaction.requires && !state.flags[interaction.requires];

      return {
        label: interaction.label,
        hint: locked ? 'trancado' : examined ? 'examinado' : '',
        variant: examined ? 'ghost' : '',
        data: { interaction: interaction.id },
        onClick: () => openInteraction(interaction.id),
      };
    });

    if (state.currentRoom === 'jardim') {
      actions.push({
        label: 'Aproximar-se do poço',
        hint: 'decisão final',
        variant: 'danger',
        data: { gameAction: 'well' },
        onClick: openWell,
      });
    }

    actions.push({
      label: 'Voltar aos locais',
      variant: 'ghost',
      data: { gameAction: 'back-hub' },
      onClick: () => {
        state.scene = 'hub';
        state.currentRoom = null;
        renderHub();
      },
    });

    renderScene({
      eyebrow: `Investigação — ${stats.examined} / ${stats.total}`,
      title: room.name,
      paragraphs: [room.description],
      actions,
    });
  }

  function findInteraction(roomId, interactionId) {
    const room = story.rooms[roomId];

    if (!room) {
      return null;
    }

    return getRoomInteractions(roomId).find((interaction) => interaction.id === interactionId) || null;
  }

  function openInteraction(interactionId) {
    const interaction = findInteraction(state.currentRoom, interactionId);

    if (!interaction) {
      return;
    }

    state.currentInteraction = interactionId;

    if (interaction.requires && !state.flags[interaction.requires]) {
      state.scene = 'interaction';
      renderInteraction(true);
      return;
    }

    if (interaction.id === 'sala-cofre' && !state.flags.safeOpen) {
      state.scene = 'safe';
      renderSafe();
      return;
    }

    const wasExamined = state.examined.has(interaction.id);
    state.examined.add(interaction.id);

    if (interaction.effect) {
      state.flags[interaction.effect] = true;
    }

    if (interaction.id === state.letterHost && !state.flags.letterFound) {
      state.flags.letterFound = true;
    }

    if (!wasExamined) {
      maybeQueueEncounter();
    }

    state.scene = 'interaction';
    renderInteraction(false);
  }

  function maybeQueueEncounter() {
    const modeConfig = getModeConfig();

    if (modeConfig.explorationEncounters <= 0) {
      return;
    }

    if (state.encountersDone >= modeConfig.explorationEncounters) {
      return;
    }

    if (state.pendingEncounter) {
      return;
    }

    // A emboscada não acontece no jardim, para não interferir no poço.
    if (state.currentRoom === 'jardim') {
      return;
    }

    if (state.examined.size < 2) {
      return;
    }

    if (Math.random() >= 0.25) {
      return;
    }

    const stage = state.encountersDone;

    state.pendingEncounter = {
      stage,
      hp: modeConfig.mendigoHpByStage[stage] || modeConfig.mendigoHpByStage[0],
    };
  }

  function leaveInteraction() {
    if (state.pendingEncounter) {
      state.scene = 'encounter-intro';
      renderEncounterIntro();
      return;
    }

    state.scene = 'room';
    renderRoom();
  }

  function buildLetter() {
    const letter = el('section', 'letter');
    letter.append(el('p', 'letter__kicker', 'Documento encontrado'));
    letter.append(el('h3', 'letter__title', story.letter.title));
    letter.append(el('p', 'letter__hint', story.letterHint));

    const body = el('div', 'letter__body');

    story.letter.paragraphs.forEach((paragraph) => {
      body.append(el('p', '', paragraph));
    });

    letter.append(body);
    return letter;
  }

  function renderInteraction(locked = false) {
    const interaction = findInteraction(state.currentRoom, state.currentInteraction);

    if (!interaction) {
      state.scene = 'room';
      renderRoom();
      return;
    }

    const room = story.rooms[state.currentRoom];
    const isLetterHost = interaction.id === state.letterHost;
    let paragraphs;

    if (locked) {
      paragraphs = interaction.lockedText || interaction.text;
    } else if (interaction.id === 'sala-cofre' && state.flags.safeOpen) {
      paragraphs = interaction.openedText || interaction.text;
    } else if (isLetterHost && state.flags.letterFound) {
      paragraphs = interaction.text;
    } else {
      paragraphs = interaction.emptyText || interaction.text;
    }

    const content =
      !locked && isLetterHost && state.flags.letterFound ? buildLetter() : null;

    renderScene({
      eyebrow: `Investigação — ${room.name}`,
      title: room.name,
      subtitle: interaction.label,
      paragraphs,
      content,
      clue: locked ? null : interaction.clue,
      actions: [
        {
          label: 'Voltar ao cômodo',
          variant: 'ghost',
          data: { gameAction: 'back-room' },
          onClick: leaveInteraction,
        },
      ],
    });
  }

  function renderSafe(message = '') {
    const interaction = findInteraction('sala', 'sala-cofre');
    const form = el('form', 'safe');
    form.noValidate = true;
    form.dataset.safeForm = 'true';

    const label = el('label', 'safe__label', 'Digite a senha');
    label.htmlFor = 'safe-password';

    const input = el('input', 'safe__input');
    input.id = 'safe-password';
    input.name = 'password';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.maxLength = 30;
    input.setAttribute('aria-describedby', 'safe-hint safe-error');

    const hint = el('p', 'safe__hint', interaction.passwordHint);
    hint.id = 'safe-hint';

    // Show password hint if letter was found (and letter wasn't in the safe itself)
    const showPasswordHint = state.flags.letterFound && state.letterHost !== 'sala-cofre';
    let passwordHintEl = null;
    if (showPasswordHint) {
      passwordHintEl = el('p', 'safe__password-hint', '💡 Senha: HELENA');
    }

    const error = el('p', 'safe__error', message);
    error.id = 'safe-error';
    error.setAttribute('role', 'alert');

    const actions = el('div', 'safe__actions');
    const submit = el('button', 'btn btn--primary', 'Abrir o cofre');
    submit.type = 'submit';

    const back = el('button', 'btn btn--ghost', 'Voltar ao cômodo');
    back.type = 'button';
    back.addEventListener('click', () => {
      state.scene = 'room';
      renderRoom();
    });

    actions.append(submit, back);
    if (passwordHintEl) {
      form.append(label, input, hint, passwordHintEl, error, actions);
    } else {
      form.append(label, input, hint, error, actions);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (input.value.trim().toLowerCase() === 'helena') {
        state.flags.safeOpen = true;
        state.examined.add('sala-cofre');
        maybeQueueEncounter();
        state.scene = 'interaction';
        state.currentInteraction = 'sala-cofre';
        renderInteraction(false);
        return;
      }

      input.value = '';
      error.textContent = 'Senha incorreta. O cofre permanece fechado.';
      input.focus();
    });

    renderScene({
      eyebrow: 'Investigação — Sala de estar',
      title: 'O cofre',
      subtitle: 'Atrás do quadro antigo',
      paragraphs: [interaction.text[0], interaction.text[1]],
      content: form,
      focus: 'none',
    });

    window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  function openWell() {
    // O poço é o combate final: nenhuma emboscada pendente pode entrar aqui.
    state.pendingEncounter = null;
    state.scene = 'well';
    renderWell();
  }

  function renderWell() {
    const paragraphs = [...story.well.text];

    if (!state.flags.safeOpen && !state.flags.letterFound) {
      paragraphs.push(
        'Douglas ainda não entendeu o que aconteceu nesta casa. Mas a casa entendeu que ele chegou.',
      );
    }

    paragraphs.push(story.well.warning);

    renderScene({
      eyebrow: 'Jardim — decisão final',
      title: 'O poço',
      paragraphs,
      actions: [
        {
          label: 'Descer até o poço',
          hint: 'O combate começa aqui',
          variant: 'danger',
          data: { gameAction: 'well-confirm' },
          onClick: startCombatIntro,
        },
        {
          label: 'Voltar ao jardim',
          variant: 'ghost',
          data: { gameAction: 'back-room' },
          onClick: () => {
            state.scene = 'room';
            renderRoom();
          },
        },
      ],
    });
  }

  function startCombatIntro() {
    state.scene = 'combat-intro';
    renderCombatIntro();
  }

  function renderCombatIntro() {
    renderScene({
      eyebrow: 'O poço — combate final',
      title: 'Helena',
      paragraphs: story.combat.intro,
      actions: [
        {
          label: 'Lutar',
          hint: 'Atirar, esquivar ou usar item a cada turno',
          variant: 'danger',
          data: { gameAction: 'combat-start' },
          onClick: beginCombat,
        },
        {
          label: 'Recuar',
          variant: 'ghost',
          data: { gameAction: 'back-well' },
          onClick: () => {
            state.scene = 'well';
            renderWell();
          },
        },
      ],
    });
  }

  function renderEncounterIntro() {
    const encounter = state.pendingEncounter;

    if (!encounter) {
      state.scene = 'room';
      renderRoom();
      return;
    }

    const modeConfig = getModeConfig();

    renderScene({
      eyebrow: `${getModeLabel()} — emboscada ${encounter.stage + 1} / ${modeConfig.explorationEncounters}`,
      title: 'Mendigo',
      subtitle: 'A casa não vai deixar você passar sem luta.',
      paragraphs: story.combat.mendigoEncounter.intro,
      actions: [
        {
          label: 'Lutar',
          hint: 'Atirar ou esquivar',
          variant: 'danger',
          data: { gameAction: 'encounter-start' },
          onClick: beginMendigoCombat,
        },
      ],
    });
  }

  function renderEncounterVictory() {
    const paragraphs = [...story.combat.mendigoEncounter.victory];

    if (state.encounterReward > 0) {
      paragraphs.push(`Saque: +${state.encounterReward} moedas.`);
    }

    renderScene({
      eyebrow: `${getModeLabel()} — emboscada vencida`,
      title: 'O mendigo cai',
      paragraphs,
      actions: [
        {
          label: 'Continuar explorando',
          variant: 'primary',
          data: { gameAction: 'continue-exploring' },
          onClick: () => {
            state.scene = 'room';
            renderRoom();
          },
        },
      ],
    });
  }

  async function setupCombat(enemies, context) {
    const modeConfig = getModeConfig();
    const playerMaxHp = modeConfig.playerMaxHp;
    const playerHp = Math.min(
      Number.isFinite(state.runHp) ? state.runHp : playerMaxHp,
      playerMaxHp,
    );

    state.combat = {
      playerHp,
      playerMaxHp,
      enemies,
      turn: 1,
      phase: 'action', // 'action' | 'enemy-turn' | 'resolved' | 'over'
      last: null,
      outcome: null,
      selectedTarget: null, // For shooting
      usedAdrenaline: false, // Adrenaline syringe effect
      context, // 'exploration' | 'final'
    };

    // Load inventory for combat items
    await loadInventoryForCombat();

    state.scene = 'combat';
    renderCombat();
  }

  async function beginCombat() {
    const modeConfig = getModeConfig();

    await setupCombat([
      {
        id: 'helena',
        name: 'Helena',
        hp: modeConfig.helenaMaxHp,
        maxHp: modeConfig.helenaMaxHp,
        type: 'boss',
        alive: true,
      },
    ], 'final');
  }

  async function beginMendigoCombat() {
    const encounter = state.pendingEncounter;

    if (!encounter) {
      return;
    }

    await setupCombat([
      {
        id: `mendigo-${encounter.stage}`,
        name: 'Mendigo',
        hp: encounter.hp,
        maxHp: encounter.hp,
        type: 'mendigo',
        alive: true,
      },
    ], 'exploration');
  }

  function buildMeter(label, value, maxValue, variant) {
    const meter = el('div', `meter meter--${variant}`);
    const top = el('div', 'meter__top');
    top.append(el('span', 'meter__label', label));
    top.append(el('span', 'meter__value', `${value} / ${maxValue}`));

    const track = el('div', 'meter__track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', label);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(maxValue));
    track.setAttribute('aria-valuenow', String(value));

    const fill = el('span', 'meter__fill');
    fill.style.width = `${(value / maxValue) * 100}%`;
    track.append(fill);
    meter.append(top, track);

    return meter;
  }

  function getLivingEnemies() {
    return state.combat.enemies.filter(e => e.alive);
  }

  async function loadInventoryForCombat() {
    try {
      const inv = await api.getInventory();
      state.combatInventory = {
        seringas: inv.seringas,
        kitsMedicos: inv.kitsMedicos,
      };
    } catch {
      state.combatInventory = { seringas: 0, kitsMedicos: 0 };
    }
  }

  function renderCombat() {
    const combat = state.combat;

    if (!combat) {
      state.scene = 'well';
      renderWell();
      return;
    }

    const panel = el('div', 'combat');
    const hud = el('div', 'combat__hud');
    
    // Player meter
    hud.append(buildMeter('Douglas', combat.playerHp, combat.playerMaxHp, 'player'));
    
    // Enemy meters
    const enemiesWrap = el('div', 'combat__enemies');
    getLivingEnemies().forEach((enemy) => {
      const variant = enemy.type === 'boss' ? 'enemy' : 'mendigo';
      enemiesWrap.append(buildMeter(enemy.name, enemy.hp, enemy.maxHp, variant));
    });
    hud.append(enemiesWrap);

    const log = el('div', 'combat__log');
    log.append(el('p', 'combat__turn', `Turno ${combat.turn}`));

    if (combat.last) {
      combat.last.lines.forEach((line) => log.append(el('p', '', line)));
    } else {
      const emptyLog =
        combat.context === 'exploration'
          ? 'O mendigo bloqueia a passagem. A casa observa.'
          : story.combat.emptyLog;
      log.append(el('p', '', emptyLog));
    }

    panel.append(hud, log);

    let actions = [];

    if (combat.phase === 'action') {
      // Show target selection if shooting
      if (combat.selectedTarget !== null && combat.selectedTarget !== undefined) {
        // Target already selected, show confirm/cancel
        actions = [
          {
            label: 'Confirmar Tiro',
            hint: `Atirar em ${combat.enemies[combat.selectedTarget].name}`,
            variant: 'danger',
            data: { combatAction: 'shoot-confirm' },
            onClick: () => resolveCombat('shoot', combat.selectedTarget),
          },
          {
            label: 'Cancelar',
            variant: 'ghost',
            data: { combatAction: 'cancel-target' },
            onClick: () => {
              combat.selectedTarget = null;
              renderCombat();
            },
          },
        ];
      } else {
        // Normal action selection
        actions = [
          {
            label: 'Atirar',
            hint: 'Escolher alvo e atirar',
            data: { combatAction: 'shoot' },
            onClick: () => {
              if (getLivingEnemies().length === 1) {
                resolveCombat('shoot', 0);
              } else {
                combat.selectedTarget = 'selecting';
                renderCombat();
              }
            },
          },
          {
            label: 'Esquivar',
            hint: 'Tentar evitar todos os ataques',
            data: { combatAction: 'dodge' },
            onClick: () => resolveCombat('dodge'),
          },
        ];
        
        // Add item actions if available
        const inv = state.combatInventory || { seringas: 0, kitsMedicos: 0 };
        if (inv.seringas > 0) {
          actions.push({
            label: `Seringa de Adrenalina (${inv.seringas})`,
            hint: 'Esquiva garantida no próximo ataque',
            variant: 'primary',
            data: { combatAction: 'use-seringa' },
            onClick: () => useCombatItem('seringa'),
          });
        }
        if (inv.kitsMedicos > 0 && combat.playerHp < combat.playerMaxHp) {
          actions.push({
            label: `Kit Médico (${inv.kitsMedicos})`,
            hint: 'Cura 3 HP',
            variant: 'primary',
            data: { combatAction: 'use-kit' },
            onClick: () => useCombatItem('kit'),
          });
        }
      }
    } else if (combat.phase === 'enemy-turn') {
      // Enemy turn is automatic, show processing
      actions = [
        {
          label: 'Inimigos agem...',
          variant: 'ghost',
          disabled: true,
        },
      ];
      // Auto-process enemy turn after short delay
      setTimeout(() => processEnemyTurns(), 500);
    } else if (combat.phase === 'resolved') {
      actions = [
        {
          label: 'Continuar',
          hint: 'Próximo turno',
          variant: 'primary',
          data: { gameAction: 'combat-next' },
          onClick: nextCombatTurn,
        },
      ];
    } else if (combat.phase === 'over') {
      actions = [
        {
          label: 'Ver o fim',
          variant: 'primary',
          data: { gameAction: 'ending' },
          onClick: showEnding,
        },
      ];
    }

    // If in target selection mode, show enemy targets as buttons
    if (combat.selectedTarget === 'selecting') {
      actions = getLivingEnemies().map((enemy, index) => ({
        label: `Atirar em ${enemy.name}`,
        hint: `${enemy.hp}/${enemy.maxHp} HP`,
        variant: enemy.type === 'boss' ? 'danger' : '',
        data: { combatAction: 'shoot-target', target: index },
        onClick: () => {
          combat.selectedTarget = index;
          renderCombat();
        },
      }));
      actions.push({
        label: 'Voltar',
        variant: 'ghost',
        onClick: () => {
          combat.selectedTarget = null;
          renderCombat();
        },
      });
    }

    renderScene({
      eyebrow: combat.context === 'exploration'
        ? `Emboscada — turno ${combat.turn}`
        : `Combate — turno ${combat.turn}`,
      title: getLivingEnemies().length > 1 ? 'Múltiplos Inimigos' : getLivingEnemies()[0]?.name || 'Helena',
      subtitle:
        combat.phase === 'over'
          ? combat.outcome === 'victory'
            ? combat.context === 'exploration'
              ? 'A passagem está livre.'
              : 'O ódio se apaga.'
            : 'A casa venceu.'
          : combat.phase === 'enemy-turn'
            ? 'Inimigos atacam...'
            : 'Escolha sua ação',
      content: panel,
      actions,
      focus: 'first-action',
    });
  }

  function processEnemyTurns() {
    const combat = state.combat;
    if (!combat || combat.phase !== 'enemy-turn') return;

    const livingEnemies = getLivingEnemies();
    let allLines = [];

    livingEnemies.forEach((enemy) => {
      if (!enemy.alive) return;
      
      const roll = Math.floor(Math.random() * 20) + 1;
      const playerDodged = combat.last?.action === 'dodge' && combat.last.success;
      const hasAdrenaline = combat.usedAdrenaline;
      
      let success = false;
      let lines = [];
      
      if (hasAdrenaline) {
        // Adrenaline guarantees dodge
        success = false;
        lines = [
          `A adrenalina pulsa nas veias de Douglas. O tempo desacelera.`,
          `${enemy.name} investe, mas Douglas se move com precisão cirúrgica.`,
          `O ataque passa raspando. Esquiva perfeita.`
        ];
        combat.usedAdrenaline = false; // Consume adrenaline
      } else if (playerDodged) {
        success = false;
        lines = story.combat.dodge.success;
      } else {
        // Enemy attacks
        success = roll > 8; // Base enemy accuracy
        if (success) {
          combat.playerHp = Math.max(0, combat.playerHp - 1);
          lines = [
            `${enemy.name} ataca com fúria!`,
            `Douglas sente a dor rasgar sua carne.`,
          ];
          if (enemy.type === 'mendigo') {
            lines[0] = `${enemy.name} avança com unhas sujas e dentes podres!`;
          }
        } else {
          lines = [
            `${enemy.name} tenta atacar, mas erra o alvo.`,
            `Douglas respira aliviado.`
          ];
        }
      }
      
      allLines.push(...lines);
    });

    combat.last = { lines: allLines, enemyTurn: true };
    state.runHp = combat.playerHp;
    
    // Check for defeat
    if (combat.playerHp <= 0) {
      combat.outcome = 'defeat';
      combat.phase = 'over';
    } else {
      combat.phase = 'resolved';
    }
    
    renderCombat();
  }

  async function resolveCombat(action, targetIndex = null) {
    const combat = state.combat;

    if (!combat || (combat.phase !== 'action' && combat.phase !== 'enemy-turn')) {
      return;
    }

    const livingEnemies = getLivingEnemies();
    if (livingEnemies.length === 0) return;

    // Determine target
    let target = targetIndex;
    if (target === null || target === undefined) {
      target = 0; // Default to first enemy
    }
    
    // If target is 'selecting', we're in target selection mode - handled in renderCombat
    if (target === 'selecting') return;
    
    const enemy = livingEnemies[target];
    if (!enemy || !enemy.alive) return;

    // Apply weapon bonuses
    const weapon = getWeaponBonus();
    const baseRoll = Math.floor(Math.random() * 20) + 1;
    const accuracyBonus = weapon.accuracy || 0;
    const roll = Math.min(20, baseRoll + Math.floor(accuracyBonus * 20));
    const success = action === 'shoot' ? roll > 10 : roll > 8;
    
    let lines = [];
    let damage = 1 + (weapon.damage || 0);
    
    if (action === 'shoot') {
      if (success) {
        enemy.hp = Math.max(0, enemy.hp - damage);
        lines = story.combat.shoot.success;
        // Customize for mendigos
        if (enemy.type === 'mendigo') {
          lines = [
            `Você dispara. O tiro acerta ${enemy.name} em cheio.`,
            `Ele cai gemendo, mas o ódio nos olhos não morre.`
          ];
        }
        // Double attack from metralhadora
        if (weapon.doubleAttack && enemy.hp > 0) {
          const secondRoll = Math.floor(Math.random() * 20) + 1;
          const secondSuccess = secondRoll > 10;
          if (secondSuccess) {
            enemy.hp = Math.max(0, enemy.hp - damage);
            lines.push(`A rajada continua! Segundo acerto em ${enemy.name}!`);
          } else {
            lines.push('A rajada continua, mas o segundo tiro vai para longe.');
          }
        }
      } else {
        lines = story.combat.shoot.failure;
      }
    } else if (action === 'dodge') {
      if (success) {
        lines = story.combat.dodge.success;
      } else {
        lines = story.combat.dodge.failure;
        // Enemy will hit during their turn
      }
    }

    // Check victory
    const allDead = getLivingEnemies().every(e => e.hp <= 0);
    if (allDead) {
      combat.outcome = 'victory';
      combat.phase = 'over';
      state.runHp = combat.playerHp;

      // Recompensa por abate: 50-200 moedas.
      const coins = await awardCoins('enemy');
      if (coins > 0) {
        lines = [...lines, `Você revira os bolsos do inimigo: +${coins} moedas.`];
      }

      combat.last = { lines, success, action };

      if (combat.context === 'exploration') {
        state.encountersDone += 1;
        state.pendingEncounter = null;
        state.encounterReward = coins;
        state.scene = 'encounter-victory';
        renderEncounterVictory();
        return;
      }

      renderCombat();
      return;
    }

    combat.last = { lines, success, action };
    
    // Move to enemy turn
    combat.phase = 'enemy-turn';
    renderCombat();
  }

  function nextCombatTurn() {
    const combat = state.combat;

    if (!combat || combat.phase !== 'resolved') {
      return;
    }

    combat.turn += 1;
    combat.phase = 'action';
    combat.selectedTarget = null;
    renderCombat();
  }

  async function useCombatItem(itemType) {
    const combat = state.combat;
    if (!combat || combat.phase !== 'action') return;

    try {
      const result = await api.useItem(itemType);
      if (!result.success) {
        showStatus('Item não disponível');
        return;
      }
      
      // Update local inventory state
      state.combatInventory = {
        seringas: result.inventory.seringas,
        kitsMedicos: result.inventory.kitsMedicos,
      };

      if (itemType === 'seringa') {
        combat.usedAdrenaline = true;
        combat.last = { 
          lines: [
            'Você injeta a adrenalina. O mundo desacelera.',
            'Seus reflexos estão no limite. O próximo ataque não o atingirá.',
          ], 
          action: 'use-seringa' 
        };
        api.incrementStat('seringaUsed');
      } else if (itemType === 'kit') {
        const heal = 3;
        combat.playerHp = Math.min(combat.playerMaxHp, combat.playerHp + heal);
        state.runHp = combat.playerHp;
        combat.last = { 
          lines: [
            'Você aplica o kit médico com mãos trêmulas.',
            `Ferimentos fecham. HP restaurado: +${heal}.`,
          ], 
          action: 'use-kit' 
        };
        api.incrementStat('kitUsed');
      }

      combat.phase = 'enemy-turn';
      renderCombat();
    } catch (e) {
      showStatus('Erro ao usar item');
    }
  }

  async function showEnding() {
    if (!state.combat || !state.combat.outcome) {
      return;
    }

    state.ending = state.combat.outcome;
    state.over = true;
    
    const isVictory = state.ending === 'victory';
    const playTime = Date.now() - gameStartTime;

    // Registra o fim da partida; zerar o jogo rende 50-200 moedas.
    try {
      const result = await api.recordGameEnd(isVictory ? 'victory' : 'defeat', playTime);
      const reward = result && result.reward ? result.reward.amount : 0;
      state.runCoins += reward;
    } catch (e) {
      console.error('Failed to record game end', e);
    }

    // Conquistas novas também rendem uma recompensa de 50-200 moedas cada.
    const unlockAchievement = async (id) => {
      try {
        const result = await api.unlockAchievement(id);
        if (result && result.success && result.reward) {
          state.runCoins += result.reward.amount;
        }
      } catch (e) {
        console.error('Failed to unlock achievement', id, e);
      }
    };

    // Unlock mode-specific achievements
    if (isVictory) {
      const originalMode = state.originalMode || state.gameMode;
      if (originalMode === 'standard') {
        await unlockAchievement('primeiro_caso');
      } else if (originalMode === 'no-mercy') {
        await unlockAchievement('sem_piedade');
      } else if (originalMode === 'surprise') {
        await unlockAchievement('roleta_russa');
      }

      // Speedrun achievement (< 15 min = 900000 ms)
      if (playTime < 900000) {
        await unlockAchievement('speedrunner');
      }

      // Survivor achievement (1 HP remaining)
      if (state.combat.playerHp === 1) {
        await unlockAchievement('sobrevivente_nato');
      }

      // All clues found
      if (state.examined.size >= getTotalInteractions()) {
        await unlockAchievement('detetive_obsessivo');
      }

      // Letter read before safe (leitor_atento)
      if (state.flags.letterFound && state.letterHost !== 'sala-cofre') {
        await unlockAchievement('leitor_atento');
      }
    }
    
    state.scene = 'ending';
    renderEnding();
  }

  function renderEnding() {
    const isVictory = state.ending === 'victory';
    const paragraphs = [
      ...(isVictory ? story.combat.victory : story.combat.defeat),
    ];

    if (state.flags.letterFound) {
      paragraphs.push(
        isVictory ? story.combat.letterEpilogue : story.combat.defeatLetterEpilogue,
      );
    }

    paragraphs.push(story.ending.final);

    if (state.runCoins > 0) {
      paragraphs.push(
        isVictory
          ? `Recompensas da partida: +${state.runCoins} moedas.`
          : `Consolação pela derrota: +${state.runCoins} moedas.`,
      );
    }

    renderScene({
      eyebrow: isVictory ? story.ending.victoryEyebrow : story.ending.defeatEyebrow,
      title: isVictory ? story.ending.victoryTitle : story.ending.defeatTitle,
      paragraphs,
      variant: isVictory ? 'scene--victory' : 'scene--defeat',
      actions: [
        {
          label: 'Jogar novamente',
          hint: 'A carta muda de cômodo',
          variant: 'primary',
          data: { gameAction: 'restart' },
          onClick: startNewGame,
        },
        {
          label: 'Voltar ao menu',
          variant: 'ghost',
          data: { gameAction: 'menu' },
          onClick: returnToMenu,
        },
      ],
    });
  }

  if (menuButton) {
    menuButton.addEventListener('click', returnToMenu);
  }

  document.addEventListener('keydown', (event) => {
    if (gameSection.hidden || event.defaultPrevented) {
      return;
    }

    const target = event.target;
    const tagName = target instanceof Element ? target.tagName : '';
    const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);

    if (isTyping) {
      return;
    }

    const isW = event.key === 'w' || event.key === 'W';
    const isAdvance = event.key === 'Enter' || event.key === ' ';
    const onButton = target instanceof Element && Boolean(target.closest('button, a'));

    if (state.scene === 'intro' && (isW || (isAdvance && !onButton))) {
      event.preventDefault();
      advanceIntro();
    }
  });

  window.RedencaoGame = {
    start,
    returnToMenu,
  };
})();
