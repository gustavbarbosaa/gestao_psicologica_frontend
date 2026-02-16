import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { iTipoAtendimento } from '@shared/models/tipo-atendimento.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TipoAtendimentoService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly API_URL: string = environment.apiUrl;
  private readonly TIPO_ATENDIMENTO_PATH: string = '/tipo-atendimento';

  public buscarTiposAtendimentos(): Observable<iTipoAtendimento[]> {
    return this.httpClient.get<iTipoAtendimento[]>(`${this.API_URL}${this.TIPO_ATENDIMENTO_PATH}`);
  }

  public buscarTipoAtendimentoPorId(tipoAtendimentoId: string): Observable<iTipoAtendimento> {
    return this.httpClient.get<iTipoAtendimento>(
      `${this.API_URL}${this.TIPO_ATENDIMENTO_PATH}/${tipoAtendimentoId}`,
    );
  }

  public criarTipoAtendimento(dados: iTipoAtendimento): Observable<iTipoAtendimento> {
    return this.httpClient.post<iTipoAtendimento>(
      `${this.API_URL}${this.TIPO_ATENDIMENTO_PATH}`,
      dados,
    );
  }

  public deletarTipoAtendimento(tipoAtendimentoId: string): Observable<void> {
    return this.httpClient.delete<void>(
      `${this.API_URL}${this.TIPO_ATENDIMENTO_PATH}/${tipoAtendimentoId}`,
    );
  }

  public editarTipoAtendimento(
    tipoAtendimentoId: string,
    dados: iTipoAtendimento,
  ): Observable<iTipoAtendimento> {
    return this.httpClient.patch<iTipoAtendimento>(
      `${this.API_URL}${this.TIPO_ATENDIMENTO_PATH}/${tipoAtendimentoId}`,
      dados,
    );
  }
}
