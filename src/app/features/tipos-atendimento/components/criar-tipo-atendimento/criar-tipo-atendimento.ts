import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TipoAtendimentoService } from '@core/services/tipo-atendimento';
import { Z_MODAL_DATA } from '@shared/components/dialog/dialog.service';
import { ZardDialogRef } from '@shared/components/dialog/dialog-ref';
import { ZardIconComponent } from '@shared/components/icon';
import { ZardSelectItemComponent } from '@shared/components/select/select-item.component';
import { ZardSelectComponent } from '@shared/components/select/select.component';
import {
  iTipoAtendimento,
  iTipoAtendimentoRequest,
  iTipoAtendimentoRequestForm,
} from '@shared/models/tipo-atendimento.model';
import { ToastService } from '@shared/services/toast-service';

@Component({
  selector: 'app-criar-tipo-atendimento',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ZardIconComponent,
    ZardSelectComponent,
    ZardSelectItemComponent,
  ],
  templateUrl: './criar-tipo-atendimento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './criar-tipo-atendimento.css',
})
export class CriarTipoAtendimento implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly tipoAtendimentoService = inject(TipoAtendimentoService);
  private readonly toastService = inject(ToastService);
  private readonly dialogRef = inject<ZardDialogRef<CriarTipoAtendimento>>(ZardDialogRef as any);
  private readonly modalData = inject(Z_MODAL_DATA) as Partial<iTipoAtendimento> & {
    onSaved?: () => void;
  };

  public form!: FormGroup<iTipoAtendimentoRequestForm>;
  public tiposAtendimentos = signal<string[]>(['PRESENCIAL', 'ONLINE']);

  ngOnInit(): void {
    this.iniciarForm();
  }

  private iniciarForm(): void {
    this.form = this.formBuilder.group<iTipoAtendimentoRequestForm>({
      nome: this.formBuilder.control('', Validators.required),
      valorPadraoTipoAtendimento: this.formBuilder.control(0, Validators.required),
    });

    if (this.modalData && this.modalData.id) {
      this.tipoAtendimentoService.buscarTipoAtendimentoPorId(this.modalData.id).subscribe({
        next: (tipo) => {
          this.form.patchValue({
            nome: tipo.nome,
            valorPadraoTipoAtendimento: tipo.valorPadraoTipoAtendimento,
          });
        },
        error: () => {
          this.toastService.exibirToastErro(
            'Erro',
            'Falha ao carregar tipo de atendimento para edição.',
          );
        },
      });
    }
  }

  criarTipoAtendimento(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.exibirToastErro(
        'Erro',
        'Por favor, preencha todos os campos obrigatórios.',
      );
      return;
    }

    const dados: iTipoAtendimentoRequest = this.form.getRawValue();
    if (this.modalData && this.modalData.id) {
      this.tipoAtendimentoService.editarTipoAtendimento(this.modalData.id, dados).subscribe({
        next: () => {
          this.toastService.exibirToastSucesso('Sucesso', 'Tipo de atendimento atualizado.');
          this.modalData?.onSaved?.();
          this.dialogRef.close(true);
        },
        error: () => {
          this.toastService.exibirToastErro('Erro', 'Falha ao atualizar tipo de atendimento.');
        },
      });
    } else {
      this.tipoAtendimentoService.criarTipoAtendimento(dados).subscribe({
        next: () => {
          this.toastService.exibirToastSucesso(
            'Sucesso',
            'Tipo de atendimento criado com sucesso.',
          );
          this.modalData?.onSaved?.();
          this.dialogRef.close(true);
        },
        error: () => {
          this.toastService.exibirToastErro('Erro', 'Falha ao criar tipo de atendimento.');
        },
      });
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
