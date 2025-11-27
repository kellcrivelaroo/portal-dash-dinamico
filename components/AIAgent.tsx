
import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, Loader2, TrendingUp } from 'lucide-react';
import { createChatSession, sendMessageToChat } from '../services/geminiService';
import { NormalizedItem, KPIMetrics, DictionaryItem } from '../types';
import ReactMarkdown from 'react-markdown';
import { Chat } from "@google/genai";

interface AIAgentProps {
  items: NormalizedItem[];
  metrics: KPIMetrics;
  contextName: string;
  module: string;
  dictionary: DictionaryItem[];
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

// Strategic, Business-Specific Suggestions
const SUGGESTIONS_BY_MODULE: { [key: string]: string[] } = {
  reembolso: [
    "Quais os maiores ofensores de budget hoje?",
    "Identifique padrões suspeitos ou duplicidades",
    "Qual a projeção de gastos para o fim do mês?",
    "Analise a dispersão de gastos por departamento"
  ],
  viagem: [
    "Qual o custo médio por destino voado?",
    "A antecedência de compra está adequada?",
    "Existe concentração de viagens em um único solicitante?",
    "Compare o gasto de Aéreo vs Hospedagem"
  ],
  fornecedor: [
    "Existem fornecedores com alto risco financeiro?",
    "Qual o tempo médio de homologação atual?",
    "Analise a concentração da nossa base de fornecedores",
    "Liste cadastros pendentes ou incompletos críticos"
  ],
  nf: [
    "Projete o fluxo de desembolso (Cash Out) da semana",
    "Quais fornecedores representam 80% do volume?",
    "Há notas paradas aguardando aprovação há muito tempo?",
    "Analise a sazonalidade dos pagamentos"
  ]
};

const AIAgent: React.FC<AIAgentProps> = ({ items, metrics, contextName, module, dictionary }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Specific colors from request
  const AGENT_COLOR = "#f8992e";
  
  // Initialize Chat Session
  useEffect(() => {
    // Reset chat when module changes
    setMessages([]);
    setChatSession(null);

    if (items.length > 0) {
        const chat = createChatSession(items, metrics, contextName, module, dictionary);
        setChatSession(chat);
        
        // Context-aware, Expert Welcome Message
        let welcomeText = `**Agente Especialista Conectado.**\n\n`;
        
        if (module === 'reembolso') {
            welcomeText += `Sou seu **Auditor de Despesas**. Minha base de dados contém ${items.length} solicitações de reembolso. Posso auditar contas, identificar desvios de política e projetar estouros orçamentários.`;
        } else if (module === 'viagem') {
            welcomeText += `Sou seu **Gestor de Viagens**. Estou monitorando ${items.length} deslocamentos corporativos. Posso analisar eficiência de rotas, custos de hospedagem e comportamento de compra de passagens.`;
        } else if (module === 'fornecedor') {
            welcomeText += `Sou seu **Analista de Risco de Fornecedores**. Tenho ${items.length} processos de cadastro mapeados. Posso validar compliance, saúde financeira e SLAs de homologação.`;
        } else if (module === 'nf') {
            welcomeText += `Sou seu **Analista de Tesouraria e Fiscal**. Controlo um volume financeiro de notas fiscais. Posso projetar seu fluxo de caixa, analisar tributos e performance de pagamentos.`;
        } else {
            welcomeText += "Estou pronto para realizar análises profundas sobre os dados apresentados neste dashboard.";
        }

        welcomeText += "\n\n**Como posso apoiar sua tomada de decisão hoje?**";

        setMessages([
            {
                id: 'welcome',
                role: 'model',
                text: welcomeText
            }
        ]);
    }
  }, [contextName, module, items, metrics, dictionary]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !chatSession) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const responseText = await sendMessageToChat(chatSession, text);

    const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
    setMessages(prev => [...prev, modelMsg]);
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const currentSuggestions = SUGGESTIONS_BY_MODULE[module] || SUGGESTIONS_BY_MODULE['reembolso'];

  return (
    <>
      {/* Floating Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        style={{ backgroundColor: AGENT_COLOR }}
        className={`fixed bottom-6 right-6 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 z-50 flex items-center justify-center ${isOpen ? 'hidden' : 'flex'}`}
        aria-label="Abrir Chat do Agente"
      >
        <Sparkles size={24} strokeWidth={2} />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </button>

      {/* Chat Window - Large Size */}
      <div className={`fixed bottom-6 right-6 w-[600px] h-[800px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none hidden'}`}>
          
          {/* Header */}
          <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-white shadow-sm z-10">
            <div className="flex items-center gap-3">
               <div className="p-2 rounded-full bg-orange-50 border border-orange-100 relative">
                  <Bot size={24} style={{ color: AGENT_COLOR }} />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
               </div>
               <div>
                  <h3 className="font-bold text-gray-800 text-sm">Especialista em {contextName}</h3>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <TrendingUp size={10} /> Consultoria Estratégica & Preditiva
                  </p>
               </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 bg-[#FAFAFA] space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-[#333] text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'
                  }`}
                >
                  {msg.role === 'model' && (
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100 text-xs font-bold text-orange-600 uppercase tracking-wider">
                        <Sparkles size={12} /> Análise do Especialista
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-li:m-0 prose-headings:font-bold prose-headings:text-gray-800 prose-strong:text-gray-900">
                    <ReactMarkdown>
                        {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start w-full">
                <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-3">
                   <Loader2 className="animate-spin w-4 h-4 text-orange-500" />
                   <span className="text-xs text-gray-400 font-medium animate-pulse">Gerando insights estratégicos...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions & Input */}
          <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            <div className="mb-3 overflow-x-auto no-scrollbar">
                <div className="flex gap-2">
                    {currentSuggestions.map((s, i) => (
                        <button 
                            key={i}
                            onClick={() => handleSend(s)}
                            className="whitespace-nowrap px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-100 text-xs text-orange-700 font-medium rounded-full transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-full border border-gray-200 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all shadow-inner">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={`Pergunte ao especialista em ${contextName}...`}
                className="flex-1 bg-transparent px-4 py-2.5 text-sm outline-none text-gray-700 placeholder-gray-400"
                disabled={isTyping}
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isTyping}
                style={{ backgroundColor: input.trim() ? AGENT_COLOR : '#e5e7eb' }}
                className={`p-2.5 rounded-full text-white transition-all ${input.trim() ? 'hover:opacity-90 shadow-md transform hover:scale-105' : ''}`}
              >
                <Send size={18} fill="currentColor" className={input.trim() ? "ml-0.5" : ""} />
              </button>
            </div>
          </div>
      </div>
    </>
  );
};

export default AIAgent;
