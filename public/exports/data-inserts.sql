-- ============================================
-- VIBE CLASS - Data Export (Transcripts & Teaching Moments)
-- Run AFTER schema + base data inserts
-- ============================================

-- UPDATE Video 1: Introdução (transcript + teaching_moments)
UPDATE public.videos SET
transcript = E'0:05\nagora. Quantas estão abertas? Olhe para\n0:08\no seu celular. Quantos aplicativos estão\n0:11\ninstalados? Centenas. Mas a verdade é\n0:15\nque o mundo digital virou um cemitério\n0:17\nde boas intenções. Por quê? Porque na\n0:20\núltima década nós ensinamos as pessoas a\n0:22\nprogramar, mas esquecemos de ensiná-las\n0:25\na sentir. Hoje não vamos falar de\n0:28\nPython, não vamos falar de APIs\n0:30\ncomplexas. Se você veio aqui esperando\n0:33\nver linhas de código nesta primeira\n0:35\naula, você pode fechar o vídeo. O código\n0:38\né a parte fácil. A inteligência\n0:41\nartificial escreve código melhor e mais\n0:43\nrápido do que qualquer humano. O código\n0:46\nvirou commodity, mas existe algo que a\n0:49\nIA não tem julgamento.\n0:53\nVocê não está aqui para ser um usuário\n0:55\nde ferramentas. Você não está aqui para\n0:57\nser um digitador de prompts. Você está\n1:00\naqui para ser um intérprete de dor. Um\n1:03\nproduto de tecnologia não é um amontoado\n1:05\nde funções. É uma ponte, uma ponte\n1:08\ninvisível entre a dor de alguém e a sua\n1:11\npaz. Você criou um produto. Nós estamos\n1:14\nvivendo a maior mudança da nossa geração\n1:17\ncom a IA. A barreira de construção caiu\n1:20\npara zero. Mas isso cria um perigo. A\n1:23\ninundação de lixo digital. Como você se\n1:25\ndestaca? Tendo a sensibilidade que a\n1:28\nmáquina não tem. Código é commodity. O\n1:31\nseu julgamento é o ativo raro. Vamos\n1:34\ncomeçar.',
teaching_moments = '[
  {
    "timestamp_seconds": 45,
    "topic": "A Inteligência Artificial e a Commoditização do Código",
    "difficulty_level": "intermediário",
    "estimated_discussion_minutes": 2,
    "key_insight": "A IA torna a escrita de código uma commodity, mudando o foco do valor no desenvolvimento de tecnologia. O valor não está mais na execução mecânica, mas em algo que a IA não pode replicar.",
    "questions_to_ask": ["O que o palestrante quer dizer com ''o código virou commodity''?", "Se o código é fácil e a IA o escreve melhor, onde você acha que o ser humano agrega valor no desenvolvimento de produtos digitais hoje?"],
    "discussion_points": ["Discutir exemplos de como a IA já está automatizando tarefas de codificação (ex: GitHub Copilot, ChatGPT para snippets).", "Refletir sobre as implicações dessa mudança para quem está aprendendo a programar ou já atua na área."],
    "teaching_approach": "Iniciar uma discussão reflexiva. Peça aos alunos para considerarem suas próprias experiências ou percepções sobre o papel da programação. O tom deve ser provocativo e encorajador à reflexão."
  },
  {
    "timestamp_seconds": 100,
    "topic": "O Propósito do Desenvolvedor: Intérprete de Dor e Ponte para Paz",
    "difficulty_level": "intermediário",
    "estimated_discussion_minutes": 3,
    "key_insight": "O verdadeiro papel de quem cria tecnologia não é ser um executor técnico (usuário de ferramentas/digitador de prompts), mas sim um ''intérprete de dor'', conectando problemas reais a soluções que trazem ''paz''.",
    "questions_to_ask": ["O que significa ser um ''intérprete de dor'' na criação de um produto digital?", "Dê um exemplo prático de um produto que você usa que é uma ''ponte invisível'' para uma dor sua.", "Como essa visão de ''intérprete de dor'' difere da ideia mais tradicional de um programador ou desenvolvedor?"],
    "discussion_points": ["Explorar a diferença entre ''funções'' de um aplicativo e a ''ponte'' que ele representa.", "Conectar com a ideia de ''design thinking'' e ''empatia'' no desenvolvimento de produtos."],
    "teaching_approach": "Incentivar os alunos a pensar em exemplos concretos e a compartilhar suas experiências. O tom deve ser inspirador."
  },
  {
    "timestamp_seconds": 133,
    "topic": "O Desafio da Inundação de Lixo Digital e o Valor do Julgamento Humano",
    "difficulty_level": "avançado",
    "estimated_discussion_minutes": 2,
    "key_insight": "A facilidade de construção de produtos com IA leva a um ''cemitério de boas intenções'' e uma ''inundação de lixo digital''. O diferencial humano reside na sensibilidade e no julgamento que a máquina não possui.",
    "questions_to_ask": ["Considerando que ''a barreira de construção caiu para zero'' com a IA, como podemos evitar a ''inundação de lixo digital'' mencionada pelo palestrante?", "O que o palestrante quer dizer com ''o seu julgamento é o ativo raro''?"],
    "discussion_points": ["Discutir as consequências da baixa barreira de entrada na criação de produtos.", "Explorar as características do ''julgamento'' que a IA não tem: ética, empatia, compreensão contextual."],
    "teaching_approach": "Propor um desafio aos alunos: como eles se destacariam nesse cenário? O tom deve ser desafiador, mas também encorajador."
  }
]'::jsonb
WHERE id = '1dc10fa2-a5d0-4c7c-8ebc-413f282460da';

