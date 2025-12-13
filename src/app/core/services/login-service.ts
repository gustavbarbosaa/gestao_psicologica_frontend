import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { iLoginRequest } from '@shared/models/login.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private httpClient: HttpClient = inject(HttpClient);
  private API_URL: string = environment.apiUrl;
  private LOGIN_PATH: string = 'autenticacao/login';
  private LOGOUT_PATH: string = 'autenticacao/logout';
  private CADASTRO_PATH: string = 'autenticacao/cadastro';

  login(data: iLoginRequest): Observable<void> {
    return this.httpClient.post<void>(`${this.API_URL}/${this.LOGIN_PATH}`, data);
  }

  logout(): Observable<void> {
    return this.httpClient.post<void>(`${this.API_URL}/${this.LOGOUT_PATH}`, {});
  }
}
