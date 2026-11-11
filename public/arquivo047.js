'use strict';

/* ARQUIVO 047 — campanha paralela de Redenção: antes dos acontecimentos principais,
   o jogador é Albrecht, o marido de Helena, e vive o cotidiano da Mansão Albrecht
   no outono de 1998 enquanto o esquema do Colégio Estadual Presidente Kennedy
   ainda está em funcionamento.

   Convenções (compartilhadas com story.js): cada interação declara `chapter`;
   só é examinável quando o capítulo desbloqueado. As exigências de cada capítulo
   estão em `chapterRequirements`. Nada aqui é pista da campanha principal —
   o Arquivo 047 aprofunda, nunca contradiz. */
window.ARQUIVO047_STORY = {
  campaign: 'arquivo047',
  chapter: 'ARQUIVO 047',
  chapters: [
    { n: 1, name: 'A Casa em Ordem' },
    { n: 2, name: 'Correspondências' },
    { n: 3, name: 'O Esquema' },
    { n: 4, name: 'O Que Nem Ela Sabe' },
    { n: 5, name: 'A Última Correspondência' },
  ],
  wellLabel: 'Descer até o poço',

  intro: [
    {
      title: 'ARQUIVO 047',
      text: [
        'Outono de 1998. Mansão Albrecht, nos arredores da cidade.',
        'Você é o dono da casa. Sempre foi.',
        'A fortuna da família ruiu há anos, mas o acordo entre você e Helena continua de pé.',
      ],
      action: 'Começar',
    },
    {
      title: 'A rotina',
      text: [
        'Os dias aqui têm um ritual. O café às seis, o correio às nove, o charuto na varanda às sete.',
        'Helena seleciona. Você registra. Ninguém pergunta de onde vêm os envelopes.',
        'Ninguém pergunta por que uma mulher jovem aceitaria viver numa casa que parece prender a respiração.',
      ],
    },
    {
      title: 'O acordo',
      text: [
        'Faz quatro anos que o arquivo funciona.',
        'Documentos chegam sem remetente. Saem com um carimbo: ARQUIVO Nº 047 — um número, não um caso.',
        'Vocês nunca falam sobre o conteúdo. Combinaram assim na primeira noite, diante de uma garrafa de vinho que ninguém terminou.',
      ],
    },
    {
      title: 'Helena',
      text: [
        'Helena acorda antes de você. Deixa o pão na mesa, o café coado, a vida arrumada.',
        'Às vezes você a encontra no jardim, podando roseiras mortas como se fossem um compromisso formal.',
        'Ela sorri. Você nunca sabe para quem.',
      ],
      action: 'Entrar na casa',
    },
  ],

  // Exigências de cada capítulo. Tudo fora desta lista é opcional e pode ser examinado livremente.
  chapterRequirements: {
    1: ['sala-relogio', 'cozinha-mesa', 'quartos-casal', 'jardim-banco'],
    2: ['sala-papeis', 'quartos-criado-mudo', 'quartos-hospedes', 'banheiro-armario', 'jardim-arvore'],
    3: ['sala-estante', 'cozinha-gavetas', 'sala-cofre', 'quartos-guarda-roupa', 'cozinha-despensa', 'jardim-galpao'],
    4: ['banheiro-espelho', 'sala-lareira', 'banheiro-marcas', 'banheiro-pia'],
    5: ['jardim-well'],
  },

  roomOrder: ['sala', 'cozinha', 'banheiro', 'quartos', 'jardim'],

  rooms: {
    sala: {
      name: 'Sala de estar',
      description:
        'A rotina desta sala nunca vacila. Helena a arruma antes do café; você a desarruma durante o dia.',
      interactions: [
        {
          id: 'sala-relogio',
          label: 'Examinar o relógio e o porta-retratos',
          clue: 'O relógio parou em 3h17',
          chapter: 1,
          text: [
            'O relógio de pêndulo marca 3h17. Sempre. Você desistiu de mandar consertar; é mais um hábito da casa do que um defeito.',
            'Sobre o móvel, o porta-retratos de vocês no jardim. Helena sorrindo. Você com a mão no ombro dela — segura demais, como sempre.',
            'No verso, na letra dela: "Para quando você esquecer por que aceitou."',
          ],
        },
        {
          id: 'sala-papeis',
          label: 'Examinar os papéis da escrivaninha',
          clue: 'ARQUIVO Nº 047',
          chapter: 2,
          text: [
            'A escrivaninha é o seu posto. Seis pastas idênticas, todas sem nome. Você sabe o conteúdo de cada uma de cor.',
            'A pilha do meio prende sua atenção: cartas de uma mesma instituição, timbre gasto — COLÉGIO ESTADUAL PRESIDENTE KENNEDY.',
            'A última é datada de 17 de agosto. Um carimbo quase apagado: ARQUIVO Nº 047.',
            'Você dobra a carta de volta ao envelope. Helena não pode saber que você leu. Helena também não pode saber que você não leu.',
          ],
        },
        {
          id: 'sala-cofre',
          label: 'Olhar atrás do quadro antigo',
          clue: 'O inventário do cofre',
          chapter: 3,
          text: [
            'Atrás do quadro há um cofre pequeno, encravado na parede. Sua letra, cravada no metal: "O que eu mais temia era perder o nome dela."',
            'A fechadura está intacta. Só você sabe o que ela esconde — e só uma palavra a abre.',
          ],
          passwordHint:
            'Quem trancou este cofre sentia tanta falta da esposa que transformou o nome dela em senha.',
          openedText: [
            'O cofre emite um clique metálico.',
            'Dentro: a certidão de casamento, a escritura da mansão, uma fotografia amarelada de Helena no jardim. Antes de tudo.',
            'E um inventário datilografado — OBJETOS ENCAMINHADOS À INSTITUIÇÃO: uma caixa de fotografias, três livros de registros, um relógio de parede, doze documentos sem identificação, uma fotografia de turma.',
            'No rodapé, um carimbo: ARQUIVO Nº 047 — DATA DE ARQUIVAMENTO: 17/08/1998.',
            'Você sabe quem escreveu este inventário. O que você nunca soube é por que a fotografia de turma era o item mais vigiado de todos.',
          ],
        },
        {
          id: 'sala-lareira',
          label: 'Revolver as cinzas da lareira',
          clue: 'O recorte de março de 1998',
          chapter: 4,
          text: [
            'A lareira está fria, mas o cinza ainda tem cheiro de papel queimado. Não é de hoje.',
            'Entre os restos: um pedaço de fotografia — a mesma turma do Presidente Kennedy, mas de outro ano. E um recorte de jornal: "Menino desaparece em excursão escolar; investigação arquivada."',
            'O recorte é de março de 1998.',
            'Você não queimou estas coisas. Helena queimou. E ela não te contou — porque você também tinha coisas que não contou a ela.',
          ],
        },
        {
          id: 'sala-estante',
          label: 'Folhear os livros da estante',
          clue: 'O livro de contabilidade',
          chapter: 3,
          text: [
            'Contabilidade, botânica, um volume gasto sobre lendas da região. Nada que denuncie quatro anos de arquivo clandestino.',
            'Mas num livro de contabilidade há uma página dobrada: um carimbo quase apagado, ARQUIVO Nº 047, e uma relação incompleta — fotografias, registros, um relógio, doze documentos sem nome.',
            'Ao lado, uma anotação a lápis, a letra tremida: "Recebemos mais do que combinamos."',
          ],
        },
      ],
    },

    cozinha: {
      name: 'Cozinha',
      description:
        'O café da manhã às seis. A mesa posta para dois. A despensa trancada por dentro do seu silêncio.',
      interactions: [
        {
          id: 'cozinha-geladeira',
          label: 'Abrir a geladeira',
          clue: 'Comida de verdade, por enquanto',
          chapter: 1,
          text: [
            'Comida de verdade. Ovos, queijo, um pote do doce que só você come.',
            'Helena cozinha como quem cumpre um dever — bem demais para ser só hábito, bem pior para ser só amor.',
          ],
        },
        {
          id: 'cozinha-gavetas',
          label: 'Vasculhar as gavetas do armário',
          clue: 'A chave enferrujada',
          chapter: 3,
          effect: 'hasKey',
          text: [
            'Entre talheres e panos há uma chave enferrujada. Você conhece esta chave — é do seu pai, do galpão do jardim.',
            'Helena nunca soube que você a guardava aqui. Nem você sabia que ela suspeitava onde você a escondia.',
            'A confiança nesta casa é uma moeda gasta dos dois lados.',
          ],
        },
        {
          id: 'cozinha-mesa',
          label: 'Observar a mesa posta',
          clue: 'Ela triava até o seu correio',
          chapter: 1,
          text: [
            'A mesa está posta para dois, como todas as manhãs. Um prato de cada lado. Flores no centro — hoje, ainda frescas.',
            'Debaixo do seu prato, o correio da manhã. Helena o tria antes que você acorde: contas, catálogos, dois envelopes lisos, sem remetente.',
            'Pela janela da cozinha, vocês trocam um olhar. Ela sorri e mexe o café.',
          ],
        },
        {
          id: 'cozinha-pia',
          label: 'Examinar a pia e o sifão',
          clue: 'O envelope lacrado na pia',
          chapter: 2,
          text: [
            'A pia está limpa demais para uma casa que cozinha pouco. Há cera de vedação derretida perto do sifão — e um pano com cheiro de papel úmido.',
            'Alguém lacrou um envelope aqui. Não foi você.',
          ],
        },
        {
          id: 'cozinha-despensa',
          label: 'Revasculhar a despensa',
          clue: 'Os envelopes vazios',
          chapter: 3,
          text: [
            'Latas enferrujadas, sacos mofados. No fundo, uma lata de mantimentos com o fundo solto.',
            'Dentro: um maço de envelopes vazios — todos com o mesmo carimbo: ARQUIVO Nº 047.',
            'Você conta treze maços. Treze remessas que saíram desta casa sem que você soubesse exatamente para onde iam.',
            'Você assinou doze. A décima terceira, não. A décima terceira alguém assinou no seu lugar.',
          ],
        },
      ],
    },

    banheiro: {
      name: 'Banheiros',
      description:
        'O espelho inteiro, ainda. A água parada, ainda não. Esta casa guarda o que você lava aqui.',
      interactions: [
        {
          id: 'banheiro-espelho',
          label: 'Olhar atrás do espelho',
          clue: 'O seu esconderijo, devolvido',
          chapter: 4,
          text: [
            'Atrás do vidro solto há um vão estreito. Alguém escondeu algo ali. Você. Há três anos.',
            'Um embrulho oleado: um cheque em branco da conta da mansão, e um bilhete seu — "Se algo acontecer comigo, isto compra o silêncio de quem devia."',
            'Você não lembrava onde o escondeu. Helena encontrou semanas atrás — e devolveu ao mesmo lugar.',
            'Ela nunca disse nada. Deixou você esquecer de propósito. Para ver o que você faria se lembrasse sozinho.',
          ],
        },
        {
          id: 'banheiro-marcas',
          label: 'Examinar as marcas nas paredes',
          clue: 'O canto que ela pintou em torno',
          chapter: 4,
          text: [
            'As marcas na parede do fundo não são de unhas — você sempre soube. São de ferro. De um móvel que ficava aqui.',
            'Só que as marcas sobem mais alto do que qualquer móvel de banheiro. Algo — ou alguém — foi arrastado para cá e ficou preso.',
            'O banheiro foi repintado há anos. Exceto este canto. Helena nunca explica por que pintou tudo menos o canto.',
            'Você também nunca pediu explicação.',
          ],
        },
        {
          id: 'banheiro-armario',
          label: 'Abrir o armário de remédios',
          clue: 'Os remédios e a insônia de Helena',
          chapter: 2,
          text: [
            'Calmantes de Helena — um frasco vazio, outro pela metade. Mesma farmácia, mesma data rasurada.',
            'Atrás deles, uma receita sem assinatura. Só uma linha escrita à mão: "Para dormir. Para não ver."',
            'Você devolve tudo no lugar. Ela sabe que você viu. Sempre soube que você veria.',
          ],
        },
        {
          id: 'banheiro-banheira',
          label: 'Examinar a banheira',
          clue: 'O quarto de hora da cola',
          chapter: 3,
          text: [
            'A banheira nunca é usada. Helena toma banhos frios — diz que água quente é luxo de quem tem tempo e culpa.',
            'No fundo, marcas de cola e de papel molhado. Aqui, documentos foram colados, selados e lavados dos dedos.',
            'Debaixo do ralo, uma tina de plástico guarda recortes irreconhecíveis. Papel de gente que precisa ser esquecido.',
          ],
        },
        {
          id: 'banheiro-pia',
          label: 'Verificar a pia e o ralo',
          clue: 'O par de alianças',
          chapter: 4,
          text: [
            'No ralo, um anel de prata. O par do dela — a aliança que ela parou de usar semanas atrás.',
            'A sua aliança ainda está no seu dedo. Você a gira nervoso, como sempre.',
            'Dezoito anos de casados. Dois anéis. Um no ralo, um no seu dedo.',
          ],
        },
      ],
    },

    quartos: {
      name: 'Quartos',
      description:
        'O quarto do casal, em ordem. O quarto de hóspedes, vazio há anos. O criado-mudo, trancado como sempre.',
      interactions: [
        {
          id: 'quartos-casal',
          label: 'Entrar no quarto do casal',
          clue: 'A ordem como hábito, não como paz',
          chapter: 1,
          text: [
            'O quarto está em ordem. Ordem demais. Helena arruma como quem apaga pegadas.',
            'O lado dela: travesseiro liso, perfume de vetiver, um livro de poesias sem marcação. O seu lado: jornal dobrado, o cinzeiro quase limpo.',
            'Tudo no lugar. Nada fora do lugar. É assim que você sabe que ela sabe sobre você.',
          ],
        },
        {
          id: 'quartos-guarda-roupa',
          label: 'Abrir o guarda-roupa',
          clue: 'A passagem sem nome',
          chapter: 3,
          text: [
            'O seu lado: casacos, o chapéu, a vida pesando. O lado de Helena: vazio — exceto por um vestido claro rasgado na barra.',
            'No bolso do seu casaco — o que você usa no correio — há um recibo de passagem de ônibus. Ida para uma cidade cuja estação você não conhece.',
            'A data é de dois dias atrás. O nome dela foi arrancado do canhoto.',
            'Você fecha o guarda-roupa devagar. A madeira não denuncia ninguém nesta casa.',
          ],
        },
        {
          id: 'quartos-criado-mudo',
          label: 'Forçar a gaveta do criado-mudo',
          clue: 'O diário sem capa',
          chapter: 2,
          text: [
            'Você prometeu não abrir esta gaveta. Faz anos.',
            'Numa madrugada, com a casa dormindo, você cede e força o encaixe com a lâmina do canivete.',
            'Dentro: um diário sem capa. As últimas páginas foram arrancadas. A que sobrou diz: "Ele disse que eu não sairia desta casa. Que o jardim seria o meu lugar."',
            'A caligrafia é de Helena.',
            'Você fecha a gaveta devagar. A madeira não range. Esta casa, pelo menos, respeita segredos.',
          ],
        },
        {
          id: 'quartos-hospedes',
          label: 'Examinar o quarto de hóspedes',
          clue: 'A fotografia de turma',
          chapter: 2,
          text: [
            'O quarto de hóspedes nunca recebe hóspedes. Helena diz que é porque nunca precisamos.',
            'Sob o colchão há um livro de orações de capa dura — e, dentro dele, um envelope selado sem remetente.',
            'Dentro: uma fotografia de turma em preto e branco. Vinte e tantos rostos diante de um prédio escolar. A um deles, alguém riscou o rosto com força.',
            'No verso, em caneta vermelha: "Presidente Kennedy — 1998. 5º da esquerda, fileira do meio. Ele não devia existir."',
          ],
        },
      ],
    },

    jardim: {
      name: 'Jardim de folhas secas',
      description:
        'As folhas secas nunca param de cair. O poço fica no centro — como sempre ficou.',
      interactions: [
        {
          id: 'jardim-galpao',
          label: 'Abrir o galpão do jardim',
          clue: 'As caixas do Presidente Kennedy',
          chapter: 3,
          requires: 'hasKey',
          effect: 'shedOpen',
          lockedText: [
            'A porta do galpão está trancada por um cadeado enferrujado.',
            'Talvez a chave que seu pai lhe deu — aquela que você guarda na cozinha — abra isto.',
          ],
          text: [
            'A chave do seu pai gira com esforço. O galpão abre.',
            'Dentro: caixas etiquetadas com um timbre gasto — COLÉGIO ESTADUAL PRESIDENTE KENNEDY. Caixas vazias. Caixas que já foram.',
            'Na parede, uma lista a lápis: "12 entregues. 1 retido." Abaixo, outra frase, de outra mão — a de Helena: "O que retivemos não é nosso. Nunca foi."',
            'Na bancada, um envelope grande, selado, sem remetente. Helena ainda não o despachou.',
            'Você não toca nele. Fica ali, selado, esperando uma decisão que você ainda não tomou.',
          ],
        },
        {
          id: 'jardim-roseira',
          label: 'Examinar as roseiras mortas',
          clue: 'Ela poda o que já morreu',
          chapter: 1,
          text: [
            'As roseiras morreram no inverno. Helena poda mesmo assim, toda semana, com as tesouras de poda do seu pai.',
            'No chão, uma plaquinha de madeira apodrecida: "H & A". Ela plantou no primeiro ano. Já não lembra.',
            'Você cheira o pó das pétalas secas. É o mesmo cheiro do primeiro ano — só que agora você sabe o peso dele.',
          ],
        },
        {
          id: 'jardim-arvore',
          label: 'Aproximar-se da árvore antiga',
          clue: 'Até o fim',
          chapter: 2,
          text: [
            'No tronco, o coração cravado há anos: H & A. "Até o fim."',
            'Você passa os dedos sobre as letras. Helena escreveu "até o fim" quando vocês eram jovens — e a palavra fim ainda era só uma palavra.',
            'A casca cresceu sobre as bordas do entalhe. A árvore está engolindo a promessa.',
          ],
        },
        {
          id: 'jardim-banco',
          label: 'Olhar o banco de madeira',
          clue: 'A promessa da gaveta',
          chapter: 1,
          text: [
            'Dois cafés sobre a borda do banco — os de vocês, restos de ontem. Marcas de charuto no chão, do seu costume de pensar o dia antes de aturá-lo.',
            'Nas costas da tábua, as iniciais de vocês entrelaçadas em tinta apagada. H & A.',
            'Foi aqui que ela pediu que você jamais abrisse a gaveta do criado-mudo. Você disse que não abriria.',
          ],
        },
        {
          id: 'jardim-well',
          label: 'Descer até o poço',
          clue: 'O poço nunca foi só um poço',
          chapter: 5,
          text: [
            'As folhas secas se acumulam ao redor da borda rachada.',
          ],
        },
      ],
    },
  },

  well: {
    text: [
      'O poço fica no centro do jardim, como sempre ficou. Uma boca fechada que a casa inteira parece observar.',
      'Você encosta a lanterna na borda e olha para dentro. O cheiro de pedra úmida sobe devagar.',
      'Lá no fundo, preso a uma pedra solta, há algo embrulhado em lona oleada. Alguém desceu isto aqui — e desceu com cuidado.',
    ],
    clue: 'O poço nunca foi só um poço',
  },

  finalLetter: {
    kicker: 'Correspondência sob a pedra',
    title: 'A última carta',
    intro: [
      'Você desce com a lanterna presa à cintura. A lona oleada está mais pesada do que parece — e intacta, como se o poço a tivesse protegido por anos.',
      'Lá em cima, Helena acende a luz da varanda. Ela não desce para ver. Algumas entregas são feitas em silêncio.',
    ],
    body: [
      'Albrecht —',
      'Se esta carta chegou até você, é porque eu não voltei da entrega. Você sabe que sempre fui eu quem escolhia o que sobrevivia. Os treze volumes subiram desta casa; esta, não.',
      'A pasta amarela — a que o inventário chama de 047 — não é sobre os clientes. É sobre 1997. Sobre um menino que existiu num registro e nunca existiu em mais lugar nenhum.',
      'Nós não apagamos ninguém. Apenas recebemos o que apagaram, e guardamos porque sua família sempre guardou tudo. O Presidente Kennedy recebeu doze vezes o que não devia guardar. A décima terceira vez — a pasta amarela — eu retive. Você guarda as suas coisas; eu retive a minha.',
      'Ela está no criado-mudo, atrás do meu diário. Sempre esteve. Se alguém procurasse por 047, procuraria na estante, no cofre, no galpão. Ninguém procura na gaveta de uma mulher de quem a casa inteira desconfia.',
      'Não a abra. Não a destrua. E, se algum dia vier outra pessoa a esta casa — um estranho com enxaqueca e charuto — deixe que ele a encontre do jeito que eu deixei para você.',
      'Ele precisará saber que a casa guardou tudo. Até o que não era nosso.',
      '— H.',
    ],
    outro: [
      'Você dobra a carta e a guarda no bolso interno do casaco. O bolso do coração.',
      'A chuva começa — ou sempre esteve caindo, e você só agora reparou.',
      'A mansão não guarda assombrações. Guarda correspondência.',
    ],
  },

  ending047: {
    eyebrow: 'ARQUIVO 047 — Encerrado',
    title: 'FIM',
    paragraphs: [
      'Você sobe as escadas devagar. Helena está na varanda, de costas, olhando o jardim. Você não conta a ela o que encontrou — ela sabe. Sempre soube.',
      'A casa não mudou. O café às seis, o correio às nove, o charuto às sete. Só que agora você sabe o peso de cada envelope.',
      'Anos depois, um homem de sessenta anos atravessará o portão desta casa com o cheiro de chuva na roupa e uma enxaqueca que ele jura reconhecer. Ele encontrará a pasta amarela no criado-mudo. Ele pensará que está descobrindo a verdade sozinho.',
      'Ninguém nunca esteve sozinho nesta casa.',
      'O poço continua desativado. O nome de vocês continua numa roseira. E o 047 continua esperando por quem souber ler.',
    ],
  },

  chapterCompletions: {
    1: {
      eyebrow: 'ARQUIVO 047 — Capítulo I concluído',
      title: 'A casa em ordem',
      paragraphs: [
        'A rotina segue como sempre. Café às seis, correio às nove, charuto às sete.',
        'Mas pesos que você não mede começam a pesar: os envelopes sem remetente. O sorriso de Helena. A gaveta que você prometeu não abrir.',
        'O que esta casa guarda, ela guarda há anos. E você ainda não olhou para o lugar certo.',
      ],
    },
    2: {
      eyebrow: 'ARQUIVO 047 — Capítulo II concluído',
      title: 'Correspondências',
      paragraphs: [
        'Agora você sabe: os envelopes não são contas atrasadas. Vêm de um lugar com nome — e com um número.',
        'E Helena guarda coisas que nem você conhece.',
        'O esquema tem endereço. E tem número: 047.',
      ],
    },
    3: {
      eyebrow: 'ARQUIVO 047 — Capítulo III concluído',
      title: 'O esquema',
      paragraphs: [
        'Agora você entende o desenho inteiro: a casa recebia, Helena escolhia, você registrava — e o Presidente Kennedy recebia o que ninguém devia ver.',
        'Quatro anos de silêncio comprado. E no centro de tudo, um número: 047.',
        'Mas há algo neste esquema que nem você nem Helena sabem. Nem os dois juntos.',
      ],
    },
    4: {
      eyebrow: 'ARQUIVO 047 — Capítulo IV concluído',
      title: 'O que nem ela sabe',
      paragraphs: [
        'Vocês não eram parceiros. Eram cúmplices — e cúmplices não confiam; apenas se equilibram.',
        'Helena escondeu de você o recorte. Você escondeu de Helena o cheque. Nenhum dos dois contou ao outro por que a fotografia de turma era a peça mais perigosa do arquivo.',
        'Só falta o que ninguém leu. Nem ela, nem você.',
      ],
    },
  },

  // Helena — presente na sala (cap. 1), na cozinha (cap. 2), no quarto do casal (cap. 3)
  // e no jardim (cap. 4). Ausente no cap. 5: a casa, finalmente, em silêncio.
  npcs: {
    1: { sala: [{ id: 'helena', name: 'Helena', texture: 'helena', x: 560, y: 150, scale: 2.1 }] },
    2: { cozinha: [{ id: 'helena', name: 'Helena', texture: 'helena', x: 468, y: 152, scale: 2.1 }] },
    3: { quartos: [{ id: 'helena', name: 'Helena', texture: 'helena', x: 340, y: 128, scale: 2.1 }] },
    4: { jardim: [{ id: 'helena', name: 'Helena', texture: 'helena', x: 430, y: 132, scale: 2.1 }] },
    5: {},
  },

  npcDialogs: {
    1: {
      subtitle: 'A esposa',
      text: [
        'Helena está na sala com a correspondência da manhã. Ela vira uma folha, empilha com cuidado, e só então olha para você.',
        '"Você dormiu bem? A enxaqueca não voltou, voltou?"',
      ],
      question: {
        label: 'Perguntar sobre os envelopes sem remetente',
        subtitle: 'Ela não muda de expressão',
        answer: [
          '"São coisas de família, Albrecht. A casa sempre guardou coisas de família."',
          'Ela volta para os papéis. "Café na mesa."',
        ],
      },
    },
    2: {
      subtitle: 'A esposa',
      text: [
        '"Você forçou a gaveta." — não é uma pergunta.',
        '"Não mente para mim nesta casa, Albrecht. A casa escuta."',
        'Ela aperta a louça com mais força do que o prato exige.',
      ],
      question: {
        label: 'Perguntar sobre o Presidente Kennedy',
        subtitle: 'Ela erra o segundo exato',
        answer: [
          '"O colégio? Que colégio?"',
          'É a primeira vez que você a vê errar um segundo tão preciso.',
        ],
      },
    },
    3: {
      subtitle: 'A esposa',
      text: [
        '"Você esteve no galpão."',
        'Ela não desvia os olhos enquanto dobra o vestido rasgado — sem pressa, sem tremor.',
        '"Você leu a lista, leu? Então sabe que estamos quites com o mundo. Eu escolho as peças brancas. Você registra as pretas. Ninguém precisa saber mais."',
      ],
      question: {
        label: 'Perguntar sobre a passagem de ônibus',
        subtitle: 'O guarda-roupa fecha com um clique',
        answer: [
          '"São para uma entrega. Mar vermelho. Você não gosta de vermelho."',
          'Ela fecha o guarda-roupa. O clique da madeira soa como um ponto final.',
        ],
      },
    },
    4: {
      subtitle: 'A esposa',
      text: [
        'Helena poda as roseiras mortas em silêncio. Por alguns segundos, nenhum de vocês fala.',
        '"Você sabe, Albrecht, às vezes penso que esta casa foi feita para arquivar pessoas."',
        'Ela corta um galho que já estava cortado.',
      ],
      question: {
        label: 'Perguntar o que ela sabe que eu não sei',
        subtitle: 'Ela ri baixo, sem humor',
        answer: [
          '"Tudo."',
          '"É essa a única diferença entre nós dois. É também a única coisa em que somos iguais."',
        ],
      },
    },
    5: null,
  },
};
