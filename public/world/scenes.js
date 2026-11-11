'use strict';

/* Cenas Phaser: IntroScene (prólogo) e RoomScene (cômodos exploráveis). */

window.RedencaoIntroScene = class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
    this.beat = 0;
    this.lightningTimer = null;
  }

  create() {
    const RW = window.RedencaoWorld;
    // Campanha paralela com progresso salvo: retoma direto no cômodo, sem prólogo.
    const s = RW.state;
    if (s && s.skipIntro && s.campaign === 'arquivo047') {
      this.scene.start('RoomScene', { room: s.currentRoom || 'sala', spawnX: 384, spawnY: 330 });
      return;
    }
    window.RedencaoTextures.create(this);
    if (s) {
      s.scene = 'intro';
      s.dialogOpen = true;
    }

    // Cenário: a estrada e a mansão sob a tempestade
    this.add.image(384, 224, 'intro-bg');

    // Chuva
    if (!RW.reducedMotion) {
      this.rain = this.add.particles(0, -24, 'rain-drop', {
        x: { min: -40, max: 820 },
        lifespan: 1400,
        speedY: { min: 430, max: 580 },
        speedX: { min: 40, max: 80 },
        scale: { min: 1, max: 1.7 },
        alpha: { min: 0.35, max: 0.8 },
        frequency: 14,
        blendMode: 'ADD',
      });
      // relâmpago ocasional
      this.flash = this.add.rectangle(384, 224, 768, 448, 0xffffff, 0).setDepth(10);
      this.scheduleLightning();
    }

    // Vigheta
    this.add.image(384, 224, 'vignette').setDepth(9);

    this.presentBeat();

    // Teclado avança o prólogo
    this.advanceHandler = (event) => {
      if (!['Enter', ' ', 'w', 'W'].includes(event.key)) return;
      const target = event.target;
      if (target && target.closest && target.closest('#dialog')) return; // botões do diálogo
      event.preventDefault();
      this.advance();
    };
    window.addEventListener('keydown', this.advanceHandler);
    this.events.once('shutdown', () => window.removeEventListener('keydown', this.advanceHandler));
  }

  scheduleLightning() {
    const delay = 4500 + Math.random() * 5500;
    this.lightningTimer = window.setTimeout(() => {
      window.RedencaoWorld.sfx('thunder');
      this.flash.setAlpha(0.42);
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 520, ease: 'Quad.easeOut' });
      if (this.scene.isActive()) this.scheduleLightning();
    });
  }

  presentBeat() {
    const RW = window.RedencaoWorld;
    const beat = RW.story.intro[this.beat];
    const isLast = this.beat === RW.story.intro.length - 1;

    RW.openDialog({
      eyebrow: `Prólogo — ${this.beat + 1} / ${RW.story.intro.length}`,
      title: beat.title,
      paragraphs: beat.text,
      actions: [
        {
          label: beat.action || (isLast ? 'Entrar na mansão' : 'Continuar'),
          hint: isLast ? 'A investigação começa' : 'Enter, Espaço ou W',
          variant: 'primary',
          onClick: () => this.advance(),
        },
      ],
    });
  }

  advance() {
    const RW = window.RedencaoWorld;
    if (this.beat < RW.story.intro.length - 1) {
      this.beat += 1;
      this.presentBeat();
      return;
    }
    RW.sfx('door');
    RW.closeDialog();
    if (RW.state) RW.state.scene = 'hub';
    this.scene.start('RoomScene', { room: 'sala', spawnX: 384, spawnY: 330 });
  }
};