-- UPDATE Video 2: Aula 1 - Descobrindo a Dor (transcript + teaching_moments)
UPDATE public.videos SET
transcript = E'0:00\nVamos começar o nosso primeiro mergulho.\n0:02\nO erro fatal que mata 90% das ideias não\n0:06\né a falta de tecnologia, é a paixão pela\n0:09\nsolução. Você tem uma ideia, desenha,\n0:12\nmonta e ninguém usa. Por quê? Porque\n0:15\nvocê construiu uma solução procurando um\n0:18\nproblema. Na 12 Brain, eu quero que você\n0:21\nse apaixone pelo problema. Você é um\n0:23\ndetetive. Sua lupa é a empatia. Para\n0:26\nentender isso, vamos usar a analogia de\n0:29\nvitaminas e analgésicos. Vitaminas são\n0:33\nnice to have. É legal tomar, mas se você\n0:36\nesquecer, a vida segue. Analgésicos são\n0:40\nmust have. Se você acorda às 3 da manhã\n0:43\ncom dor de dente, você vai à farmácia de\n0:45\npijama. Você paga o preço que for. A dor\n0:48\né urgente. Muitos acham que precisam\n0:51\ncriar o próximo Uber. Esqueçam isso. Às\n0:54\nvezes o melhor analgésico é invisível.\n0:57\nPense num grupo de WhatsApp de\n0:59\nvoluntários da igreja. Tentar marcar uma\n1:02\nescala ali é um inferno. Se você cria um\n1:04\nagente simples que organiza a lista\n1:06\nsozinho no privado, você criou um\n1:08\nanalgésico. Você removeu o caos. Outro\n1:12\nexemplo, o mundo corporativo está cheio\n1:15\nde dor passiva. Sabe aquele processo\n1:17\nonde você precisa copiar dados de um\n1:20\ne-mail e colar num sistema antigo?\n1:23\ntodo dia. Isso é uma tortura lenta. Se\n1:26\nvocê cria uma automação que faz isso\n1:28\nsozinha, você devolveu tempo de vida\n1:31\npara aquele funcionário. Isso é poder.\n1:33\nComo identificar essas dores? Existem\n1:36\ntrês tipos. A dor latente que o usuário\n1:39\ntem, mas não sabe. A dor passiva que ele\n1:43\njá desistiu de resolver e a dor ativa\n1:46\nonde ele está desesperado.\n1:49\nUse o Gemini ou o chat GPT para simular\n1:52\nessas dores. Peça para a IA listar o que\n1:55\ntira o sono do seu cliente. Pare de\n1:58\ntentar impressionar com tecnologia.\n2:00\nImpressione resolvendo problemas reais.\n2:03\nIdentificamos a dor. Agora, como\n2:06\ngarantimos que a solução seja usada?\n2:09\nVamos adaptar o modelo do gancho para a\n2:11\nrealidade do agente no Code. Gatilho,\n2:15\nação, recompensa e investimento.\n2:18\nPrimeiro, o gatilho. Os maiores produtos\n2:21\nusam gatilhos internos, emoções. Quando\n2:25\num cliente seu tem uma dúvida sobre o\n2:27\ncontrato, o gatilho é a insegurança. Se\n2:30\nvocê demora para responder, a\n2:32\ninsegurança aumenta. Como agente cria um\n2:36\nsistema onde essa insegurança dispara\n2:38\numa resposta imediata e acolhedora da\n2:40\nsua IA. A IA não espera, ela antecipa.\n2:44\nSegundo a ação. A regra é: quanto mais\n2:48\ndifícil, menos uso. Estamos caminhando\n2:51\npara zero UI. Imagine um dono de\n2:54\nmercadinho que odeia computador.\n2:57\nA ação para ele tem que ser mandar um\n2:59\náudio no WhatsApp dizendo: "Vendi três\n3:02\ncaixas de leite". e o seu agente\n3:04\nprocessa. Se você reduz o atrito a zero,\n3:07\nvocê vence. Terceiro, a recompensa\n3:10\nvariável. Por que as redes sociais\n3:12\nviciam? Surpresa. Traga isso para o seu\n3:16\nsistema. Se você criou um painel de\n3:19\nvendas, faça a IA trazer um insite\n3:21\ndiferente todo dia. Hoje você vendeu 20%\n3:25\na mais.\n3:27\nO usuário abre o sistema para ver o que\n3:29\na IA descobriu, não por obrigação.\n3:32\nQuarto, o investimento. Quanto mais a\n3:36\npessoa usa, melhor o produto fica. Se\n3:39\nvocê cria um aplicativo de diário ou\n3:41\norações, as memórias ficam lá. Como\n3:44\nagente, garanta que o sistema aprenda.\n3:48\nSe eu corrijo a IA uma vez, ela nunca\n3:51\nmais deve errar. Você não precisa de\n3:53\nmilhões de usuários. Se tiver 10 que\n3:56\namam sua solução, você venceu. Vocês\n3:59\nentendem a dor e o hábito. Agora, como\n4:03\nconstruímos? O erro é achar que leva\n4:05\nmeses. Tempo é o único recurso que não\n4:08\nvolta. Por isso, usamos o framework dos\n4:12\n12 minutos. A restrição gera foco.\n4:15\nCódigo é commodity. O que eu quero de\n4:18\nvocês nesses 12 minutos é a arquitetura.\n4:22\nBloco um, minutos 0 a 4. A definição da\n4:26\ndor única. Escreva em uma frase: "Não\n4:30\nvale, vou melhorar a gestão. Vago\n4:33\ndemais. Tem que ser. Vou eliminar o\n4:37\ntempo que a equipe gasta preenchendo\n4:39\nrelatórios manuais na sexta à tarde.\n4:42\nIsso é específico. Isso é dor real.\n4:45\nBloco dois, minutos 4 a 8, o caminho\n4:49\nfeliz. Desenhe em papel de pão. Passo\n4:52\num, vendedor manda áudio. Passo dois, IA\n4:56\ntranscreve. Passo três, chefe recebe\n4:59\ne-mail. Pronto. Se você desenhou 10\n5:02\ntelas e menus de login, você está\n5:04\npensando como programador antigo. Pense\n5:07\ncomo agente de solução. Bloco 3, minutos\n5:10\n8 a 12. O aha moment. Qual é o momento\n5:15\nem que o usuário sorri? é quando ele\n5:17\nrecebe a notificação de feito sem ter\n5:20\ntido trabalho. Estamos buscando o MLP,\n5:23\nproduto mínimo amável. Uma planilha\n5:26\nautomatizada que poupa 2 horas é mais\n5:29\namável do que um aplicativo complexo. Se\n5:31\nnão consegue desenhar em 12 minutos,\n5:34\nvolte e observe mais. Estamos chegando\n5:36\nao fim. Começamos falando de almas e\n5:40\nterminamos falando de estratégia rápida.\n5:43\nQuero reforçar. A tecnologia sem\n5:46\nhumanidade é apenas burocracia digital.\n5:49\nSua missão hoje não é abrir o computador\n5:52\ne programar. Sua missão é observar. Nas\n5:56\npróximas 24 horas, olhe para sua vida\n5:58\ncom olhos de cirurgião. Identifique três\n6:01\ndores suas. Aquela tarefa chata, aquele\n6:05\nprocesso que todos reclamam, a confusão\n6:07\nno grupo da família. Perguntem-se por\n6:10\nque isso ainda dói. Geralmente é porque\n6:13\nachavam que precisava de um programador\n6:15\ncaro. Agora você tem a IA. Tragam essa\n6:19\ndor para a próxima aula. Vamos deixar de\n6:21\nser observadores e virar construtores. O\n6:24\nfuturo não pertence a quem apenas usa\n6:26\nIA. Pertence a quem conduz a IA para\n6:29\nresolver problemas reais. Você é o\n6:32\narquiteto. Eu sou Ray Jane. Bem-vindos a\n6:35\nDoze Brain.',
teaching_moments = '[
  {
    "timestamp_seconds": 55,
    "topic": "Introdução ao conceito de dor",
    "key_insight": "A dor é um sinal importante do corpo",
    "questions_to_ask": ["O que você entende por dor?", "Já sentiu dor relacionada ao trabalho?"],
    "discussion_points": ["Tipos de dor", "Quando procurar ajuda"]
  },
  {
    "timestamp_seconds": 90,
    "topic": "Causas comuns",
    "key_insight": "Postura e ergonomia são fatores-chave",
    "questions_to_ask": ["Como é sua postura ao trabalhar?", "Você faz pausas regulares?"],
    "discussion_points": ["Ergonomia no home office", "Importância das pausas"]
  },
  {
    "timestamp_seconds": 150,
    "topic": "Prevenção",
    "key_insight": "Pequenas mudanças fazem grande diferença",
    "questions_to_ask": ["Que mudanças você pode implementar hoje?"],
    "discussion_points": ["Exercícios simples", "Configuração do ambiente"]
  }
]'::jsonb
WHERE id = '760470fa-7670-4b56-8746-d5d44d1c4509';

