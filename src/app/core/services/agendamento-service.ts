import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { iAgendamentoRequest, iAgendamentoResponse } from '@shared/models/agendamento.model';
import { Observable, Subject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AgendamentoService {
  private httpClient: HttpClient = inject(HttpClient);
  private API_URL: string = environment.apiUrl;
  private AGENDAMENTOS_PATH: string = '/agendamento';
  private AGENDAMENTOS_POR_USUARIO_PATH: string = `${this.AGENDAMENTOS_PATH}/por-usuario`;
  private AGENDAMENTOS_POR_PACIENTE_PATH: string = `${this.AGENDAMENTOS_PATH}/por-paciente/`;
  private EDITAR_AGENDAMENTO_PATH: string = `${this.AGENDAMENTOS_PATH}/editar/`;

  private agendamentoCriadoSource = new Subject<iAgendamentoResponse>();
  public agendamentoCriado$ = this.agendamentoCriadoSource.asObservable();

  public buscarTodosAgendamentos(): Observable<iAgendamentoResponse[]> {
    return this.httpClient.get<iAgendamentoResponse[]>(`${this.API_URL}${this.AGENDAMENTOS_PATH}`);
  }

  public buscarAgendamentosPorUsuario(): Observable<iAgendamentoResponse[]> {
    return this.httpClient.get<iAgendamentoResponse[]>(
      `${this.API_URL}${this.AGENDAMENTOS_POR_USUARIO_PATH}`,
    );
  }

  public buscarAgendamentosPorPaciente(pacienteId: string): Observable<iAgendamentoResponse[]> {
    return this.httpClient.get<iAgendamentoResponse[]>(
      `${this.API_URL}${this.AGENDAMENTOS_POR_PACIENTE_PATH}${pacienteId}`,
    );
  }

  public editarAgendamento(
    agendamentoId: string,
    dados: iAgendamentoRequest,
  ): Observable<iAgendamentoResponse> {
    return this.httpClient.patch<iAgendamentoResponse>(
      `${this.API_URL}${this.EDITAR_AGENDAMENTO_PATH}${agendamentoId}`,
      dados,
    );
  }

  public criarAgendamento(dados: iAgendamentoRequest): Observable<iAgendamentoResponse> {
    return this.httpClient
      .post<iAgendamentoResponse>(`${this.API_URL}${this.AGENDAMENTOS_PATH}`, dados)
      .pipe(
        tap((novoAgendamento) => {
          this.agendamentoCriadoSource.next(novoAgendamento);
        }),
      );
  }

  public deletarAgendamento(agendamentoId: string): Observable<iAgendamentoResponse> {
    return this.httpClient.delete<iAgendamentoResponse>(
      `${this.API_URL}${this.AGENDAMENTOS_PATH}/${agendamentoId}`,
    );
  }
}