window.RedencaoRoomScene = class RoomScene extends Phaser.Scene {
  constructor() {
    super('RoomScene');
    this.roomId = 'sala';
  }

  create(data) {
    const RW = window.RedencaoWorld;
    window.RedencaoTextures.create(this);
    const R = window.RedencaoRooms;
    this.roomId = (data && data.room) || 'sala';
    const def = R.rooms[this.roomId];
    const s = RW.state;
    if (s) {
      s.scene = 'room';
      s.currentRoom = this.roomId;
    }

    const map = def.map;
    this.map = map;

    // Chão pré-renderizado (tábuas longas / jardim)
    this.add.image(384, 224, def.interior ? 'floor-interior' : 'floor-garden').setDepth(0);

    // Paredes e portas (tiles, apenas onde há parede)
    for (let ty = 0; ty < map.length; ty++) {
      for (let tx = 0; tx < map[ty].length; tx++) {
        const ch = map[ty][tx];
        const px = tx * 32;
        const py = ty * 32;
        if (ch === '#') {
          const key = ty < 2 ? 'wall-top' : 'wall';
          this.add.image(px, py, key).setOrigin(0).setDepth(1);
        }
      }
    }

    // Arcos/vão das portas
    def.doors.forEach((door) => {
      const horizontal = door.w > door.h;
      if (horizontal) {
        if (door.y === 0) {
          this.add.image(door.x + door.w / 2, 0, 'door-arch')
            .setOrigin(0.5, 0).setDisplaySize(64, 96).setDepth(5);
        } else {
          this.add.image(door.x + door.w / 2, door.y + door.h, 'door-arch')
            .setOrigin(0.5, 1).setDisplaySize(64, 96).setDepth(5);
        }
      } else {
        this.add.image(door.x + (door.x === 0 ? 0 : door.w), door.y + door.h / 2, 'door-side')
          .setOrigin(door.x === 0 ? 0 : 1, 0.5).setDisplaySize(36, 96).setDepth(5);
      }
    });

    // Props e decorações com profundidade pela base + obstáculos (ninguém atravessa móvel)
    this.props = [];
    this.obstacles = [];

    const addObstacle = (x, y, w, h) => {
      this.obstacles.push({ x: x + w * 0.08, y, w: w * 0.84, h });
    };

    def.props.forEach((prop) => {
      const img = this.add.image(prop.x, prop.y, prop.texture).setOrigin(0, 0);
      img.setDepth(prop.y + img.displayHeight);
      img.propId = prop.id;
      const w = img.displayWidth;
      const h = img.displayHeight;
      this.props.push({ ...prop, img, w, h });
      if (prop.solid !== false) addObstacle(prop.x, prop.y, w, h);
    });

    (def.decor || []).forEach((item) => {
      const img = this.add.image(item.x, item.y, item.texture).setOrigin(0, 0);
      const isDecal = item.solid === false;
      const depth = Number.isFinite(item.depth) ? item.depth : (isDecal ? item.y + 2 : item.y + img.displayHeight);
      img.setDepth(depth);
      const w = img.displayWidth;
      const h = img.displayHeight;
      if (!isDecal) addObstacle(item.x, item.y, w, h);
    });

    // NPCs da campanha paralela (Helena) — caminham pelo mesmo ciclo de interação
    const npcChapter = RW.state && RW.state.chapter ? RW.state.chapter : 0;
    const npcDefs = (RW.state && RW.state.campaign === 'arquivo047' && RW.story.npcs
      && RW.story.npcs[npcChapter] && RW.story.npcs[npcChapter][this.roomId]) || [];
    npcDefs.forEach((npc) => {
      const scale = npc.scale || 2.1;
      const img = this.add.image(npc.x, npc.y, npc.texture).setOrigin(0.5, 1).setScale(scale).setDepth(npc.y);
      const w = img.displayWidth;
      const h = img.displayHeight;
      this.obstacles.push({ x: npc.x - w * 0.3, y: npc.y - 12, w: w * 0.6, h: 12 });
      this.props.push({
        ...npc,
        img,
        w,
        h,
        x: npc.x - w / 2,
        y: npc.y - h,
        isNpc: true,
      });
    });

    // Corredor cenográfico
    if (this.roomId === 'sala') {
      this.add.image(384, 268, 'prop-rug').setOrigin(0.5, 0.5).setDepth(40);
    }

    // Marcador "!" flutuante sobre objetos não examinados (NPCs não recebem marcador)
    this.markers = new Map();
    this.props.forEach((prop) => {
      if (prop.isNpc) return;
      const marker = this.add.image(prop.x + prop.w / 2, prop.y - 6, 'marker')
        .setOrigin(0.5, 1).setScale(2).setDepth(10000);
      marker.baseY = prop.y - 6;
      this.markers.set(prop.id, marker);
    });

    // Partículas de atmosfera
    if (!RW.reducedMotion) {
      if (!def.interior) {
        this.rain = this.add.particles(0, -24, 'rain-drop', {
          x: { min: -40, max: 820 },
          lifespan: 1300,
          speedY: { min: 430, max: 580 },
          speedX: { min: 40, max: 80 },
          scale: { min: 0.9, max: 1.4 },
          alpha: { min: 0.28, max: 0.6 },
          frequency: 26,
        }).setDepth(9000);

        // neblina rasa — leve, para não pesar o cômodo
        this.fog = this.add.particles(0, 0, 'fog', {
          x: { min: -80, max: 848 },
          y: { min: 150, max: 448 },
          lifespan: 5200,
          speedX: { min: -7, max: 9 },
          speedY: { min: -1, max: 1.5 },
          scale: { min: 1.1, max: 2.0 },
          alpha: { min: 0.12, max: 0.2 },
          frequency: 210,
        }).setDepth(9001);
      } else {
        this.dust = this.add.particles(0, 0, 'dust', {
          x: { min: 40, max: 728 },
          y: { min: 40, max: 320 },
          lifespan: 3400,
          speedY: { min: -6, max: 10 },
          speedX: { min: -6, max: 6 },
          scale: { min: 1, max: 2 },
          alpha: { min: 0.15, max: 0.4 },
          frequency: 160,
        }).setDepth(9000);
      }
      // chamas da lareira na sala
      if (this.roomId === 'sala') {
        this.flames = this.add.particles(84, 62, 'flame', {
          x: { min: -8, max: 8 },
          speedY: { min: -26, max: -44 },
          speedX: { min: -6, max: 6 },
          lifespan: 700,
          scale: { start: 1.6, end: 0.4 },
          alpha: { start: 0.9, end: 0 },
          frequency: 60,
        }).setDepth(20);
      }
    }

    // Douglas — ou Albrecht, o marido (campanha paralela)
    const isArquivoJogado = RW.state && RW.state.campaign === 'arquivo047';
    const playerPrefix = isArquivoJogado ? 'marito' : 'doug';
    this.playerPrefix = playerPrefix;

    // Douglas
    const spawnX = (data && Number.isFinite(data.spawnX)) ? data.spawnX : 384;
    const spawnY = (data && Number.isFinite(data.spawnY)) ? data.spawnY : 330;
    this.facingLeft = false;

    // Resolução final impossível de falhar: se o spawn cair dentro de uma parede
    // ou móvel, empurra o Douglas para fora — ele jamais fica preso.
    this.player = this.add.image(spawnX, spawnY, `${playerPrefix}-idle`).setOrigin(0.5, 1).setScale(2.2).setDepth(spawnY);
    let guard = 0;
    while (window.RedencaoRooms.rectHitsSolid(this.map, this.player.x - 9, this.player.y - 12, 18, 12) && guard < 14) {
      this.player.y += 14;
      guard += 1;
    }
    for (let iteration = 0; iteration < 12; iteration++) {
      const box = { x: this.player.x - 9, y: this.player.y - 12, w: 18, h: 12 };
      const hit = this.obstacles.find((o) =>
        box.x < o.x + o.w && box.x + box.w > o.x && box.y < o.y + o.h && box.y + box.h > o.y);
      if (!hit) break;
      const overlapLeft = box.x + box.w - hit.x;
      const overlapRight = hit.x + hit.w - box.x;
      const overlapTop = box.y + box.h - hit.y;
      const overlapBottom = hit.y + hit.h - box.y;
      const min = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if (min === overlapBottom) this.player.y = hit.y + hit.h + 12;
      else if (min === overlapTop) this.player.y = hit.y - 1;
      else if (min === overlapRight) this.player.x = hit.x - 10;
      else this.player.x = hit.x + hit.w + 10;
    }

    this.shadow = this.add.image(this.player.x, this.player.y + 2, 'shadow').setDepth(this.player.y).setScale(1.6, 1);
    this.player.setDepth(this.player.y);
    // sempre registra a posição FINAL validada deste cômodo (retorno pós-emboscada)
    if (window.RedencaoWorld.state) {
      window.RedencaoWorld.state.returnSpawn = { x: this.player.x, y: this.player.y };
    }

    // Vinheta por cima de tudo (abaixo do DOM)
    this.add.image(384, 224, 'vignette').setDepth(9500);

    this.cursors = this.input.keyboard.createCursorKeys();
    // Sem capture: espaço nem teclas letras são bloqueados para a digitação no diálogo.
    this.wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' }, false);
    this.keyE = this.input.keyboard.addKey('E', false);
    this.keyShift = this.input.keyboard.addKey('SHIFT', false);

    // Clique/toque no objeto interage (com área de tolerância generosa)
    this.pointerDownHandler = (pointer) => {
      if (window.RedencaoWorld.state.dialogOpen) return;
      const prop = this.props.find((p) =>
        pointer.x >= p.x - 26 && pointer.x <= p.x + p.w + 26
        && pointer.y >= p.y - 26 && pointer.y <= p.y + p.h + 26);
      if (prop) this.interact(prop);
    };
    this.input.on('pointerdown', this.pointerDownHandler);
    this.events.once('shutdown', () => this.input.off('pointerdown', this.pointerDownHandler));

    // disponibilidade de interações calculada uma vez por sala (não por frame)
    this.propAvailability = new Map();
    this.props.forEach((prop) => {
      this.propAvailability.set(prop.id, prop.isNpc ? true : window.RedencaoWorld.isInteractionAvailable(this.roomId, prop.id));
    });

    this.cameras.main.fadeIn(240, 4, 7, 11);
    window.RedencaoWorld.updateProgress();
  }

  // Distância do jogador até o RETÂNGULO do objeto — funciona de qualquer ângulo
  distanceTo(prop) {
    const px = this.player.x;
    const py = this.player.y - 8;
    const dx = Math.max(prop.x - px, 0, px - (prop.x + prop.w));
    const dy = Math.max(prop.y - py, 0, py - (prop.y + prop.h));
    return Math.hypot(dx, dy);
  }

  update(time, delta) {
    const RW = window.RedencaoWorld;
    const s = RW.state;
    const dialogOpen = s.dialogOpen;

    // Marcadores flutuam; só marcamos o que o modo permite examinar
    const isArquivo047 = s.campaign === 'arquivo047';
    this.markers.forEach((marker, id) => {
      const examined = id === 'well' ? false : s.examined.has(id);
      const wellOpen = id === 'well' && !isArquivo047;
      const available = wellOpen || this.propAvailability.get(id) !== false;
      marker.setVisible(available && !examined);
      marker.y = marker.baseY + Math.sin(time / 320 + marker.baseY) * 4;
    });

    if (dialogOpen) {
      this.player.setTexture(`${this.playerPrefix}-idle`);
      window.RedencaoWorld.showDoorPrompt(null);
      return;
    }

    // Movimento com aceleração e desaceleração suaves
    const body = { x: this.player.x, y: this.player.y };
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    const running = this.keyShift && this.keyShift.isDown;

    if (!this.vel) this.vel = { x: 0, y: 0 };
    if (this.walkCycle === undefined) this.walkCycle = 0;

    const inputX = (right ? 1 : 0) - (left ? 1 : 0);
    const inputY = (down ? 1 : 0) - (up ? 1 : 0);
    const inputLen = Math.hypot(inputX, inputY);
    const targetSpeed = running ? 236 : 148;

    let targetX = 0, targetY = 0;
    if (inputLen > 0) {
      targetX = (inputX / inputLen) * targetSpeed;
      targetY = (inputY / inputLen) * targetSpeed;
    }

    // força/resposta: acelera rápido, freia suave — sem trancos
    const response = inputLen > 0 ? 10.5 : 13.5;
    const blend = Math.min(1, (delta / 1000) * response);
    this.vel.x += (targetX - this.vel.x) * blend;
    this.vel.y += (targetY - this.vel.y) * blend;

    if (inputLen === 0 && Math.hypot(this.vel.x, this.vel.y) < 7) {
      this.vel.x = 0;
      this.vel.y = 0;
    }

    const speedNow = Math.hypot(this.vel.x, this.vel.y);
    const moving = speedNow > 14;

    if (moving) {
      const half = { w: 9, h: 6 };
      const hitsObstacle = (bx, by, bw, bh) =>
        this.obstacles.some((o) => bx < o.x + o.w && bx + bw > o.x && by < o.y + o.h && by + bh > o.y);
      const tryAxis = (dx, dy) => {
        const nx = body.x + dx * (delta / 1000);
        const ny = body.y + dy * (delta / 1000);
        const boxX = nx - half.w, boxY = ny - half.h * 2;
        const bw = half.w * 2, bh = half.h * 2;
        if (window.RedencaoRooms.rectHitsSolid(this.map, boxX, boxY, bw, bh)) { this.vel = { x: Math.abs(dx) > 0 ? 0 : this.vel.x, y: Math.abs(dy) > 0 ? 0 : this.vel.y }; return; }
        if (hitsObstacle(boxX, boxY, bw, bh)) { this.vel = { x: Math.abs(dx) > 0 ? 0 : this.vel.x, y: Math.abs(dy) > 0 ? 0 : this.vel.y }; return; }
        body.x = nx; body.y = ny;
      };
      tryAxis(this.vel.x, 0);
      tryAxis(0, this.vel.y);
      if (Math.abs(this.vel.x) > 1) this.facingLeft = this.vel.x < 0;

      // ciclo de passada proporcional à distância percorrida (sem tremida por tempo)
      this.walkCycle += (speedNow * (delta / 1000)) / (running ? 15 : 13);
      const strideIndex = Math.floor(this.walkCycle);
      if (strideIndex !== this.lastStride) {
        this.lastStride = strideIndex;
        this.player.setTexture(running
          ? (strideIndex % 2 === 0 ? `${this.playerPrefix}-walk` : `${this.playerPrefix}-run`)
          : (strideIndex % 2 === 0 ? `${this.playerPrefix}-idle` : `${this.playerPrefix}-walk`));
        RW.sfx('step');
      }
      this.player.y = body.y + Math.sin(this.walkCycle * Math.PI * 2) * (running ? 1.0 : 0.55);
    } else {
      this.player.setTexture(`${this.playerPrefix}-idle`);
      this.vel.x = 0;
      this.vel.y = 0;
      this.walkCycle = 0;
      this.player.y = body.y;
    }

    this.player.x = body.x;
    if (!moving) this.player.y = body.y;
    this.player.setFlipX(this.facingLeft);
    this.player.setDepth(this.player.y);
    this.shadow.setPosition(this.player.x, this.player.y + 2);

    // Porta mais próxima?
    const def = window.RedencaoRooms.rooms[this.roomId];
    const door = def.doors.find((d) =>
      body.x >= d.x - 6 && body.x <= d.x + d.w + 6 && body.y >= d.y - 6 && body.y <= d.y + d.h + 6);

    // Prop mais próximo (por distância-retângulo, qualquer ângulo)
    let nearest = null, nearestDist = 64;
    this.props.forEach((prop) => {
      const d = this.distanceTo(prop);
      if (d < nearestDist) { nearest = prop; nearestDist = d; }
    });
    this.nearProp = nearest;

    if (door) {
      window.RedencaoWorld.showDoorPrompt(door.to === 'sala' ? 'Sala de estar' : (window.RedencaoRooms.rooms[door.to].name || door.to));
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.goThroughDoor(door);
    } else if (nearest) {
      const label = this.interactionLabel(nearest.id);
      window.RedencaoWorld.showDoorPrompt(label);
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.interact(nearest);
    } else {
      window.RedencaoWorld.showDoorPrompt(null);
    }
  }

  interactionLabel(id) {
    if (id === 'well') return window.RedencaoWorld.story.wellLabel || 'Descer até o poço';
    if (id === 'helena') return 'Falar com Helena';
    const room = window.RedencaoWorld.story.rooms[this.roomId];
    if (room) {
      const interaction = room.interactions.find((i) => i.id === id);
      if (interaction) return interaction.label;
    }
    return id;
  }

  interact(prop) {
    const RW = window.RedencaoWorld;
    const id = prop.id;
    if (prop.isNpc) {
      RW.sfx('ui');
      RW.openNpcDialog(prop);
      return;
    }
    if (id !== 'well' && !RW.isInteractionAvailable(this.roomId, id)) {
      // NO MERCY / Arquivo 047: nem tudo está disponível ainda
      RW.sfx('ui');
      const lockedMsg = RW.state && RW.state.campaign === 'arquivo047'
        ? 'Ainda não. Há uma ordem para estas coisas'
        : 'Você não encontra nada útil ali';
      RW.showDoorPrompt(lockedMsg);
      window.setTimeout(() => {
        if (!RW.state.dialogOpen) RW.showDoorPrompt(null);
      }, 1500);
      return;
    }
    RW.sfx('ui');
    if (prop.id === 'well' && RW.state && RW.state.campaign === 'arquivo047') {
      // o poço só abre no capítulo 5
      if (!RW.isInteractionAvailable(this.roomId, 'jardim-well')) {
        RW.showDoorPrompt('Ainda não. Há uma ordem para estas coisas');
        window.setTimeout(() => {
          if (!RW.state.dialogOpen) RW.showDoorPrompt(null);
        }, 1500);
        return;
      }
      RW.openArquivo047Well();
      return;
    }
    if (prop.id === 'well') {
      RW.openWellFlow();
      return;
    }
    RW.openInteractionFlow(prop.id);
  }

  goThroughDoor(door) {
    const RW = window.RedencaoWorld;
    RW.sfx('door');
    window.RedencaoWorld.showDoorPrompt(null);
    // nascer do outro lado: perto da porta correspondente na sala de destino
    const target = window.RedencaoRooms.rooms[door.to];
    const backDoor = target.doors.find((d) => d.to === this.roomId);
    let spawnX = 384, spawnY = 330;
    if (backDoor) {
      spawnX = backDoor.x + backDoor.w / 2;
      spawnY = backDoor.y + backDoor.h / 2;
      if (backDoor.y === 0) spawnY = backDoor.h + 26;
      else if (backDoor.x === 0) spawnX = backDoor.w + 26;
      else if (backDoor.x + backDoor.w >= 736) spawnX = backDoor.x - 26;
      else spawnY = backDoor.y - 26;
    }
    this.cameras.main.fadeOut(200, 4, 7, 11);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('RoomScene', { room: door.to, spawnX, spawnY });
    });
  }
};