-- UPDATE Video 3: Aula 2 - Psicologia Real da Dor (transcript + teaching_moments)
UPDATE public.videos SET
transcript = E'0:00\nA psicologia real da dor. Antes de\n0:02\nfalarmos de tecnologia, eu quero falar\n0:04\nde algo que todo ser humano conhece.\n0:06\nFeche os olhos por um segundo. Pense na\n0:09\núltima vez que algo pequeno te incomodou\n0:11\ntanto que você não conseguiu ignorar.\n0:14\nNão era uma tragédia, não era um\n0:16\ndesastre, era algo simples, mas que\n0:19\nficava ali martelando um e-mail que você\n0:21\nnão queria responder, uma conta que você\n0:24\nnão queria abrir, uma conversa que você\n0:27\nestava adiando. Isso é dor. Não a dor\n0:31\nfísica, a dor psicológica. A tensão que\n0:34\nse acumula quando algo está fora do\n0:36\nlugar e você sabe disso. E é dessa dor\n0:39\nque todos os produtos que realmente\n0:41\nmudam o mundo são feitos. Não de\n0:43\ntecnologia, não de inovação, mas de\n0:46\nalívio. Dor não é reclamação. Dor não é\n0:50\nfeedback. Dor é tensão não resolvida. É\n0:54\naquilo que continua existindo mesmo\n0:56\nquando você tenta ignorar. Toda dor real\n0:59\ntem três características. A primeira é\n1:02\nfrequência. Ela não acontece uma vez.\n1:06\nEla volta todo dia, toda semana, em toda\n1:10\nsituação parecida. A segunda é custo.\n1:13\nEla rouba algo de você. Tempo, energia,\n1:16\ndinheiro ou paz mental. A terceira é\n1:19\nurgência emocional. Ela incomoda mesmo\n1:22\nquando você finge que está tudo bem. Ela\n1:25\nfica ali pressionando por atenção. Se\n1:27\numa suposta dor essas três coisas:\n1:31\nfrequência, custo e urgência emocional,\n1:34\nela não sustenta um produto. E aqui está\n1:37\num erro clássico de quem começa a criar\n1:39\nsoluções. Confundir o que o usuário diz\n1:42\ncom o que o usuário faz. Usuários\n1:44\nmentem, não por maldade, mas porque não\n1:47\nentendem a própria mente. Eles dizem que\n1:50\nquerem uma coisa, mas continuam fazendo\n1:53\noutra. E em produto, o que importa não é\n1:55\nopinião, é comportamento observável.\n1:59\nUm agente no Code de verdade não\n2:01\nconstrói sistemas baseados em\n2:03\nentrevistas bonitas, ele constrói\n2:06\nsistemas baseados em ações repetidas. Se\n2:08\nalguém diz que odeia planilhas, mas abre\n2:11\naquela planilha todos os dias, isso é\n2:13\numa dor. Se alguém reclama de um\n2:15\nprocesso, mas continua passando por ele\n2:18\ntoda semana, isso é uma dor. Agora vamos\n2:21\ndar um passo mais profundo. As pessoas\n2:23\nnão querem executar tarefas. Elas querem\n2:26\neliminar estados psicológicos\n2:27\ndesconfortáveis. Ninguém quer organizar\n2:30\ntarefas. As pessoas querem parar de se\n2:33\nsentir atrasadas. Ninguém quer controlar\n2:36\nfinanças.\n2:38\nElas querem parar de sentir ansiedade\n2:40\nquando olham para o banco. Ninguém quer\n2:43\ngerenciar projetos. Elas querem parar de\n2:46\nse sentir perdidas. Produto bom não vem\n2:49\ntarefa. Produto bom vem alívio. Como\n2:53\nagente de IA, você precisa enxergar dois\n2:55\nmapas ao mesmo tempo. O mapa da tarefa\n2:58\nvisível e o mapa da dor invisível. Quem\n3:01\nenxerga só a tarefa constrói\n3:03\nferramentas. Quem enxerga a dor constrói\n3:06\nprodutos. Agora vamos falar de hábito.\n3:10\nHábito não é vício. Hábito é economia\n3:13\ncognitiva.\n3:14\nO cérebro humano odeia gastar energia.\n3:17\nEle quer repetir o que já funcionou\n3:19\nantes. É por isso que quando você sente\n3:22\no mesmo tipo de desconforto, você abre o\n3:25\nmesmo aplicativo. Bons produtos se\n3:27\nencaixam em rotinas que já existem.\n3:30\nProdutos ruins tentam criar rotinas\n3:32\nnovas. E é aqui que a inteligência\n3:34\nartificial muda tudo. A Iá moderna não\n3:37\nserve apenas para responder, ela serve\n3:39\npara interpretar contexto. Contexto é a\n3:42\nsoma de o que você fez antes, onde você\n3:45\nestá agora, o que você provavelmente\n3:47\nquer e o quão difícil é agir. Quando\n3:50\nvocê entende contexto, você não empurra\n3:52\nfuncionalidades,\n3:54\nvocê entrega o próximo passo óbvio. E\n3:56\nquando um sistema sempre entrega o\n3:58\npróximo passo óbvio, ele deixa de ser\n4:00\numa ferramenta. Ele se torna inevitável.',
teaching_moments = '[
  {
    "timestamp_seconds": 38,
    "topic": "Definição de Dor Psicológica e sua Importância para Produtos",
    "difficulty_level": "básico",
    "estimated_discussion_minutes": 2,
    "key_insight": "Dor, no contexto de produtos e soluções, não é uma reclamação superficial, mas uma tensão psicológica não resolvida.",
    "questions_to_ask": ["O que diferencia a ''dor'' que o palestrante descreve de um ''feedback'' ou ''reclamação'' comum?", "Conseguem pensar em algum produto ou serviço que vocês usam que, na verdade, alivia uma ''dor psicológica''?"],
    "discussion_points": ["Explorar exemplos pessoais dos alunos de ''dores psicológicas''.", "Discutir a frase ''todos os produtos que realmente mudam o mundo são feitos... de alívio''."],
    "teaching_approach": "Iniciar com uma breve recapitulação da analogia inicial para reforçar a ideia de dor psicológica."
  },
  {
    "timestamp_seconds": 135,
    "topic": "As Três Características da Dor Real e o Erro de Confundir Diz com Faz",
    "difficulty_level": "intermediário",
    "estimated_discussion_minutes": 3,
    "key_insight": "Uma ''dor real'' que sustenta um produto tem frequência, custo e urgência emocional. É crucial observar o comportamento do usuário, e não apenas o que ele diz.",
    "questions_to_ask": ["Baseado nas três características (frequência, custo, urgência emocional), quais delas vocês acham mais difícil de identificar?", "Por que o palestrante afirma que ''usuários mentem''?"],
    "discussion_points": ["Analisar exemplos onde o comportamento do usuário contradiz sua fala.", "Debater a importância de observar ''ações repetidas''."],
    "teaching_approach": "Introduzir a ideia de ''usuários mentem'' com um tom provocativo para gerar debate."
  },
  {
    "timestamp_seconds": 290,
    "topic": "Alívio de Estados Psicológicos e os Dois Mapas do Agente de IA",
    "difficulty_level": "intermediário",
    "estimated_discussion_minutes": 3,
    "key_insight": "As pessoas não buscam executar tarefas, mas sim eliminar estados psicológicos desconfortáveis. Um bom produto entrega alívio.",
    "questions_to_ask": ["Quando o palestrante diz que ''Ninguém quer organizar tarefas. As pessoas querem parar de se sentir atrasadas'', qual a diferença sutil?", "Para um agente de IA, como a capacidade de ver o ''mapa da dor invisível'' pode levar a uma solução fundamentalmente diferente?"],
    "discussion_points": ["Explorar mais exemplos de ''estados psicológicos desconfortáveis'' que produtos digitais buscam aliviar.", "Discutir a metáfora dos ''dois mapas''."],
    "teaching_approach": "Utilizar os exemplos dados no vídeo para ilustrar a ideia central."
  },
  {
    "timestamp_seconds": 402,
    "topic": "Hábito, Contexto e a Inevitabilidade da IA",
    "difficulty_level": "avançado",
    "estimated_discussion_minutes": 3,
    "key_insight": "Hábito é economia cognitiva; produtos de sucesso se encaixam em rotinas existentes. A IA se destaca ao interpretar contexto, entregando o ''próximo passo óbvio''.",
    "questions_to_ask": ["Como a definição de ''hábito'' como ''economia cognitiva'' se relaciona com a ideia de que ''bons produtos se encaixam em rotinas que já existem''?", "Pensem em um aplicativo de IA que vocês usam e como ele ''interpreta o contexto''."],
    "discussion_points": ["Debater a diferença entre um produto que ''tenta criar rotinas novas'' e um que se ''encaixa em rotinas que já existem''."],
    "teaching_approach": "Relembrar a importância da economia cognitiva. O tom deve ser visionário e desafiador."
  }
]'::jsonb
WHERE id = 'eaa3d3c2-5394-464d-9336-20f8053a249c';

