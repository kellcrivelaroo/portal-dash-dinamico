import { APIResponse } from '../types';

// const API_BASE_URL = 'https://maria-n8n.62ejry.easypanel.host/webhook/getDadosDash';
const API_BASE_URL = 'https://bpm-homol.join4.com.br/app-ext/consultadadosprocesso/api/v1/getdados';
// const CORS_PROXY = 'https://corsproxy.io/?';

type ModuleType = 'reembolso' | 'fornecedor' | 'nf' | 'viagem';

/**
 * Mapeia o type para os parâmetros de negócio (querystring)
 */
const businessParamMap: Record<ModuleType, string> = {
    reembolso: 'Reembolso',
    viagem: 'Viagem',
    fornecedor: 'CliFor',
    nf: 'NF'
};

/**
 * Mapeia o type para o body da requisição
 */
const bodyConfigMap: Record<
    ModuleType,
    { nomeTabela: string; grids?: string }
> = {
    reembolso: {
        nomeTabela: 'f_reemb_desp',
        grids: 'GDESPESA'
    },
    viagem: {
        nomeTabela: 'f_c_sol_viagens',
        grids: 'GRID_DESPESA'
    },
    nf: {
        nomeTabela: 'f_p_rec_notafis'
    },
    fornecedor: {
        nomeTabela: 'f_c_cadastros_f'
    }
};

export const fetchProcessData = async (type: ModuleType): Promise<APIResponse> => {
    const business = businessParamMap[type];
    const bodyConfig = bodyConfigMap[type];

    if (!business || !bodyConfig) {
        console.error(`Unknown module type: ${type}`);
        return { DICTIONARY_DATA: [], PROCESS_DATA: {} };
    }

    try {
        const targetUrl = `${API_BASE_URL}?business=${business}`;

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyConfig)
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Validação defensiva da resposta
        if (typeof data !== 'object' || data === null) {
            console.warn('API returned non-object data:', data);
            return { DICTIONARY_DATA: [], PROCESS_DATA: {} };
        }

        // Novo formato esperado
        if ('DICTIONARY_DATA' in data && 'PROCESS_DATA' in data) {
            return data as APIResponse;
        }

        // Fallback para formato antigo
        return {
            DICTIONARY_DATA: [],
            PROCESS_DATA: data
        };

    } catch (error) {
        console.error('Erro ao buscar dados da API:', error);
        throw error;
    }
};
