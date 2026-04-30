import { AbstractControl } from '@angular/forms';
import { iLoginResponse } from './login.model';
import { iPacienteMinResponse } from './paciente.model';
import { iTipoAtendimento } from './tipo-atendimento.model';

export type StatusAtendimento =
  | 'CRIADO'
  | 'CONFIRMADO'
  | 'CANCELADO'
  | 'CONCLUIDO'
  | 'REAGENDADO'
  | 'NAO_COMPARECEU';

export type StatusPagamento = 'PENDENTE' | 'CONFIRMADO' | 'COBRANCA_GERADA';

export interface iAgendamentoResponse {
  id: string;
  statusPagamento: StatusPagamento;
  dataHoraInicio: string;
  dataHoraFim: string;
  paciente: iPacienteMinResponse;
  statusAtendimento: StatusAtendimento;
  usuario: iLoginResponse;
  tipoAtendimento: iTipoAtendimento;
}

export interface iAgendamentoRequest {
  dataHoraInicio: string;
  duracaoEmMinutos: number;
  pacienteId: string;
  usuarioId: string;
  tipoAtendimentoId: string;
}

export interface iAgendamentoRequestForm {
  dataHoraInicio: AbstractControl<string>;
  duracaoEmMinutos: AbstractControl<number>;
  pacienteId: AbstractControl<string>;
  usuarioId: AbstractControl<string>;
  tipoAtendimentoId: AbstractControl<string>;
}
