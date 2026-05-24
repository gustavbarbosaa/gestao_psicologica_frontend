export interface iLoginRequest {
  email: string;
  senha: string;
}

export interface iUsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  permissoes: string[];
  ativo: boolean;
}

export interface iLoginResponse {
  token: string;
  usuarioResponse: iUsuarioAutenticado;
}
