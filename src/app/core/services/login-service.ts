import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { environment } from '@env/environment';
import { iLoginRequest } from '@shared/models/login.model';
import { iUsuario } from '@shared/models/usuario.model';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private httpClient: HttpClient = inject(HttpClient);
  private API_URL: string = environment.apiUrl;
  private LOGIN_PATH: string = 'autenticacao/login';
  private LOGOUT_PATH: string = 'autenticacao/logout';
  private CADASTRO_PATH: string = 'autenticacao/cadastro';
  private ME_PATH: string = 'autenticacao/me';

  protected readonly usuarioLogado = signal<boolean | null>(null);
  usuario = signal<iUsuario | null>(null);

  login(data: iLoginRequest): Observable<void> {
    return this.httpClient.post<void>(`${this.API_URL}/${this.LOGIN_PATH}`, data);
  }

  logout(): Observable<void> {
    return this.httpClient.post<void>(`${this.API_URL}/${this.LOGOUT_PATH}`, {});
  }

  carregarUsuario(): Observable<iUsuario> {
    return this.httpClient.get<iUsuario>(`${this.API_URL}/${this.ME_PATH}`).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        this.usuarioLogado.set(true);
      }),
    );
  }

  verificaUsuarioLogado(): Observable<void> {
    return this.carregarUsuario().pipe(
      map(() => void 0),
      catchError((error) => {
        this.usuario.set(null);
        this.usuarioLogado.set(false);
        return throwError(() => error);
      }),
    );
  }

  isLogado(): Signal<boolean | null> {
    return this.usuarioLogado.asReadonly();
  }
}
