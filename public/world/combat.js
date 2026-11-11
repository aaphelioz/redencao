'use strict';

/* CombatScene — arena por turnos 2D (mendigo nas emboscadas, Helena no poço).
   Mantém as regras do jogo original: tiro >10 e esquiva >8 em um d20. */
window.RedencaoCombatScene = class CombatScene extends Phaser.Scene {
  constructor() {
    super('CombatScene');
    this.inventory = { seringas: 0, kitsMedicos: 0 };
  }

  create(data) {
    const RW = window.RedencaoWorld;
    window.RedencaoTextures.create(this);
    const s = RW.state;
    this.context = (data && data.context) || 'final';
    this.isExploration = this.context === 'exploration';
    this.encounterFinished = false;
    const cfg = RW.getModeConfig();

    // Inimigos
    if (this.isExploration) {
      const encounter = s.pendingEncounter || { stage: 0, hp: 3 };
      this.enemies = [{ id: `mendigo-${encounter.stage}`, name: 'Mendigo', hp: encounter.hp, maxHp: encounter.hp, type: 'mendigo', alive: true }];
    } else {
      this.enemies = [{ id: 'helena', name: 'Helena', hp: cfg.helenaMaxHp, maxHp: cfg.helenaMaxHp, type: 'boss', alive: true }];
    }

    // Jogador (HP carregado entre encontros)
    const maxHp = cfg.playerMaxHp;
    this.playerMaxHp = maxHp;
    this.playerHp = Math.min(Number.isFinite(s.runHp) ? s.runHp : maxHp, maxHp);
    this.turn = 1;
    this.phase = 'action';
    this.logLines = [];
    this.lastAction = null;
    this.lastSuccess = false;
    this.adrenaline = false;
    this.outcome = null;
    // Fundo
    this.add.image(384, 224, this.isExploration ? 'combat-shadow' : 'combat-well');

    // Sombras e sprites (acima do dock inferior)
    this.playerShadow = this.add.image(168, 272, 'shadow').setScale(2.5, 1.3).setDepth(20);
    this.playerSprite = this.add.image(168, 268, 'doug-idle').setOrigin(0.5, 1).setScale(3.4).setDepth(21);

    const enemy = this.enemies[0];
    const enemyTexture = enemy.type === 'boss' ? 'helena' : 'mendigo';
    const enemyScale = enemy.type === 'boss' ? 5.2 : 4.6;
    this.enemyShadow = this.add.image(588, 236, 'shadow').setScale(3.1, 1.4).setDepth(15).setAlpha(0);
    this.enemySprite = this.add.image(588, 232, enemyTexture).setOrigin(0.5, 1).setScale(enemyScale).setDepth(16).setAlpha(0);
    this.enemyFinalY = 232 - 4;

    if (this.isExploration) {
      // mendigo emerge das sombras
      this.tweens.add({
        targets: [this.enemySprite, this.enemyShadow],
        alpha: enemy.type === 'boss' ? 0.92 : 1,
        duration: 900,
        ease: 'Quad.easeOut',
      });
      window.setTimeout(() => RW.sfx('step'), 300);
      window.setTimeout(() => RW.sfx('step'), 520);
    } else {
      // Helena sobe do poço — grito, folhas e lama
      this.enemySprite.setY(this.enemyFinalY + 46);
      this.enemySprite.setAlpha(0);
      this.enemyShadow.setAlpha(0);
      RW.sfx('roar');
      this.cameras.main.shake(260, 0.006);
      this.leafBurst(34);
      this.tweens.add({
        targets: this.enemySprite,
        y: this.enemyFinalY,
        alpha: 0.92,
        duration: 1250,
        ease: 'Quad.easeOut',
      });
      this.tweens.add({ targets: this.enemyShadow, alpha: 0.9, duration: 1250 });
    }

    if (!RW.reducedMotion) {
      this.tweens.add({
        targets: [this.playerSprite],
        y: '-=4',
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      if (!this.isExploration) {
        this.rain = this.add.particles(0, -24, 'rain-drop', {
          x: { min: -40, max: 820 },
          lifespan: 1300,
          speedY: { min: 440, max: 590 },
          speedX: { min: 40, max: 80 },
          scale: { min: 0.9, max: 1.6 },
          alpha: { min: 0.3, max: 0.75 },
          frequency: 14,
          blendMode: 'ADD',
        }).setDepth(40);
      }
    }

    // Inventário para os botões de item
    this.loadInventory();

    // DOM do combate
    this.dock = document.getElementById('combat-dock');
    this.playerMeter = document.getElementById('combat-player');
    this.enemiesMeter = document.getElementById('combat-enemies');
    this.turnLabel = document.getElementById('combat-turn');
    this.logEl = document.getElementById('combat-log');
    this.actionsEl = document.getElementById('combat-actions');
    if (this.dock) this.dock.hidden = false;
    window.RedencaoWorld.showDoorPrompt(null);

    this.pushLog(this.isExploration
      ? 'O mendigo bloqueia a passagem. A casa observa.'
      : RW.story.combat.emptyLog);
    this.renderDock();
  }

  async loadInventory() {
    try {
      const inv = await window.RedencaoAPI.getInventory();
      this.inventory = { seringas: inv.seringas || 0, kitsMedicos: inv.kitsMedicos || 0 };
    } catch {
      this.inventory = { seringas: 0, kitsMedicos: 0 };
    }
    this.renderDock();
  }

  livingEnemies() {
    return this.enemies.filter((e) => e.alive && e.hp > 0);
  }

  buildMeter(label, value, maxValue, variant, parent) {
    const meter = document.createElement('div');
    meter.className = `meter meter--${variant}`;

    const top = document.createElement('div');
    top.className = 'meter__top';
    const labelEl = document.createElement('span');
    labelEl.className = 'meter__label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'meter__value';
    valueEl.textContent = `${value} / ${maxValue}`;
    top.append(labelEl, valueEl);

    const track = document.createElement('div');
    track.className = 'meter__track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', label);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(maxValue));
    track.setAttribute('aria-valuenow', String(value));
    const fill = document.createElement('span');
    fill.className = 'meter__fill';
    fill.style.width = `${Math.max(0, (value / maxValue) * 100)}%`;
    track.append(fill);

    meter.append(top, track);
    parent.appendChild(meter);
  }

  pushLog(lines) {
    if (typeof lines === 'string') lines = [lines];
    this.logLines.push(...lines);
    if (this.logLines.length > 6) this.logLines = this.logLines.slice(-6);
  }

  renderDock() {
    if (!this.dock) return;
    const RW = window.RedencaoWorld;

    this.playerMeter.replaceChildren();
    this.buildMeter('Douglas', this.playerHp, this.playerMaxHp, 'player', this.playerMeter);

    this.enemiesMeter.replaceChildren();
    this.livingEnemies().forEach((enemy) => {
      this.buildMeter(enemy.name, enemy.hp, enemy.maxHp, enemy.type === 'boss' ? 'enemy' : 'mendigo', this.enemiesMeter);
    });

    this.turnLabel.textContent = `Turno ${this.turn}`;

    this.logEl.replaceChildren(...this.logLines.map((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      return p;
    }));

    this.actionsEl.replaceChildren();
    const addButton = (label, variant, hint, onClick, disabled) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn scene__button${variant ? ` btn--${variant}` : ''}`;
      button.disabled = Boolean(disabled);
      const labelEl = document.createElement('span');
      labelEl.className = 'scene__button-label';
      labelEl.textContent = label;
      button.append(labelEl);
      if (hint) {
        const hintEl = document.createElement('span');
        hintEl.className = 'scene__button-hint';
        hintEl.textContent = hint;
        button.append(hintEl);
      }
      button.addEventListener('click', () => { if (!button.disabled) onClick(); });
      this.actionsEl.appendChild(button);
      return button;
    };

    if (this.phase === 'action') {
      addButton('Atirar', '', 'Tiros acertam com resultado maior que 10', () => this.resolveAction('shoot'));
      addButton('Esquivar', '', 'Esquiva com resultado maior que 8', () => this.resolveAction('dodge'));
      if (this.inventory.seringas > 0) {
        addButton(`Seringa de Adrenalina (${this.inventory.seringas})`, 'primary', 'Esquiva garantida no próximo ataque', () => this.useItem('seringa'));
      }
      if (this.inventory.kitsMedicos > 0 && this.playerHp < this.playerMaxHp) {
        addButton(`Kit Médico (${this.inventory.kitsMedicos})`, 'primary', 'Cura 3 HP', () => this.useItem('kit'));
      }
    } else if (this.phase === 'enemy') {
      addButton('Inimigos agem...', 'ghost', null, () => {}, true);
    } else if (this.phase === 'resolved') {
      addButton('Continuar', 'primary', 'Próximo turno', () => {
        this.turn += 1;
        this.phase = 'action';
        this.renderDock();
      });
    } else if (this.phase === 'over') {
      // derrota na emboscada também leva ao final de derrota, como no jogo original
      if (this.isExploration && this.outcome === 'victory') {
        addButton('Continuar explorando', 'primary', 'Voltar para a investigação', () => {
          if (this.encounterFinished) return;
          this.encounterFinished = true;
          if (this.dock) this.dock.hidden = true;
          RW.finishEncounterVictory(this.runCoinsThisCombat || 0);
        });
      } else {
        addButton('Ver o fim', 'primary', null, () => this.showEnding());
      }
    }
  }

  rollD20() {
    return Math.floor(Math.random() * 20) + 1;
  }

  weaponBonus() {
    const bonus = window.RedencaoWorld.state.weaponBonus || {};
    return { accuracy: bonus.accuracy || 0, damage: bonus.damage || 0, doubleAttack: Boolean(bonus.doubleAttack) };
  }

  hitFlash(sprite) {
    if (window.RedencaoWorld.reducedMotion) return;
    const baseScaleX = sprite.scaleX;
    const baseScaleY = sprite.scaleY;
    this.tweens.add({
      targets: sprite,
      scaleX: baseScaleX * 1.18,
      scaleY: baseScaleY * 1.18,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => sprite.setScale(baseScaleX, baseScaleY),
    });
    const flash = this.add.rectangle(sprite.x, sprite.y - (sprite.displayHeight * sprite.originY) / 2, sprite.displayWidth, sprite.displayHeight, 0xffffff, 0.55)
      .setDepth(30);
    this.tweens.add({ targets: flash, alpha: 0, duration: 160, onComplete: () => flash.destroy() });
  }

  lunge(sprite, towardX) {
    if (window.RedencaoWorld.reducedMotion) return;
    const start = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: start + (towardX > start ? 34 : -34),
      duration: 130,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });
  }

  spawnMuzzleFlash() {
    if (window.RedencaoWorld.reducedMotion) return;
    const flash = this.add.image(this.playerSprite.x + 20, this.playerSprite.y - 34, 'muzzle').setDepth(35).setScale(1.8);
    this.tweens.add({ targets: flash, alpha: 0, scaleX: 0.7, scaleY: 0.7, duration: 90, onComplete: () => flash.destroy() });
  }

  fireBullet(miss) {
    const target = this.enemySprite;
    const bullet = this.add.image(this.playerSprite.x + 26, this.playerSprite.y - 34, 'bullet').setDepth(34).setScale(1.7);
    const aim = miss
      ? { x: target.x + (Math.random() - 0.5) * 110, y: target.y - target.displayHeight * 0.5 + (Math.random() - 0.5) * 70 }
      : { x: target.x, y: target.y - target.displayHeight * 0.55 };
    this.tweens.add({
      targets: bullet,
      x: aim.x,
      y: aim.y,
      duration: 165,
      ease: 'Quad.easeIn',
      onComplete: () => {
        bullet.destroy();
        this.impactAt(aim.x, aim.y);
        if (!miss) this.hitFlash(target);
      },
    });
  }

  impactAt(x, y) {
    const burst = this.add.image(x, y, 'impact').setDepth(36).setScale(1.7);
    this.tweens.add({ targets: burst, alpha: 0, scaleX: 3.1, scaleY: 3.1, duration: 190, onComplete: () => burst.destroy() });
  }

  leafBurst(count) {
    if (window.RedencaoWorld.reducedMotion) return;
    for (let i = 0; i < count; i += 1) {
      const leaf = this.add.image(
        this.enemySprite.x + (Math.random() - 0.5) * 170,
        108 + Math.random() * 60,
        'leaf',
      ).setDepth(37).setScale(2);
      leaf.setAngle(Math.random() * 360);
      this.tweens.add({
        targets: leaf,
        y: leaf.y + 150 + Math.random() * 90,
        x: leaf.x + (Math.random() - 0.5) * 130,
        angle: leaf.angle + 180,
        alpha: 0,
        duration: 1200 + Math.random() * 600,
        onComplete: () => leaf.destroy(),
      });
    }
  }

  dodgeDash() {
    if (window.RedencaoWorld.reducedMotion) return;
    const dir = this.playerSprite.x < this.enemySprite.x ? -1 : 1;
    const startX = this.playerSprite.x;
    this.tweens.add({
      targets: this.playerSprite,
      x: startX + dir * 54,
      duration: 120,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  playEnemyDeath(enemy) {
    if (window.RedencaoWorld.reducedMotion) {
      this.enemySprite.setAlpha(0.25);
      return;
    }
    if (enemy.type === 'mendigo') {
      this.tweens.add({
        targets: [this.enemySprite, this.enemyShadow],
        angle: 82,
        y: this.enemySprite.y + 16,
        alpha: 0.15,
        duration: 850,
        ease: 'Quad.easeIn',
      });
    } else {
      this.tweens.add({
        targets: [this.enemySprite, this.enemyShadow],
        y: this.enemySprite.y + 38,
        alpha: 0.12,
        duration: 1100,
        ease: 'Quad.easeIn',
      });
      this.leafBurst(30);
      window.RedencaoWorld.sfx('laugh');
    }
  }

  playPlayerDefeat() {
    if (window.RedencaoWorld.reducedMotion) {
      this.playerSprite.setAlpha(0.3);
      return;
    }
    this.tweens.add({
      targets: [this.playerSprite, this.playerShadow],
      angle: -64,
      y: this.playerSprite.y + 12,
      alpha: 0.22,
      duration: 850,
      ease: 'Quad.easeIn',
    });
  }

  redFlash() {
    const flash = this.add.rectangle(384, 224, 768, 448, 0x5a0d0d, 0.4).setDepth(45);
    this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
  }

  async resolveAction(action) {
    if (this.phase !== 'action') return;
    const enemy = this.livingEnemies()[0];
    if (!enemy) return;

    const RW = window.RedencaoWorld;
    const weapon = this.weaponBonus();
    const baseRoll = this.rollD20();
    const roll = Math.min(20, baseRoll + Math.floor(weapon.accuracy * 20));
    const success = action === 'shoot' ? roll > 10 : roll > 8;
    const damage = 1 + (weapon.damage || 0);

    this.lastAction = action;
    this.lastSuccess = success;

    let lines = [];

    if (action === 'shoot') {
      RW.sfx('shot');
      if (!RW.reducedMotion) this.cameras.main.shake(90, 0.004);
      this.spawnMuzzleFlash();
      this.fireBullet(!success);
      if (success) {
        enemy.hp = Math.max(0, enemy.hp - damage);
        lines = enemy.type === 'mendigo'
          ? ['Você dispara. O tiro acerta o mendigo em cheio.', 'Ele cai gemendo, mas o ódio nos olhos não morre.']
          : RW.story.combat.shoot.success.slice();
        this.lunge(this.playerSprite, this.enemySprite.x);
        // Metralhadora: segundo tiro na mesma ação
        if (weapon.doubleAttack && enemy.hp > 0) {
          const secondRoll = this.rollD20();
          if (secondRoll > 10) {
            enemy.hp = Math.max(0, enemy.hp - damage);
            lines.push(`A rajada continua! Segundo acerto em ${enemy.name}!`);
          } else {
            lines.push('A rajada continua, mas o segundo tiro vai para longe.');
          }
        }
      } else {
        lines = RW.story.combat.shoot.failure.slice();
      }
    } else {
      // Esquivar
      if (success) {
        lines = RW.story.combat.dodge.success.slice();
      } else {
        lines = RW.story.combat.dodge.failure.slice();
      }
      this.dodgeDash();
    }

    this.pushLog(lines);

    // Vitória?
    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.outcome = 'victory';
      const coins = await RW.awardCoins('enemy');
      this.runCoinsThisCombat = coins;
      if (coins > 0) this.pushLog(`Você revira os bolsos do inimigo: +${coins} moedas.`);
      this.playEnemyDeath(enemy);
      this.phase = 'over';
      this.renderDock();
      return;
    }

    this.phase = 'enemy';
    this.renderDock();
    window.setTimeout(() => this.processEnemyTurns(), 480);
  }

  async useItem(itemType) {
    if (this.phase !== 'action') return;
    const RW = window.RedencaoWorld;
    try {
      const result = await window.RedencaoAPI.useItem(itemType);
      if (!result || !result.success) {
        this.pushLog('Item não disponível.');
        this.renderDock();
        return;
      }
      this.inventory = {
        seringas: result.inventory.seringas,
        kitsMedicos: result.inventory.kitsMedicos,
      };

      if (itemType === 'seringa') {
        this.adrenaline = true;
        this.lastAction = 'use-seringa';
        this.pushLog(['Você injeta a adrenalina. O mundo desacelera.', 'Seus reflexos estão no limite. O próximo ataque não o atingirá.']);
        try { window.RedencaoAPI.incrementStat('seringaUsed'); } catch { /* ignora */ }
      } else if (itemType === 'kit') {
        const heal = 3;
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + heal);
        this.lastAction = 'use-kit';
        this.pushLog(['Você aplica o kit médico com mãos trêmulas.', `Ferimentos fecham. HP restaurado: +${heal}.`]);
        try { window.RedencaoAPI.incrementStat('kitUsed'); } catch { /* ignora */ }
      }
    } catch (e) {
      this.pushLog('Erro ao usar item.');
      this.renderDock();
      return;
    }

    this.phase = 'enemy';
    this.renderDock();
    window.setTimeout(() => this.processEnemyTurns(), 480);
  }

  processEnemyTurns() {
    // reentrada: só processa uma vez por turno inimigo
    if (this.phase !== 'enemy') return;
    const RW = window.RedencaoWorld;
    const alive = this.livingEnemies();
    if (!alive.length) return;

    alive.forEach((enemy) => {
      if (this.adrenaline) {
        this.adrenaline = false;
        this.pushLog([
          'A adrenalina pulsa nas veias de Douglas. O tempo desacelera.',
          `${enemy.name} investe, mas Douglas se move com precisão cirúrgica.`,
          'O ataque passa raspando. Esquiva perfeita.',
        ]);
        return;
      }
      if (this.lastAction === 'dodge' && this.lastSuccess) {
        this.pushLog(RW.story.combat.dodge.success);
        return;
      }
      const roll = this.rollD20();
      const hit = roll > 8;
      if (hit) {
        this.playerHp = Math.max(0, this.playerHp - 1);
        RW.sfx(enemy.type === 'mendigo' ? 'bite' : 'laugh');
        this.redFlash();
        if (!RW.reducedMotion) this.cameras.main.shake(120, 0.005);
        this.pushLog(enemy.type === 'mendigo'
          ? [`${enemy.name} avança com unhas sujas e dentes podres!`, 'Douglas sente a dor rasgar sua carne.']
          : [`${enemy.name} ataca com fúria!`, 'Douglas sente a dor rasgar sua carne.']);
        this.lunge(this.enemySprite, this.playerSprite.x);
      } else {
        this.pushLog([`${enemy.name} tenta atacar, mas erra o alvo.`, 'Douglas respira aliviado.']);
      }
    });

    if (this.playerHp <= 0) {
      this.outcome = 'defeat';
      this.phase = 'over';
      this.playPlayerDefeat();
      this.pushLog(['A visão de Douglas escurece...']);
      this.renderDock();
      return;
    }

    this.phase = 'resolved';
    this.renderDock();
  }

  showEnding() {
    const RW = window.RedencaoWorld;
    if (this.dock) this.dock.hidden = true;
    RW.state.runHp = this.playerHp;
    RW.finishRun(this.outcome, this.playerHp);
  }
};
