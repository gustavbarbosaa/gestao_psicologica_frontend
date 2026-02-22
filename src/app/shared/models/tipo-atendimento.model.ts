import { AbstractControl } from '@angular/forms';

export interface iTipoAtendimento {
  id: string;
  nome: string;
  valorPadraoTipoAtendimento: number;
}

export interface iTipoAtendimentoRequest {
  nome: string;
  valorPadraoTipoAtendimento: number;
}

export interface iTipoAtendimentoRequestForm {
  nome: AbstractControl<string>;
  valorPadraoTipoAtendimento: AbstractControl<number>;
}
