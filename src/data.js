/* Camada de dados (mock) ISOLADA, persistida em localStorage.
   Contrato estável para futura troca por API real:
   mantenha as assinaturas das funções exportadas. */

import { STORAGE_KEYS, storageGet, storageSet, uid } from "./utils.js";

/* "todas" não é categoria — existe apenas como filtro na listagem. */
export const CATEGORIES = [
  { id: "geral", label: "Geral" },
  { id: "rh", label: "RH" },
  { id: "ti", label: "TI" },
  { id: "beneficios", label: "Benefícios" },
];

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString();

/* Schema do comunicado (mesmo consumido pela PWA irmã):
   { id, readMode: "auto" | "ack", categoryId, urgent: boolean,
     likeBase: number, title: string, body: string[],
     author: { name, role }, dateISO } */
const POSTS_SEED = [
  {
    id: "p01",
    readMode: "auto",
    categoryId: "geral",
    urgent: false,
    likeBase: 24,
    title: "Boas-vindas ao Interact",
    body: [
      "É com muita satisfação que lançamos o Interact, o novo canal oficial de comunicação entre a empresa e você. Aqui você encontra avisos, novidades de RH, atualizações de TI e informações sobre benefícios — tudo em um só lugar.",
      "Adicione o app à sua tela inicial para receber os comunicados sempre à mão. Em breve, novas funcionalidades serão publicadas por aqui.",
      "Bom trabalho!",
    ],
    author: { name: "Marina Duarte", role: "Comunicação Interna" },
    dateISO: daysAgo(0),
  },
  {
    id: "p02",
    readMode: "ack",
    categoryId: "ti",
    urgent: true,
    likeBase: 7,
    title: "Manutenção emergencial no servidor de e-mail",
    body: [
      "Na noite de hoje, entre 22h e 2h, a equipe de TI realizará uma manutenção emergencial no servidor de e-mail corporativo.",
      "Durante esse período o envio e recebimento de mensagens ficará temporariamente indisponível. Nenhuma mensagem será perdida — as pendentes serão entregues automaticamente após a conclusão.",
      "Em caso de urgência, utilize os canais telefônicos da empresa.",
    ],
    author: { name: "Rafael Nunes", role: "Coordenador de TI" },
    dateISO: daysAgo(0),
  },
  {
    id: "p03",
    readMode: "auto",
    categoryId: "beneficios",
    urgent: false,
    likeBase: 15,
    title: "Nova operadora de plano de saúde disponível",
    body: [
      "A partir do próximo mês, os colaboradores poderão migrar para a nova operadora de plano de saúde, com rede credenciada ampliada e cobertura odontológica incluída.",
      "As janelas de migração abrem na primeira segunda-feira do mês, pelo portal do colaborador, e permanecem disponíveis por 15 dias.",
      "Dúvidas sobre carência, acomodação e dependentes podem ser enviadas ao RH pelo ramal 2340.",
    ],
    author: { name: "Cláudia Ferreira", role: "Gerente de Benefícios" },
    dateISO: daysAgo(1),
  },
  {
    id: "p04",
    readMode: "auto",
    categoryId: "rh",
    urgent: false,
    likeBase: 31,
    title: "Pesquisa de clima organizacional está no ar",
    body: [
      "Começou hoje a Pesquisa de Clima Organizacional do semestre. Sua participação é anônima e leva menos de 10 minutos.",
      "As respostas orientam as melhorias nas políticas de pessoas, gestão e ambiente de trabalho. Quanto mais colegas participarem, mais fiel será o diagnóstico.",
      "O prazo de resposta encerra na próxima sexta-feira.",
    ],
    author: { name: "Paulo Menezes", role: "Business Partner de RH" },
    dateISO: daysAgo(1),
  },
  {
    id: "p05",
    readMode: "ack",
    categoryId: "ti",
    urgent: false,
    likeBase: 12,
    title: "Treinamento obrigatório de segurança da informação",
    body: [
      "Todos os colaboradores devem concluir o treinamento anual de Segurança da Informação até o fim do mês. O conteúdo leva cerca de 40 minutos e é feito pela plataforma de ensino corporativo.",
      "Os módulos abordam phishing, uso de dispositivos pessoais, senhas e proteção de dados de clientes — temas que impactam diretamente o nosso dia a dia.",
      "Colaboradores que não concluírem dentro do prazo terão o acesso à rede sinalizado ao gestor.",
    ],
    author: { name: "Rafael Nunes", role: "Coordenador de TI" },
    dateISO: daysAgo(3),
  },
  {
    id: "p06",
    readMode: "auto",
    categoryId: "rh",
    urgent: false,
    likeBase: 9,
    title: "Programação de férias coletivas do fim de ano",
    body: [
      "A direção definiu o recesso coletivo entre 23 de dezembro e 1º de janeiro, retornando às atividades no primeiro dia útil do ano.",
      "Quem preferir manter parte das férias individuais nesse período deve alinhar com o gestor imediato até o dia 30 de novembro.",
      "O RH disponibilizará um atendimento reduzido durante o recesso, apenas para urgências.",
    ],
    author: { name: "Cláudia Ferreira", role: "Gerente de Benefícios" },
    dateISO: daysAgo(4),
  },
  {
    id: "p07",
    readMode: "auto",
    categoryId: "beneficios",
    urgent: false,
    likeBase: 42,
    title: "Day off pelos 15 anos da empresa",
    body: [
      "Para celebrar nossos 15 anos, todos os colaboradores ganham um day off a ser utilizado em um dia útil de sua escolha, mediante acordado previamente com o gestor.",
      "Aproveite para descansar, cuidar da família ou realizar aquele compromisso que nunca cabe na agenda.",
      "O day off deve ser registrado no sistema de ponto como ausência programada e usado até o fim do semestre.",
    ],
    author: { name: "Marina Duarte", role: "Comunicação Interna" },
    dateISO: daysAgo(6),
  },
  {
    id: "p08",
    readMode: "auto",
    categoryId: "beneficios",
    urgent: false,
    likeBase: 6,
    title: "Restaurante da sede terá novo horário de almoço",
    body: [
      "A partir da próxima semana, o restaurante da sede passa a atender no horário contínuo, das 11h às 14h30, eliminando as filas do antigo turno único.",
      "O buffet continua incluso para todos os colaboradores, com opção de marmita para levar no fim da tarde.",
    ],
    author: { name: "Cláudia Ferreira", role: "Gerente de Benefícios" },
    dateISO: daysAgo(9),
  },
  {
    id: "p09",
    readMode: "auto",
    categoryId: "geral",
    urgent: false,
    likeBase: 28,
    title: "Resultado do último trimestre e metas do próximo ciclo",
    body: [
      "Fechamos o trimestre com crescimento de 12% sobre o mesmo período do ano passado, impulsionado pelas duas novas contas assinadas em setembro.",
      "Para o próximo ciclo, as prioridades são a expansão da equipe comercial, a certificação ISO da fábrica e a conclusão da migração dos sistemas internos para nuvem.",
      "A apresentação completa estará disponível na intranet até sexta-feira.",
    ],
    author: { name: "Eduardo Salles", role: "Diretor Executivo" },
    dateISO: daysAgo(12),
  },
  {
    id: "p10",
    readMode: "auto",
    categoryId: "rh",
    urgent: false,
    likeBase: 19,
    title: "Campanha de vacinação contra gripe no escritório",
    body: [
      "Nos dias 14 e 15, das 9h às 17h, a enfermagem ocupacional aplicará a vacina contra a gripe gratuitamente no auditório do 2º andar.",
      "Não é necessário agendamento: basta apresentar documento com foto e carteira de vacinação.",
      "A vacinação é recomendada para todos e especialmente importante para quem trabalha presencialmente.",
    ],
    author: { name: "Paulo Menezes", role: "Business Partner de RH" },
    dateISO: daysAgo(15),
  },
];

