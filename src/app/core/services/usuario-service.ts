import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { iUsuarioCadastroRequest, iUsuarioResponse } from '@shared/models/usuario.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private readonly httpClient = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;
  private readonly USUARIO_PATH = '/autenticacao/usuarios';
  private readonly CADASTRO_PATH = '/autenticacao/cadastro';

  public listarUsuarios(): Observable<iUsuarioResponse[]> {
    return this.httpClient.get<iUsuarioResponse[]>(`${this.API_URL}${this.USUARIO_PATH}`);
  }

  public cadastrarUsuario(dados: iUsuarioCadastroRequest): Observable<iUsuarioResponse> {
    return this.httpClient.post<iUsuarioResponse>(`${this.API_URL}${this.CADASTRO_PATH}`, dados);
  }

  public toggleSituacaoUsuario(usuarioId: string): Observable<iUsuarioResponse> {
    return this.httpClient.patch<iUsuarioResponse>(
      `${this.API_URL}${this.USUARIO_PATH}/${usuarioId}/alterar-situacao`,
      {},
    );
  }
}
