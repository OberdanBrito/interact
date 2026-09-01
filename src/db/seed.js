import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import connectDB from "./connection.js";
import User from "../models/User.js";
import Comunicado from "../models/Comunicado.js";
import Group from "../models/Group.js";
import Tenant from "../models/Tenant.js";

const SEED_POSTS = [
  {
    _id: "p01",
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
    dateISO: new Date(),
  },
  {
    _id: "p02",
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
    dateISO: new Date(),
  },
  {
    _id: "p03",
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
    _id: "p04",
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
    _id: "p05",
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
    _id: "p06",
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
    _id: "p07",
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
    _id: "p08",
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
    _id: "p09",
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
    _id: "p10",
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

function daysAgo(n) {
  const DAY = 24 * 60 * 60 * 1000;
  return new Date(Date.now() - n * DAY);
}

async function seed() {
  try {
    await connectDB();

    // Apaga coleções antes de popular (reset completo)
    await User.deleteMany({});
    await Comunicado.deleteMany({});
    await Group.deleteMany({});
    console.log("✔ Coleções limpas");

    // Tenant default (MT-19): idempotente — não cria duplicado entre execuções
    const defaultTenantSlug = process.env.DEFAULT_TENANT_SLUG || "interna";
    let defaultTenant = await Tenant.findOne({ slug: defaultTenantSlug });
    if (!defaultTenant) {
      defaultTenant = await Tenant.create({
        slug: defaultTenantSlug,
        name: "Empresa",
        subdomain: defaultTenantSlug,
        plan: "free",
        active: true,
      });
    }
    console.log(`✔ Tenant default "${defaultTenant.slug}" garantido`);

    // Insere admin
    const hash = bcrypt.hashSync("senha123", 10);
    const admin = await User.create({
      email: "admin@interactcorp.com.br",
      password_hash: hash,
      name: "Administrador",
      role: "admin",
    });
    console.log("✔ Usuário admin inserido");

    const [gOperacoes, gLogistica, gTi] = await Group.create([
      { name: "operacoes", active: true },
      { name: "logistica", active: true },
      { name: "ti", active: true },
    ]);
    const idOperacoes = String(gOperacoes._id);
    const idLogistica = String(gLogistica._id);
    const idTi = String(gTi._id);
    console.log("✔ 3 grupos inseridos");

    await User.create([
      {
        email: "colaborador.operacoes@interactcorp.com.br",
        password_hash: bcrypt.hashSync("senha123", 10),
        name: "Colaborador Operações",
        role: "colaborador",
        groupIds: [idOperacoes],
      },
      {
        email: "colaborador.multi@interactcorp.com.br",
        password_hash: bcrypt.hashSync("senha123", 10),
        name: "Colaborador Multi",
        role: "colaborador",
        groupIds: [idOperacoes, idTi],
      },
      {
        email: "colaborador.semgrupo@interactcorp.com.br",
        password_hash: bcrypt.hashSync("senha123", 10),
        name: "Colaborador Sem Grupo",
        role: "colaborador",
        groupIds: [],
      },
    ]);
    console.log("✔ 3 colaboradores inseridos");

    // Posts p01-p10 recebem createdBy do admin (admin vê só o que publicou)
    const posts = SEED_POSTS.map((p) => ({ ...p, createdBy: admin._id }));

    posts.push(
      {
        _id: "p11",
        readMode: "ack",
        categoryId: "rh",
        urgent: false,
        likeBase: 11,
        title: "Regra de home office para Operações",
        body: [
          "A partir do próximo mês, a equipe de Operações passa a ter direito a dois dias de home office por semana, mediante alinhamento prévio com o gestor imediato.",
          "Os dias remotos devem ser registrados no sistema de ponto até a sexta-feira da semana anterior, e a presença presencial segue obrigatória nas reuniões de escala às segundas-feiras.",
          "Dúvidas sobre a nova regra podem ser encaminhadas ao Departamento Pessoal.",
        ],
        targetGroups: [idOperacoes],
        createdBy: admin._id,
        author: { name: "Departamento Pessoal", role: "DP" },
        dateISO: daysAgo(2),
      },
      {
        _id: "p12",
        readMode: "auto",
        categoryId: "ti",
        urgent: false,
        likeBase: 5,
        title: "Treinamento de segurança para Operações e Logística",
        body: [
          "As equipes de Operações e Logística terão um treinamento específico de segurança da informação focado no uso dos terminais de coleta de dados e tablets de campo.",
          "O treinamento será presencial, no auditório da sede, com turmas de 20 pessoas. A escala de horários será divulgada pelos gestores de cada equipe.",
        ],
        targetGroups: [idOperacoes, idLogistica],
        createdBy: admin._id,
        author: { name: "Rafael Nunes", role: "Coordenador de TI" },
        dateISO: daysAgo(1),
      }
    );

    // Insere comunicados
    await Comunicado.insertMany(posts);
    console.log(`✔ ${posts.length} comunicados inseridos`);
    console.log("✔ Seed concluído com sucesso");
  } catch (err) {
    console.error("✖ Erro durante seed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
