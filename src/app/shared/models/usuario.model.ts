export interface iUsuarioResponse {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  authorities: string[];
}

export interface iUsuarioCadastroRequest {
  nome: string;
  email: string;
  senha: string;
}
