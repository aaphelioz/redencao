'use strict';

/* Definição dos cômodos 2D: grade de tiles, props interativos e portas.
   Internamente o mundo tem 768x448 px (24 x 14 tiles de 32px). */
window.RedencaoRooms = (() => {
  const TILE = 32;

  // Caracteres do mapa:
  //  '#' parede sólida   '.' piso de madeira   ',' grama   ':' terra   'D' porta (andável)
  const salaMap = [
    '###########DD###########',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    'DD....................DD',
    'DD....................DD',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '###########DD###########',
    '###########DD###########',
  ];

  const cozinhaMap = [
    '########################',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#.....................DD',
    '#.....................DD',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '########################',
    '########################',
  ];

  const banheiroMap = [
    '########################',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    'DD.....................#',
    'DD.....................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '########################',
    '########################',
  ];

  const quartosMap = [
    '########################',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '#......................#',
    '###########DD###########',
    '###########DD###########',
  ];

  const jardimMap = [
    '###########DD###########',
    '###########DD###########',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,::,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,::,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,#',
    '########################',
    '########################',
  ];

  const rooms = {
    sala: {
      id: 'sala',
      name: 'Sala de estar',
      map: salaMap,
      interior: true,
      props: [
        { id: 'sala-lareira', texture: 'prop-fireplace', x: 26, y: 18 },
        { id: 'sala-relogio', texture: 'prop-clock', x: 182, y: 24 },
        { id: 'sala-cofre', texture: 'prop-painting', x: 428, y: 24 },
        { id: 'sala-estante', texture: 'prop-bookshelf', x: 606, y: 22 },
        { id: 'sala-papeis', texture: 'prop-desk', x: 84, y: 258 },
      ],
      doors: [
        { x: 352, y: 0, w: 64, h: 36, to: 'quartos', label: 'Quartos' },
        { x: 0, y: 160, w: 36, h: 64, to: 'cozinha', label: 'Cozinha' },
        { x: 732, y: 160, w: 64, h: 64, to: 'banheiro', label: 'Banheiros' },
        { x: 352, y: 412, w: 64, h: 36, to: 'jardim', label: 'Jardim de folhas secas' },
      ],
      decor: [
        { texture: 'decor-armchair', x: 250, y: 244 },
        { texture: 'decor-side-table', x: 452, y: 258 },
        { texture: 'decor-lamp', x: 560, y: 118 },
        { texture: 'decor-papers', x: 236, y: 354, solid: false },
        { texture: 'decor-papers', x: 502, y: 172, solid: false },
        { texture: 'decor-cobweb-l', x: 6, y: 64, solid: false },
        { texture: 'decor-cobweb-r', x: 726, y: 64, solid: false },
        { texture: 'decor-crack', x: 250, y: 34 },
      ],
    },
    cozinha: {
      id: 'cozinha',
      name: 'Cozinha',
      map: cozinhaMap,
      interior: true,
      props: [
        { id: 'cozinha-geladeira', texture: 'prop-fridge', x: 56, y: 24 },
        { id: 'cozinha-gavetas', texture: 'prop-cabinet', x: 232, y: 30 },
        { id: 'cozinha-pia', texture: 'prop-kitchen-sink', x: 520, y: 26 },
        { id: 'cozinha-mesa', texture: 'prop-table', x: 330, y: 220 },
        { id: 'cozinha-despensa', texture: 'prop-pantry', x: 610, y: 118 },
      ],
      doors: [
        { x: 732, y: 160, w: 36, h: 64, to: 'sala', label: 'Sala de estar' },
      ],
      decor: [
        { texture: 'decor-stove', x: 148, y: 28 },
        { texture: 'decor-herbs', x: 366, y: 92, solid: false },
        { texture: 'decor-plates', x: 452, y: 296, solid: false },
        { texture: 'decor-cobweb-r', x: 726, y: 64, solid: false },
      ],
    },
    banheiro: {
      id: 'banheiro',
      name: 'Banheiros',
      map: banheiroMap,
      interior: true,
      props: [
        { id: 'banheiro-espelho', texture: 'prop-mirror', x: 88, y: 24 },
        { id: 'banheiro-marcas', texture: 'prop-scratches', x: 322, y: 34 },
        { id: 'banheiro-armario', texture: 'prop-med-cabinet', x: 470, y: 26 },
        { id: 'banheiro-banheira', texture: 'prop-bathtub', x: 150, y: 284 },
        { id: 'banheiro-pia', texture: 'prop-bath-sink', x: 556, y: 58 },
      ],
      doors: [
        { x: 0, y: 160, w: 36, h: 64, to: 'sala', label: 'Sala de estar' },
      ],
      decor: [
        { texture: 'decor-towel', x: 268, y: 34 },
        { texture: 'decor-bottles', x: 520, y: 302, solid: false },
        { texture: 'decor-cobweb-l', x: 6, y: 64, solid: false },
        { texture: 'decor-cobweb-r', x: 726, y: 64, solid: false },
      ],
    },
    quartos: {
      id: 'quartos',
      name: 'Quartos',
      map: quartosMap,
      interior: true,
      props: [
        { id: 'quartos-casal', texture: 'prop-bed', x: 66, y: 28 },
        { id: 'quartos-criado-mudo', texture: 'prop-nightstand', x: 238, y: 32 },
        { id: 'quartos-guarda-roupa', texture: 'prop-wardrobe', x: 54, y: 186 },
        { id: 'quartos-hospedes', texture: 'prop-guest-bed', x: 500, y: 28 },
      ],
      doors: [
        { x: 352, y: 412, w: 64, h: 36, to: 'sala', label: 'Sala de estar' },
      ],
      decor: [
        { texture: 'decor-armchair', x: 330, y: 262 },
        { texture: 'decor-clothes', x: 210, y: 196, solid: false },
        { texture: 'decor-cobweb-r', x: 726, y: 64, solid: false },
        // Pasta espiando da gaveta forçada do criado-mudo (easter egg)
        { texture: 'prop-folder', x: 246, y: 58, solid: false, depth: 90 },
      ],
    },
    jardim: {
      id: 'jardim',
      name: 'Jardim de folhas secas',
      map: jardimMap,
      interior: false,
      props: [
        { id: 'jardim-galpao', texture: 'prop-shed', x: 88, y: 66 },
        { id: 'jardim-roseira', texture: 'prop-roses', x: 384, y: 96 },
        { id: 'jardim-arvore', texture: 'prop-tree', x: 552, y: 58 },
        { id: 'jardim-banco', texture: 'prop-bench', x: 150, y: 330 },
        { id: 'well', texture: 'prop-well', x: 318, y: 224 },
      ],
      doors: [
        { x: 352, y: 0, w: 64, h: 36, to: 'sala', label: 'Sala de estar' },
      ],
      decor: [
        { texture: 'decor-statue', x: 474, y: 132 },
        { texture: 'decor-lantern', x: 272, y: 168 },
        { texture: 'decor-lantern', x: 508, y: 298 },
        { texture: 'decor-wheelbarrow', x: 210, y: 214 },
        { texture: 'decor-gravestone', x: 436, y: 340 },
      ],
    },
  };

  const TILE_SIZE = TILE;
  const WORLD_W = 768;
  const WORLD_H = 448;

  function isSolidChar(ch) {
    return ch === '#' || ch === undefined || ch === ' ';
  }

  function tileSolidAt(map, px, py) {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    const row = map[ty];
    if (!row) return true;
    return isSolidChar(row[tx]);
  }

  function rectHitsSolid(map, x, y, w, h) {
    const points = [
      [x, y], [x + w, y], [x, y + h], [x + w, y + h],
      [x + w / 2, y], [x + w / 2, y + h], [x, y + h / 2], [x + w, y + h / 2],
    ];
    return points.some(([px, py]) => tileSolidAt(map, px, py));
  }

  return { TILE, WORLD_W, WORLD_H, rooms, rectHitsSolid, tileSolidAt };
})();
