
import { RawProcessData, DashboardConfig, NormalizedItem, KPIMetrics } from '../types';
import * as d3 from 'd3';

// Define PT-BR Locale for D3
const ptBR = {
  dateTime: "%A, %e de %B de %Y. %X",
  date: "%d/%m/%Y",
  time: "%H:%M:%S",
  periods: ["AM", "PM"],
  days: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"],
  shortDays: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  months: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"],
  shortMonths: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
};

// Apply the locale
// @ts-ignore
d3.timeFormatDefaultLocale(ptBR);

const formatDateToPTBR = (rawDate: any): string => {
    if (!rawDate) return 'N/A';
    
    const strDate = String(rawDate).trim();
    
    // List of formats to try parsing FROM
    const parseFormats = [
        "%Y-%m-%d", 
        "%Y-%m-%dT%H:%M:%S.%LZ",
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y" // In case it's already formatted or mixed
    ];

    let dt: Date | null = null;

    for (const fmt of parseFormats) {
        const parser = d3.timeParse(fmt);
        dt = parser(strDate);
        if (dt) break;
    }

    // Fallback to native Date parsing if D3 fails but string is valid ISO
    if (!dt) {
        const nativeParsed = new Date(strDate);
        if (!isNaN(nativeParsed.getTime())) {
            dt = nativeParsed;
        }
    }

    // If we have a valid date, format it to dd/mm/yyyy
    if (dt) {
        return d3.timeFormat("%d/%m/%Y")(dt);
    }

    return strDate; // Return original if parsing fails
};

export const normalizeData = (data: RawProcessData, config: DashboardConfig, module: string): NormalizedItem[] => {
  // Ensure data is an object or array we can iterate
  const entries = Array.isArray(data) ? data.entries() : Object.entries(data);

  // Handle case where API returns an array instead of object keys
  const itemsToMap = Array.isArray(data) 
    ? data.map((val, idx) => [idx.toString(), val]) 
    : Object.entries(data);

  return itemsToMap.map(([key, value]: [string, any]) => {
    const rawValue = value[config.fieldMapping.value];
    const rawDate = value[config.fieldMapping.date];
    const rawStatus = value[config.fieldMapping.status];

    // Handle IDE_FINALIZADO translation if applicable
    let finalStatus = rawStatus;
    const statusMap: Record<string, string> = {
        'R': 'Rejeitado',
        'C': 'Cancelado',
        'A': 'Em Andamento',
        'P': 'Aprovado'
    };

    if (rawStatus && statusMap[rawStatus]) {
        finalStatus = statusMap[rawStatus];
    } else if (!finalStatus) {
        finalStatus = 'Desconhecido';
    }
    
    // Handle currency strings like "1.000,00" or "1000.00"
    let cleanValue = 0;
    if (typeof rawValue === 'number') {
        cleanValue = rawValue;
    } else if (typeof rawValue === 'string') {
        // Remove currency symbols and unexpected chars
        let v = rawValue.replace(/[R$\s]/g, ''); 
        // Check format: if comma is last separator, it is decimal
        if (v.indexOf(',') > -1 && v.indexOf('.') > -1) {
            if (v.indexOf(',') > v.indexOf('.')) {
                // 1.000,00 (PT-BR) -> Remove dots, replace comma with dot
                 v = v.replace(/\./g, '').replace(',', '.');
            }
        } else if (v.indexOf(',') > -1) {
            // 1000,00 -> Replace comma with dot
            v = v.replace(',', '.');
        }
        cleanValue = parseFloat(v);
    }

    return {
      id: key,
      date: formatDateToPTBR(rawDate),
      value: isNaN(cleanValue) ? 0 : cleanValue,
      status: finalStatus,
      requester: value[config.fieldMapping.requester] || 'N/A',
      category: value[config.fieldMapping.category] || 'Geral',
      description: config.fieldMapping.description ? value[config.fieldMapping.description] : '',
      raw: value
    };
  }).filter(item => {
      // Business Rules for Validation based on Module
      switch (module) {
          case 'reembolso':
              // Rule: Must have a valid Requester (Solicitante)
              return item.requester && item.requester !== 'N/A' && item.requester.toLowerCase() !== 'null' && item.requester.trim() !== '';
          
          case 'viagem':
              // Rule: Must have a valid Date (DT_INICIO_VIAGEM)
              return item.date && item.date !== 'N/A' && item.date.toLowerCase() !== 'null';
          
          case 'fornecedor':
              // Rule: Must have a valid Requester (Razão Social)
              return item.requester && item.requester !== 'N/A' && item.requester.toLowerCase() !== 'null' && item.requester.trim() !== '';
          
          case 'nf':
              // Rule: Must have a valid Value (VALOR_PEDIDO)
              return item.value > 0;
          
          default:
              // Default generic strict check
              return (
                  item.requester !== 'N/A' && 
                  item.date !== 'N/A'
              );
      }
  });
};

