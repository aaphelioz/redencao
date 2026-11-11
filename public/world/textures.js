'use strict';

/* Pixel art procedural do Redenção 2D.
   Tudo é desenhado em canvas offscreen e registrado como textura no Phaser. */
window.RedencaoTextures = (() => {
  // Mulberry32 — ruído determinístico para texturas estáveis entre sessões.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCanvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    draw(ctx, w, h);
    return c;
  }

  function pixelMap(rows, palette, seedOffset) {
    const w = Math.max(...rows.map((r) => r.length));
    const h = rows.length;
    return makeCanvas(w, h, (ctx) => {
      const rand = rng(1337 + (seedOffset || 0));
      rows.forEach((row, y) => {
        for (let x = 0; x < w; x++) {
          const ch = row[x] || '.';
          const color = palette[ch];
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.fillRect(x, y, 1, 1);
          // leve variação para fugir do chapado
          if (rand() < 0.12 && ch !== '.' && ch !== 'e' && ch !== 'r') {
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      });
    });
  }

  function create(scene) {
    const add = (key, canvasTexture) => {
      if (scene.textures.exists(key)) return;
      scene.textures.addCanvas(key, canvasTexture);
    };

    // ============ PERSONAGENS (sprites 16px) ============
    const dougPalette = { h: '#22262e', H: '#39414e', s: '#d9b596', S: '#b98f71', e: '#10131a', c: '#39404a', C: '#2b3038', b: '#1d2026', p: '#262a32', o: '#14161b' };
    const dougBody = [
      '....hhhhhh......',
      '...hhHHhhhh.....',
      '..hhhhhhhhhh....',
      '.hhhhhhhhhhhh...',
      '....ssssss......',
      '....sesses......',
      '....SSSSSS......',
      '...cccccccc.....',
      '..cccccccccc....',
      '..cCccccccCc....',
      '.cccccccccccc...',
      '.CccccccccccC...',
      '.cccccccccccc...',
      '..cccccccccc....',
      '..bbbbbbbbbb....',
      '..pppppppppp....',
    ];
    const dougLegsA = ['..ppp....ppp....', '..ppp....ppp....', '.oppp....pppo...'];
    const dougLegsB = ['.ppp......ppp...', '.pp........pp...', 'op..........po..'];
    const dougLegsRun = ['.ppp......ppp...', 'ppp........ppp..', 'oo..........oo..'];
    add('doug-idle', pixelMap([...dougBody, ...dougLegsA], dougPalette, 1));
    add('doug-walk', pixelMap([...dougBody, ...dougLegsB], dougPalette, 2));
    add('doug-run', pixelMap([...dougBody, ...dougLegsRun], dougPalette, 5));

    const helenPalette = { k: '#1b1b22', K: '#26262f', P: '#efe6da', p: '#cfc4b8', r: '#06070b', T: '#c9c2b4', t: '#8f887c', S: '#5e6b52' };
    const helenaRows = [
      '.....KKKKK.......',
      '...KKKKKKKKK.....',
      '..KKKKKKKKKKK....',
      '.KKKKKKKKKKKKK...',
      '.KKKKKPKKKKKKK...',
      '.KKpppppppppKK...',
      '.KpPPpppppPPpK...',
      '.KpprPppPprppK...',
      '.KppppppppppK....',
      '..KppppppppK.....',
      '..KKpppppKK......',
      '...KKKKKKK.......',
      '..TTTTTTTTTT.....',
      '.TTtTTTTTTtTT....',
      'TTTTTTTTTTTTTTT..',
      'TtTTTTTTTTTTtTT..',
      'TTTtTTTTTTTtTTT..',
      '.TtTTTtTTtTtTT...',
      '.TTTTTTTTTTTT....',
      '..TTTtTTTtTT.....',
      '..TTTTTTTTTT.....',
      '.TTTTTTTTTTTT....',
      '.TtTTtTTtTTtT....',
      'TT..TTT.TT..TT...',
      'tt..ttt.tt..tt...',
    ];
    add('helena', pixelMap(helenaRows, helenPalette, 3));

    const mendigoPalette = { m: '#4a4238', M: '#332d26', s: '#a8866a', S: '#7d6149', e: '#0e0c0a' };
    const mendigoRows = [
      '.....mmmm.......',
      '...mmmmmmmm.....',
      '..mMmmmMmmm.....',
      '..mmmmmmmmm.....',
      '..msssssssm.....',
      '..smeSSesm......',
      '..msssssssm.....',
      '...mSSSSm.......',
      '..mmmmmmmm......',
      '.mmmmmmmmmm.....',
      '.mMmmmMmmmMm....',
      'mmmmmmmmmmmmm...',
      'mMmmmmmmmmMmm...',
      'mmmmmmmmmmmmmm..',
      'MMMMMMMMMMMMMM..',
      '..ss....ss......',
      '..mm....mm......',
    ];
    add('mendigo', pixelMap(mendigoRows, mendigoPalette, 4));

    // ============ TILES ============
    // Chão inteiro pré-renderizado: tábuas longas contínuas
    add('floor-interior', makeCanvas(768, 448, (ctx) => {
      const rand = rng(1234);
      ctx.fillStyle = '#33281e'; ctx.fillRect(0, 0, 768, 448);
      const plankH = 16;
      const tones = ['#3a2d23', '#362b21', '#2e2520', '#3d2f24'];
      let y = 0;
      let row = 0;
      while (y < 448) {
        let x = -20;
        while (x < 768) {
          const len = 90 + Math.floor(rand() * 140);
          ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
          ctx.fillRect(x, y, len - 2, plankH - 2);
          // veio da madeira
          for (let i = 0; i < 4; i++) {
            ctx.fillStyle = 'rgba(0,0,0,0.14)';
            ctx.fillRect(x + 4 + Math.floor(rand() * (len - 20)), y + 3 + Math.floor(rand() * 9), 20 + Math.floor(rand() * 40), 1);
          }
          x += len;
        }
        ctx.fillStyle = '#1f1610'; ctx.fillRect(0, y + plankH - 2, 768, 2);
        y += plankH;
        row += 1;
      }
      // manchas escuras de desgaste
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = 'rgba(10, 8, 6, 0.25)';
        ctx.beginPath();
        ctx.ellipse(rand() * 768, rand() * 448, 20 + rand() * 46, 8 + rand() * 16, rand() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }));

    // Chão do jardim: grama + caminho de terra com folhas
    add('floor-garden', makeCanvas(768, 448, (ctx) => {
      const rand = rng(4321);
      ctx.fillStyle = '#16241a'; ctx.fillRect(0, 0, 768, 448);
      // variação de grama
      for (let i = 0; i < 700; i++) {
        ctx.fillStyle = rand() < 0.4 ? '#1b2a20' : rand() < 0.5 ? '#101a13' : '#1f3025';
        ctx.fillRect(Math.floor(rand() * 764), Math.floor(rand() * 444), 3, 3 + Math.floor(rand() * 4));
      }
      // caminho de terra sinuoso (do portão/porta norte ao centro)
      ctx.fillStyle = '#2b231a';
      ctx.beginPath();
      ctx.moveTo(348, 0);
      ctx.quadraticCurveTo(330 + rand() * 20, 150, 352, 448);
      ctx.lineTo(420, 448);
      ctx.quadraticCurveTo(400 + rand() * 20, 150, 424, 0);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 260; i++) {
        const pathY = rand() * 448;
        const pathX = 356 + (rand() - 0.5) * 60 + Math.sin(pathY / 90) * 12;
        ctx.fillStyle = rand() < 0.5 ? '#33291f' : '#241c14';
        ctx.fillRect(Math.floor(pathX), Math.floor(pathY), 3, 2);
      }
      // montes de folhas secas
      const pile = (cx, cy, r) => {
        for (let i = 0; i < 46; i++) {
          const a = rand() * Math.PI * 2, d = rand() * r;
          ctx.fillStyle = ['#4a3a22', '#5a452a', '#33291b'][Math.floor(rand() * 3)];
          ctx.fillRect(Math.floor(cx + Math.cos(a) * d), Math.floor(cy + Math.sin(a) * d * 0.6), 3, 2);
        }
      };
      pile(140, 190, 46); pile(620, 330, 52); pile(280, 380, 38); pile(480, 120, 34);
    }));

    const wall = makeCanvas(32, 32, (ctx) => {
      const rand = rng(55);
      ctx.fillStyle = '#1d2a37'; ctx.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = rand() < 0.5 ? '#232f3f' : '#182330';
        ctx.fillRect(Math.floor(rand() * 30), Math.floor(rand() * 30), 3, 2);
      }
      ctx.fillStyle = '#141e28'; ctx.fillRect(0, 24, 32, 8); // rodapé
      ctx.fillStyle = '#2a3a49'; ctx.fillRect(0, 23, 32, 1);
    });
    add('wall', wall);

    const wallTop = makeCanvas(32, 32, (ctx) => {
      const rand = rng(59);
      ctx.fillStyle = '#232f3f'; ctx.fillRect(0, 0, 32, 32);
      for (let i = 0; i < 22; i++) {
        ctx.fillStyle = rand() < 0.5 ? '#2b3a4c' : '#1a2531';
        ctx.fillRect(Math.floor(rand() * 30), Math.floor(rand() * 30), 4, 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 28, 32, 4);
    });
    add('wall-top', wallTop);

    const voidTile = makeCanvas(32, 32, (ctx) => {
      ctx.fillStyle = '#05080d'; ctx.fillRect(0, 0, 32, 32);
    });
    add('void', voidTile);

    // ============ MÓVEIS E OBJETOS ============
    const wood = '#3a2c22', woodHi = '#4a392c', woodLo = '#241a12';

    // Tapete cenográfico (não interativo)
    add('prop-rug', makeCanvas(196, 128, (ctx) => {
      ctx.fillStyle = '#3d1f23'; ctx.fillRect(0, 0, 196, 128);
      ctx.fillStyle = '#57302c'; ctx.fillRect(6, 6, 184, 116);
      ctx.fillStyle = '#3d1f23'; ctx.fillRect(14, 14, 168, 100);
      ctx.strokeStyle = '#6e4038'; ctx.lineWidth = 3;
      ctx.strokeRect(22, 22, 152, 84);
      ctx.fillStyle = '#6e4038';
      // medalhão central
      ctx.beginPath(); ctx.moveTo(98, 34); ctx.lineTo(128, 64); ctx.lineTo(98, 94); ctx.lineTo(68, 64); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3d1f23';
      ctx.beginPath(); ctx.moveTo(98, 46); ctx.lineTo(118, 64); ctx.lineTo(98, 82); ctx.lineTo(78, 64); ctx.closePath(); ctx.fill();
      // cantos
      [[26, 26], [146, 26], [26, 78], [146, 78]].forEach(([x, y]) => {
        ctx.fillStyle = '#6e4038'; ctx.fillRect(x, y, 24, 24);
        ctx.fillStyle = '#3d1f23'; ctx.fillRect(x + 5, y + 5, 14, 14);
      });
    }));

    // Escrivaninha com papéis
    add('prop-desk', makeCanvas(112, 66, (ctx) => {
      ctx.fillStyle = wood; ctx.fillRect(4, 22, 104, 34);
      ctx.fillStyle = woodHi; ctx.fillRect(4, 22, 104, 6);
      ctx.fillStyle = woodLo; ctx.fillRect(8, 56, 10, 8); ctx.fillRect(94, 56, 10, 8);
      ctx.fillStyle = '#b3a482'; // papéis
      ctx.fillRect(22, 12, 30, 14); ctx.fillRect(58, 14, 26, 12);
      ctx.fillStyle = '#8f8468';
      ctx.fillRect(26, 16, 22, 2); ctx.fillRect(26, 21, 18, 2); ctx.fillRect(62, 18, 18, 2); ctx.fillRect(62, 23, 14, 2);
      ctx.fillStyle = '#14161b'; ctx.fillRect(88, 10, 8, 12); // tinteiro
      ctx.fillStyle = woodLo; ctx.fillRect(16, 32, 80, 3); // gaveta
      ctx.fillStyle = '#6e5a44'; ctx.fillRect(52, 34, 8, 3);
    }));

    // Quadro (atrás fica o cofre)
    add('prop-painting', makeCanvas(64, 54, (ctx) => {
      ctx.fillStyle = '#6b5a2a'; ctx.fillRect(0, 0, 64, 54);
      ctx.fillStyle = '#8a7434'; ctx.fillRect(2, 2, 60, 50);
      ctx.fillStyle = '#222b33'; ctx.fillRect(7, 7, 50, 40);
      ctx.fillStyle = '#31404e'; ctx.fillRect(7, 7, 50, 22); // céu sombrio
      ctx.fillStyle = '#5e594e'; ctx.fillRect(20, 26, 26, 12); // mansão
      ctx.fillStyle = '#0a0c10'; ctx.fillRect(28, 20, 8, 8); // telhado
      ctx.fillStyle = '#d8b46a'; ctx.fillRect(30, 31, 3, 4); // janela acesa
    }));

    // Cofre aberto/fechado — usado como conteúdo do diálogo
    add('prop-safe', makeCanvas(96, 72, (ctx) => {
      ctx.fillStyle = '#2b3440'; ctx.fillRect(4, 4, 88, 64);
      ctx.fillStyle = '#39465a'; ctx.fillRect(4, 4, 88, 8);
      ctx.fillStyle = '#1a212b'; ctx.fillRect(12, 14, 72, 48);
      ctx.fillStyle = '#51637c'; ctx.beginPath(); ctx.arc(48, 38, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#141a22'; ctx.beginPath(); ctx.arc(48, 38, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7e93a6';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillRect(44 + Math.cos(a) * 12 - 1, 35 + Math.sin(a) * 12 - 1, 3, 3);
      }
    }));

    // Lareira
    add('prop-fireplace', makeCanvas(112, 88, (ctx) => {
      ctx.fillStyle = '#2a2f38'; ctx.fillRect(0, 0, 112, 88);
      ctx.fillStyle = '#3a4250'; ctx.fillRect(0, 0, 112, 10); // console
      ctx.fillStyle = '#10141a'; // boca
      ctx.beginPath(); ctx.moveTo(18, 84); ctx.lineTo(18, 40); ctx.quadraticCurveTo(56, 10, 94, 40); ctx.lineTo(94, 84); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#241a12'; ctx.fillRect(28, 68, 56, 8); // lenha
      ctx.fillStyle = '#4a2c14'; ctx.fillRect(32, 64, 24, 6); ctx.fillRect(56, 62, 22, 8);
      ctx.fillStyle = '#d8722c'; ctx.fillRect(44, 52, 8, 12); ctx.fillRect(60, 48, 7, 16); // chamas
      ctx.fillStyle = '#f0a848'; ctx.fillRect(48, 56, 4, 8); ctx.fillRect(62, 54, 3, 10);
    }));

    // Estante de livros
    add('prop-bookshelf', makeCanvas(96, 132, (ctx) => {
      const rand = rng(83);
      ctx.fillStyle = wood; ctx.fillRect(0, 0, 96, 132);
      ctx.fillStyle = woodHi; ctx.fillRect(0, 0, 96, 6);
      ctx.fillStyle = woodLo;
      [44, 86].forEach((y) => ctx.fillRect(4, y, 88, 5));
      const rowsY = [8, 50, 92];
      const spines = ['#5a3a3a', '#3a4a5a', '#4a5a3a', '#5a4a2a', '#2a3a4a', '#46333f'];
      rowsY.forEach((y) => {
        let x = 8;
        while (x < 82) {
          const w = 5 + Math.floor(rand() * 6);
          const hgt = 22 + Math.floor(rand() * 10);
          ctx.fillStyle = spines[Math.floor(rand() * spines.length)];
          ctx.fillRect(x, y + (32 - hgt), w, hgt);
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + (32 - hgt), 1, hgt);
          x += w + 2;
        }
      });
    }));

    // Relógio de pêndulo
    add('prop-clock', makeCanvas(44, 96, (ctx) => {
      ctx.fillStyle = wood; ctx.fillRect(2, 0, 40, 96);
      ctx.fillStyle = woodHi; ctx.fillRect(2, 0, 40, 6);
      ctx.fillStyle = '#141a22'; ctx.fillRect(8, 10, 28, 28); // visor do mostrador
      ctx.fillStyle = '#cdbf9f'; ctx.beginPath(); ctx.arc(22, 24, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#141a22'; ctx.beginPath(); ctx.arc(22, 24, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cdbf9f'; ctx.fillRect(21, 17, 2, 7); ctx.fillRect(22, 23, 6, 2);
      ctx.fillStyle = '#10141a'; ctx.fillRect(8, 44, 28, 44); // caixa do pêndulo
      ctx.fillStyle = '#8a7434'; ctx.fillRect(21, 48, 2, 26); // haste
      ctx.fillStyle = '#cdbf9f'; ctx.beginPath(); ctx.arc(22, 76, 5, 0, Math.PI * 2); ctx.fill(); // peso
    }));

    // Geladeira enferrujada
    add('prop-fridge', makeCanvas(68, 108, (ctx) => {
      ctx.fillStyle = '#5b6d7d'; ctx.fillRect(2, 2, 64, 104);
      ctx.fillStyle = '#7e93a6'; ctx.fillRect(2, 2, 64, 8);
      ctx.fillStyle = '#46566a'; ctx.fillRect(6, 34, 56, 4); // divisória
      ctx.fillStyle = '#2c3540'; ctx.fillRect(56, 14, 5, 16); ctx.fillRect(56, 44, 5, 22); // puxadores
      ctx.fillStyle = '#4a3a2a'; // ferrugem
      ctx.fillRect(10, 20, 8, 5); ctx.fillRect(38, 60, 10, 6); ctx.fillRect(14, 84, 14, 5); ctx.fillRect(44, 96, 8, 4);
    }));

    // Armário de gavetas (chave)
    add('prop-cabinet', makeCanvas(112, 78, (ctx) => {
      ctx.fillStyle = wood; ctx.fillRect(2, 14, 108, 56);
      ctx.fillStyle = woodHi; ctx.fillRect(2, 14, 108, 6);
      ctx.fillStyle = woodLo;
      ctx.fillRect(10, 30, 92, 12); ctx.fillRect(10, 48, 92, 12);
      ctx.fillStyle = '#6e5a44'; ctx.fillRect(50, 34, 12, 4); ctx.fillRect(50, 52, 12, 4);
      // tampo com talheres/pano
      ctx.fillStyle = '#241a12'; ctx.fillRect(0, 6, 112, 10);
      ctx.fillStyle = '#8f887c'; ctx.fillRect(18, 8, 18, 6); ctx.fillRect(66, 9, 16, 5);
    }));

    // Mesa posta para dois
    add('prop-table', makeCanvas(100, 64, (ctx) => {
      ctx.fillStyle = woodHi; ctx.fillRect(8, 26, 84, 10);
      ctx.fillStyle = wood; ctx.fillRect(12, 36, 76, 20);
      ctx.fillStyle = woodLo; ctx.fillRect(18, 56, 8, 8); ctx.fillRect(74, 56, 8, 8);
      // pratos
      ctx.fillStyle = '#cdbf9f'; ctx.beginPath(); ctx.arc(30, 22, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(70, 22, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a89a76'; ctx.beginPath(); ctx.arc(30, 22, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(70, 22, 5, 0, Math.PI * 2); ctx.fill();
      // vaso de flores mortas
      ctx.fillStyle = '#2c3540'; ctx.fillRect(46, 8, 8, 14);
      ctx.fillStyle = '#46333f'; ctx.fillRect(44, 2, 3, 8); ctx.fillRect(50, 0, 3, 10); ctx.fillRect(54, 4, 3, 7);
    }));

    // Pia da cozinha
    add('prop-kitchen-sink', makeCanvas(72, 66, (ctx) => {
      ctx.fillStyle = '#5b6d7d'; ctx.fillRect(2, 22, 68, 30);
      ctx.fillStyle = '#141a22'; ctx.fillRect(10, 26, 52, 20); // cuba
      ctx.fillStyle = '#3a4756'; ctx.fillRect(14, 30, 44, 12);
      ctx.strokeStyle = '#7e93a6'; ctx.lineWidth = 4; // torneira
      ctx.beginPath(); ctx.moveTo(36, 22); ctx.lineTo(36, 8); ctx.lineTo(52, 8); ctx.stroke();
      // aliança na grade
      ctx.strokeStyle = '#cdbf9f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(30, 36, 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#241a12'; ctx.fillRect(2, 52, 68, 12); // armário
    }));

    // Despensa
    add('prop-pantry', makeCanvas(80, 116, (ctx) => {
      const rand = rng(91);
      ctx.fillStyle = wood; ctx.fillRect(2, 2, 76, 112);
      ctx.fillStyle = woodLo; ctx.fillRect(2, 2, 76, 6);
      ctx.fillStyle = '#10141a';
      [34, 68].forEach((y) => ctx.fillRect(8, y, 64, 6));
      for (let shelf = 0; shelf < 3; shelf++) {
        const y = 12 + shelf * 34;
        let x = 10;
        while (x < 62) {
          ctx.fillStyle = rand() < 0.3 ? '#3a2c22' : '#222b33';
          const h = 14 + Math.floor(rand() * 8);
          ctx.fillRect(x, y + 20 - h, 10, h);
          x += 13;
        }
      }
    }));

    // Espelho quebrado
    add('prop-mirror', makeCanvas(56, 80, (ctx) => {
      ctx.fillStyle = wood; ctx.fillRect(0, 0, 56, 80);
      ctx.fillStyle = woodHi; ctx.fillRect(0, 0, 56, 4);
      ctx.fillStyle = '#39465a'; ctx.fillRect(5, 6, 46, 68); // vidro
      ctx.fillStyle = '#4e5f78'; ctx.fillRect(5, 6, 46, 30); // reflexo superior
      // rachaduras
      ctx.strokeStyle = '#c9d4de'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(28, 6); ctx.lineTo(18, 40); ctx.moveTo(28, 6); ctx.lineTo(42, 34); ctx.moveTo(28, 6); ctx.lineTo(30, 74); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(18, 40); ctx.lineTo(6, 52); ctx.moveTo(42, 34); ctx.lineTo(52, 46); ctx.stroke();
    }));

    // Marcas de unhas na parede (decalque)
    add('prop-scratches', makeCanvas(88, 60, (ctx) => {
      ctx.strokeStyle = '#0d0a08';
      ctx.lineWidth = 3;
      const seed = [12, 26, 40, 54, 68];
      seed.forEach((x, i) => {
        ctx.beginPath(); ctx.moveTo(x, 6 + (i % 3) * 4); ctx.lineTo(x + 8, 52 - (i % 2) * 8); ctx.stroke();
      });
      ctx.fillStyle = '#1a120c'; ctx.fillRect(30, 50, 30, 6); // mão escura
    }));

    // Armário de remédios
    add('prop-med-cabinet', makeCanvas(56, 64, (ctx) => {
      ctx.fillStyle = '#8a94a0'; ctx.fillRect(2, 2, 52, 60);
      ctx.fillStyle = '#a8b2bd'; ctx.fillRect(2, 2, 52, 6);
      ctx.fillStyle = '#5b666f'; ctx.fillRect(26, 8, 4, 48); // porta dupla
      ctx.fillStyle = '#39424c'; ctx.fillRect(20, 32, 5, 4); ctx.fillRect(33, 32, 5, 4); // trincos
      ctx.fillStyle = '#c9d4de'; ctx.fillRect(8, 16, 12, 12); ctx.fillRect(36, 16, 12, 12); // vidro
    }));

    // Banheira
    add('prop-bathtub', makeCanvas(128, 62, (ctx) => {
      ctx.fillStyle = '#6d7a88';
      ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(128, 20); ctx.lineTo(116, 56); ctx.lineTo(12, 56); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#39465a'; ctx.fillRect(6, 24, 116, 12); // água parada
      ctx.fillStyle = '#55677e'; ctx.fillRect(10, 26, 40, 3);
      ctx.fillStyle = '#4a545f'; ctx.fillRect(18, 56, 8, 6); ctx.fillRect(102, 56, 8, 6); // pés
      // mecha de cabelo no ralo
      ctx.strokeStyle = '#3a2c22'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(64, 34); ctx.quadraticCurveTo(70, 40, 60, 46); ctx.stroke();
    }));

    // Pia do banheiro
    add('prop-bath-sink', makeCanvas(56, 74, (ctx) => {
      ctx.fillStyle = '#6d7a88'; ctx.fillRect(6, 12, 44, 26);
      ctx.fillStyle = '#39465a'; ctx.fillRect(12, 16, 32, 14);
      ctx.fillStyle = '#4a545f'; ctx.fillRect(22, 38, 12, 34); // coluna
      ctx.strokeStyle = '#8a94a0'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(28, 12); ctx.lineTo(28, 4); ctx.lineTo(40, 4); ctx.stroke();
      // anel no ralo
      ctx.strokeStyle = '#cdbf9f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(26, 22, 3, 0, Math.PI * 2); ctx.stroke();
    }));

    // Cama de casal (esvaziada)
    add('prop-bed', makeCanvas(132, 80, (ctx) => {
      ctx.fillStyle = woodLo; ctx.fillRect(0, 10, 12, 66); // cabeceira
      ctx.fillStyle = '#3a4048'; ctx.fillRect(10, 26, 120, 44);
      ctx.fillStyle = '#242a32'; ctx.fillRect(10, 26, 120, 10); // colchão sem roupa
      ctx.fillStyle = '#cdd3da'; ctx.fillRect(16, 16, 34, 14); // travesseiro
      ctx.fillStyle = '#8f97a3'; ctx.fillRect(16, 16, 34, 4);
    }));

    // Guarda-roupa
    add('prop-wardrobe', makeCanvas(112, 128, (ctx) => {
      ctx.fillStyle = wood; ctx.fillRect(2, 2, 108, 124);
      ctx.fillStyle = woodHi; ctx.fillRect(2, 2, 108, 6);
      ctx.fillStyle = woodLo; ctx.fillRect(55, 10, 3, 112); // divisão de portas
      ctx.fillStyle = '#6e5a44'; ctx.fillRect(48, 62, 5, 10); ctx.fillRect(62, 62, 5, 10); // puxadores
      // porta entreaberta com vestido
      ctx.fillStyle = '#241a12'; ctx.fillRect(58, 14, 44, 104);
      ctx.fillStyle = '#c9c2b4'; ctx.fillRect(72, 40, 20, 34); // vestido claro
      ctx.fillStyle = '#8f887c'; ctx.fillRect(72, 40, 20, 6);
    }));

    // Criado-mudo
    add('prop-nightstand', makeCanvas(54, 56, (ctx) => {
      ctx.fillStyle = wood; ctx.fillRect(2, 10, 50, 40);
      ctx.fillStyle = woodHi; ctx.fillRect(2, 10, 50, 5);
      ctx.fillStyle = woodLo; ctx.fillRect(8, 24, 38, 9);
      ctx.fillStyle = '#6e5a44'; ctx.fillRect(22, 27, 10, 3);
      ctx.fillStyle = '#14161b'; ctx.fillRect(18, 2, 18, 8); // diário/velas
      // gaveta forçada
      ctx.fillStyle = woodLo; ctx.fillRect(6, 40, 42, 8);
    }));

    // Cama de hóspedes
    add('prop-guest-bed', makeCanvas(124, 66, (ctx) => {
      ctx.fillStyle = woodLo; ctx.fillRect(0, 8, 10, 54);
      ctx.fillStyle = '#2e343d'; ctx.fillRect(8, 20, 114, 38);
      ctx.fillStyle = '#565e6a'; ctx.fillRect(8, 20, 114, 8); // lençol cinza
      ctx.fillStyle = '#cdd3da'; ctx.fillRect(14, 12, 30, 12);
    }));

    // Galpão do jardim
    add('prop-shed', makeCanvas(128, 124, (ctx) => {
      ctx.fillStyle = '#2e2620'; ctx.beginPath(); ctx.moveTo(4, 34); ctx.lineTo(64, 4); ctx.lineTo(124, 34); ctx.closePath(); ctx.fill(); // telhado
      ctx.fillStyle = '#362c24'; ctx.fillRect(12, 34, 104, 86); // corpo
      ctx.fillStyle = '#241c14'; ctx.fillRect(12, 34, 104, 6);
      // tábuas
      ctx.fillStyle = '#2c241c';
      for (let x = 22; x < 112; x += 14) ctx.fillRect(x, 44, 2, 74);
      // porta com cadeado
      ctx.fillStyle = '#1a1410'; ctx.fillRect(44, 52, 40, 68);
      ctx.fillStyle = '#0d0a08'; ctx.fillRect(48, 56, 32, 60);
      ctx.fillStyle = '#5b6d7d'; ctx.fillRect(60, 84, 8, 8); // cadeado
      ctx.fillStyle = '#39465a'; ctx.fillRect(62, 80, 4, 5);
      // pá limpa encostada
      ctx.strokeStyle = '#7e93a6'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(102, 116); ctx.lineTo(112, 66); ctx.stroke();
      ctx.fillStyle = '#7e93a6'; ctx.beginPath(); ctx.moveTo(106, 60); ctx.lineTo(118, 64); ctx.lineTo(112, 74); ctx.closePath(); ctx.fill();
    }));

    // Roseiras mortas
    add('prop-roses', makeCanvas(88, 64, (ctx) => {
      ctx.fillStyle = '#241c14'; ctx.fillRect(0, 52, 88, 12); // canteiro
      ctx.strokeStyle = '#332a20'; ctx.lineWidth = 3;
      const stems = [12, 26, 38, 52, 64, 76];
      stems.forEach((x, i) => {
        ctx.beginPath(); ctx.moveTo(x, 54); ctx.lineTo(x + (i % 2 ? 6 : -6), 14 + (i % 3) * 8); ctx.stroke();
      });
      ctx.fillStyle = '#4a2c33'; // flores mortas
      stems.forEach((x, i) => { ctx.fillRect(x + (i % 2 ? 4 : -9), 12 + (i % 3) * 8, 5, 5); });
    }));

    // Banco de madeira
    add('prop-bench', makeCanvas(96, 44, (ctx) => {
      ctx.fillStyle = wood; ctx.fillRect(6, 14, 84, 8);
      ctx.fillStyle = woodHi; ctx.fillRect(6, 14, 84, 3);
      ctx.fillStyle = wood; ctx.fillRect(10, 26, 76, 5);
      ctx.fillStyle = woodLo; ctx.fillRect(12, 22, 6, 20); ctx.fillRect(78, 22, 6, 20);
      // marcas de charuto
      ctx.fillStyle = '#0d0a08'; ctx.fillRect(20, 18, 3, 2); ctx.fillRect(48, 16, 3, 2); ctx.fillRect(66, 19, 3, 2);
    }));

    // Árvore antiga
    add('prop-tree', makeCanvas(120, 150, (ctx) => {
      ctx.strokeStyle = '#241c14';
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(60, 148); ctx.quadraticCurveTo(54, 100, 62, 60); ctx.stroke();
      ctx.lineWidth = 6; // galhos
      const branches = [[62, 78, 22, 34], [60, 66, 96, 28], [58, 96, 30, 66], [61, 88, 100, 74], [59, 56, 60, 16]];
      branches.forEach(([x1, y1, x2, y2]) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
      ctx.lineWidth = 3;
      branches.forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo((x1 + x2) / 2, (y1 + y2) / 2); ctx.lineTo(x2 + 8, y2 - 10); ctx.stroke();
      });
      // coração entalhado
      ctx.strokeStyle = '#4a3324'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(52, 112); ctx.lineTo(60, 104); ctx.lineTo(68, 112); ctx.lineTo(60, 122); ctx.closePath(); ctx.stroke();
    }));

    // Poço
    add('prop-well', makeCanvas(128, 104, (ctx) => {
      // apoios do telhado
      ctx.fillStyle = woodLo; ctx.fillRect(18, 8, 8, 60); ctx.fillRect(102, 8, 8, 60);
      ctx.fillStyle = '#241c14'; ctx.beginPath(); ctx.moveTo(8, 12); ctx.lineTo(64, 0); ctx.lineTo(120, 12); ctx.closePath(); ctx.fill();
      // corda e manivela
      ctx.strokeStyle = '#6b5a44'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(64, 10); ctx.lineTo(64, 44); ctx.stroke();
      ctx.fillStyle = wood; ctx.fillRect(40, 6, 48, 5);
      // boca de pedra
      ctx.fillStyle = '#39424c'; ctx.beginPath(); ctx.ellipse(64, 66, 56, 26, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#556270'; ctx.beginPath(); ctx.ellipse(64, 60, 56, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#05070b'; ctx.beginPath(); ctx.ellipse(64, 60, 42, 17, 0, 0, Math.PI * 2); ctx.fill();
      // pedras
      ctx.fillStyle = '#232b34';
      [8, 28, 48, 68, 88, 108].forEach((x, i) => ctx.fillRect(x, 70 + (i % 2) * 4, 14, 6));
    }));

    // ============ PROJETIL E IMPACTOS ============
    add('bullet', makeCanvas(6, 2, (ctx) => {
      ctx.fillStyle = '#fff3c4'; ctx.fillRect(2, 0, 4, 2);
      ctx.fillStyle = '#d8b46a'; ctx.fillRect(0, 0, 2, 2);
    }));
    add('muzzle', makeCanvas(10, 10, (ctx) => {
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(4, 0, 2, 10); ctx.fillRect(0, 4, 10, 2);
      ctx.fillRect(2, 2, 2, 2); ctx.fillRect(6, 2, 2, 2); ctx.fillRect(2, 6, 2, 2); ctx.fillRect(6, 6, 2, 2);
    }));
    add('impact', makeCanvas(12, 12, (ctx) => {
      ctx.fillStyle = '#f0a848';
      ctx.fillRect(5, 1, 2, 10); ctx.fillRect(1, 5, 10, 2);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(4, 4, 4, 4);
      ctx.fillStyle = '#d8722c';
      ctx.fillRect(0, 0, 2, 2); ctx.fillRect(10, 0, 2, 2); ctx.fillRect(0, 10, 2, 2); ctx.fillRect(10, 10, 2, 2);
    }));
    add('leaf', makeCanvas(4, 3, (ctx) => {
      ctx.fillStyle = '#4a3a22'; ctx.fillRect(0, 0, 4, 3);
      ctx.fillStyle = '#5a452a'; ctx.fillRect(1, 0, 2, 1);
    }));

    // ============ DECORAÇÕES (não interativas) ============
    // Poltrona surrada
    add('decor-armchair', makeCanvas(60, 58, (ctx) => {
      ctx.fillStyle = '#3f362c'; ctx.fillRect(4, 5, 52, 3); // brilho da borda de cima
      ctx.fillStyle = '#241c16'; ctx.fillRect(6, 46, 10, 10); ctx.fillRect(44, 46, 10, 10); // pés
      ctx.fillStyle = '#332a24'; ctx.fillRect(6, 8, 48, 26); // encosto
      ctx.fillStyle = '#4a4036'; ctx.fillRect(10, 12, 40, 9); // desgaste do encosto
      ctx.fillStyle = '#40352c'; ctx.fillRect(2, 24, 56, 26); // assento/corpo
      ctx.fillStyle = '#241c16'; ctx.fillRect(0, 24, 8, 22); ctx.fillRect(52, 24, 8, 22); // braços
      ctx.fillStyle = '#4a4036'; ctx.fillRect(10, 30, 40, 7); // almofada
      ctx.fillStyle = '#5a4e42'; ctx.fillRect(10, 30, 12, 3); // brilho da almofada
    }));

    // Mesa lateral com vela
    add('decor-side-table', makeCanvas(40, 52, (ctx) => {
      ctx.fillStyle = '#2c241c'; ctx.fillRect(4, 14, 32, 6); // tampo
      ctx.fillStyle = '#241c14'; ctx.fillRect(17, 20, 6, 24); // perna
      ctx.fillStyle = '#241c14'; ctx.fillRect(8, 44, 24, 5); // base
      ctx.fillStyle = '#cdbf9f'; ctx.fillRect(16, 5, 8, 9); // vela
      ctx.fillStyle = '#8f8468'; ctx.fillRect(16, 5, 8, 2);
      ctx.fillStyle = '#f0a848'; ctx.fillRect(18, 1, 4, 4); // chama
      ctx.fillStyle = 'rgba(240,168,72,0.35)'; ctx.fillRect(14, 0, 12, 8); // brilho
    }));

    // Abajur de chão
    add('decor-lamp', makeCanvas(36, 88, (ctx) => {
      ctx.fillStyle = 'rgba(216,180,106,0.22)';
      ctx.beginPath(); ctx.moveTo(12, 26); ctx.lineTo(24, 26); ctx.lineTo(34, 62); ctx.lineTo(2, 62); ctx.closePath(); ctx.fill(); // cone de luz
      ctx.fillStyle = '#4a4034'; // cúpula
      ctx.beginPath(); ctx.moveTo(9, 2); ctx.lineTo(27, 2); ctx.lineTo(32, 24); ctx.lineTo(4, 24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d8b46a'; ctx.fillRect(6, 21, 24, 3); // borda quente
      ctx.fillStyle = '#241c14'; ctx.fillRect(16, 25, 4, 52); // poste
      ctx.fillStyle = '#241c14'; ctx.fillRect(6, 77, 24, 7); // base
    }));

    // Papéis espalhados (decalque)
    add('decor-papers', makeCanvas(56, 28, (ctx) => {
      ctx.fillStyle = '#b3a482'; ctx.fillRect(4, 6, 18, 12); ctx.fillRect(30, 2, 16, 12);
      ctx.fillStyle = '#8f8468'; ctx.fillRect(14, 12, 20, 12);
      ctx.fillStyle = '#6e6552';
      ctx.fillRect(8, 9, 10, 1); ctx.fillRect(8, 13, 12, 1); ctx.fillRect(33, 5, 10, 1); ctx.fillRect(17, 16, 12, 1); ctx.fillRect(17, 20, 9, 1);
    }));

    // Teia de aranha (canto esquerdo e direito)
    const cobweb = (flip) => makeCanvas(36, 36, (ctx) => {
      ctx.strokeStyle = 'rgba(205,223,238,0.4)';
      ctx.lineWidth = 1;
      const ox = flip ? 35 : 0;
      const dir = flip ? -1 : 1;
      for (const radius of [8, 15, 22, 29]) {
        ctx.beginPath(); ctx.arc(ox, 1, radius, 0, Math.PI / 2); ctx.stroke();
      }
      for (const angle of [0.35, 0.78, 1.2]) {
        ctx.beginPath(); ctx.moveTo(ox, 1);
        ctx.lineTo(ox + Math.cos(angle) * 32 * dir, 1 + Math.sin(angle) * 32);
        ctx.stroke();
      }
    });
    add('decor-cobweb-l', cobweb(false));
    add('decor-cobweb-r', cobweb(true));

    // Rachadura na parede (decalque)
    add('decor-crack', makeCanvas(44, 60, (ctx) => {
      ctx.strokeStyle = '#0e141b';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(22, 2);
      ctx.lineTo(18, 14); ctx.lineTo(26, 22); ctx.lineTo(14, 34); ctx.lineTo(22, 44); ctx.lineTo(16, 58);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(24, 22); ctx.lineTo(34, 30); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, 34); ctx.lineTo(6, 40); ctx.stroke();
    }));

    // Fogão a lenha antigo
    add('decor-stove', makeCanvas(72, 64, (ctx) => {
      ctx.fillStyle = '#141920'; ctx.fillRect(50, 0, 12, 14); // cano
      ctx.fillStyle = '#1c2126'; ctx.fillRect(4, 14, 64, 40); // corpo
      ctx.fillStyle = '#10151b'; ctx.fillRect(0, 8, 72, 8); // chapa
      ctx.fillStyle = '#0d1116'; ctx.fillRect(14, 11, 12, 3); ctx.fillRect(40, 11, 12, 3); // bocas
      ctx.fillStyle = '#2c343d'; ctx.fillRect(10, 26, 52, 20); // porta
      ctx.fillStyle = '#d8722c'; ctx.fillRect(14, 42, 44, 3); // brasa sob a porta
      ctx.fillStyle = '#f0a848'; ctx.fillRect(20, 43, 8, 1); ctx.fillRect(38, 43, 6, 1);
      ctx.fillStyle = '#39424c'; ctx.fillRect(30, 30, 10, 3); // trinco
      ctx.fillStyle = '#05080d'; ctx.fillRect(0, 54, 72, 10); // base de sombra
    }));

    // Ervas e alho pendurados
    add('decor-herbs', makeCanvas(56, 48, (ctx) => {
      ctx.fillStyle = '#241c14'; ctx.fillRect(0, 0, 56, 5); // viga
      ctx.strokeStyle = '#3a2c22'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(12, 5); ctx.lineTo(12, 26); ctx.moveTo(28, 5); ctx.lineTo(28, 32); ctx.moveTo(44, 5); ctx.lineTo(44, 22); ctx.stroke();
      ctx.fillStyle = '#2c3a24';
      ctx.fillRect(7, 26, 10, 10); ctx.fillRect(9, 36, 6, 5); // feixe 1
      ctx.fillStyle = '#3a4a2c'; ctx.fillRect(24, 32, 9, 10); ctx.fillRect(26, 42, 5, 4); // feixe 2
      ctx.fillStyle = '#cfc4b8'; ctx.fillRect(40, 22, 8, 8); ctx.fillRect(42, 30, 4, 4); // alho
      ctx.fillStyle = '#8f857a'; ctx.fillRect(40, 22, 8, 2);
    }));

    // Pratos quebrados no chão (decalque)
    add('decor-plates', makeCanvas(52, 26, (ctx) => {
      ctx.fillStyle = '#b3a482'; ctx.fillRect(2, 8, 14, 10); ctx.fillRect(34, 12, 14, 9);
      ctx.fillStyle = '#8f8468'; ctx.fillRect(18, 14, 16, 8);
      ctx.fillStyle = '#6e6552'; ctx.fillRect(6, 11, 8, 1); ctx.fillRect(37, 15, 7, 1); ctx.fillRect(21, 17, 10, 1);
    }));

    // Toalha suja pendurada
    add('decor-towel', makeCanvas(28, 36, (ctx) => {
      ctx.fillStyle = '#1c2126'; ctx.fillRect(0, 0, 28, 4); // varal
      ctx.fillStyle = '#6b655a'; ctx.fillRect(6, 4, 16, 24); // pano
      ctx.fillStyle = '#4a463d'; ctx.fillRect(6, 20, 16, 4); // faixa
      ctx.fillStyle = '#5a554c'; ctx.fillRect(6, 28, 3, 6); ctx.fillRect(12, 28, 3, 6); ctx.fillRect(18, 28, 3, 6); // desfiado
    }));

    // Garrafas no chão (decalque)
    add('decor-bottles', makeCanvas(36, 24, (ctx) => {
      ctx.fillStyle = '#101a14'; ctx.fillRect(2, 6, 10, 16); ctx.fillRect(5, 2, 4, 6); // garrafa 1
      ctx.fillStyle = '#1c2620'; ctx.fillRect(20, 10, 9, 12); ctx.fillRect(23, 6, 3, 6); // garrafa 2
      ctx.fillStyle = '#2c3a30'; ctx.fillRect(4, 8, 2, 10); ctx.fillRect(22, 12, 2, 7); // reflexos
    }));

    // Roupas espalhadas (decalque)
    add('decor-clothes', makeCanvas(56, 24, (ctx) => {
      ctx.fillStyle = '#2c3540'; ctx.beginPath(); ctx.ellipse(16, 14, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#46333f'; ctx.beginPath(); ctx.ellipse(36, 12, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#332a20'; ctx.beginPath(); ctx.ellipse(26, 18, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cfc4b8'; ctx.fillRect(30, 10, 8, 3); // manga
    }));

    // Estátua de anjo quebrada
    add('decor-statue', makeCanvas(72, 116, (ctx) => {
      ctx.fillStyle = '#39424c'; ctx.fillRect(8, 84, 56, 28); // pedestal
      ctx.fillStyle = '#46525e'; ctx.fillRect(12, 88, 48, 6);
      // corpo da estátua (sem a cabeça esquerda — decapitada)
      ctx.fillStyle = '#4a565f';
      ctx.fillRect(24, 40, 24, 44); // torso
      ctx.fillRect(28, 28, 16, 14); // pescoço/queixo
      ctx.fillRect(14, 44, 10, 26); // braço caído
      ctx.beginPath(); ctx.moveTo(24, 40); ctx.lineTo(10, 34); ctx.lineTo(14, 58); ctx.closePath(); ctx.fill(); // asa esquerda quebrada
      ctx.beginPath(); ctx.moveTo(48, 36); ctx.lineTo(66, 22); ctx.lineTo(58, 52); ctx.closePath(); ctx.fill(); // asa direita erguida
      ctx.fillStyle = '#313a42'; ctx.fillRect(26, 44, 4, 38); // vinco da túnica
      ctx.fillStyle = '#5b6875'; ctx.fillRect(28, 28, 4, 6); // resto do rosto
      // rachaduras
      ctx.strokeStyle = '#141a20'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(38, 44); ctx.lineTo(34, 62); ctx.lineTo(40, 72); ctx.stroke();
    }));

    // Poste de lampião
    add('decor-lantern', makeCanvas(30, 84, (ctx) => {
      ctx.fillStyle = '#141a20'; ctx.fillRect(12, 16, 6, 64); // poste
      ctx.fillStyle = '#0d1116'; ctx.fillRect(4, 80, 22, 4); // base
      ctx.fillStyle = '#1c2126'; ctx.beginPath(); ctx.moveTo(6, 16); ctx.lineTo(15, 0); ctx.lineTo(24, 16); ctx.closePath(); ctx.fill(); // capuz
      ctx.fillStyle = '#1c2126'; ctx.fillRect(8, 16, 14, 14); // moldura
      ctx.fillStyle = '#d8b46a'; ctx.fillRect(11, 19, 8, 8); // vidro aceso
      ctx.fillStyle = 'rgba(216,180,106,0.25)'; ctx.fillRect(7, 30, 16, 10); // luz vazando
    }));

    // Carrinho de mão enferrujado
    add('decor-wheelbarrow', makeCanvas(76, 56, (ctx) => {
      ctx.fillStyle = '#33291b'; ctx.beginPath(); ctx.ellipse(28, 12, 22, 7, 0, 0, Math.PI * 2); ctx.fill(); // terra
      ctx.fillStyle = '#3d2b1e'; // caçamba enferrujada
      ctx.beginPath(); ctx.moveTo(8, 16); ctx.lineTo(52, 16); ctx.lineTo(44, 34); ctx.lineTo(14, 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#241a12'; ctx.fillRect(14, 20, 32, 3);
      // roda
      ctx.fillStyle = '#141a20'; ctx.beginPath(); ctx.arc(12, 40, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#39424c'; ctx.beginPath(); ctx.arc(12, 40, 4, 0, Math.PI * 2); ctx.fill();
      // pernas e alças
      ctx.fillStyle = '#241a12'; ctx.fillRect(44, 34, 4, 14); ctx.fillRect(52, 10, 22, 4); ctx.fillRect(66, 4, 4, 12);
    }));

    // Lápide torta
    add('decor-gravestone', makeCanvas(52, 64, (ctx) => {
      ctx.save();
      ctx.translate(26, 34); ctx.rotate(-0.09); ctx.translate(-26, -34);
      ctx.fillStyle = '#39424c';
      ctx.beginPath(); ctx.moveTo(8, 58); ctx.lineTo(8, 18); ctx.quadraticCurveTo(26, 2, 44, 18); ctx.lineTo(44, 58); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2b333c'; ctx.fillRect(8, 34, 36, 2);
      ctx.fillStyle = '#232b33'; ctx.fillRect(14, 24, 24, 3); ctx.fillRect(16, 30, 20, 2);
      ctx.restore();
      ctx.fillStyle = '#16241a'; ctx.fillRect(0, 54, 52, 10); // terra da base
    }));
    // ============ MARKER / INDICADORES ============
    add('marker', makeCanvas(14, 18, (ctx) => {
      ctx.fillStyle = '#d8b46a';
      ctx.fillRect(5, 0, 5, 10);
      ctx.fillRect(5, 13, 5, 5);
    }));

    // Arco de porta
    add('door-arch', makeCanvas(64, 96, (ctx) => {
      ctx.fillStyle = woodLo; ctx.fillRect(0, 10, 64, 86);
      ctx.fillStyle = wood; ctx.fillRect(0, 10, 8, 86); ctx.fillRect(56, 10, 8, 86);
      ctx.fillStyle = woodHi; ctx.fillRect(0, 4, 64, 8);
      ctx.fillStyle = '#04070b'; // vão escuro
      ctx.beginPath(); ctx.moveTo(10, 96); ctx.lineTo(10, 30); ctx.quadraticCurveTo(32, 12, 54, 30); ctx.lineTo(54, 96); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(127,168,201,0.12)'; // leve luz do outro cômodo
      ctx.beginPath(); ctx.moveTo(16, 96); ctx.lineTo(16, 36); ctx.quadraticCurveTo(32, 22, 48, 36); ctx.lineTo(48, 96); ctx.closePath(); ctx.fill();
    }));

    // Vão de porta lateral (gap na parede com escuridão)
    add('door-side', makeCanvas(36, 88, (ctx) => {
      ctx.fillStyle = woodLo; ctx.fillRect(0, 0, 36, 88);
      ctx.fillStyle = '#04070b'; ctx.fillRect(4, 4, 28, 80); // vão escuro
      ctx.fillStyle = 'rgba(127,168,201,0.10)'; ctx.fillRect(8, 8, 10, 72); // leve luz
      ctx.fillStyle = wood; ctx.fillRect(0, 0, 36, 5); ctx.fillRect(0, 83, 36, 5);
    }));

    // Chuva e poeira
    add('fog', makeCanvas(48, 48, (ctx) => {
      const grad = ctx.createRadialGradient(24, 24, 2, 24, 24, 22);
      grad.addColorStop(0, 'rgba(159,180,198,0.5)');
      grad.addColorStop(1, 'rgba(159,180,198,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 48, 48);
    }));
    add('rain-drop', makeCanvas(2, 12, (ctx) => {
      ctx.fillStyle = 'rgba(154,198,228,0.75)'; ctx.fillRect(0, 0, 2, 12);
    }));
    add('dust', makeCanvas(2, 2, (ctx) => {
      ctx.fillStyle = 'rgba(205,223,238,0.5)'; ctx.fillRect(0, 0, 2, 2);
    }));
    add('flame', makeCanvas(6, 10, (ctx) => {
      ctx.fillStyle = '#d8722c'; ctx.fillRect(1, 2, 4, 8);
      ctx.fillStyle = '#f0a848'; ctx.fillRect(2, 4, 2, 5);
    }));

    // Sombra projetada (elipse suave)
    add('shadow', makeCanvas(48, 16, (ctx) => {
      const grad = ctx.createRadialGradient(24, 8, 2, 24, 8, 22);
      grad.addColorStop(0, 'rgba(0,0,0,0.5)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(24, 8, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
    }));

    // Vinheta escura por cômodo
    add('vignette', makeCanvas(768, 448, (ctx) => {
      const grad = ctx.createRadialGradient(384, 224, 130, 384, 224, 480);
      grad.addColorStop(0, 'rgba(2,4,7,0)');
      grad.addColorStop(0.62, 'rgba(2,4,7,0.12)');
      grad.addColorStop(1, 'rgba(2,4,7,0.68)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 768, 448);
    }));

    // ============ FUNDOS DE COMBATE ============
    add('combat-well', makeCanvas(768, 448, (ctx) => {
      // céu noturno tempestuoso
      const sky = ctx.createLinearGradient(0, 0, 0, 300);
      sky.addColorStop(0, '#070d14'); sky.addColorStop(1, '#131e29');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 768, 300);
      // lua atrás das nuvens
      ctx.fillStyle = '#c9d4de'; ctx.beginPath(); ctx.arc(640, 64, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(19,30,41,0.7)'; ctx.fillRect(600, 52, 90, 12); ctx.fillRect(610, 76, 80, 10);
      // chão de jardim
      const ground = ctx.createLinearGradient(0, 300, 0, 448);
      ground.addColorStop(0, '#1b2a20'); ground.addColorStop(1, '#0d150f');
      ctx.fillStyle = ground; ctx.fillRect(0, 300, 768, 148);
      // folhas secas
      const rand = rng(7);
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = rand() < 0.5 ? '#3a2c1d' : '#2c2318';
        ctx.fillRect(Math.floor(rand() * 768), 300 + Math.floor(rand() * 148), 3, 2);
      }
      // o poço ao centro-fundo (grande)
      ctx.fillStyle = '#39424c'; ctx.beginPath(); ctx.ellipse(384, 300, 150, 56, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#556270'; ctx.beginPath(); ctx.ellipse(384, 290, 150, 52, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#05070b'; ctx.beginPath(); ctx.ellipse(384, 290, 116, 40, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = woodLo; ctx.fillRect(228, 130, 18, 150); ctx.fillRect(522, 130, 18, 150);
      ctx.fillStyle = '#241c14'; ctx.beginPath(); ctx.moveTo(190, 138); ctx.lineTo(384, 82); ctx.lineTo(578, 138); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6b5a44'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(384, 96); ctx.lineTo(384, 244); ctx.stroke();
    }));

    add('combat-shadow', makeCanvas(768, 448, (ctx) => {
      // fundo de sombra de cômodo
      const wallGrad = ctx.createLinearGradient(0, 0, 0, 448);
      wallGrad.addColorStop(0, '#131c26'); wallGrad.addColorStop(0.75, '#1d2a37'); wallGrad.addColorStop(1, '#241a12');
      ctx.fillStyle = wallGrad; ctx.fillRect(0, 0, 768, 448);
      ctx.fillStyle = '#241a12'; ctx.fillRect(0, 380, 768, 68); // tábuas do piso
      ctx.fillStyle = '#33261d';
      for (let x = 0; x < 768; x += 46) ctx.fillRect(x, 380, 2, 68);
      // frestas de luz nas laterais
      ctx.fillStyle = 'rgba(127,168,201,0.07)';
      ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(150, 0); ctx.lineTo(240, 448); ctx.lineTo(120, 448); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(700, 0); ctx.lineTo(620, 0); ctx.lineTo(540, 448); ctx.lineTo(640, 448); ctx.closePath(); ctx.fill();
    }));

    // ============ FUNDO DO PRÓLOGO ============
    add('intro-bg', makeCanvas(768, 448, (ctx) => {
      const sky = ctx.createLinearGradient(0, 0, 0, 300);
      sky.addColorStop(0, '#04070b'); sky.addColorStop(0.6, '#0a121b'); sky.addColorStop(1, '#131e29');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, 768, 300);
      // lua
      ctx.fillStyle = '#c9d4de'; ctx.beginPath(); ctx.arc(600, 58, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#04070b'; ctx.beginPath(); ctx.arc(610, 52, 22, 0, Math.PI * 2); ctx.fill(); // crescente
      // nuvens
      ctx.fillStyle = 'rgba(19,30,41,0.8)';
      ctx.fillRect(80, 40, 260, 16); ctx.fillRect(140, 64, 300, 12); ctx.fillRect(430, 30, 240, 14);
      // estrada escura
      ctx.fillStyle = '#0d0a08';
      ctx.beginPath(); ctx.moveTo(0, 448); ctx.lineTo(300, 300); ctx.lineTo(468, 300); ctx.lineTo(768, 448); ctx.closePath(); ctx.fill();
      // colina e a mansão
      ctx.fillStyle = '#070d14'; ctx.fillRect(0, 262, 768, 44);
      ctx.fillStyle = '#05080d';
      // corpo principal
      ctx.fillRect(268, 168, 220, 96);
      // torre central
      ctx.beginPath(); ctx.moveTo(356, 96); ctx.lineTo(398, 96); ctx.lineTo(410, 168); ctx.lineTo(344, 168); ctx.closePath(); ctx.fill();
      // telhados
      ctx.beginPath(); ctx.moveTo(252, 170); ctx.lineTo(380, 96); ctx.lineTo(500, 170); ctx.closePath(); ctx.fill();
      ctx.fillRect(344, 84, 74, 14); // beiral da torre
      // alas laterais
      ctx.fillRect(196, 214, 92, 50); ctx.fillRect(468, 214, 92, 50);
      ctx.beginPath(); ctx.moveTo(188, 216); ctx.lineTo(242, 178); ctx.lineTo(296, 216); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(460, 216); ctx.lineTo(514, 178); ctx.lineTo(568, 216); ctx.closePath(); ctx.fill();
      // janelas: uma acesa, as outras escuras
      const wins = [[292, 206], [330, 206], [430, 206], [466, 206], [236, 232], [492, 232]];
      wins.forEach(([x, y]) => { ctx.fillStyle = '#05070b'; ctx.fillRect(x, y, 14, 18); });
      ctx.fillStyle = '#d8b46a'; ctx.fillRect(376, 128, 12, 20); // janela da torre acesa
      ctx.fillStyle = 'rgba(216,180,106,0.25)'; ctx.fillRect(368, 120, 28, 34);
      // portão e cerca
      ctx.fillStyle = '#0a0f16'; ctx.fillRect(0, 300, 768, 8);
      for (let x = 0; x < 768; x += 24) ctx.fillRect(x, 288, 4, 20);
      // árvores mortas
      ctx.strokeStyle = '#04070b'; ctx.lineWidth = 5;
      [[96, 262, 60, 190], [690, 262, 730, 200]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 18, y2 - 34); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 + 16, y2 - 30); ctx.stroke();
        ctx.lineWidth = 5;
      });
    }));
  }

  return { create };
})();
