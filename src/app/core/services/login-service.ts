import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { environment } from '@env/environment';
import { iLoginRequest, iLoginResponse } from '@shared/models/login.model';
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

  protected readonly usuarioLogado = signal<boolean>(false);
  usuario = signal<iLoginResponse | null>(null);

  login(data: iLoginRequest): Observable<iLoginResponse> {
    return this.httpClient.post<iLoginResponse>(`${this.API_URL}/${this.LOGIN_PATH}`, data).pipe(
      tap((response: iLoginResponse) => {
        this.usuarioLogado.set(true);
        this.usuario.set(response);
      }),
    );
  }

  logout(): Observable<void> {
    return this.httpClient.post<void>(`${this.API_URL}/${this.LOGOUT_PATH}`, {}).pipe(
      tap(() => {
        this.usuarioLogado.set(false);
        this.usuario.set(null);
      }),
      catchError(() => {
        this.usuarioLogado.set(false);
        this.usuario.set(null);
        return of(void 0);
      }),
    );
  }

  carregarUsuario(): Observable<iLoginResponse> {
    return this.httpClient.get<iLoginResponse>(`${this.API_URL}/${this.ME_PATH}`).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        this.usuarioLogado.set(true);
      }),
    );
  }

  verificaUsuarioLogado(): Observable<boolean> {
    return this.carregarUsuario().pipe(
      map(() => true),
      catchError((error) => {
        this.usuario.set(null);
        this.usuarioLogado.set(false);
        return throwError(() => error);
      }),
    );
  }

  isLogado(): Signal<boolean> {
    return this.usuarioLogado.asReadonly();
  }
}
