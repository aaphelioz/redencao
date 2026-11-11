'use strict';

/* Redenção 2D — aventura top-down.
   Reaproveita story.js (textos/puzzles) e a API Node (moedas, armas, conquistas).
   O menu/opções/loja/conquistas continuam em DOM; o mundo roda em Phaser 3. */
window.RedencaoWorld = (() => {
  const REDENCAO_STORY = window.REDENCAO_STORY;
  const ARQUIVO047_STORY = window.ARQUIVO047_STORY;
  let story = REDENCAO_STORY;
  const R = window.RedencaoRooms;
  const api = window.RedencaoAPI;

  const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
  const isArquivo047 = () => Boolean(state && state.campaign === 'arquivo047');

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
      campaign: 'redencao',
      chapter: 1,
      completedChapters: {},
      skipIntro: false,
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
    if (isArquivo047()) return 'ARQUIVO 047';
    return state.gameMode === 'no-mercy' ? 'NO MERCY' : 'STANDARD';
  }

  function getRoomInteractions(roomId) {
    const room = story.rooms[roomId];
    if (!room) return [];
    if (isArquivo047()) {
      // Campanha paralela: interações com chapter <= capítulo atual
      return room.interactions.filter((i) => (i.chapter || 1) <= state.chapter);
    }
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
  const chapterEl = document.getElementById('game-chapter');
  const chapterTintEl = document.getElementById('chapter-tint');
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

  // ---------- ARQUIVO 047: progressão e rótulos ----------
  function getChapterRequirements(chapterN) {
    const reqs = story.chapterRequirements || {};
    return reqs[chapterN] || [];
  }

  function getChapterProgress() {
    const req = getChapterRequirements(state.chapter);
    const examined = req.filter((id) => state.examined.has(id)).length;
    const completedCount = Math.min(5, Object.values(state.completedChapters || {}).filter(Boolean).length);
    return { total: req.length, examined, completedCount };
  }

  function setArquivo047Labels() {
    if (!isArquivo047()) return;
    if (chapterEl) {
      const chapterDef = (story.chapters || [])[state.chapter - 1];
      const name = chapterDef ? chapterDef.name : '';
      chapterEl.textContent = `ARQUIVO 047 — Capítulo ${ROMAN[state.chapter - 1]} · ${name}`;
    }
  }

  function applyChapterTint(n) {
    document.body.classList.add('is-arquivo047');
    for (let i = 1; i <= 5; i += 1) {
      document.body.classList.toggle(`chapter-${i}`, i === n);
    }
    if (chapterTintEl) chapterTintEl.hidden = false;
  }

  function clearChapterTint() {
    document.body.classList.remove('is-arquivo047');
    for (let i = 1; i <= 5; i += 1) {
      document.body.classList.remove(`chapter-${i}`);
    }
    if (chapterTintEl) chapterTintEl.hidden = true;
  }

  async function persistArquivo047() {
    if (!isArquivo047()) return;
    try {
      await api.saveArquivo047Progress({
        chapter: state.chapter,
        examined: [...state.examined],
        flags: state.flags,
        completed: state.completedChapters,
        currentRoom: state.currentRoom,
      });
    } catch (e) {
      console.error('ARQUIVO 047: falha ao salvar progresso', e);
    }
  }

  function maybeCompleteChapter() {
    if (!isArquivo047()) return false;
    const req = getChapterRequirements(state.chapter);
    if (!req.length) return false;
    if (!req.every((id) => state.examined.has(id))) return false;

    const finished = state.chapter;
    state.completedChapters[finished] = true;
    const isLast = finished >= 5;
    if (!isLast) {
      state.chapter += 1;
      applyChapterTint(state.chapter);
    }
    const completion = (story.chapterCompletions && story.chapterCompletions[finished]) || null;
    if (completion) {
      sfx('unlock');
      openDialog({
        eyebrow: completion.eyebrow,
        title: completion.title,
        paragraphs: completion.paragraphs,
        actions: [{ label: 'Continuar', variant: 'primary' }],
      });
    }
    setArquivo047Labels();
    updateProgress();
    persistArquivo047();
    return true;
  }

  function updateProgress() {
    if (!progressLabel || !state) return;
    if (isArquivo047()) {
      const { total, examined, completedCount } = getChapterProgress();
      const parts = [`Cap. ${ROMAN[state.chapter - 1]} · Pistas ${examined} / ${total}`, `Capítulos ${completedCount} / 5`];
      progressLabel.textContent = parts.join(' · ');
      setArquivo047Labels();
      return;
    }
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

  // ===== ARQUIVO 047 — diálogos com Helena (NPC) =====
  function openNpcDialog() {
    if (!isArquivo047()) return;
    const dialogDef = story.npcDialogs && story.npcDialogs[state.chapter];
    if (!dialogDef) return; // capítulo 5: a casa em silêncio
    const actions = [{ label: 'Voltar', variant: 'ghost' }];
    if (dialogDef.question) {
      actions.unshift({
        label: dialogDef.question.label,
        variant: 'primary',
        onClick() {
          openNpcDialogResponse(dialogDef.question);
        },
      });
    }
    openDialog({
      eyebrow: 'Helena',
      title: 'Helena',
      subtitle: dialogDef.subtitle || 'A esposa',
      paragraphs: dialogDef.text,
      actions,
    });
  }

  function openNpcDialogResponse(question) {
    openDialog({
      eyebrow: 'Helena',
      title: 'Helena',
      subtitle: question.subtitle || 'Ela não desvia os olhos',
      paragraphs: question.answer,
      actions: [{ label: 'Voltar', variant: 'ghost' }],
    });
  }

  // ---------- easter egg: O Arquivo Kennedy ----------
  // Pasta escondida no fundo da gaveta do criado-mudo do quarto do casal.
  // Não interfere na história: progresso próprio, sem contar no HUD de pistas.
  const kennedyDocIds = ['carta', 'relacao', 'foto', 'nota'];
  // Progresso da sessão (persiste entre cômodos e partidas nesta sessão de jogo).
  const kennedyProgress = { viewed: new Set(), achievementUnlocked: false };
  let kennedyCurrent = 0;
  let kennedyPhotoFlipped = false;
  let archiveOpen = false;
  let archiveLastTrigger = null;

  const archiveEl = document.getElementById('kennedy-archive');
  const archivePage = document.getElementById('archive-page');
  const archiveTabs = document.getElementById('archive-tabs');
  const archiveCounter = document.getElementById('archive-counter');
  const archiveFoot = document.getElementById('archive-foot');
  const archivePrev = document.getElementById('archive-prev');
  const archiveNext = document.getElementById('archive-next');
  const archiveClose = document.getElementById('archive-close');

  function isKennedyDocAvailable(id) {
    if (id !== 'nota') return true;
    return ['carta', 'relacao', 'foto'].every((prev) => kennedyProgress.viewed.has(prev));
  }

  function openKennedyArchive(startIndex) {
    if (!archiveEl || !story.kennedy) return;
    if (Number.isInteger(startIndex)) kennedyCurrent = Math.min(Math.max(startIndex, 0), kennedyDocIds.length - 1);
    archiveOpen = true;
    archiveLastTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // O diálogo do criado-mudo continua aberto por baixo: trava o teclado do jogo.
    setPhaserKeyboardEnabled(false);
    showWorldPrompt(null);
    archiveEl.hidden = false;
    archiveEl.classList.remove('archive--closing');
    renderKennedyArchive();
    sfx('examine');
    if (archiveClose) window.requestAnimationFrame(() => archiveClose.focus({ preventScroll: true }));
  }

  function closeKennedyArchive() {
    if (!archiveEl || archiveEl.hidden || !archiveOpen) return;
    sfx('ui');
    const finish = () => {
      archiveEl.hidden = true;
      archiveEl.classList.remove('archive--closing');
      archiveOpen = false;
      // Só devolve o teclado ao jogo se não houver diálogo aberto por baixo.
      setPhaserKeyboardEnabled(!state.dialogOpen);
      const target = archiveLastTrigger && document.contains(archiveLastTrigger) ? archiveLastTrigger : null;
      if (target) window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
      archiveLastTrigger = null;
    };
    if (reducedMotion) {
      finish();
      return;
    }
    archiveEl.classList.add('archive--closing');
    window.setTimeout(finish, 190);
  }

  function renderKennedyArchive() {
    if (!archiveEl) return;
    const k = story.kennedy;

    renderKennedyTabs();
    renderKennedyPage();

    const n = kennedyProgress.viewed.size;
    if (archiveCounter) archiveCounter.textContent = `${k.overlay.progressLabel}: ${n}/${kennedyDocIds.length}`;
    if (archiveFoot) {
      archiveFoot.textContent = n === kennedyDocIds.length ? k.overlay.completeNote : k.overlay.line;
      archiveFoot.classList.toggle('archive__foot--unlocked', n === kennedyDocIds.length);
    }
    if (archivePrev) archivePrev.disabled = kennedyCurrent === 0;
    if (archiveNext) archiveNext.disabled = kennedyCurrent === kennedyDocIds.length - 1;
  }

  function renderKennedyTabs() {
    if (!archiveTabs) return;
    const k = story.kennedy;
    archiveTabs.setAttribute('aria-label', k.overlay.tabsLabel);
    archiveTabs.replaceChildren(...k.tabs.map((label, i) => {
      const id = kennedyDocIds[i];
      const available = isKennedyDocAvailable(id);
      const viewed = kennedyProgress.viewed.has(id);
      const tab = el('button', `archive__tab${i === kennedyCurrent ? ' archive__tab--active' : ''}${available ? '' : ' archive__tab--locked'}${viewed ? ' archive__tab--done' : ''}`, available ? label : `🔒 ${label}`);
      tab.type = 'button';
      tab.dataset.index = String(i);
      tab.setAttribute('aria-current', i === kennedyCurrent ? 'true' : 'false');
      return tab;
    }));
  }

  function renderKennedyPage() {
    if (!archivePage) return;
    const id = kennedyDocIds[kennedyCurrent];
    const k = story.kennedy;
    archivePage.replaceChildren();

    if (!isKennedyDocAvailable(id)) {
      const locked = el('div', 'archive__locked');
      locked.append(el('div', 'archive__locked-icon'));
      locked.append(el('p', 'archive__locked-text', k.overlay.lockedNote));
      archivePage.append(locked);
      return;
    }

    if (id === 'carta') {
      archivePage.append(buildKennedyTypewriterPaper(k.documents.carta));
    } else if (id === 'relacao') {
      archivePage.append(buildKennedyListPaper(k.documents.relacao));
    } else if (id === 'foto') {
      archivePage.append(buildKennedyPhoto(k.documents.foto, k.overlay));
    } else if (id === 'nota') {
      archivePage.append(buildKennedyTypewriterPaper(k.documents.nota, true));
    }

    markKennedyDocViewed(id);
  }

  function buildKennedyTypewriterPaper(doc, signOff) {
    const paper = el('article', 'archive__paper');
    paper.append(el('p', 'archive__paper-kind', doc.kind));
    paper.append(el('h4', 'archive__paper-title', doc.title));
    const body = el('div', 'archive__paper-body');
    doc.paragraphs.forEach((p) => {
      const line = el('p', '', p);
      if (signOff && p.startsWith('—')) {
        line.classList.add('archive__hand');
        line.style.fontStyle = 'italic';
      }
      body.append(line);
    });
    paper.append(body);
    return paper;
  }

  function buildKennedyListPaper(doc) {
    const paper = el('article', 'archive__paper');
    paper.append(el('p', 'archive__paper-kind', doc.kind));
    paper.append(el('h4', 'archive__paper-title', doc.title));
    const body = el('div', 'archive__paper-body');
    body.append(el('p', '', doc.intro));
    const list = el('ul', 'archive__list');
    doc.items.forEach((item, i) => {
      const li = el('li', 'archive__list-item');
      li.append(el('span', 'archive__list-text', item));
      if (i === doc.items.length - 1) li.append(el('span', 'archive__hand', `“${doc.annotation}”`));
      list.append(li);
    });
    body.append(list);
    paper.append(body);
    if (doc.closing) paper.append(el('p', 'archive__paper-note', doc.closing));
    return paper;
  }

  function buildKennedyPhoto(doc, overlay) {
    const wrap = el('div', 'archive__paper archive__photo');
    wrap.append(el('p', 'archive__paper-kind', doc.kind));

    const front = el('figure', 'archive__photo-frame');
    front.hidden = kennedyPhotoFlipped;
    const canvas = document.createElement('canvas');
    canvas.width = 356;
    canvas.height = 224;
    canvas.className = 'archive__photo-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Fotografia em preto e branco de uma turma diante do prédio do colégio. Um dos rostos foi riscado.');
    front.append(canvas);
    front.append(el('figcaption', 'archive__photo-caption', overlay.frontCaption));
    drawKennedyPhoto(canvas);

    const back = el('div', 'archive__photo-back');
    back.hidden = !kennedyPhotoFlipped;
    back.append(el('div', 'archive__photo-stamp'));
    back.append(el('p', 'archive__photo-back-inscription', overlay.backInscription));

    const flip = el('button', 'archive__flip', kennedyPhotoFlipped ? overlay.flipToFront : overlay.flipToBack);
    flip.type = 'button';
    flip.addEventListener('click', () => {
      kennedyPhotoFlipped = !kennedyPhotoFlipped;
      sfx('ui');
      front.hidden = kennedyPhotoFlipped;
      back.hidden = !kennedyPhotoFlipped;
      flip.textContent = kennedyPhotoFlipped ? overlay.flipToFront : overlay.flipToBack;
    });

    wrap.append(front);
    wrap.append(back);
    wrap.append(flip);
    return wrap;
  }

  // Fotografia de turma procedural (P&B, envelhecida, um rosto riscado)
  function drawKennedyPhoto(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    let seed = 19980817;
    const rand = () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // fundo: parede do colégio, porta ao longe
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#63645f');
    bg.addColorStop(0.55, '#41423f');
    bg.addColorStop(1, '#242523');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 44, w, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(w / 2 - 22, 10, 44, 46); // porta escura ao fundo

    const figure = (cx, baseY, scale, tone, headTone) => {
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.moveTo(cx - 12 * scale, baseY);
      ctx.lineTo(cx - 8.5 * scale, baseY - 15 * scale);
      ctx.lineTo(cx + 8.5 * scale, baseY - 15 * scale);
      ctx.lineTo(cx + 12 * scale, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = headTone;
      ctx.beginPath();
      ctx.arc(cx, baseY - 21 * scale, 6.6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(22,20,17,0.85)';
      ctx.beginPath();
      ctx.arc(cx, baseY - 23.4 * scale, 6.6 * scale, Math.PI * 1.04, Math.PI * 1.96);
      ctx.fill();
    };

    const tones = ['#1d1e1d', '#252624', '#2d2c29', '#1a1b1c'];
    const heads = ['#b9b5a8', '#a8a496', '#c6c2b4', '#98948a'];

    // professor ao fundo, ao centro
    figure(w / 2, 78, 1.28, '#191a19', '#b0aca0');
    ctx.fillStyle = 'rgba(10,10,10,0.9)';
    ctx.fillRect(w / 2 - 1.5, 56, 3, 12); // gravata

    // três fileiras de alunos
    const rows = [
      { baseY: 116, count: 8, spread: 34, scale: 0.86 },
      { baseY: 158, count: 9, spread: 35, scale: 0.98 },
      { baseY: 208, count: 8, spread: 40, scale: 1.14 },
    ];
    const scribbledRow = 1;   // fileira do meio
    const scribbledIndex = 4; // quarto aluno a partir da esquerda
    let scribbled = null;

    rows.forEach((row, rowIndex) => {
      const startX = w / 2 - ((row.count - 1) * row.spread) / 2;
      for (let i = 0; i < row.count; i++) {
        const cx = startX + i * row.spread + (rand() - 0.5) * 5;
        const tone = tones[Math.floor(rand() * tones.length)];
        const head = heads[Math.floor(rand() * heads.length)];
        figure(cx, row.baseY, row.scale * (0.92 + rand() * 0.18), tone, head);
        if (rowIndex === scribbledRow && i === scribbledIndex) {
          scribbled = { x: cx, y: row.baseY - 21 * row.scale, r: 6.6 * row.scale };
        }
      }
    });

    // rosto riscado: rabiscos escuros por cima da identidade
    if (scribbled) {
      ctx.strokeStyle = 'rgba(10,8,6,0.92)';
      ctx.lineWidth = 1.7;
      ctx.lineCap = 'round';
      for (let s = 0; s < 5; s++) {
        const yy = scribbled.y - scribbled.r + (s + 0.5) * ((scribbled.r * 2) / 5);
        ctx.beginPath();
        ctx.moveTo(scribbled.x - scribbled.r - 2, yy + (rand() - 0.5) * 3);
        for (let x = scribbled.x - scribbled.r; x <= scribbled.x + scribbled.r + 2; x += 3) {
          ctx.lineTo(x, yy + (rand() - 0.5) * 4.5);
        }
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(scribbled.x, scribbled.y, scribbled.r + 3, scribbled.r + 2, -0.15, 0, Math.PI * 2);
      ctx.stroke();
    }

    // granulação, riscos de revelação e vinheta
    for (let i = 0; i < 1300; i++) {
      const alpha = 0.04 + rand() * 0.09;
      ctx.fillStyle = rand() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.8})`;
      ctx.fillRect(Math.floor(rand() * w), Math.floor(rand() * h), 1, 1);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(Math.floor(w * 0.3), 0, 1, h);
    ctx.fillRect(Math.floor(w * 0.72), 0, 1, h);
    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.72);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.46)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  function markKennedyDocViewed(id) {
    if (kennedyProgress.viewed.has(id)) return;
    kennedyProgress.viewed.add(id);
    renderKennedyTabs();

    if (kennedyProgress.viewed.size === kennedyDocIds.length && !kennedyProgress.achievementUnlocked) {
      kennedyProgress.achievementUnlocked = true;
      unlockKennedyAchievement();
    }
  }

  async function unlockKennedyAchievement() {
    const k = story.kennedy;
    let unlocked = false;
    let rewardAmount = 0;
    try {
      if (typeof api !== 'undefined' && api && typeof api.unlockAchievement === 'function') {
        const result = await api.unlockAchievement(k.achievementId);
        if (result && result.success) {
          unlocked = true;
          if (result.reward && result.reward.amount) {
            rewardAmount = result.reward.amount;
            if (state) state.runCoins += rewardAmount;
          }
        }
      }
    } catch (e) {
      console.error('Failed to unlock achievement', k.achievementId, e);
      kennedyProgress.achievementUnlocked = false; // permite nova tentativa em outra leitura
      return;
    }
    if (unlocked && archiveFoot) {
      archiveFoot.textContent = rewardAmount > 0
        ? `${k.overlay.unlockedNote} (+${rewardAmount} moedas)`
        : k.overlay.unlockedNote;
      archiveFoot.classList.add('archive__foot--unlocked');
    }
    renderKennedyCounterAfterUnlock();
  }

  function renderKennedyCounterAfterUnlock() {
    const n = kennedyProgress.viewed.size;
    if (archiveCounter) archiveCounter.textContent = `${story.kennedy.overlay.progressLabel}: ${n}/${kennedyDocIds.length}`;
  }

  function kennedyTrapFocus(event) {
    if (!archiveEl) return;
    const focusable = archiveEl.querySelectorAll('button:not(:disabled), [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (archiveEl) {
    const k = story.kennedy;
    if (k) {
      const stampNo = archiveEl.querySelector('.archive__stamp-no');
      const stampLines = archiveEl.querySelectorAll('.archive__stamp-line');
      const title = archiveEl.querySelector('.archive__title');
      if (stampNo) stampNo.textContent = k.overlay.eyebrow;
      if (stampLines[0]) stampLines[0].textContent = k.overlay.stampLine1;
      if (stampLines[1]) stampLines[1].textContent = k.overlay.stampLine2;
      if (title) title.textContent = k.overlay.title;
      if (archiveClose) archiveClose.setAttribute('aria-label', k.overlay.closeLabel);
      if (archivePrev) archivePrev.setAttribute('aria-label', k.overlay.prevLabel);
      if (archiveNext) archiveNext.setAttribute('aria-label', k.overlay.nextLabel);
    }
    archiveClose.addEventListener('click', closeKennedyArchive);
    archiveEl.querySelector('[data-archive-close]').addEventListener('click', closeKennedyArchive);
    archivePrev.addEventListener('click', () => {
      if (kennedyCurrent === 0) return;
      kennedyCurrent -= 1;
      sfx('ui');
      renderKennedyArchive();
    });
    archiveNext.addEventListener('click', () => {
      if (kennedyCurrent === kennedyDocIds.length - 1) return;
      kennedyCurrent += 1;
      sfx('ui');
      renderKennedyArchive();
    });
    archiveTabs.addEventListener('click', (event) => {
      const tab = event.target.closest('.archive__tab');
      if (!tab || !archiveTabs.contains(tab)) return;
      const index = Number(tab.dataset.index);
      if (!Number.isInteger(index) || index === kennedyCurrent) return;
      kennedyCurrent = index;
      sfx('ui');
      renderKennedyArchive();
    });
    archiveEl.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') kennedyTrapFocus(event);
    });
  }

  // ---------- pistas / encontros ----------
  function maybeQueueEncounter() {
    if (isArquivo047()) return; // campanha de investigação — sem emboscadas
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
    if (isArquivo047()) {
      maybeCompleteChapter();
      return;
    }
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
    persistArquivo047();

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

    const actions = [{ label: 'Voltar ao cômodo', variant: 'ghost' }];
    // Easter egg: algo espreita no fundo da gaveta do criado-mudo
    if (interaction.id === 'quartos-criado-mudo' && story.kennedy) {
      actions.unshift({ label: story.kennedy.buttonLabel, variant: 'primary', onClick: () => openKennedyArchive(0) });
    }

    openDialog({
      eyebrow: `Investigação — ${room.name}`,
      title: room.name,
      subtitle: interaction.label,
      paragraphs,
      content,
      clue: interaction.clue,
      actions,
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
        persistArquivo047();
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

  // ===== ARQUIVO 047 — o poço e a última correspondência =====
  function openArquivo047Well() {
    const paragraphs = [...story.well.text];
    openDialog({
      eyebrow: 'Jardim — a última porta',
      title: 'O poço',
      paragraphs,
      clue: story.well.clue,
      actions: [
        {
          label: 'Descer com a lanterna',
          hint: 'Algo prende na pedra',
          variant: 'danger',
          onClick() {
            closeDialog();
            window.setTimeout(openArquivo047FinalLetter, 150);
          },
        },
        { label: 'Voltar ao jardim', variant: 'ghost' },
      ],
    });
  }

  function buildFinalLetter() {
    const fl = story.finalLetter;
    const letter = el('section', 'letter letter--final');
    letter.append(el('p', 'letter__kicker', fl.kicker));
    letter.append(el('h3', 'letter__title', fl.title));
    const body = el('div', 'letter__body');
    fl.body.forEach((p) => body.append(el('p', '', p)));
    letter.append(body);
    return letter;
  }

  function openArquivo047FinalLetter() {
    state.examined.add('jardim-well');
    state.flags.finalLetter = true;
    persistArquivo047();
    updateProgress();

    const fl = story.finalLetter;
    openDialog({
      eyebrow: 'Correspondência sob a pedra',
      title: fl.title,
      paragraphs: fl.intro,
      content: buildFinalLetter(),
      actions: [{
        label: 'Guardar a carta no bolso',
        hint: 'A campanha se encerra',
        variant: 'primary',
        onClick() {
          closeDialog();
          window.setTimeout(() => {
            openDialog({
              eyebrow: 'ARQUIVO 047 — O bolso do coração',
              title: 'De volta à varanda',
              paragraphs: fl.outro,
              actions: [{ label: 'Encerrar o Arquivo 047', variant: 'primary', onClick() { closeDialog(); window.setTimeout(renderArquivo047Ending, 200); } }],
            });
          }, 180);
        },
      }],
    });
  }

  async function renderArquivo047Ending() {
    state.over = true;
    state.completedChapters[5] = true;
    try {
      await api.saveArquivo047Progress({
        chapter: 5,
        examined: [...state.examined],
        flags: state.flags,
        completed: state.completedChapters,
        done: true,
        currentRoom: state.currentRoom,
      });
    } catch (e) {
      console.error('ARQUIVO 047: falha ao registrar a conclusão', e);
    }
    try {
      await api.unlockAchievement('arquivo_047');
    } catch (e) {
      console.error('ARQUIVO 047: falha ao desbloquear conquista', e);
    }

    clearChapterTint();
    if (!endingEl) return;
    combatDock.hidden = true;

    const e = story.ending047;
    const card = el('article', 'scene scene--victory scene--arquivo047');
    card.append(el('p', 'scene__eyebrow', e.eyebrow));
    const h = el('h2', 'scene__title', e.title);
    h.tabIndex = -1;
    card.append(h);
    const text = el('div', 'scene__text');
    e.paragraphs.forEach((p) => text.append(el('p', '', p)));
    card.append(text);

    const actions = el('div', 'scene__actions');
    const menuBtn = el('button', 'btn btn--primary scene__button');
    menuBtn.append(el('span', 'scene__button-label', 'Voltar ao menu'));
    menuBtn.addEventListener('click', () => { sfx('ui'); returnToMenu(); });
    actions.append(menuBtn);
    card.append(actions);

    endingEl.replaceChildren(card);
    endingEl.hidden = false;
    window.requestAnimationFrame(() => h.focus({ preventScroll: true }));
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
    clearChapterTint();
    gameSection.hidden = true;
    document.body.classList.remove('is-playing');
    story = REDENCAO_STORY;
    state = null;
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
    story = REDENCAO_STORY;
    clearChapterTint();
    state = createState();
    state.active = true;
    state.gameMode = mode;
    state.originalMode = mode;
    state.letterRoom = pickLetterRoom();
    state.letterHost = story.letterHosts[state.letterRoom];
    state.scene = 'intro';
    state.runHp = getModeConfig().playerMaxHp;
    gameStartTime = Date.now();
    if (chapterEl) chapterEl.textContent = story.chapter;

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

  // ===== ARQUIVO 047 — entrada da campanha paralela =====
  async function startArquivo047() {
    story = ARQUIVO047_STORY;
    state = createState();
    state.campaign = 'arquivo047';
    state.gameMode = 'standard';
    state.originalMode = 'standard';
    state.scene = 'intro';
    state.runHp = getModeConfig().playerMaxHp;
    gameStartTime = Date.now();
    state.letterRoom = null;
    state.letterHost = null;

    showGame();
    if (endingEl) { endingEl.hidden = true; endingEl.replaceChildren(); }
    if (combatDock) combatDock.hidden = true;
    if (chapterEl) chapterEl.textContent = `ARQUIVO 047 — Capítulo I · ${(ARQUIVO047_STORY.chapters[0] || {}).name || ''}`;
    applyChapterTint(1);

    // Retoma de onde parou — o progresso nunca toca na campanha principal
    let saved = null;
    try { saved = await api.getArquivo047Progress(); } catch (e) { console.error('ARQUIVO 047: falha ao carregar progresso', e); }
    if (saved && saved.done) {
      try { await api.resetArquivo047Progress(); } catch (e) { console.error('ARQUIVO 047: falha ao recomeçar', e); }
      saved = null;
    }
    const hasProgress = saved && (
      (Array.isArray(saved.examined) && saved.examined.length > 0)
      || (saved.chapter && saved.chapter > 1)
      || (saved.completed && Object.keys(saved.completed).length > 0)
    );
    if (hasProgress) {
      state.skipIntro = true;
      state.chapter = Math.min(5, Math.max(1, Number(saved.chapter) || 1));
      state.examined = new Set(saved.examined || []);
      state.flags = { ...state.flags, ...(saved.flags || {}) };
      state.completedChapters = saved.completed || {};
      state.currentRoom = saved.currentRoom || 'sala';
      state.scene = 'room';
      applyChapterTint(state.chapter);
    }

    updateProgress();
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
    // Arquivo Kennedy aberto: Esc fecha; nada vaza para o diálogo por baixo
    if (archiveOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeKennedyArchive();
      }
      return;
    }
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

  window.RedencaoGame = { start, startArquivo047, returnToMenu };

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
    openNpcDialog,
    openArquivo047Well,
    goToCombat,
    sfx,
    reducedMotion,
    get story() { return story; },
  };
})();
