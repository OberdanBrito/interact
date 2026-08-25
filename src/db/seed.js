import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import bcrypt from "bcrypt";
import pool from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CATEGORIES = [
  { id: "todas", label: "Todas" },
  { id: "geral", label: "Geral" },
  { id: "rh", label: "RH" },
  { id: "ti", label: "TI" },
  { id: "beneficios", label: "Benefícios" },
];

const SEED_USERS = [
  {
    email: "admin@interactcorp.com.br",
    password: "senha123",
    name: "Administrador",
    role: "admin",
  },
];

const SEED_POSTS = [
  {
    id: "p01",
    read_mode: "auto",
    category_id: "geral",
    urgent: false,
    like_base: 24,
    title: "Boas-vindas ao Interact",
    body: [
      "É com muita satisfação que lançamos o Interact, o novo canal oficial de comunicação entre a empresa e você. Aqui você encontra avisos, novidades de RH, atualizações de TI e informações sobre benefícios — tudo em um só lugar.",
      "Adicione o app à sua tela inicial para receber os comunicados sempre à mão. Em breve, novas funcionalidades serão publicadas por aqui.",
      "Bom trabalho!",
    ],
    author_name: "Marina Duarte",
    author_role: "Comunicação Interna",
    date_iso: new Date().toISOString(),
  },
  {
    id: "p02",
    read_mode: "ack",
    category_id: "ti",
    urgent: true,
    like_base: 7,
    title: "Manutenção emergencial no servidor de e-mail",
    body: [
      "Na noite de hoje, entre 22h e 2h, a equipe de TI realizará uma manutenção emergencial no servidor de e-mail corporativo.",
      "Durante esse período o envio e recebimento de mensagens ficará temporariamente indisponível. Nenhuma mensagem será perdida — as pendentes serão entregues automaticamente após a conclusão.",
      "Em caso de urgência, utilize os canais telefônicos da empresa.",
    ],
    author_name: "Rafael Nunes",
    author_role: "Coordenador de TI",
    date_iso: new Date().toISOString(),
  },
  {
    id: "p03",
    read_mode: "auto",
    category_id: "beneficios",
    urgent: false,
    like_base: 15,
    title: "Nova operadora de plano de saúde disponível",
    body: [
      "A partir do próximo mês, os colaboradores poderão migrar para a nova operadora de plano de saúde, com rede credenciada ampliada e cobertura odontológica incluída.",
      "As janelas de migração abrem na primeira segunda-feira do mês, pelo portal do colaborador, e permanecem disponíveis por 15 dias.",
      "Dúvidas sobre carência, acomodação e dependentes podem ser enviadas ao RH pelo ramal 2340.",
    ],
    author_name: "Cláudia Ferreira",
    author_role: "Gerente de Benefícios",
    date_iso: daysAgo(1),
  },
  {
    id: "p04",
    read_mode: "auto",
    category_id: "rh",
    urgent: false,
    like_base: 31,
    title: "Pesquisa de clima organizacional está no ar",
    body: [
      "Começou hoje a Pesquisa de Clima Organizacional do semestre. Sua participação é anônima e leva menos de 10 minutos.",
      "As respostas orientam as melhorias nas políticas de pessoas, gestão e ambiente de trabalho. Quanto mais colegas participarem, mais fiel será o diagnóstico.",
      "O prazo de resposta encerra na próxima sexta-feira.",
    ],
    author_name: "Paulo Menezes",
    author_role: "Business Partner de RH",
    date_iso: daysAgo(1),
  },
  {
    id: "p05",
    read_mode: "ack",
    category_id: "ti",
    urgent: false,
    like_base: 12,
    title: "Treinamento obrigatório de segurança da informação",
    body: [
      "Todos os colaboradores devem concluir o treinamento anual de Segurança da Informação até o fim do mês. O conteúdo leva cerca de 40 minutos e é feito pela plataforma de ensino corporativo.",
      "Os módulos abordam phishing, uso de dispositivos pessoais, senhas e proteção de dados de clientes — temas que impactam diretamente o nosso dia a dia.",
      "Colaboradores que não concluírem dentro do prazo terão o acesso à rede sinalizado ao gestor.",
    ],
    author_name: "Rafael Nunes",
    author_role: "Coordenador de TI",
    date_iso: daysAgo(3),
  },
  {
    id: "p06",
    read_mode: "auto",
    category_id: "rh",
    urgent: false,
    like_base: 9,
    title: "Programação de férias coletivas do fim de ano",
    body: [
      "A direção definiu o recesso coletivo entre 23 de dezembro e 1º de janeiro, retornando às atividades no primeiro dia útil do ano.",
      "Quem preferir manter parte das férias individuais nesse período deve alinhar com o gestor imediato até o dia 30 de novembro.",
      "O RH disponibilizará um atendimento reduzido durante o recesso, apenas para urgências.",
    ],
    author_name: "Cláudia Ferreira",
    author_role: "Gerente de Benefícios",
    date_iso: daysAgo(4),
  },
  {
    id: "p07",
    read_mode: "auto",
    category_id: "beneficios",
    urgent: false,
    like_base: 42,
    title: "Day off pelos 15 anos da empresa",
    body: [
      "Para celebrar nossos 15 anos, todos os colaboradores ganham um day off a ser utilizado em um dia útil de sua escolha, mediante acordado previamente com o gestor.",
      "Aproveite para descansar, cuidar da família ou realizar aquele compromisso que nunca cabe na agenda.",
      "O day off deve ser registrado no sistema de ponto como ausência programada e usado até o fim do semestre.",
    ],
    author_name: "Marina Duarte",
    author_role: "Comunicação Interna",
    date_iso: daysAgo(6),
  },
  {
    id: "p08",
    read_mode: "auto",
    category_id: "beneficios",
    urgent: false,
    like_base: 6,
    title: "Restaurante da sede terá novo horário de almoço",
    body: [
      "A partir da próxima semana, o restaurante da sede passa a atender no horário contínuo, das 11h às 14h30, eliminando as filas do antigo turno único.",
      "O buffet continua incluso para todos os colaboradores, com opção de marmita para levar no fim da tarde.",
    ],
    author_name: "Cláudia Ferreira",
    author_role: "Gerente de Benefícios",
    date_iso: daysAgo(9),
  },
  {
    id: "p09",
    read_mode: "auto",
    category_id: "geral",
    urgent: false,
    like_base: 28,
    title: "Resultado do último trimestre e metas do próximo ciclo",
    body: [
      "Fechamos o trimestre com crescimento de 12% sobre o mesmo período do ano passado, impulsionado pelas duas novas contas assinadas em setembro.",
      "Para o próximo ciclo, as prioridades são a expansão da equipe comercial, a certificação ISO da fábrica e a conclusão da migração dos sistemas internos para nuvem.",
      "A apresentação completa estará disponível na intranet até sexta-feira.",
    ],
    author_name: "Eduardo Salles",
    author_role: "Diretor Executivo",
    date_iso: daysAgo(12),
  },
  {
    id: "p10",
    read_mode: "auto",
    category_id: "rh",
    urgent: false,
    like_base: 19,
    title: "Campanha de vacinação contra gripe no escritório",
    body: [
      "Nos dias 14 e 15, das 9h às 17h, a enfermagem ocupacional aplicará a vacina contra a gripe gratuitamente no auditório do 2º andar.",
      "Não é necessário agendamento: basta apresentar documento com foto e carteira de vacinação.",
      "A vacinação é recomendada para todos e especialmente importante para quem trabalha presencialmente.",
    ],
    author_name: "Paulo Menezes",
    author_role: "Business Partner de RH",
    date_iso: daysAgo(15),
  },
];

