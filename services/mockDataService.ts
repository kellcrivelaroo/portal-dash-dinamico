import { APIResponse } from '../types';

const API_BASE_URL = 'https://maria-n8n.62ejry.easypanel.host/webhook/getDadosDash';
// Use a CORS proxy to avoid browser restrictions when calling http endpoints or webhooks directly
const CORS_PROXY = 'https://corsproxy.io/?';

export const fetchProcessData = async (type: 'reembolso' | 'fornecedor' | 'nf' | 'viagem'): Promise<APIResponse> => {
    // Map internal module names to API business parameters
    const businessParamMap: Record<string, string> = {
        reembolso: 'Reembolso',
        viagem: 'Viagem',
        fornecedor: 'CliFor',
        nf: 'NF'
    };

    const business = businessParamMap[type];
    
    if (!business) {
        console.error(`Unknown module type: ${type}`);
        return { DICTIONARY_DATA: [], PROCESS_DATA: {} };
    }

    try {
        const targetUrl = `${API_BASE_URL}?business=${business}`;
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(targetUrl)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validate new structure
        if (typeof data !== 'object' || data === null) {
             console.warn("API returned non-object data:", data);
             return { DICTIONARY_DATA: [], PROCESS_DATA: {} };
        }

        // Handle cases where API might return the old format or new format
        if ('DICTIONARY_DATA' in data && 'PROCESS_DATA' in data) {
            return data as APIResponse;
        } else {
             // Fallback if API hasn't updated yet, treat whole data as PROCESS_DATA
             return {
                 DICTIONARY_DATA: [],
                 PROCESS_DATA: data
             };
        }

    } catch (error) {
        console.error("Erro ao buscar dados da API:", error);
        throw error;
    }
};