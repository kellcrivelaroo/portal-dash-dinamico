import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  DollarSign, 
  FileText, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Plane,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Code,
  X
} from 'lucide-react';
import { fetchProcessData } from './services/mockDataService';
import { normalizeData, calculateKPIs } from './services/adapterService';
import KPICard from './components/KPICard';
import { StatusPieChart, TimeLineChart, CategoryBarChart } from './components/DashboardCharts';
import AIAgent from './components/AIAgent';
import { DashboardConfig, NormalizedItem, KPIMetrics, RawProcessData, DictionaryItem } from './types';

// Cores solicitadas
const PRIMARY_COLOR = "#f8992e"; // Laranja
const SECONDARY_COLOR = "#139a9a"; // Verde-azulado (Teal)

// Configurações para os diferentes módulos - Updated Mappings based on new JSONs
const configs: { [key: string]: DashboardConfig } = {
  reembolso: {
    title: "Solic. Reembolso",
    description: "Visão geral das solicitações de despesas e reembolsos corporativos.",
    fieldMapping: {
      date: "DT_INICIO",
      value: "VALOR_TOTAL_DESPESA",
      status: "IDE_FINALIZADO",
      requester: "COLABORADOR",
      category: "LT_CENTRO_CUSTO",
      description: "CX_MOTIVO_REEMBOLSO"
    },
    currency: true
  },
  viagem: {
    title: "Solic. Viagens",
    description: "Gestão de deslocamentos, hospedagens e custos de viagens corporativas.",
    fieldMapping: {
      date: "DT_INICIO_VIAGEM",
      value: "TOTAL_DESPESA", // Updated based on JSON
      status: "IDE_FINALIZADO",
      requester: "NOME", // Updated based on JSON
      category: "CENTRO_CUSTO", // Updated based on JSON
      description: "MOTIVO_VIAGEM" // Updated based on JSON
    },
    currency: true
  },
  fornecedor: {
    title: "Cadastro Cliente/Fornecedor",
    description: "Monitoramento de novos cadastros e status de homologação.",
    fieldMapping: {
      date: "AUX_DATA", 
      value: "CAPITAL_SOCIAL",
      status: "IDE_FINALIZADO",
      requester: "RAZAO_SOCIAL",
      category: "TIPO_CADASTRO",
      description: "CIDADE"
    },
    currency: true
  },
  nf: {
    title: "Recebimento de NF",
    description: "Controle de notas fiscais de serviço e pedidos de compra.",
    fieldMapping: {
      date: "DT_INICIO", // Fallback/Note: JSON doesn't have explicit date, adapter handles N/A
      value: "VALOR_PEDIDO",
      status: "IDE_FINALIZADO",
      requester: "FORN_NOME",
      category: "TIPO_SERVICO",
      description: "OBS"
    },
    currency: true
  }
};

