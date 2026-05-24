import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { environment } from '@env/environment';
import { iLoginRequest, iLoginResponse, iUsuarioAutenticado } from '@shared/models/login.model';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private static readonly TOKEN_STORAGE_KEY = 'auth_token';

  private httpClient: HttpClient = inject(HttpClient);
  private API_URL: string = environment.apiUrl;
  private LOGIN_PATH: string = 'autenticacao/login';
  private LOGOUT_PATH: string = 'autenticacao/logout';
  private CADASTRO_PATH: string = 'autenticacao/cadastro';
  private ME_PATH: string = 'autenticacao/me';

  protected readonly usuarioLogado = signal<boolean>(false);
  usuario = signal<iUsuarioAutenticado | null>(null);

  constructor() {
    this.usuarioLogado.set(this.hasToken());
  }

  login(data: iLoginRequest): Observable<iUsuarioAutenticado> {
    return this.httpClient.post<iLoginResponse>(`${this.API_URL}/${this.LOGIN_PATH}`, data).pipe(
      map((response: iLoginResponse) => {
        this.persistToken(response.token);
        this.usuarioLogado.set(true);
        this.usuario.set(response.usuarioResponse);
        return response.usuarioResponse;
      }),
    );
  }

  logout(): Observable<void> {
    return this.httpClient.post<void>(`${this.API_URL}/${this.LOGOUT_PATH}`, {}).pipe(
      tap(() => {
        this.clearAuthState();
      }),
      catchError(() => {
        this.clearAuthState();
        return of(void 0);
      }),
    );
  }

  carregarUsuario(): Observable<iUsuarioAutenticado> {
    return this.httpClient.get<iUsuarioAutenticado>(`${this.API_URL}/${this.ME_PATH}`).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        this.usuarioLogado.set(true);
      }),
    );
  }

  verificaUsuarioLogado(): Observable<boolean> {
    if (!this.hasToken()) {
      this.clearAuthState();
      return of(false);
    }

    return this.carregarUsuario().pipe(
      map(() => true),
      catchError((error) => {
        this.clearAuthState();
        return throwError(() => error);
      }),
    );
  }

  isLogado(): Signal<boolean> {
    return this.usuarioLogado.asReadonly();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(LoginService.TOKEN_STORAGE_KEY);
  }

  private persistToken(token: string): void {
    localStorage.setItem(LoginService.TOKEN_STORAGE_KEY, token);
  }

  private clearAuthState(): void {
    localStorage.removeItem(LoginService.TOKEN_STORAGE_KEY);
    this.usuarioLogado.set(false);
    this.usuario.set(null);
  }
}
