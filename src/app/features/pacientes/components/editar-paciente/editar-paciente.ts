import { Component, inject, OnInit } from '@angular/core';
import { PacienteService } from '@core/services/paciente-service';
import { ZardDialogRef } from '@shared/components/dialog/dialog-ref';
import { ToastService } from '@shared/services/toast-service';
import { Z_MODAL_DATA } from '@shared/components/dialog/dialog.service';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { iPacienteRequest } from '@shared/models/paciente.model';
import { ZardIconComponent } from '@shared/components/icon';
import { ZardInputGroupComponent } from '@shared/components/input-group';
import { CommonModule } from '@angular/common';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

interface IModalData {
  pacienteId?: string;
  onSaved?: () => void;
}

@Component({
  selector: 'app-editar-paciente',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ZardIconComponent,
    ZardInputGroupComponent,
    NgxMaskDirective,
  ],
  templateUrl: './editar-paciente.html',
  styleUrl: './editar-paciente.css',
  providers: [provideNgxMask()],
})
export class EditarPaciente implements OnInit {
  private readonly pacienteService = inject(PacienteService);
  private readonly toastService = inject(ToastService);
  private readonly dialogRef = inject<ZardDialogRef<EditarPaciente>>(ZardDialogRef as any);
  private readonly fb = inject(FormBuilder);
  private readonly data = inject<IModalData>(Z_MODAL_DATA as any);

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required]],
      email: ['', [Validators.email]],
      telefone: ['', [Validators.required]],
    });

    const pacienteId = this.data.pacienteId;

    this.pacienteService.buscarPacientePorIdDetalhado(pacienteId!).subscribe({
      next: (paciente) => {
        this.form.patchValue({
          nome: paciente.nome,
          email: paciente.email,
          telefone: paciente.telefone,
        });
      },
      error: () => {
        this.toastService.exibirToastErro(
          'Erro',
          'Ocorreu um erro ao recuperar os dados do paciente',
        );
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  editar(): void {
    if (this.form.invalid) return;

    const payload = this.form.value as iPacienteRequest;
    const pacienteId = this.data.pacienteId;

    if (pacienteId) {
      this.pacienteService.editarPaciente(pacienteId, payload).subscribe({
        next: () => {
          this.toastService.exibirToastSucesso('Sucesso', 'Paciente atualizado.');
          this.data?.onSaved?.();
          this.dialogRef.close(true);
        },
        error: () => {
          this.toastService.exibirToastErro('Erro', 'Falha ao atualizar paciente.');
        },
      });
    }
  }
}
