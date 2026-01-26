import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import {
  iPacienteMaxResponse,
  iPacienteMinResponse,
  iPacienteRequest,
} from '@shared/models/paciente.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PacienteService {
  private httpClient: HttpClient = inject(HttpClient);
  private API_URL: string = environment.apiUrl;
  private PACIENTES_PATH: string = '/paciente';
  private PACIENTES_POR_USUARIO_PATH: string = `${this.PACIENTES_PATH}/por-usuario`;
  private EDITAR_PACIENTE_PATH: string = `${this.PACIENTES_PATH}/editar/`;

  public buscarPacientePorId(pacienteId: string): Observable<iPacienteMinResponse> {
    return this.httpClient.get<iPacienteMinResponse>(
      `${this.API_URL}${this.PACIENTES_PATH}/${pacienteId}`,
    );
  }

  public buscarPacientesPorUsuario(): Observable<iPacienteMaxResponse[]> {
    return this.httpClient.get<iPacienteMaxResponse[]>(
      `${this.API_URL}${this.PACIENTES_POR_USUARIO_PATH}`,
    );
  }

  public buscarTodosPacientes(): Observable<iPacienteMinResponse[]> {
    return this.httpClient.get<iPacienteMinResponse[]>(`${this.API_URL}${this.PACIENTES_PATH}`);
  }

  public criarPaciente(dados: iPacienteRequest): Observable<iPacienteMinResponse> {
    return this.httpClient.post<iPacienteMinResponse>(
      `${this.API_URL}${this.PACIENTES_PATH}`,
      dados,
    );
  }

  public editarPaciente(
    pacienteId: string,
    dados: iPacienteRequest,
  ): Observable<iPacienteMinResponse> {
    return this.httpClient.put<iPacienteMinResponse>(
      `${this.API_URL}${this.EDITAR_PACIENTE_PATH}/${pacienteId}`,
      dados,
    );
  }

  public deletarPaciente(pacienteId: string): Observable<iPacienteMinResponse> {
    return this.httpClient.delete<iPacienteMinResponse>(
      `${this.API_URL}${this.PACIENTES_PATH}/${pacienteId}`,
    );
  }
}
