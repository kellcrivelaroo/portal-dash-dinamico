
import { GoogleGenAI, Chat } from "@google/genai";
import { NormalizedItem, KPIMetrics, DictionaryItem } from '../types';

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const getPersonaDefinition = (module: string) => {
  switch (module) {
    case 'reembolso':
      return {
        role: "Auditor Sênior de Despesas Corporativas & Compliance Officer",
        focus: "Você é obcecado por: Política de gastos, detecção de fraudes, duplicidades, gastos fora do padrão e eficiência orçamentária.",
        scope: "Sua autoridade limita-se estritamente a REEMBOLSOS E DESPESAS DE FUNCIONÁRIOS. Você analisa recibos, categorias de gastos (táxi, alimentação) e comportamento de solicitantes.",
        forbidden: "Não responda sobre estratégias de compras corporativas globais, cotação de passagens aéreas (módulo viagens) ou notas fiscais de fornecedores externos."
      };
    case 'viagem':
      return {
        role: "Gestor Estratégico de Viagens Corporativas (Travel Manager)",
        focus: "Você foca em: Antecedência de compra, custo médio por trecho, ROI da viagem, escolha de parceiros (cias aéreas/hotéis) e abusos em diárias.",
        scope: "Sua autoridade limita-se a VIAGENS CORPORATIVAS. Você analisa passagens, estadias, roteiros e motivos de deslocamento.",
        forbidden: "Não analise reembolsos de almoço do dia a dia (que não sejam de viagem) ou cadastros de fornecedores de matéria-prima."
      };
    case 'fornecedor':
      return {
        role: "Especialista em Gestão de Risco de Fornecedores (Vendor Risk Management)",
        focus: "Você avalia: Saúde financeira (Capital Social), regularidade fiscal, SLA de cadastro, concentração de mercado e compliance de terceiros.",
        scope: "Sua autoridade limita-se ao CADASTRO E HOMOLOGAÇÃO DE FORNECEDORES/CLIENTES. Você olha para dados cadastrais, CNPJs e riscos.",
        forbidden: "Não responda sobre despesas de funcionários, fluxo de aprovação de viagens ou detalhes de itens de notas fiscais específicas."
      };
    case 'nf':
      return {
        role: "Analista Sênior de Contas a Pagar e Tesouraria (FP&A)",
        focus: "Você monitora: Fluxo de caixa (Cash Out), prazos de pagamento, volumetria de notas, impostos retidos e relação comercial com prestadores.",
        scope: "Sua autoridade limita-se ao RECEBIMENTO FISCAL E PAGAMENTOS. Você analisa valores de notas, datas de vencimento e serviços tomados.",
        forbidden: "Não entre no mérito de como o fornecedor foi cadastrado ou se o funcionário gastou muito no almoço."
      };
    default:
      return {
        role: "Consultor Executivo de Estratégia",
        focus: "Visão holística dos processos.",
        scope: "Análise geral dos dados apresentados.",
        forbidden: "Assuntos não relacionados aos dados da tela."
      };
  }
};

export const createChatSession = (
  items: NormalizedItem[], 
  metrics: KPIMetrics, 
  contextName: string,
  moduleKey: string,
  dictionary: DictionaryItem[]
): Chat => {
  
  const model = 'gemini-2.5-flash';
  const persona = getPersonaDefinition(moduleKey);
  
  // Process Dictionary into a readable context string for the AI (Internal Knowledge)
  // This maps technical DB fields to Business Terms using "CAMPO_LABEL" and "DESCRICAO_IA"
  const dictionaryContext = dictionary.map(d => 
    `> CAMPO DE DADO: "${d.CAMPO_LABEL}" (Técnico: ${d.CAMPO_TABELA}) -> O que é: ${d.DESCRICAO_IA}`
  ).join('\n');

  // Prepare Data Summary
  const summary = {
    contexto_negocio: contextName,
    metricas_principais: {
        valor_total: metrics.totalValue,
        volume_processos: metrics.totalProcesses,
        ticket_medio: metrics.averageValue,
        categoria_dominante: metrics.topCategory
    },
    tendencia_temporal: metrics.timelineData, 
    distribuicao_status: metrics.statusDistribution,
    distribuicao_categoria: metrics.categoryDistribution,
    // Providing samples for context - anonymized if needed, but here we trust the normalized data
    amostra_transacoes_relevantes: items
        .sort((a, b) => b.value - a.value) // Top values first
        .slice(0, 20) // Top 20 items for deep context
        .map(i => ({
            data: i.date,
            valor: i.value,
            status_atual: i.status,
            solicitante_ou_fornecedor: i.requester,
            categoria_ou_centro_custo: i.category,
            descricao_detalhada: i.description
        }))
  };

  const systemInstruction = `
    ### IDENTIDADE E PROPÓSITO ###
    VOCÊ É: ${persona.role}.
    SEU FOCO: ${persona.focus}
    SEU ESCOPO (HARD LIMIT): ${persona.scope}
    O QUE VOCÊ NÃO FAZ: ${persona.forbidden}

    ### BASE DE CONHECIMENTO (DICIONÁRIO DE DADOS) ###
    Utilize as definições abaixo para interpretar corretamente o que cada dado significa no contexto deste negócio específico:
    ${dictionaryContext}

    ### DADOS DO MOMENTO (CONTEXTO ATUAL) ###
    ${JSON.stringify(summary, null, 2)}

    ### DIRETRIZES DE COMPORTAMENTO (CONSULTORIA EXECUTIVA) ###
    1. **BLOQUEIO DE ASSUNTO:** Se o usuário perguntar sobre algo fora do seu ESCOPO (ex: perguntar de viagens estando no módulo de reembolso), responda: "Como especialista em ${contextName}, minha análise se restringe a este tema. Por favor, navegue até o módulo correspondente para essa análise."
    2. **LINGUAGEM DE NEGÓCIO:** Nunca use termos técnicos de TI (JSON, Endpoint, String, Null). Use a terminologia do negócio definida no Dicionário (ex: em vez de "VALOR_PEDIDO", diga "Montante da Nota").
    3. **ANÁLISE, NÃO DESCRIÇÃO:** Não diga "O valor subiu". Diga "O aumento expressivo de X% no volume financeiro indica uma pressão no fluxo de caixa, impulsionada principalmente por..."
    4. **VISÃO PREDITIVA:** Use os dados temporais para alertar sobre o futuro. "Considerando a tendência dos últimos 3 meses, é provável que estouremos o budget em..."
    5. **OBJETIVIDADE COM VALOR:** Seja sucinto, use Bullet Points, mas garanta que cada ponto tenha um insight valioso.
    
    ### FORMATO DE RESPOSTA ###
    - Comece direto ao ponto.
    - Use **Negrito** para destacar valores e entidades (nomes, empresas).
    - Finalize sempre com a seção: "**💡 Recomendação do Especialista:**" com uma ação prática.
  `;

  return ai.chats.create({
    model: model,
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.3, // Low temperature for factual, precise adherence to data
    }
  });
};

export const sendMessageToChat = async (chat: Chat, message: string): Promise<string> => {
  try {
    const response = await chat.sendMessage({ message });
    return response.text || "Não consegui gerar uma análise conclusiva sobre esse ponto específico. Poderia reformular com foco nos dados apresentados?";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Estou reprocessando os dados estratégicos. Por favor, tente novamente em instantes.";
  }
};