let cache = null;

function persist() {
  storageSet(STORAGE_KEYS.posts, cache);
}

function load() {
  if (cache) return cache;
  const stored = storageGet(STORAGE_KEYS.posts, null);
  cache = Array.isArray(stored) ? stored : POSTS_SEED;
  if (!stored) persist();
  return cache;
}

const byDateDesc = (a, b) => new Date(b.dateISO) - new Date(a.dateISO);

export function listPosts() {
  return [...load()].sort(byDateDesc);
}

export function getPost(id) {
  return load().find((post) => post.id === id) || null;
}

export function createPost(data) {
  const post = {
    id: uid("p"),
    likeBase: 0,
    dateISO: new Date().toISOString(),
    ...data,
  };
  load().push(post);
  persist();
  return post;
}

export function updatePost(id, data) {
  const posts = load();
  const index = posts.findIndex((post) => post.id === id);
  if (index === -1) return null;
  const current = posts[index];
  /* id, dateISO e likeBase originais são preservados na edição. */
  posts[index] = {
    ...current,
    ...data,
    id: current.id,
    dateISO: current.dateISO,
    likeBase: current.likeBase,
  };
  persist();
  return posts[index];
}

export function deletePost(id) {
  const posts = load();
  const next = posts.filter((post) => post.id !== id);
  if (next.length === posts.length) return false;
  cache = next;
  persist();
  return true;
}

export function getCategoryLabel(categoryId) {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return cat ? cat.label : categoryId;
}

/* Login simulado: qualquer e-mail válido + senha com 6+ caracteres. */
export function login(email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!validEmail || password.length < 6) {
        reject(new Error("Credenciais inválidas. Verifique o e-mail e a senha."));
        return;
      }
      const nickname = email.split("@")[0].replace(/[._-]+/g, " ").trim();
      const name =
        nickname
          .split(" ")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ") || "Administrador";
      resolve({ email: email.toLowerCase(), name });
    }, 700);
  });
}
