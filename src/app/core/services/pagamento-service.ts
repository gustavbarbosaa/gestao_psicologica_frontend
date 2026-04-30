import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { iAgendamentoResponse, StatusPagamento } from '@shared/models/agendamento.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PagamentoService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly API_URL: string = environment.apiUrl;
  private readonly AGENDAMENTOS_PATH: string = '/pagamentos';

  public alterarStatusPagamento(
    agendamentoId: string,
    statusPagamento: StatusPagamento,
  ): Observable<iAgendamentoResponse> {
    return this.httpClient.patch<iAgendamentoResponse>(
      `${this.API_URL}${this.AGENDAMENTOS_PATH}/${agendamentoId}/pagamento`,
      { statusPagamento },
    );
  }
}
