import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ZardDialogRef } from '@shared/components/dialog/dialog-ref';
import { Z_MODAL_DATA } from '@shared/components/dialog/dialog.service';
import { PacienteService } from '@core/services/paciente-service';
import { ToastService } from '@shared/services/toast-service';
import { iPacienteRequest } from '@shared/models/paciente.model';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ZardIconComponent } from '@shared/components/icon';
import { ZardInputGroupComponent } from '@shared/components/input-group';

interface IModalData {
  pacienteId?: string;
  onSaved?: () => void;
}

@Component({
  selector: 'app-cadastro-paciente',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgxMaskDirective,
    ZardIconComponent,
    ZardInputGroupComponent,
  ],
  templateUrl: './cadastro-paciente.html',
  styleUrl: './cadastro-paciente.css',
  providers: [provideNgxMask()],
})
export class CadastroPaciente implements OnInit {
  private pacienteService = inject(PacienteService);
  private toastService = inject(ToastService);
  private dialogRef = inject<ZardDialogRef<CadastroPaciente>>(ZardDialogRef as any);
  private data = inject<IModalData>(Z_MODAL_DATA as any);

  private fb = inject(FormBuilder);
  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required]],
      email: ['', [Validators.email]],
      telefone: ['', [Validators.required]],
      valorSessaoPadrao: [0, [Validators.min(0)]],
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  salvar(): void {
    if (this.form.invalid) return;

    const payload = this.form.value as iPacienteRequest;

    this.pacienteService.criarPaciente(payload).subscribe({
      next: () => {
        this.toastService.exibirToastSucesso('Sucesso', 'Paciente criado.');
        this.data?.onSaved?.();
        this.dialogRef.close(true);
      },
      error: () => {
        this.toastService.exibirToastErro('Erro', 'Falha ao criar paciente.');
      },
    });
  }
}
