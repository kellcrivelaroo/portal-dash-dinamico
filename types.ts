export interface RawProcessData {
  [key: string]: any;
}

export interface DictionaryItem {
  DESC_TABELA: string;
  TIPO_CAMPO: string;
  CAMPO_TABELA: string;
  CAMPO_LABEL: string;
  ID: string;
  CRIADO_EM: string;
  DESCRICAO_IA: string;
  TAMANHO_CAMPO: string;
}

export interface APIResponse {
  DICTIONARY_DATA: DictionaryItem[];
  PROCESS_DATA: RawProcessData;
}

export interface DashboardConfig {
  title: string;
  description: string;
  fieldMapping: {
    date: string;
    value: string;
    status: string;
    requester: string;
    category: string; // Used for charts (e.g., Cost Center, Service Type)
    description?: string;
  };
  currency: boolean;
}

export interface NormalizedItem {
  id: string;
  date: string;
  value: number;
  status: string;
  requester: string;
  category: string;
  description: string;
  raw: any;
}

export interface KPIMetrics {
  totalValue: number;
  totalProcesses: number;
  averageValue: number;
  topCategory: string;
  statusDistribution: { name: string; value: number; color: string }[];
  categoryDistribution: { name: string; value: number; total: number }[];
  timelineData: { date: string; value: number }[];
}