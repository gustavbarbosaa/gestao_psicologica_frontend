import { iAgendamentoResponse } from './agendamento.model';

export interface iEvolucaoResponse {
  id: string;
  agendamento: iAgendamentoResponse;
  conteudo: string | null;
  observacoes: string | null;
  ativo: boolean;
  dataCriacao: string;
  dataAlteracao: string | null;
}

export interface iEvolucaoRequest {
  agendamentoId: string;
  conteudo: string;
  observacoes?: string | null;
}