export const calculateKPIs = (items: NormalizedItem[]): KPIMetrics => {
  const totalValue = items.reduce((acc, item) => acc + item.value, 0);
  const totalProcesses = items.length;
  const averageValue = totalProcesses > 0 ? totalValue / totalProcesses : 0;

  // Category Distribution with Value Aggregation
  const catStats: { [key: string]: { count: number; total: number } } = {};
  
  items.forEach(item => {
    const cat = item.category || 'Geral';
    if (!catStats[cat]) {
        catStats[cat] = { count: 0, total: 0 };
    }
    catStats[cat].count += 1;
    catStats[cat].total += item.value;
  });
  
  let topCategory = 'N/A';
  let maxCount = 0;
  
  const categoryDistribution = Object.entries(catStats).map(([name, stat]) => {
    if (stat.count > maxCount) {
      maxCount = stat.count;
      topCategory = name;
    }
    return { name, value: stat.count, total: stat.total };
  });

  // Status Distribution
  const statCounts: { [key: string]: number } = {};
  items.forEach(item => {
    let status = item.status;
    // Normalize statuses for cleaner charts
    if (!status) status = 'Desconhecido';
    
    // Basic normalization logic based on common terms
    const s = status.toLowerCase();
    if (s.includes('aprov') || s.includes('conclu') || s === 'ativa' || s === 'ok') status = 'Aprovado';
    else if (s.includes('andamento') || s.includes('analise') || s.includes('aberto')) status = 'Em Andamento';
    else if (s.includes('pendente') || s.includes('aguardando')) status = 'Pendente';
    else if (s.includes('rejeit')) status = 'Rejeitado';
    else if (s.includes('cancel') || s.includes('baixada') || s.includes('inapta')) status = 'Cancelado';


    statCounts[status] = (statCounts[status] || 0) + 1;
  });

  const colors = ['#F97316', '#14B8A6', '#3B82F6', '#EF4444', '#8B5CF6'];
  const statusDistribution = Object.entries(statCounts).map(([name, value], index) => ({
    name,
    value,
    color: colors[index % colors.length]
  }));

  // Timeline Data - Chronological Sort & Localization
  const possibleFormats = [
      "%d/%m/%Y", // Prioritize the format we just normalized to
      "%Y-%m-%d", 
      "%Y-%m-%dT%H:%M:%S.%LZ",
      "%Y-%m-%d %H:%M:%S"
  ];
  
  const timelineMap = new Map<number, number>();
  const monthFormatter = d3.timeFormat("%b %y");

  items.forEach(item => {
    if (item.date && item.date !== 'N/A') {
        let dt: Date | null = null;
        
        // Try parsing different formats
        for (const fmt of possibleFormats) {
            const parser = d3.timeParse(fmt);
            dt = parser(item.date);
            if (dt) break;
        }

        // Fallback for ISO strings that d3 might miss or if already valid string
        if (!dt && !isNaN(Date.parse(item.date))) {
             if (item.date.indexOf('/') === -1) {
                 dt = new Date(item.date);
             }
        }

        if (dt) {
            // Set to first day of month to group by month effectively
            dt.setDate(1); 
            dt.setHours(0, 0, 0, 0);
            const key = dt.getTime();
            
            const currentVal = timelineMap.get(key) || 0;
            timelineMap.set(key, currentVal + item.value);
        }
    }
  });

  // Convert Map to Array and Sort by Date (Timestamp key)
  const timelineData = Array.from(timelineMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, value]) => {
        const date = new Date(timestamp);
        // Format: "jan 23" -> "Jan 23" (Capitalize first letter)
        let label = monthFormatter(date);
        label = label.charAt(0).toUpperCase() + label.slice(1);
        return { date: label, value };
    });

  return {
    totalValue,
    totalProcesses,
    averageValue,
    topCategory,
    statusDistribution,
    categoryDistribution,
    timelineData
  };
};