-- UPDATE Video: Aula 3 - Quebrando Paradigmas (transcript + teaching_moments)
UPDATE public.videos SET
transcript = E'0:02\ncomeçarmos, eu preciso quebrar um mito\n0:05\nque te segurou a vida toda. O mito de\n0:08\nque para criar tecnologia você precisa\n0:11\nser um gênio da matemática, decorar\n0:13\nmanuais técnicos e passar noites em\n0:16\nclaro olhando para uma tela preta com\n0:18\nletras verdes. Durante 40 anos existiu o\n0:22\nque chamamos de taxa de sintaxe.\n0:25\nSe você tivesse uma ideia brilhante para\n0:27\num negócio, mas não soubesse onde\n0:30\ncolocar uma chave ou um ponto e vírgula\n0:32\nno código, sua ideia morria. Ou você\n0:35\npagava uma fortuna para um\n0:37\ndesenvolvedor, ou você desistia. O\n0:40\nprogramador era o tradutor necessário\n0:42\nentre o seu cérebro humano e o cérebro\n0:45\nda máquina. Eu estou aqui para dar a\n0:47\nnotícia oficial. O tradutor foi\n0:49\ndemitido, o muro caiu. Nós não estamos\n0:52\nmais na era da sintaxe, nós entramos na\n0:55\nera da intenção. Hoje a máquina entende\n0:58\nportuguês, inglês, espanhol e até\n1:01\ngírias. Você faz parte de uma nova\n1:03\ncategoria econômica que está assustando\n1:06\no mercado tradicional.\n1:08\nBem-vindos à geração Vibe Code. Mas Ray\n1:11\nJane, isso é papo futurista ou tem gente\n1:14\nganhando dinheiro com isso hoje? Vamos\n1:16\naos fatos. O termo vibe coding explodiu\n1:20\nno vale do silício porque pessoas comuns\n1:23\ncomeçaram a construir império sozinhas.\n1:26\nOlhem para Peter Levels. Ele é um\n1:28\nempreendedor nômade que construiu o\n1:30\nfotoaii.net.\n1:32\nEle não tem uma equipe de 50\n1:34\nengenheiros. Ele usa IA para escrever\n1:37\n90%% do código que ele não quer escrever.\n1:40\nO resultado? Uma empresa que fatura\n1:43\nmilhões de dólares por ano, operada de\n1:45\num laptop, muitas vezes enquanto ele\n1:48\nestá num café. Querem um exemplo ainda\n1:50\nmais impressionante? Ravi Lopez. Ele era\n1:54\num artista digital, não um programador\n1:56\nsenior. Ele teve a ideia do Magnific AI,\n2:00\numa ferramenta para melhorar a resolução\n2:03\nde imagens. Ele usou o GPT4 para\n2:06\nescrever as partes complexas de React e\n2:09\nPython que ele não dominava. Ele dizia\n2:12\npara Ia: "Não, não está bom. Quero que a\n2:16\nimagem carregue mais rápido. Quero que o\n2:18\nbotão seja mais chamativo." Ele\n2:21\ncodificou pela vibe, pela estética, pela\n2:24\ninsistência. Resultado, em poucos meses,\n2:27\na ferramenta virou febre global e foi\n2:30\nadquirida por uma fortuna. Então, como\n2:33\nisso funciona? Na prática? Você vai\n2:35\nsentar na frente do computador e a\n2:37\nmágica acontece? Não, vibe coding não é\n2:41\nmágica, é iteração. Antigamente, se você\n2:44\nerrasse uma linha de código, o programa\n2:47\nquebrava e você levava horas caçando o\n2:49\nerro. Hoje o processo é uma conversa.\n2:52\nVocê usa ferramentas como cursor, Riplet\n2:55\nou Vzer e diz: "Cria um site para minha\n2:59\npizzaria". Aí a cria, talvez fique feio.\n3:03\nAí entra o vibe coder. Você diz: "Está\n3:06\nmuito formal. Deixa mais divertido.\n3:09\nColoca um botão de WhatsApp piscando\n3:11\naqui e muda esse fundo para preto. Aí a\n3:15\nreescreve o código em segundos. Você não\n3:17\nestá digitando código. Você está\n3:19\nmoldando o software como se fosse\n3:21\nargila. O seu trabalho é ter o bom gosto\n3:24\ne a persistência de pedir até ficar\n3:26\nperfeito. A Ia é incansável. Ela não\n3:29\npede férias. Ela não reclama de refazer.\n3:33\nSam Altman, o criador do chat GPT, fez\n3:36\numa previsão que está tirando o sono de\n3:38\nmuita gente grande. Em breve veremos a\n3:41\nprimeira empresa de bilhão de dólares\n3:44\ngerida por uma única pessoa. Pensem\n3:46\nnisso. 1 bilhão de dólares sem\n3:49\ndepartamento de RH, sem gerente de\n3:52\nprojetos. Quem será essa pessoa? Não\n3:55\nserá o programador tradicional que perde\n3:57\ntempo discutindo qual linguagem é\n3:58\ntecnicamente superior. Será um vibe\n4:01\ncoder. Será alguém como você, alguém que\n4:04\nentende do negócio, entende pessoas e\n4:07\nusa a IA para construir a frota. Isso\n4:10\ncria a maior oportunidade da sua\n4:12\ncarreira. Quem tem mais poder agora? É o\n4:15\nadvogado que sabe onde o processo trava.\n4:18\nÉ o contador que sabe qual planilha é um\n4:20\ninferno. É o pastor que sabe como é\n4:23\ndifícil organizar os voluntários. A sua\n4:26\nexperiência de vida é o mapa. A IA é o\n4:29\nveículo. Esqueça a síndrome do impostor.\n4:32\nSe você sabe falar português, sabe o que\n4:34\nquer e tem a coragem de pedir, você é\n4:37\ntécnico o suficiente para 2025. Você não\n4:41\nestá aqui para ser um usuário. Você está\n4:44\naqui para ser um diretor de\n4:45\ninteligência. Ajuste a sua frequência,\n4:48\naumente a sua ambição.\n4:50\nEu sou Ray Jane. Vamos codar na vibe.',
teaching_moments = '[
  {
    "timestamp_seconds": 50,
    "topic": "A transição da Era da Sintaxe para a Era da Intenção",
    "difficulty_level": "básico",
    "estimated_discussion_minutes": 2,
    "key_insight": "A inteligência artificial eliminou a barreira técnica da sintaxe na programação, permitindo que pessoas sem conhecimento profundo em codificação criem soluções tecnológicas apenas com a ''intenção'' (linguagem natural).",
    "questions_to_ask": ["O que o palestrante quis dizer com ''o tradutor foi demitido, o muro caiu''?", "Qual é a principal diferença entre a ''Era da Sintaxe'' e a ''Era da Intenção''?"],
    "discussion_points": ["Discutir exemplos do dia a dia onde a linguagem natural já substitui comandos técnicos.", "Refletir sobre o impacto dessa mudança para profissionais de outras áreas."],
    "teaching_approach": "Iniciar com uma pergunta aberta para estimular a reflexão sobre a quebra de paradigmas."
  },
  {
    "timestamp_seconds": 190,
    "topic": "Exemplos práticos de Vibe Coding e empreendedorismo com IA",
    "difficulty_level": "intermediário",
    "estimated_discussion_minutes": 3,
    "key_insight": "Pessoas comuns, sem formação tradicional em programação, estão construindo negócios milionários utilizando IA para gerar código.",
    "questions_to_ask": ["Quais foram os principais pontos em comum nas histórias de Peter Levels e Ravi Lopez?", "Como a frase ''Ele codificou pela vibe, pela estética, pela insistência'' se conecta com a ''Era da Intenção''?"],
    "discussion_points": ["Analisar como a IA atua como um ''multiplicador de capacidade'' para empreendedores individuais.", "Debater os desafios e oportunidades de ter uma empresa ''milionária'' operada por uma única pessoa."],
    "teaching_approach": "Explorar os estudos de caso para ilustrar a teoria."
  },
  {
    "timestamp_seconds": 310,
    "topic": "Vibe Coding na prática: Iteração e Moldagem de Software",
    "difficulty_level": "intermediário",
    "estimated_discussion_minutes": 3,
    "key_insight": "Vibe coding não é mágica, mas um processo iterativo de ''moldar'' o software através de conversas com a IA.",
    "questions_to_ask": ["Como o processo de ''criar um site para uma pizzaria'' com IA difere fundamentalmente do desenvolvimento de software ''antigamente''?", "O que o palestrante quer dizer com ''Você está moldando o software como se fosse argila''?"],
    "discussion_points": ["Comparar o processo de Vibe Coding com outras formas de design onde a iteração é fundamental.", "Discutir as ferramentas mencionadas (Cursor, Riplet, Vzer)."],
    "teaching_approach": "Focar na analogia da ''argila'' para concretizar o conceito."
  },
  {
    "timestamp_seconds": 400,
    "topic": "O Novo Poder: Conhecimento de Negócio e a Geração Vibe Code",
    "difficulty_level": "avançado",
    "estimated_discussion_minutes": 3,
    "key_insight": "O maior poder na ''Era da Intenção'' não é a habilidade técnica de programar, mas sim o conhecimento profundo de um domínio específico.",
    "questions_to_ask": ["Segundo o palestrante, quem terá ''mais poder'' neste novo cenário e por quê?", "Como a sua ''experiência de vida'' se torna um ''mapa'' e a IA um ''veículo''?"],
    "discussion_points": ["Listar exemplos de problemas reais em diferentes profissões que poderiam ser resolvidos por um ''Vibe Coder''.", "Debater a previsão de Sam Altman sobre a empresa de bilhões de dólares gerida por uma única pessoa."],
    "teaching_approach": "Promover uma discussão mais ampla e reflexiva sobre o futuro do trabalho e o papel da IA."
  }
]'::jsonb
WHERE id = '44ceb0f3-9f49-4721-a205-87850e2c5c7b';

