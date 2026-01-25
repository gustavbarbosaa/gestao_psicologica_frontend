import { AbstractControl } from '@angular/forms';
import { iLoginResponse } from './login.model';
import { iPacienteMinResponse } from './paciente.model';

export interface iAgendamentoResponse {
  id: string;
  statusPagamento: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  paciente: iPacienteMinResponse;
  usuario: iLoginResponse;
}

export interface iAgendamentoRequest {
  dataHoraInicio: string;
  duracaoEmMinutos: number;
  pacienteId: string;
  usuarioId: string;
}

export interface iAgendamentoRequestForm {
  dataHoraInicio: AbstractControl<string>;
  duracaoEmMinutos: AbstractControl<number>;
  pacienteId: AbstractControl<string>;
  usuarioId: AbstractControl<string>;
}
