export interface iPacienteMinResponse {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface iPacienteMaxResponse extends iPacienteMinResponse {
  telefone: string;
  email: string;
}

export interface iPacienteRequest extends iPacienteMinResponse {
  telefone: string;
  email: string;
}