-- UPDATE Video: Aula 4 - O Ciclo do Hábito (transcript + teaching_moments)
UPDATE public.videos SET
transcript = E'0:00\nO ciclo do hábito e a dopamina. Vamos\n0:02\ncomeçar com algo simples, mas profundo.\n0:05\nVocê não abre um aplicativo porque ele é\n0:07\nbom. Você abre um aplicativo porque algo\n0:10\ndentro de você pediu por ele. Às vezes é\n0:13\ntédio, às vezes é ansiedade, às vezes é\n0:16\nsolidão, às vezes é só aquele vazio\n0:19\nentre uma tarefa e outra. Esse pequeno\n0:21\ndesconforto interno é o que chamamos de\n0:23\ngatilho. Near Alel organizou isso em um\n0:26\nmodelo chamado Hook Model. gatilho,\n0:31\nação, recompensa, investimento, mas\n0:35\nquero que você esqueça os nomes técnicos\n0:37\npor um momento e pense como um ser\n0:39\nhumano. Quando você pega o celular sem\n0:42\nperceber, você não pensa: "Vou abrir o\n0:45\nInstagram". Seu cérebro pensa: "Eu quero\n0:48\nparar de me sentir assim". Isso é o\n0:51\ngatilho real. Agora vem a ação. E existe\n0:55\numa regra dura sobre comportamento\n0:56\nhumano. Se for difícil, não acontece. O\n1:00\ncérebro odeia fricção. Ele sempre\n1:03\nescolhe o caminho mais curto entre dor e\n1:05\nalívio. É por isso que um botão a mais\n1:08\njá derruba conversão. É por isso que\n1:10\nformulários longos matam produtos. E é\n1:13\npor isso que a Ia mudou o jogo. Antes\n1:15\nvocê precisava aprender a usar um\n1:17\nsistema. Hoje o sistema aprende a usar\n1:20\nvocê. Você não navega por menus, você\n1:24\nfala, me ajuda, me explica, resolve\n1:28\nisso. A ação virou linguagem natural. E\n1:32\nquando a ação fica simples, o hábito\n1:34\nnasce, depois vem a recompensa e aqui\n1:37\nestá algo que muda tudo. O seu cérebro\n1:40\nnão fica viciado na recompensa, ele fica\n1:43\nviciado na expectativa da recompensa.\n1:46\nQuando você puxa o feed para atualizar,\n1:49\nvocê não sabe o que vai aparecer.\n1:51\nPode ser algo incrível, pode ser algo\n1:54\ninútil. Essa incerteza libera dopamina.\n1:57\nÉ por isso que você continua puxando. A\n2:00\ninteligência artificial potencializa\n2:02\nisso. Cada resposta que ela gera é\n2:05\núnica. Cada imagem é nova. Cada texto é\n2:09\numa pequena surpresa. Você não recebe um\n2:12\nresultado, você recebe uma revelação e\n2:15\nisso mantém você voltando. Agora vem o\n2:18\núltimo passo, o investimento. Toda vez\n2:21\nque você usa um sistema, você coloca\n2:23\nalgo de você ali. Tempo, dados,\n2:27\npreferências, história. O sistema começa\n2:30\na te conhecer. E quando um produto te\n2:33\nconhece, sair dele dói. Você não troca\n2:36\nde Spotify porque suas playlists moram\n2:38\nlá. Você não troca de ferramentas porque\n2:41\nsua identidade digital mora lá. Agora\n2:43\nveja o que muda com a IA. Antes o\n2:46\ngatilho vinha só de você. Você sentia\n2:49\nalgo e agia. Agora o sistema observa\n2:54\npadrões. Ele sabe quando você costuma\n2:56\nficar cansado, quando você costuma ficar\n2:59\ninseguro, quando você costuma pedir\n3:01\najuda e ele age antes de você. Isso não\n3:04\né invasão, isso é antecipação de valor.\n3:08\nÉ como um bom amigo que traz café antes\n3:10\nde você pedir, porque sabe que você\n3:13\nsempre quer café naquele horário. Os\n3:15\nprodutos mais poderosos de hoje não\n3:17\nesperam. Eles sentem, eles leem\n3:20\nintenção, eles respondem emoção. E\n3:24\nquando isso acontece, o produto deixa de\n3:26\nser uma ferramenta. Ele vira um hábito.\n3:29\nÉ isso que vocês estão aprendendo a\n3:31\nconstruir aqui.',
teaching_moments = '[
  {
    "timestamp_seconds": 30,
    "topic": "O Gatilho e o Desconforto Interno",
    "difficulty_level": "básico",
    "estimated_discussion_minutes": 2,
    "key_insight": "O gatilho para a ação não é a qualidade do aplicativo, mas um desconforto interno (tédio, ansiedade, vazio) que buscamos aliviar.",
    "questions_to_ask": ["O que o palestrante sugere que realmente nos leva a abrir um aplicativo?", "Você consegue identificar um ''gatilho'' interno que te leva a pegar o celular em momentos específicos?"],
    "discussion_points": ["A diferença entre o gatilho ''mental'' e o gatilho ''emocional''.", "Como a compreensão desses gatilhos pode ser aplicada no desenvolvimento de produtos."],
    "teaching_approach": "Comece com uma pergunta aberta para engajar os alunos. Peça exemplos pessoais."
  },
  {
    "timestamp_seconds": 105,
    "topic": "A Regra da Fricção e a Ação Simplificada pela IA",
    "difficulty_level": "intermediário",
    "estimated_discussion_minutes": 2,
    "key_insight": "O cérebro humano busca o caminho de menor fricção entre dor e alívio. A IA simplificou drasticamente a ''ação'', tornando-a linguagem natural.",
    "questions_to_ask": ["Qual é a ''regra dura'' sobre o comportamento humano que impacta a tomada de ação?", "Como a Inteligência Artificial é apresentada como um divisor de águas na forma como realizamos ''ações'' em sistemas?"],
    "discussion_points": ["Discutir exemplos de como a ''fricção'' pode impedir a adoção de produtos.", "Analisar como a IA, ao permitir interações por linguagem natural, remove barreiras."],
    "teaching_approach": "Incentive a reflexão sobre a própria experiência dos alunos com produtos digitais."
  },
  {
    "timestamp_seconds": 198,
    "topic": "A Recompensa e a Dopamina da Incerteza",
    "difficulty_level": "intermediário",
    "estimated_discussion_minutes": 2,
    "key_insight": "O vício não está na recompensa em si, mas na expectativa da recompensa e na incerteza que a envolve, liberando dopamina.",
    "questions_to_ask": ["Onde o palestrante afirma que o cérebro realmente se ''vicia''?", "Como a incerteza de ''puxar o feed'' se relaciona com a liberação de dopamina?"],
    "discussion_points": ["Explorar o conceito de ''recompensa variável'' e como ele é utilizado em jogos e mídias sociais.", "Refletir sobre a ética de produtos que exploram essa vulnerabilidade humana."],
    "teaching_approach": "Desafie os alunos a pensar além da recompensa óbvia."
  },
  {
    "timestamp_seconds": 280,
    "topic": "O Investimento e a Antecipação de Valor da IA",
    "difficulty_level": "avançado",
    "estimated_discussion_minutes": 3,
    "key_insight": "O ''investimento'' (tempo, dados, preferências) cria uma barreira para sair do produto. A IA eleva isso ao observar padrões e antecipar necessidades.",
    "questions_to_ask": ["O que significa ''investimento'' no contexto do ciclo do hábito?", "Como a IA muda a origem do ''gatilho'', passando de algo que vinha só do usuário para algo que o sistema antecipa?"],
    "discussion_points": ["Discutir a ''fricção de saída'' e como o investimento de dados nos ''prende'' a plataformas.", "Analisar a implicação da IA ''sentir'' e ''ler intenção'' – é útil ou invasivo?"],
    "teaching_approach": "Estimule um debate sobre privacidade vs. conveniência."
  }
]'::jsonb
WHERE id = 'b653e1eb-a89a-4231-a656-8d6ec4f7f4b3';