function daysAgo(n) {
  const DAY = 24 * 60 * 60 * 1000;
  return new Date(Date.now() - n * DAY).toISOString();
}

// Dates para os posts seed (já calculados antes de inserir)
SEED_POSTS[2].date_iso = daysAgo(1);
SEED_POSTS[3].date_iso = daysAgo(1);
SEED_POSTS[4].date_iso = daysAgo(3);
SEED_POSTS[5].date_iso = daysAgo(4);
SEED_POSTS[6].date_iso = daysAgo(6);
SEED_POSTS[7].date_iso = daysAgo(9);
SEED_POSTS[8].date_iso = daysAgo(12);
SEED_POSTS[9].date_iso = daysAgo(15);

async function seed() {
  const client = await pool.connect();

  try {
    // Aplica schema (idempotente — CREATE TABLE IF NOT EXISTS)
    const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
    await client.query(schema);
    console.log("✔ Schema aplicado");

    // Verifica se já existe dados → skip silenciosamente
    const { rows } = await client.query("SELECT COUNT(*)::int AS n FROM users");
    if (rows[0].n > 0) {
      console.log("ℹ Banco já populado — seed ignorado");
      return;
    }

    // Insere admin
    const hash = bcrypt.hashSync("senha123", 10);
    await client.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)`,
      ["admin@interactcorp.com.br", hash, "Administrador", "admin"]
    );
    console.log("✔ Usuário admin inserido");

    // Insere comunicados
    for (const p of SEED_POSTS) {
      await client.query(
        `INSERT INTO comunicados
           (id, read_mode, category_id, urgent, like_base, title, body,
            author_name, author_role, date_iso)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          p.id,
          p.read_mode,
          p.category_id,
          p.urgent,
          p.like_base,
          p.title,
          p.body,
          p.author_name,
          p.author_role,
          p.date_iso,
        ]
      );
    }
    console.log(`✔ ${SEED_POSTS.length} comunicados inseridos`);
    console.log("✔ Seed concluído com sucesso");
  } catch (err) {
    console.error("✖ Erro durante seed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
