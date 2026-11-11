'use strict';

/* Redenção 2D — aventura top-down.
   Reaproveita story.js (textos/puzzles) e a API Node (moedas, armas, conquistas).
   O menu/opções/loja/conquistas continuam em DOM; o mundo roda em Phaser 3. */
window.RedencaoWorld = (() => {
  const story = window.REDENCAO_STORY;
  const R = window.RedencaoRooms;
  const api = window.RedencaoAPI;

  const LETTER_STORAGE_KEY = 'redencao:letter-room';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- estado global ----------
  let state = null;
  let gameStartTime = 0;
  let phaserGame = null;
  let lastPlayerHp = 5;

  function createState() {
    return {
      active: true,
      over: false,
      gameMode: 'standard',
      originalMode: 'standard',
      scene: 'intro',
      currentRoom: 'sala',
      examined: new Set(),
      flags: { hasKey: false, safeOpen: false, shedOpen: false, letterFound: false },
      letterRoom: null,
      letterHost: null,
      combat: null,
      pendingEncounter: null,
      encountersDone: 0,
      encounterReward: 0,
      runHp: null,
      runCoins: 0,
      weaponBonus: { accuracy: 0, damage: 0, doubleAttack: false },
      combatInventory: { seringas: 0, kitsMedicos: 0 },
      dialogOpen: false,
    };
  }

  function getModeConfig() {
    const noMercy = state.gameMode === 'no-mercy';
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
    if (!room) return [];
    if (state.gameMode !== 'no-mercy' || !story.noMercyInteractions) return room.interactions;
    const selectedIds = [...(story.noMercyInteractions[roomId] || [])];
    const letterHost = state.letterHost;
    const hostInRoom = letterHost && room.interactions.some((i) => i.id === letterHost);
    if (hostInRoom && !selectedIds.includes(letterHost) && selectedIds.length) {
      selectedIds[selectedIds.length - 1] = letterHost;
    }
    return selectedIds
      .map((id) => room.interactions.find((i) => i.id === id))
      .filter(Boolean);
  }

  function getTotalInteractions() {
    return story.roomOrder.reduce((total, roomId) => total + getRoomInteractions(roomId).length, 0);
  }

  function getRoomStats(roomId) {
    const interactions = getRoomInteractions(roomId);
    const examinedCount = interactions.reduce((count, i) => count + (state.examined.has(i.id) ? 1 : 0), 0);
    return { total: interactions.length, examined: examinedCount };
  }

  function findInteraction(roomId, interactionId) {
    const room = story.rooms[roomId];
    if (!room) return null;
    return getRoomInteractions(roomId).find((i) => i.id === interactionId) || null;
  }

  function isInteractionAvailable(roomId, interactionId) {
    return getRoomInteractions(roomId).some((i) => i.id === interactionId);
  }

  function pickLetterRoom() {
    const rooms = Object.keys(story.letterHosts);
    let previous = null;
    try { previous = localStorage.getItem(LETTER_STORAGE_KEY); } catch { previous = null; }
    const candidates = rooms.filter((roomId) => roomId !== previous);
    const pool = candidates.length ? candidates : rooms;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem(LETTER_STORAGE_KEY, chosen); } catch { /* sem localStorage */ }
    return chosen;
  }

  // ---------- elementos DOM ----------
  const gameSection = document.getElementById('game');
  const menu = document.getElementById('main-menu');
  const progressLabel = document.getElementById('game-progress');
  const menuButton = document.querySelector('[data-game-menu]');
  const dialogEl = document.getElementById('dialog');
  const dialogEyebrow = document.getElementById('dialog-eyebrow');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogSubtitle = document.getElementById('dialog-subtitle');
  const dialogText = document.getElementById('dialog-text');
  const dialogContent = document.getElementById('dialog-content');
  const dialogActions = document.getElementById('dialog-actions');
  const promptEl = document.getElementById('world-prompt');
  const endingEl = document.getElementById('ending');
  const combatDock = document.getElementById('combat-dock');

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function updateProgress() {
    if (!progressLabel || !state) return;
    const parts = [`Pistas ${state.examined.size} / ${getTotalInteractions()}`];
    if (state.flags.letterFound) parts.push('Carta encontrada');
    progressLabel.textContent = parts.join(' · ');
  }

  function showWorldPrompt(label) {
    if (!promptEl) return;
    if (label) {
      promptEl.textContent = `E — ${label}`;
      promptEl.hidden = false;
    } else {
      promptEl.hidden = true;
    }
  }

  // ---------- SFX procedurais ----------
  let audioCtx = null;
  function masterVolume() {
    try {
      const stored = JSON.parse(localStorage.getItem('redencao:volumes') || '{}');
      const v = Number(stored.master);
      return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.7;
    } catch { return 0.7; }
  }
  function sfx(kind) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;
      const gain = audioCtx.createGain();
      gain.connect(audioCtx.destination);
      const vol = masterVolume();
      const env = (peak, decay) => {
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * vol), t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      };
      const osc = (type, freq, dur) => {
        const o = audioCtx.createOscillator();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        o.connect(gain); o.start(t); o.stop(t + dur);
        return o;
      };
      const noise = (dur) => {
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = audioCtx.createBufferSource(); src.buffer = buffer; src.connect(gain); src.start(t);
      };
      switch (kind) {
        case 'ui': env(0.12, 0.09); osc('triangle', 660, 0.09); break;
        case 'step': env(0.05, 0.06); noise(0.05); break;
        case 'examine': env(0.14, 0.16); noise(0.16); break;
        case 'door': env(0.2, 0.4); osc('sine', 110, 0.4); osc('sine', 165, 0.35); break;
        case 'shot': env(0.5, 0.28); noise(0.22); osc('square', 92, 0.18); break;
        case 'hit': env(0.4, 0.2); osc('sine', 70, 0.2); noise(0.12); break;
        case 'bite': env(0.4, 0.22); osc('sawtooth', 55, 0.22); break;
        case 'coin': env(0.25, 0.35); osc('triangle', 880, 0.12); osc('triangle', 1320, 0.25); break;
        case 'unlock': env(0.3, 0.3); osc('triangle', 440, 0.1); osc('triangle', 660, 0.22); break;
        case 'roar':
          env(0.5, 1.1);
          {
            const o = audioCtx.createOscillator();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(78, t);
            o.frequency.exponentialRampToValueAtTime(41, t + 1.0);
            o.connect(gain);
            o.start(t);
            o.stop(t + 1.1);
          }
          noise(0.6);
          break;
        case 'laugh':
          env(0.32, 0.66);
          [0, 0.18, 0.37].forEach((offset, i) => {
            const o = audioCtx.createOscillator();
            o.type = 'triangle';
            o.frequency.value = 215 - i * 45;
            const blip = audioCtx.createGain();
            blip.gain.setValueAtTime(0.0001, t + offset);
            blip.gain.exponentialRampToValueAtTime(0.5, t + offset + 0.025);
            blip.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.16);
            o.connect(blip);
            blip.connect(gain);
            o.start(t + offset);
            o.stop(t + offset + 0.2);
          });
          break;
        case 'thunder': env(0.3, 1.4); noise(1.3); break;
        default: env(0.1, 0.1); osc('sine', 440, 0.1);
      }
    } catch { /* áudio indisponível */ }
  }

  function setPhaserKeyboardEnabled(enabled) {
    if (!phaserGame) return;
    phaserGame.scene.getScenes(true).forEach((scene) => {
      const keyboard = scene && scene.input && scene.input.keyboard;
      if (keyboard) keyboard.enabled = enabled;
    });
  }

  // ---------- diálogo em DOM ----------
  let dialogOnClose = null;

  function closeDialog() {
    if (!dialogEl) return;
    dialogEl.hidden = true;
    state.dialogOpen = false;
    setPhaserKeyboardEnabled(true);
    const onClose = dialogOnClose;
    dialogOnClose = null;
    showWorldPrompt(null);
    if (typeof onClose === 'function') onClose();
  }

  function openDialog({ eyebrow, title, subtitle, paragraphs = [], content = null, clue = null, actions = [], onClose = null, variant = '' }) {
    if (!dialogEl) return;
    state.dialogOpen = true;
    dialogOnClose = onClose;

    dialogEyebrow.textContent = eyebrow || '';
    dialogEyebrow.hidden = !eyebrow;
    dialogTitle.textContent = title || '';
    if (subtitle) {
      dialogSubtitle.textContent = subtitle;
      dialogSubtitle.hidden = false;
    } else {
      dialogSubtitle.hidden = true;
    }

    dialogText.replaceChildren(...paragraphs.map((p) => el('p', '', p)));

    dialogContent.replaceChildren();
    if (content) {
      dialogContent.appendChild(content);
      dialogContent.hidden = false;
    } else {
      dialogContent.hidden = true;
    }

    // dica de pista
    const oldClue = dialogEl.querySelector('.dialog__clue');
    if (oldClue) oldClue.remove();
    if (clue) {
      dialogContent.hidden = false;
      dialogContent.appendChild(el('p', 'dialog__clue', `Pista: ${clue}`));
    }

    dialogActions.replaceChildren();
    actions.forEach((action) => {
      const variantClass = action.variant ? ` btn--${action.variant}` : '';
      const button = el('button', `btn scene__button${variantClass}`);
      button.type = 'button';
      button.append(el('span', 'scene__button-label', action.label));
      if (action.hint) button.append(el('span', 'scene__button-hint', action.hint));
      button.addEventListener('click', () => {
        sfx('ui');
        if (typeof action.onClick === 'function') action.onClick();
        else closeDialog();
      });
      dialogActions.appendChild(button);
    });

    dialogEl.hidden = false;
    setPhaserKeyboardEnabled(false);
    const first = dialogActions.querySelector('button');
    if (first) window.requestAnimationFrame(() => first.focus({ preventScroll: true }));
  }

  function buildLetter() {
    const letter = el('section', 'letter');
    letter.append(el('p', 'letter__kicker', 'Documento encontrado'));
    letter.append(el('h3', 'letter__title', story.letter.title));
    letter.append(el('p', 'letter__hint', story.letterHint));
    const body = el('div', 'letter__body');
    story.letter.paragraphs.forEach((p) => body.append(el('p', '', p)));
    letter.append(body);
    return letter;
  }

  // ---------- pistas / encontros ----------
  function maybeQueueEncounter() {
    const cfg = getModeConfig();
    if (cfg.explorationEncounters <= 0) return;
    if (state.encountersDone >= cfg.explorationEncounters) return;
    if (state.pendingEncounter) return;
    if (state.currentRoom === 'jardim') return; // nunca no jardim, para não interferir no poço
    if (state.examined.size < 1) return;
    if (Math.random() >= 0.4) return;
    const stage = state.encountersDone;
    state.pendingEncounter = { stage, hp: cfg.mendigoHpByStage[stage] || cfg.mendigoHpByStage[0] };
  }

  function afterInteractionCloses() {
    if (state.pendingEncounter && !state.over) {
      goToCombat('exploration');
    }
  }

  async function openInteractionFlow(interactionId) {
    const interaction = findInteraction(state.currentRoom, interactionId);
    if (!interaction) return;

    const room = story.rooms[state.currentRoom];

    // galpão trancado sem a chave
    if (interaction.requires && !state.flags[interaction.requires]) {
      openDialog({
        eyebrow: `Investigação — ${room.name}`,
        title: room.name,
        subtitle: interaction.label,
        paragraphs: interaction.lockedText || interaction.text,
        actions: [{ label: 'Voltar ao cômodo', variant: 'ghost' }],
        onClose: afterInteractionCloses,
      });
      return;
    }

    // cofre
    if (interaction.id === 'sala-cofre' && !state.flags.safeOpen) {
      renderSafeDialog(interaction);
      return;
    }

    const wasExamined = state.examined.has(interaction.id);
    state.examined.add(interaction.id);
    if (interaction.effect) state.flags[interaction.effect] = true;

    const isLetterHost = interaction.id === state.letterHost;
    if (isLetterHost && !state.flags.letterFound) state.flags.letterFound = true;

    const paragraphs = interaction.id === 'sala-cofre' && state.flags.safeOpen
      ? interaction.openedText || interaction.text
      : isLetterHost && state.flags.letterFound
        ? interaction.text
        : interaction.emptyText || interaction.text;

    const content = isLetterHost && state.flags.letterFound ? buildLetter() : null;

    if (!wasExamined) maybeQueueEncounter();
    updateProgress();
    sfx('examine');

    openDialog({
      eyebrow: `Investigação — ${room.name}`,
      title: room.name,
      subtitle: interaction.label,
      paragraphs,
      content,
      clue: interaction.clue,
      actions: [{ label: 'Voltar ao cômodo', variant: 'ghost' }],
      onClose: afterInteractionCloses,
    });
  }

  function renderSafeDialog(interaction) {
    const form = el('form', 'safe');
    form.noValidate = true;

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

    if (state.flags.letterFound && state.letterHost !== 'sala-cofre') {
      form.append(label, input, hint, el('p', 'safe__password-hint', '💡 Senha: HELENA'));
    } else {
      form.append(label, input, hint);
    }

    const error = el('p', 'safe__error', '');
    error.id = 'safe-error';
    error.setAttribute('role', 'alert');

    const actions = el('div', 'safe__actions');
    const submit = el('button', 'btn btn--primary', 'Abrir o cofre');
    submit.type = 'submit';
    const back = el('button', 'btn btn--ghost', 'Voltar ao cômodo');
    back.type = 'button';
    back.addEventListener('click', () => closeDialog());
    actions.append(submit, back);
    form.append(error, actions);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (input.value.trim().toLowerCase() === 'helena') {
        state.flags.safeOpen = true;
        state.examined.add('sala-cofre');
        maybeQueueEncounter();
        updateProgress();
        sfx('unlock');
        openInteractionFlow('sala-cofre');
        return;
      }
      input.value = '';
      error.textContent = 'Senha incorreta. O cofre permanece fechado.';
      input.focus();
    });

    openDialog({
      eyebrow: 'Investigação — Sala de estar',
      title: 'O cofre',
      subtitle: 'Atrás do quadro antigo',
      paragraphs: [interaction.text[0], interaction.text[1]],
      content: form,
      actions: [],
      onClose: afterInteractionCloses,
    });

    window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  function openWellFlow() {
    const paragraphs = [...story.well.text];
    if (!state.flags.safeOpen && !state.flags.letterFound) {
      paragraphs.push('Douglas ainda não entendeu o que aconteceu nesta casa. Mas a casa entendeu que ele chegou.');
    }
    paragraphs.push(story.well.warning);

    openDialog({
      eyebrow: 'Jardim — decisão final',
      title: 'O poço',
      paragraphs,
      actions: [
        {
          label: 'Descer até o poço',
          hint: 'O combate começa aqui',
          variant: 'danger',
          onClick() {
            closeDialog();
            window.setTimeout(openHelenaIntro, 150);
          },
        },
        { label: 'Voltar ao jardim', variant: 'ghost' },
      ],
    });
  }

  function openHelenaIntro() {
    openDialog({
      eyebrow: 'O poço — combate final',
      title: 'Helena',
      paragraphs: story.combat.intro,
      actions: [
        {
          label: 'Lutar',
          hint: 'Atirar, esquivar ou usar item a cada turno',
          variant: 'danger',
          onClick() { closeDialog(); goToCombat('final'); },
        },
        { label: 'Recuar', variant: 'ghost' },
      ],
    });
  }

  // ---------- transição entre cenas ----------
  // Troca para `key` parando antes qualquer cena ativa: o Phaser não para a cena
  // de origem sozinho quando `scene.start` é chamado direto no SceneManager,
  // o que deixava o combate desenhado por cima da sala (tela travada).
  function swapScene(key, data) {
    if (!phaserGame) return;
    ['IntroScene', 'RoomScene', 'CombatScene'].forEach((sceneKey) => {
      if (sceneKey === key) return;
      try {
        if (phaserGame.scene.isActive(sceneKey)) phaserGame.scene.stop(sceneKey);
      } catch { /* cena inexistente não precisa ser parada */ }
    });
    phaserGame.scene.start(key, data);
  }

  // ---------- transição para o combate ----------
  function goToCombat(context) {
    if (!phaserGame) return;
    // guarda onde o Douglas estava para devolvê-lo ao mesmo lugar
    try {
      const roomScene = phaserGame.scene.getScene('RoomScene');
      if (roomScene && roomScene.player) {
        state.returnSpawn = { x: roomScene.player.x, y: roomScene.player.y };
      }
    } catch {
      state.returnSpawn = null;
    }
    state.pendingCombat = { context };
    swapScene('CombatScene', { context });
  }

  function finishEncounterVictory(reward) {
    try {
      state.encountersDone += 1;
      state.pendingEncounter = null;
      state.encounterReward = reward;
      state.runCoins += reward;
      const roomDef = window.RedencaoRooms.rooms[state.currentRoom];
      const spawn = state.returnSpawn;
      // só vale a posição salva se ela for andável NESTE cômodo; senão, ponto padrão
      const spawnValid = spawn
        && Number.isFinite(spawn.x)
        && Number.isFinite(spawn.y)
        && roomDef
        && !window.RedencaoRooms.rectHitsSolid(roomDef.map, spawn.x - 9, spawn.y - 12, 18, 12);
      swapScene('RoomScene', spawnValid
        ? { room: state.currentRoom, spawnX: spawn.x, spawnY: spawn.y }
        : { room: state.currentRoom });
    } catch (err) {
      console.error('finishEncounterVictory falhou; forçando retorno à sala', err);
      try {
        swapScene('RoomScene', { room: state.currentRoom || 'sala' });
      } catch (err2) {
        console.error('Retorno à sala também falhou', err2);
      }
    }

    sfx('coin');
    const paragraphs = [...story.combat.mendigoEncounter.victory];
    if (reward > 0) paragraphs.push(`Saque: +${reward} moedas.`);
    openDialog({
      eyebrow: `${getModeLabel()} — emboscada vencida`,
      title: 'O mendigo cai',
      paragraphs,
      actions: [{ label: 'Continuar explorando', variant: 'primary' }],
    });
  }

  async function awardCoins(source) {
    if (!api || typeof api.rewardCoins !== 'function') return 0;
    try {
      const result = await api.rewardCoins(source);
      return result && result.reward ? result.reward.amount : 0;
    } catch { return 0; }
  }

  // ---------- fim de jogo ----------
  async function finishRun(outcome, playerHp) {
    state.over = true;
    lastPlayerHp = Number.isFinite(playerHp) ? playerHp : state.runHp ?? 0;
    state.runHp = lastPlayerHp;
    const isVictory = outcome === 'victory';
    const playTime = Date.now() - gameStartTime;

    try {
      const result = await api.recordGameEnd(isVictory ? 'victory' : 'defeat', playTime);
      if (result && result.reward) state.runCoins += result.reward.amount;
    } catch (e) {
      console.error('Failed to record game end', e);
    }

    const unlock = async (id) => {
      try {
        const result = await api.unlockAchievement(id);
        if (result && result.success && result.reward) state.runCoins += result.reward.amount;
      } catch (e) {
        console.error('Failed to unlock achievement', id, e);
      }
    };

    if (isVictory) {
      const mode = state.originalMode || state.gameMode;
      if (mode === 'standard') await unlock('primeiro_caso');
      else if (mode === 'no-mercy') await unlock('sem_piedade');
      else if (mode === 'surprise') await unlock('roleta_russa');
      if (playTime < 900000) await unlock('speedrunner');
      if (state.runHp === 1) await unlock('sobrevivente_nato');
      if (state.examined.size >= getTotalInteractions()) await unlock('detetive_obsessivo');
      if (state.flags.letterFound && state.letterHost !== 'sala-cofre') await unlock('leitor_atento');
    }

    renderEnding(isVictory);
  }

  function renderEnding(isVictory) {
    if (!endingEl) return;
    combatDock.hidden = true;

    const paragraphs = [...(isVictory ? story.combat.victory : story.combat.defeat)];
    if (state.flags.letterFound) {
      paragraphs.push(isVictory ? story.combat.letterEpilogue : story.combat.defeatLetterEpilogue);
    }
    paragraphs.push(story.ending.final);
    if (state.runCoins > 0) {
      paragraphs.push(isVictory
        ? `Recompensas da partida: +${state.runCoins} moedas.`
        : `Consolação pela derrota: +${state.runCoins} moedas.`);
    }

    const card = el('article', `scene ${isVictory ? 'scene--victory' : 'scene--defeat'}`);
    card.append(el('p', 'scene__eyebrow', isVictory ? story.ending.victoryEyebrow : story.ending.defeatEyebrow));
    const h = el('h2', 'scene__title', isVictory ? story.ending.victoryTitle : story.ending.defeatTitle);
    h.tabIndex = -1;
    card.append(h);
    const text = el('div', 'scene__text');
    paragraphs.forEach((p) => text.append(el('p', '', p)));
    card.append(text);

    const actions = el('div', 'scene__actions');
    const again = el('button', 'btn btn--primary scene__button');
    again.append(el('span', 'scene__button-label', 'Jogar novamente'), el('span', 'scene__button-hint', 'A carta muda de cômodo'));
    again.addEventListener('click', () => { sfx('ui'); returnToMenu(); });
    const menuBtn = el('button', 'btn btn--ghost scene__button');
    menuBtn.append(el('span', 'scene__button-label', 'Voltar ao menu'));
    menuBtn.addEventListener('click', () => { sfx('ui'); returnToMenu(); });
    actions.append(again, menuBtn);
    card.append(actions);

    endingEl.replaceChildren(card);
    endingEl.hidden = false;
    window.requestAnimationFrame(() => h.focus({ preventScroll: true }));
  }

  // ---------- fluxo principal ----------
  function resetRun() {
    const mode = state ? state.originalMode : 'standard';
    state = createState();
    state.gameMode = mode;
    state.originalMode = mode;
    state.letterRoom = pickLetterRoom();
    state.letterHost = story.letterHosts[state.letterRoom];
    state.scene = 'intro';
  }

  function showGame() {
    if (menu) menu.hidden = true;
    gameSection.hidden = false;
    document.body.classList.add('is-playing');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  function returnToMenu() {
    if (phaserGame) {
      phaserGame.destroy(true);
      phaserGame = null;
    }
    if (dialogEl) dialogEl.hidden = true;
    if (endingEl) { endingEl.hidden = true; endingEl.replaceChildren(); }
    if (combatDock) combatDock.hidden = true;
    showWorldPrompt(null);
    gameSection.hidden = true;
    document.body.classList.remove('is-playing');
    if (menu) {
      menu.hidden = false;
      const playButton = menu.querySelector('[data-action="play"]');
      if (playButton) playButton.focus({ preventScroll: true });
    }
    if (window.RedencaoApp && typeof window.RedencaoApp.refreshCoins === 'function') {
      window.RedencaoApp.refreshCoins();
    }
  }

  async function start(mode = 'standard') {
    state = createState();
    state.active = true;
    state.gameMode = mode;
    state.originalMode = mode;
    state.letterRoom = pickLetterRoom();
    state.letterHost = story.letterHosts[state.letterRoom];
    state.scene = 'intro';
    state.runHp = getModeConfig().playerMaxHp;
    gameStartTime = Date.now();

    showGame();
    if (endingEl) { endingEl.hidden = true; endingEl.replaceChildren(); }
    if (combatDock) combatDock.hidden = true;
    updateProgress();

    // bônus de arma e kit do modo NO MERCY
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

    if (mode === 'no-mercy') {
      try { await api.ensureStarterKit(); } catch { /* sem servidor */ }
    }

    bootPhaser();
  }

  function bootPhaser() {
    if (phaserGame) {
      phaserGame.destroy(true);
      phaserGame = null;
    }
    const parent = document.getElementById('world-canvas');
    if (!parent || !window.Phaser) return;

    window.Phaser.Scale.FIT;
    phaserGame = new window.Phaser.Game({
      // Canvas 2D: pixel art não precisa de WebGL — evita travamento de contexto em GPUs antigas/integradas
      type: window.Phaser.CANVAS,
      parent: 'world-canvas',
      width: R.WORLD_W,
      height: R.WORLD_H,
      backgroundColor: '#04070b',
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: window.Phaser.Scale.FIT,
        autoCenter: window.Phaser.Scale.CENTER_BOTH,
      },
      scene: [window.RedencaoIntroScene, window.RedencaoRoomScene, window.RedencaoCombatScene],
      banner: false,
    });
  }

  if (menuButton) menuButton.addEventListener('click', returnToMenu);

  // Atalho universal: Enter/Espaço ativa o primeiro botão do diálogo visível
  document.addEventListener('keydown', (event) => {
    if (!dialogEl || dialogEl.hidden) return;
    const button = dialogActions.querySelector('button');
    if (!button) return; // diálogos sem botões são formulários — não interferir
    const target = event.target;
    const tag = target instanceof Element ? target.tagName : '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if (event.defaultPrevented) return;
    // o prólogo tem o próprio avanço de teclado — não duplicar
    if (state && state.scene === 'intro') return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      button.click();
    }
  });

  window.RedencaoGame = { start, returnToMenu };

  // API interna para combat.js
  return {
    get state() { return state; },
    get game() { return phaserGame; },
    get modeLabel() { return getModeLabel(); },
    getModeConfig,
    getTotalInteractions,
    openDialog,
    closeDialog,
    showDoorPrompt: showWorldPrompt,
    isInteractionAvailable,
    updateProgress,
    awardCoins,
    finishRun,
    finishEncounterVictory,
    openInteractionFlow,
    openWellFlow,
    goToCombat,
    sfx,
    reducedMotion,
    story,
  };
})();
