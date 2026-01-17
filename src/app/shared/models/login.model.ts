export interface iLoginRequest {
  email: string;
  senha: string;
}

export interface iLoginResponse {
  id: string;
  nome: string;
  email: string;
  permissoes: string[];
}
