import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { environment } from '@env/environment';
import { iLoginRequest } from '@shared/models/login.model';
import { catchError, Observable, of, tap } from 'rxjs';

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

  login(data: iLoginRequest): Observable<void> {
    return this.httpClient.post<void>(`${this.API_URL}/${this.LOGIN_PATH}`, data);
  }

  logout(): Observable<void> {
    return this.httpClient.post<void>(`${this.API_URL}/${this.LOGOUT_PATH}`, {});
  }

  verificaUsuarioLogado(): Observable<void> {
    return this.httpClient.get<void>(`${this.API_URL}/${this.ME_PATH}`).pipe(
      tap(() => this.usuarioLogado.set(true)),
      catchError(() => {
        this.usuarioLogado.set(false);
        return of(void 0);
      }),
    );
  }

  isLogado(): Signal<boolean | null> {
    return this.usuarioLogado.asReadonly();
  }
}
