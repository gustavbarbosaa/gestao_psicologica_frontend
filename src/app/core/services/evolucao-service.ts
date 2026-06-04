import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { iEvolucaoRequest, iEvolucaoResponse } from '@shared/models/evolucao.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EvolucaoService {
  private readonly httpClient = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;
  private readonly EVOLUCAO_PATH = '/evolucao';

  public listarEvolucoes(): Observable<iEvolucaoResponse[]> {
    return this.httpClient.get<iEvolucaoResponse[]>(`${this.API_URL}${this.EVOLUCAO_PATH}`);
  }

  public listarEvolucoesPorPaciente(pacienteId: string): Observable<iEvolucaoResponse[]> {
    return this.httpClient.get<iEvolucaoResponse[]>(
      `${this.API_URL}${this.EVOLUCAO_PATH}/paciente/${pacienteId}`,
    );
  }

  public buscarEvolucaoPorId(evolucaoId: string): Observable<iEvolucaoResponse> {
    return this.httpClient.get<iEvolucaoResponse>(`${this.API_URL}${this.EVOLUCAO_PATH}/${evolucaoId}`);
  }

  public editarEvolucao(
    evolucaoId: string,
    dados: iEvolucaoRequest,
  ): Observable<iEvolucaoResponse> {
    return this.httpClient.patch<iEvolucaoResponse>(
      `${this.API_URL}${this.EVOLUCAO_PATH}/${evolucaoId}`,
      dados,
    );
  }

  public removerEvolucao(evolucaoId: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.API_URL}${this.EVOLUCAO_PATH}/${evolucaoId}`);
  }
}