const App: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<'reembolso' | 'fornecedor' | 'nf' | 'viagem'>('reembolso');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NormalizedItem[]>([]);
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [rawJson, setRawJson] = useState<any | null>(null); // Stores full response
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [dictionary, setDictionary] = useState<DictionaryItem[]>([]);
  
  // Estado de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiResponse = await fetchProcessData(currentModule);
        setRawJson(apiResponse); // Salva a resposta completa (DICTIONARY + PROCESS)

        // Destructure
        const processData = apiResponse.PROCESS_DATA || {};
        const dictionaryData = apiResponse.DICTIONARY_DATA || [];
        
        setDictionary(dictionaryData);

        const config = configs[currentModule];
        // Pass currentModule to normalizeData for specific validation rules
        const normalized = normalizeData(processData, config, currentModule);
        const calculatedMetrics = calculateKPIs(normalized);
        
        setItems(normalized);
        setMetrics(calculatedMetrics);
        setCurrentPage(1); // Resetar para primeira página ao mudar módulo
      } catch (err) {
        console.error("Failed to load data", err);
        setError("Não foi possível carregar os dados do servidor. Verifique sua conexão e tente novamente.");
        setMetrics(null);
        setRawJson(null);
        setDictionary([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentModule, refreshKey]);

  const config = configs[currentModule];

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getNavButtonClass = (module: string) => {
    const isActive = currentModule === module;
    return `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 shadow-sm whitespace-nowrap ${
      isActive 
        ? `text-white ring-2 ring-offset-1` 
        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
    }`;
  };

  // Lógica de Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F4F6]">
      
      {/* Cabeçalho - Fixo */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
             <img 
               src="https://join4.com.br/wp-content/uploads/2025/07/logotipo-join4-automacao-de-processos-com-inteligencia.png" 
               alt="Join4" 
               className="h-10 w-auto object-contain"
             />
             <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
             <div>
                <h1 className="text-xl font-bold text-gray-800">{config.title}</h1>
                <p className="text-xs text-gray-500 hidden sm:block">{config.description}</p>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 flex items-center gap-2">
                API Status <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
             </div>
          </div>
        </div>
      </header>

      {/* Barra de Navegação - Seleção de Módulo */}
      <div className="bg-gray-50 border-b border-gray-200 sticky top-20 z-10">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
               <button 
                 onClick={() => setCurrentModule('reembolso')}
                 className={getNavButtonClass('reembolso')}
                 style={currentModule === 'reembolso' ? { backgroundColor: SECONDARY_COLOR, borderColor: SECONDARY_COLOR } : {}}
               >
                 <DollarSign size={16} />
                 Reembolsos
               </button>
               <button 
                 onClick={() => setCurrentModule('viagem')}
                 className={getNavButtonClass('viagem')}
                 style={currentModule === 'viagem' ? { backgroundColor: SECONDARY_COLOR, borderColor: SECONDARY_COLOR } : {}}
               >
                 <Plane size={16} />
                 Viagens
               </button>
               <button 
                 onClick={() => setCurrentModule('fornecedor')}
                 className={getNavButtonClass('fornecedor')}
                 style={currentModule === 'fornecedor' ? { backgroundColor: SECONDARY_COLOR, borderColor: SECONDARY_COLOR } : {}}
               >
                 <Users size={16} />
                 Clientes/Fornec.
               </button>
               <button 
                 onClick={() => setCurrentModule('nf')}
                 className={getNavButtonClass('nf')}
                 style={currentModule === 'nf' ? { backgroundColor: SECONDARY_COLOR, borderColor: SECONDARY_COLOR } : {}}
               >
                 <FileText size={16} />
                 Notas Fiscais
               </button>
            </div>

            <button
                onClick={() => setShowJsonModal(true)}
                className="p-2.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all shadow-sm ml-4"
                title="Ver JSON bruto"
            >
                <Code size={20} />
            </button>
         </div>
      </div>

      {/* Área de Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto py-8 px-4 sm:px-6 lg:px-8">
         <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400 gap-3">
                  <Clock className="animate-spin w-10 h-10" style={{ color: SECONDARY_COLOR }} /> 
                  <p className="text-sm font-medium">Sincronizando dados em tempo real...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-500 gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-10">
                  <div className="bg-red-50 p-4 rounded-full">
                      <AlertCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <div className="text-center">
                      <p className="font-bold text-xl text-gray-800 mb-2">Erro de Conexão</p>
                      <p className="text-sm text-gray-500 max-w-md">{error}</p>
                  </div>
                  <button 
                      onClick={() => setRefreshKey(k => k + 1)}
                      className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:opacity-90 transition-all font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                      style={{ backgroundColor: SECONDARY_COLOR }}
                  >
                      <RefreshCw size={18} />
                      Tentar Novamente
                  </button>
              </div>
            ) : !metrics ? (
              <div className="flex items-center justify-center h-96 text-gray-400">Nenhum dado disponível.</div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
                
                {/* Linha de KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard 
                    title={config.currency ? "Valor Total" : "Métrica Principal"}
                    value={config.currency ? formatCurrency(metrics.totalValue) : metrics.totalValue.toString()}
                    icon={DollarSign}
                    color={`text-[${PRIMARY_COLOR}]`}
                    bgColor={`bg-[${PRIMARY_COLOR}]/10`}
                  />
                  <KPICard 
                    title="Total de Processos"
                    value={metrics.totalProcesses.toString()}
                    icon={LayoutDashboard}
                    color={`text-[${PRIMARY_COLOR}]`}
                    bgColor={`bg-[#FFF7ED]`}
                  />
                  <KPICard 
                    title="Média por Processo"
                    value={formatCurrency(metrics.averageValue)}
                    icon={TrendingUp}
                    color={`text-[${PRIMARY_COLOR}]`}
                    bgColor={`bg-[${PRIMARY_COLOR}]/10`}
                  />
                  <KPICard 
                    title="Principal Categoria"
                    value={metrics.topCategory}
                    icon={FileText}
                    color={`text-[${PRIMARY_COLOR}]`}
                    bgColor={`bg-[#FFF7ED]`}
                  />
                </div>
                
                {/* Linha Secundária de KPIs (Contagens) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="p-3 rounded-full bg-green-50 text-green-600"><CheckCircle2 size={24}/></div>
                      <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Concluídos</p>
                          <p className="text-2xl font-bold text-gray-800">{metrics.statusDistribution.find(s => s.name === 'Aprovado' || s.name === 'Concluído' || s.name === 'Aprovar')?.value || 0}</p>
                      </div>
                   </div>
                   <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="p-3 rounded-full bg-blue-50 text-blue-600"><Clock size={24}/></div>
                      <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Em Andamento</p>
                          <p className="text-2xl font-bold text-gray-800">{metrics.statusDistribution.find(s => s.name === 'Em Andamento')?.value || 0}</p>
                      </div>
                   </div>
                   <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                      <div className="p-3 rounded-full bg-orange-50 text-orange-600"><AlertCircle size={24}/></div>
                      <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rejeitados/Pend.</p>
                          <p className="text-2xl font-bold text-gray-800">{metrics.statusDistribution.find(s => s.name === 'Rejeitado' || s.name === 'Pendente' || s.name === 'Rejeitar')?.value || 0}</p>
                      </div>
                   </div>
                </div>

                {/* Linha de Gráficos 1 - Status e Linha do Tempo */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[350px]">
                    <h3 className="text-base font-bold text-gray-800 mb-6">Distribuição por Status</h3>
                    <div className="h-72 flex-1 w-full">
                      <StatusPieChart metrics={metrics} primaryColor="" />
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[350px]">
                    <h3 className="text-base font-bold text-gray-800 mb-6">Evolução ao Longo do Tempo</h3>
                    <div className="h-72 flex-1 w-full">
                      <TimeLineChart metrics={metrics} primaryColor={SECONDARY_COLOR} />
                    </div>
                  </div>
                </div>

                {/* Linha de Gráficos 2 - Categorias */}
                <div className="grid grid-cols-1 gap-8">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[350px]">
                    <h3 className="text-base font-bold text-gray-800 mb-6">Por Categoria / Centro de Custo</h3>
                    <div className="h-72 flex-1 w-full">
                      <CategoryBarChart metrics={metrics} primaryColor={SECONDARY_COLOR} />
                    </div>
                  </div>
                </div>

                {/* Tabela de Dados com Paginação */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                  <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-800">Visão Geral dos Processos</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-8 py-4 font-semibold">ID</th>
                          <th className="px-8 py-4 font-semibold">Solicitante / Origem</th>
                          <th className="px-8 py-4 font-semibold">Categoria</th>
                          <th className="px-8 py-4 font-semibold">Data</th>
                          <th className="px-8 py-4 font-semibold">Status</th>
                          <th className="px-8 py-4 font-semibold text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map((item) => (
                          <tr key={item.id} className="bg-white border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="px-8 py-4 font-medium text-gray-900">#{item.id}</td>
                            <td className="px-8 py-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 uppercase">
                                  {item.requester.charAt(0)}
                              </div>
                              <span className="truncate max-w-[200px]" title={item.requester}>{item.requester}</span>
                            </td>
                            <td className="px-8 py-4 text-gray-600">{item.category}</td>
                            <td className="px-8 py-4 text-gray-600">{item.date}</td>
                            <td className="px-8 py-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                ${(item.status === 'Aprovado' || item.status === 'Concluído') ? 'bg-green-50 text-green-700 border-green-100' : 
                                  (item.status === 'Em Andamento') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                  (item.status === 'Rejeitado' || item.status === 'Cancelado') ? 'bg-red-50 text-red-700 border-red-100' :
                                  'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-8 py-4 text-right font-medium text-gray-900">
                              {config.currency ? formatCurrency(item.value) : item.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Rodapé de Paginação */}
                  <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                     <div className="text-xs text-gray-500">
                        Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(indexOfLastItem, items.length)}</span> de <span className="font-medium">{items.length}</span> resultados
                     </div>
                     <div className="flex items-center gap-2">
                        <button 
                          onClick={prevPage} 
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-medium text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-200">
                           Página {currentPage} de {totalPages}
                        </span>
                        <button 
                          onClick={nextPage} 
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                     </div>
                  </div>
                </div>
              </div>
            )}
         </div>
      </main>
      
      {/* JSON Viewer Modal */}
      {showJsonModal && rawJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2">
                <Code size={20} className="text-gray-500" />
                <h3 className="font-bold text-gray-700">JSON Original da API</h3>
              </div>
              <button onClick={() => setShowJsonModal(false)} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-0 overflow-auto flex-1 bg-[#1e1e1e]">
                <pre className="text-xs font-mono text-green-400 p-6 leading-relaxed">
                    {JSON.stringify(rawJson, null, 2)}
                </pre>
            </div>
             <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                <button 
                  onClick={() => setShowJsonModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Fechar
                </button>
             </div>
          </div>
        </div>
      )}
      
      {/* Agente Especialista com IA */}
      {items.length > 0 && metrics && (
          <AIAgent items={items} metrics={metrics} contextName={config.title} module={currentModule} dictionary={dictionary} />
      )}
    </div>
  );
};

export default App;