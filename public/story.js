'use strict';

window.REDENCAO_STORY = {
  chapter: 'Capítulo I — A Mansão Albrecht',

  intro: [
    {
      title: 'Capítulo I — A Mansão Albrecht',
      text: [
        'Antes de jogar, lembre-se: este é um jogo que envolve decisões sábias e muita sorte.',
        'Talvez o destino não lhe conceda a oportunidade de redenção.',
      ],
      action: 'Começar',
    },
    {
      title: 'A missão',
      text: [
        'Douglas Silva tinha sessenta anos e contava os dias para a aposentadoria.',
        'Antes de pendurar o distintivo, aceitou uma última missão do delegado local: investigar uma antiga mansão nos arredores da cidade.',
        'O delegado não explicou por que ninguém da polícia queria entrar lá. Apenas entregou a chave e pediu que Douglas voltasse antes do anoitecer.',
      ],
    },
    {
      title: 'A mansão',
      text: [
        'A Mansão Albrecht era famosa pelos boatos de assombrações e desaparecimentos.',
        'Ninguém entrava ali há anos. As janelas permaneciam fechadas, mas as luzes às vezes acendiam sozinhas.',
        'Os moradores mais antigos diziam que a casa não estava vazia. Estava esperando.',
      ],
    },
    {
      title: 'A estrada',
      text: [
        'No caminho, a chuva começou fina. Douglas acendeu um charuto e baixou o vidro.',
        'Foi então que a enxaqueca veio. Forte, quase incapacitante, como se algo dentro da mansão já o estivesse rejeitando.',
        'Ele seguiu mesmo assim. Um trabalho é um trabalho.',
      ],
    },
    {
      title: 'A porta',
      text: [
        'Douglas estacionou diante do portão. A mansão era maior do que as fotos, e muito mais silenciosa.',
        'Ele subiu os degraus com cautela, o charuto entre os dedos, e abriu a porta devagar.',
        'A madeira rangeu. O cheiro de poeira e umidade envolveu o policial.',
        'Atrás dele, a chuva continuava. A casa, não.',
      ],
      action: 'Entrar na mansão',
    },
  ],

  roomOrder: ['sala', 'cozinha', 'banheiro', 'quartos', 'jardim'],

  // NO MERCY usa apenas 3 pistas por cômodo, sempre incluindo as pistas
  // essenciais (cofre, chave, galpão) e o esconderijo sorteado da carta.
  noMercyInteractions: {
    sala: ['sala-papeis', 'sala-cofre', 'sala-lareira'],
    cozinha: ['cozinha-gavetas', 'cozinha-mesa', 'cozinha-pia'],
    banheiro: ['banheiro-marcas', 'banheiro-armario', 'banheiro-banheira'],
    quartos: ['quartos-casal', 'quartos-guarda-roupa', 'quartos-criado-mudo'],
    jardim: ['jardim-galpao', 'jardim-roseira', 'jardim-banco'],
  },

  hub: {
    eyebrow: 'A casa',
    title: 'Mansão Albrecht',
    description:
      'A casa parece respirar. Cada porta guarda uma versão da mesma história.',
    prompt: 'Onde você quer investigar?',
    letterFound: 'A carta de Helena está com você.',
    allRooms: 'Você reuniu o que a casa permitia. O poço ainda espera.',
  },

  rooms: {
    sala: {
      name: 'Sala de estar',
      description:
        'As tábuas rangem sob cada passo. A poeira dança na luz baça. A sala conserva uma ordem estranha, como se alguém tivesse arrumado a cena antes de partir.',
      interactions: [
        {
          id: 'sala-papeis',
          label: 'Examinar os papéis da escrivaninha',
          clue: 'Confissão do marido',
          text: [
            'A escrivaninha está coberta por papéis amarelados. A caligrafia é apertada, trêmula.',
            `"Helena não está mais aqui. As pessoas já notaram o sumiço dela. Inventei que viajou às pressas para um treinamento em outra cidade..."`,
            `"Aquela discussão na cozinha passou dos limites e acabou da pior forma. Passei a noite limpando tudo. Peguei os documentos dela e joguei no fundo do velho poço desativado, lá no jardim, sob as folhas secas."`,
            `"Espero que ninguém vasculhe aquele lugar. Minha vida acabou se descobrirem."`,
            'Não há assinatura. Só uma mancha escura no canto da folha.',
          ],
        },
        {
          id: 'sala-cofre',
          label: 'Olhar atrás do quadro antigo',
          clue: 'Cofre atrás do quadro',
          text: [
            'Atrás do quadro há um cofre pequeno, encravado na parede.',
            'A fechadura está enferrujada, mas intacta. Alguém gravou uma frase na porta: "O que eu mais temia era perder o nome dela."',
          ],
          passwordHint:
            'Quem trancou o cofre sentia tanta falta da esposa que transformou o nome dela em senha.',
          openedText: [
            'O cofre emite um clique metálico.',
            'Dentro há uma certidão de casamento, documentos da mansão e uma fotografia amarelada de uma mulher de vestido claro.',
            'No verso da foto: "Helena, no jardim. Antes de tudo."',
            'Os documentos mostram que a mansão foi vendida às pressas, por uma quantia muito abaixo do valor. Quem assinou a venda não queria dinheiro. Queria desaparecer.',
          ],
        },
        {
          id: 'sala-lareira',
          label: 'Revolver as cinzas da lareira',
          clue: 'Fotografia queimada',
          text: [
            'A lareira está fria, mas o cinza ainda tem cheiro de papel queimado.',
            'Entre os restos, um pedaço de fotografia: um casal diante do poço. O rosto do homem foi queimado; o de Helena, não.',
            'Alguém tentou apagar uma história inteira, mas esqueceu o rosto dela.',
          ],
        },
        {
          id: 'sala-estante',
          label: 'Folhear os livros da estante',
          clue: 'Lenda da Esposa do Poço',
          text: [
            'A estante guarda livros de botânica, contabilidade e um volume gasto sobre lendas da região.',
            'O livro aberto marca o capítulo "A Esposa do Poço". Nas margens, alguém escreveu: "Ela nunca saiu da casa. Eu nunca deixei."',
            'Há também um livro de poesias com dedicatória: "Para Helena, que ainda acredita que o jardim pode florescer."',
          ],
        },
        {
          id: 'sala-relogio',
          label: 'Examinar o relógio e o porta-retratos',
          clue: 'Retrato do casal',
          text: [
            'O relógio de pêndulo parou às 3h17.',
            'Sobre o móvel, um porta-retratos virado para baixo. Helena e o marido no jardim. Ela sorri; ele segura o braço dela com força demais.',
            'Atrás da moldura, uma lista de compras na letra dela: pão, velas, linha. E, no fim, quase apagado: "não deixe ele saber".',
          ],
        },
      ],
    },

    cozinha: {
      name: 'Cozinha',
      description:
        'O cheiro de podridão é quase insuportável. A casa parece guardar o jantar de anos atrás, esperando que alguém se sente à mesa.',
      interactions: [
        {
          id: 'cozinha-geladeira',
          label: 'Abrir a geladeira enferrujada',
          clue: 'Gás e podridão',
          text: [
            'A porta da geladeira range. Um gás esquisito escapa e Douglas tosse forte. A enxaqueca volta, latejando atrás dos olhos.',
            'Dentro, restos pretos e um pote de vidro rachado. Nada comestível. Só o cheiro de algo que apodreceu devagar.',
          ],
        },
        {
          id: 'cozinha-gavetas',
          label: 'Vasculhar as gavetas do armário',
          clue: 'Chave enferrujada',
          effect: 'hasKey',
          text: [
            'As gavetas estão emperradas. Douglas força até que uma cede.',
            'Dentro, entre talheres e panos, uma chave enferrujada. O metal está frio e pesado.',
            'Pode ser útil mais tarde.',
          ],
        },
        {
          id: 'cozinha-mesa',
          label: 'Observar a mesa posta',
          clue: 'Mesa para dois',
          text: [
            'A mesa está posta para dois. Um prato tem restos secos; o outro está vazio, com o garfo alinhado demais.',
            'No centro, flores mortas em um vaso. A mesa parece esperar alguém que nunca voltou.',
            'Debaixo de um prato, uma anotação: "Não fale do testamento. Não hoje."',
          ],
        },
        {
          id: 'cozinha-pia',
          label: 'Examinar a pia e o ralo',
          clue: 'Aliança de Helena',
          text: [
            'A pia está manchada de ferrugem. O ralo exala um cheiro metálico.',
            'Presa na grade, uma aliança fina. Douglas a limpa com o polegar. Na parte de dentro, as iniciais "H. A.".',
            'Ao lado, um pano dobrado esconde marcas escuras que não saíram com água.',
          ],
        },
        {
          id: 'cozinha-despensa',
          label: 'Revasculhar a despensa',
          clue: 'Lista escondida',
          text: [
            'As prateleiras estão quase vazias. Latas enferrujadas, sacos mofados, uma garrafa sem rótulo.',
            'No fundo, uma lata de mantimentos tem o fundo solto. Dentro, um pedaço de papel dobrado.',
          ],
          emptyText: [
            'No fundo, uma lata de mantimentos tem o fundo solto. Dentro, só uma lista antiga: farinha, açúcar, veneno para ratos.',
            'A última palavra foi riscada com força.',
          ],
        },
      ],
    },

    banheiro: {
      name: 'Banheiros',
      description:
        'O espelho está quebrado em estrelas. A água parada no fundo da banheira reflete o teto. Aqui, o silêncio tem outro peso.',
      interactions: [
        {
          id: 'banheiro-espelho',
          label: 'Olhar atrás do espelho quebrado',
          clue: 'Espelho rachado',
          text: [
            'O espelho está rachado do centro para as bordas. O reflexo de Douglas chega partido.',
            'Atrás do vidro solto, há um vão. Alguém escondeu algo ali.',
          ],
          emptyText: [
            'Atrás do vidro solto, há um vão. Dentro, um batom velho e um bilhete: "Ele conta quantas vezes eu saio. Hoje eu não saí."',
          ],
        },
        {
          id: 'banheiro-marcas',
          label: 'Examinar as marcas nas paredes',
          clue: 'Marcas de unhas',
          text: [
            'As paredes têm marcas longas, fundas, como unhas que tentaram abrir caminho.',
            'Perto do batente, uma mão escura impressa no azulejo. Não é tinta. A casa não deixa esquecer.',
          ],
        },
        {
          id: 'banheiro-armario',
          label: 'Abrir o armário de remédios',
          clue: 'Calmantes de Helena',
          text: [
            'O armário de remédios está organizado demais. Frasco de calmantes vazio, outro pela metade.',
            'O rótulo traz o nome de Helena. A receita foi assinada muitas vezes, sempre com a mesma data rasurada.',
            'Ao lado, uma caixa de fósforos vazia. O cheiro de charuto do marido ainda está no ar.',
          ],
        },
        {
          id: 'banheiro-banheira',
          label: 'Examinar a banheira',
          clue: 'Mecha de cabelo',
          text: [
            'A banheira está seca, mas o fundo tem uma marca escura em forma de meia-lua.',
            'Presa no ralo, uma mecha de cabelo castanho. O mesmo tom da mulher da fotografia.',
            'Douglas sente o cheiro de ferro e sabão. A casa parece prender a respiração.',
          ],
        },
        {
          id: 'banheiro-pia',
          label: 'Verificar a pia e o ralo',
          clue: 'Anel de prata',
          text: [
            'A pia tem uma rachadura fina. No ralo, um anel de prata escurecido.',
            'A pedra é pequena e barata. A aliança da cozinha deve ser a outra metade.',
            'Há também um copo virado, com marcas de dedos no pó.',
          ],
        },
      ],
    },

    quartos: {
      name: 'Quartos',
      description:
        'Os corredores terminam em portas fechadas. O silêncio aqui é mais espesso, como se alguém ainda dormisse atrás de uma delas.',
      interactions: [
        {
          id: 'quartos-casal',
          label: 'Entrar no quarto do casal',
          clue: 'Quarto esvaziado',
          text: [
            'O quarto do casal está quase vazio. Nem uma foto, nem um perfume. Só o colchão sem roupa e o cheiro de poeira.',
            'As marcas no chão mostram onde ficava um armário. Alguém levou tudo às pressas, ou tentou apagar a presença de alguém.',
            'A janela está trancada por fora. Douglas sente a enxaqueca crescer.',
          ],
        },
        {
          id: 'quartos-guarda-roupa',
          label: 'Abrir o guarda-roupa',
          clue: 'Vestido rasgado',
          text: [
            'O guarda-roupa está aberto. O lado do marido ainda tem casacos, guardados com cuidado.',
            'O lado de Helena está vazio. No fundo, um vestido claro, rasgado na barra, e um sapato sem par.',
            'No bolso do casaco do marido, um recibo de passagem comprada para uma mulher. A data é dois dias depois do sumiço. O nome foi arrancado.',
          ],
        },
        {
          id: 'quartos-criado-mudo',
          label: 'Forçar a gaveta do criado-mudo',
          clue: 'Diário de Helena',
          text: [
            'O criado-mudo tem uma gaveta travada. Douglas a abre com a lâmina do canivete.',
            `Dentro, um diário sem capa. As últimas páginas foram arrancadas. A que sobrou diz: "Ele disse que eu não sairia desta casa. Que o jardim seria o meu lugar."`,
            'A caligrafia é de Helena.',
          ],
        },
        {
          id: 'quartos-hospedes',
          label: 'Examinar o quarto de hóspedes',
          clue: 'Visita da irmã',
          text: [
            'O quarto de hóspedes cheira a mofo. A cama está coberta por um lençol cinza.',
            'Sob o colchão, há um volume duro.',
          ],
          emptyText: [
            'Sob o colchão, há um livro de orações com uma foto da irmã de Helena.',
            'A foto tem uma data dois meses antes do sumiço. Ela veio visitar a mansão. E, pelo visto, não ficou muito tempo.',
          ],
        },
      ],
    },

    jardim: {
      name: 'Jardim de folhas secas',
      description:
        'O vento atravessa as folhas secas. O poço fica no centro, como uma boca fechada. A casa inteira parece observá-lo por trás das janelas.',
      interactions: [
        {
          id: 'jardim-galpao',
          label: 'Abrir o galpão do jardim',
          clue: 'Galpão trancado',
          requires: 'hasKey',
          effect: 'shedOpen',
          lockedText: [
            'A porta do galpão está trancada por um cadeado enferrujado.',
            'Talvez a chave da cozinha abra.',
          ],
          text: [
            'A chave enferrujada gira com esforço. O galpão abre.',
            'Dentro: ferramentas, um saco de cal, uma corda enrolada e um casaco masculino manchado de terra.',
            'A corda tem nós que não são de trabalho. O casaco tem o mesmo cheiro da confissão.',
            'Na parede, uma pá limpa demais para um lugar abandonado.',
          ],
        },
        {
          id: 'jardim-roseira',
          label: 'Examinar as roseiras mortas',
          clue: 'Roseira do casal',
          text: [
            'As roseiras estão mortas, mas alguém podou os galhos com cuidado.',
            'No chão, uma placa de madeira apodrecida: "H & A".',
            'Douglas se lembra da fotografia. Helena no jardim, antes de tudo.',
          ],
        },
        {
          id: 'jardim-banco',
          label: 'Olhar o banco de madeira',
          clue: 'Banco do jardim',
          text: [
            'Um banco de madeira apodrecida olha para o poço. Ao lado, marcas de charuto no chão.',
            'Nas costas de uma tábua, duas iniciais entrelaçadas. O tempo comeu parte do desenho.',
            'Aqui, alguém passou muitas noites olhando para o poço.',
          ],
        },
        {
          id: 'jardim-arvore',
          label: 'Aproximar-se da árvore antiga',
          clue: 'Iniciais na árvore',
          text: [
            'A árvore antiga tem galhos retorcidos, como dedos fechados.',
            'No tronco, um coração cravado com as mesmas iniciais. Abaixo, uma frase quase ilegível: "Até o fim."',
            'O vento vira as folhas secas. Por um instante, Douglas ouve uma risada abafada.',
          ],
        },
      ],
    },
  },

  letterHosts: {
    sala: 'sala-estante',
    cozinha: 'cozinha-despensa',
    banheiro: 'banheiro-espelho',
    quartos: 'quartos-hospedes',
    jardim: 'jardim-galpao',
  },

  letter: {
    title: 'Carta para minha irmã',
    paragraphs: [
      'Querida irmã,',
      'Se esta carta chegar às suas mãos, não acredite se disserem que eu viajei. Ele não aceita que eu vá embora. Desde que os negócios afundaram, a casa ficou menor, e ele ficou maior.',
      'Ele controla o dinheiro, os remédios, as janelas. Diz que me protege. Ontem, pela primeira vez, falou do poço sem desviar os olhos.',
      'Eu ainda guardo a chave da minha antiga vida no bolso. Mas já não sei se existe porta que ele não tenha trancado.',
      'Não venha sozinha. E não confie no silêncio desta casa.',
      'Com todo o meu amor, Helena.',
    ],
  },

  letterHint: 'Uma carta dobrada estava escondida aqui.',

  well: {
    text: [
      'Douglas se aproxima do poço com cautela. As folhas secas se acumulam ao redor da borda rachada.',
      'O cheiro de umidade e algo podre sobe das profundezas.',
      'A casa inteira fica em silêncio. Até a chuva parece esperar.',
    ],
    warning: 'Descer até o poço pode encerrar a investigação. Você ainda pode voltar.',
  },

  combat: {
    intro: [
      'De repente, uma mão gosmenta e pálida emerge do poço, agarrando a borda.',
      'Uma figura feminina sobe de forma grotesca. É Helena... ou o que restou dela.',
      'Sua pele está coberta de limo e terra, o cabelo grudado no rosto, e os olhos brilham com ódio puro.',
      'Ela emite um grito gutural, sedenta por vingança.',
      'Douglas ergue a pistola. Cada tiro pode derrubá-la. Cada golpe pode matá-lo.',
    ],
    emptyLog: 'Helena espera. O poço respira atrás dela.',
    shoot: {
      success: [
        'Você dispara. O tiro acerta em cheio o corpo podre de Helena.',
        'Ela recua gritando de dor... mas continua de pé.',
      ],
      failure: [
        'Você erra o tiro. Helena aproveita a abertura e avança.',
        'Ela te arranha com as unhas sujas e gosmentas. A dor é intensa.',
      ],
    },
    dodge: {
      success: [
        'Você se joga para o lado a tempo. Helena passa raspando.',
        'O hálito de terra passa perto do seu rosto. Você se reergue rápido.',
      ],
      failure: [
        'Você tenta esquivar, mas é lento demais.',
        'Helena te empurra com força e crava os dentes no seu ombro. O gosto metálico de sangue enche sua boca.',
      ],
    },
    // NO MERCY specific: Mendigo exploration encounters
    mendigoEncounter: {
      intro: [
        'Uma figura maltrapilha se desprende da sombra e bloqueia a passagem.',
        'O cheiro de podridão e álcool chega antes dele. Os olhos brilham com fome e raiva.',
        'Ele não diz nada. Apenas avança, arrastando os pés sobre as tábuas.',
      ],
      victory: [
        'O mendigo tomba entre as tábuas, ofegante, e para de se mover.',
        'A casa volta a ficar em silêncio. Por enquanto.',
        'Douglas limpa o suor do rosto e continua a investigação.',
      ],
    },
    // NO MERCY specific: Mendigo combat texts
    mendigo: {
      shoot: {
        success: [
          'Você dispara. O tiro acerta o mendigo em cheio.',
          'Ele cai gemendo, mas o ódio nos olhos não morre.',
        ],
        failure: [
          'Você erra o tiro. O mendigo ri com a boca podre.',
          'Ele avança cambaleando, unhas sujas estendidas.',
        ],
      },
      attack: {
        success: [
          'O mendigo salta sobre você com fúria animalesca!',
          'Unhas sujas rasgam sua pele. O cheiro de podridão é sufocante.',
        ],
        failure: [
          'O mendigo tropeça nos próprios trapos.',
          'Ele rosna de frustração, preparando novo ataque.',
        ],
      },
    },
    victory: [
      'Com o último tiro, Helena finalmente cai de joelhos.',
      'Seu corpo treme, o ódio se esvai dos olhos, e ela desaba no chão coberto de folhas.',
      'Douglas, ofegante e ferido, observa o corpo imóvel.',
      'A vingança de Helena chegou ao fim... mas a verdade sobre a mansão ainda permanece.',
      'Anos depois, os desaparecimentos realmente pararam...',
      `Douglas, por dentro, não culpa aquela mulher por tudo o que fez. Ninguém culpa.`,
      `O caso da "Esposa do Poço" permanece famoso até os dias de hoje...`,
      'O paradeiro do marido continua desconhecido e omitido.',
    ],
    defeat: [
      'Helena te derruba no chão. Suas mãos gosmentas apertam seu pescoço com força sobrenatural.',
      'A visão de Douglas escurece enquanto a criatura emite um riso distorcido e molhado.',
      'Sua última sensação é o cheiro de terra úmida e morte...',
      'Douglas Silva não conseguiu se salvar dessa vez.',
    ],
    letterEpilogue:
      'Na carta, Helena dizia que não acreditava mais em saídas. Douglas guarda o papel no casaco. É a única coisa que restou para contar por ela.',
    defeatLetterEpilogue:
      'A carta escapa do bolso de Douglas e se perde entre as folhas secas. Ninguém saberá o que Helena tentou dizer.',
  },

  ending: {
    victoryTitle: 'Vitória',
    defeatTitle: 'Derrota',
    victoryEyebrow: 'O caso da Esposa do Poço',
    defeatEyebrow: 'A mansão cobrou seu preço',
    final: 'FIM.',
  },
};
