import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ZardIconComponent } from '@shared/components/icon';
import { ZardSelectItemComponent } from '@shared/components/select/select-item.component';
import { ZardSelectComponent } from '@shared/components/select/select.component';
import { iAgendamentoRequestForm } from '@shared/models/agendamento.model';
import { iPacienteMinResponse } from '@shared/models/paciente.model';
import { Z_MODAL_DATA } from '@shared/components/dialog/dialog.service';
import { LoginService } from '@core/services/login-service';
import { PacienteService } from '@core/services/paciente-service';

@Component({
  selector: 'app-editar-agendamento',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ZardSelectComponent,
    ZardSelectItemComponent,
    ZardIconComponent,
  ],
  templateUrl: './editar-agendamento-form.html',
  styleUrl: './editar-agendamento-form.css',
})
export class EditarAgendamentoForm implements OnInit {
  public form!: FormGroup;
  private formBuilder = inject(NonNullableFormBuilder);

  private modalData = inject(Z_MODAL_DATA) as Partial<iAgendamentoRequestForm> | undefined;
  private loginService = inject(LoginService);
  private pacienteService = inject(PacienteService);

  public dadosCarregados = signal<boolean>(false);
  public pacientes = signal<iPacienteMinResponse[]>([]);

  ngOnInit(): void {
    this.iniciarForm();
  }

  private iniciarForm(): void {
    this.carregarPacientes();

    this.form = this.formBuilder.group<iAgendamentoRequestForm>({
      dataHoraInicio: this.formBuilder.control('', Validators.required),
      duracaoEmMinutos: this.formBuilder.control(60, [Validators.required, Validators.min(15)]),
      pacienteId: this.formBuilder.control('', Validators.required),
      usuarioId: this.formBuilder.control(this.getUsuarioId(), Validators.required),
    });

    if (this.modalData && this.modalData.dataHoraInicio) {
      const dataRecebida = new Date(this.modalData.dataHoraInicio as any);

      const isMidnightUTC = dataRecebida.getUTCHours() === 0 && dataRecebida.getUTCMinutes() === 0;

      if (isMidnightUTC) {
        dataRecebida.setMinutes(dataRecebida.getMinutes() + dataRecebida.getTimezoneOffset());
      }

      if (!isNaN(dataRecebida.getTime())) {
        const offset = dataRecebida.getTimezoneOffset() * 60000;
        const dataLocal = new Date(dataRecebida.getTime() - offset);
        const dataFormatada = dataLocal.toISOString().slice(0, 16);

        this.form.patchValue({ dataHoraInicio: dataFormatada });
      }
    }

    if (typeof this.modalData?.duracaoEmMinutos !== 'undefined') {
      this.form.patchValue({ duracaoEmMinutos: this.modalData!.duracaoEmMinutos });
    }

    if (this.modalData?.pacienteId) {
      this.form.patchValue({ pacienteId: this.modalData.pacienteId });
    }
  }

  private getUsuarioId(): string {
    const usuario = this.loginService.usuario();

    if (!usuario) {
      return '';
    }

    return usuario.id;
  }

  carregarPacientes(): void {
    this.pacienteService.buscarPacientesPorUsuario().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes);
        this.dadosCarregados.set(true);
      },
      error: (err) => {
        this.dadosCarregados.set(false);
        console.error('Erro ao carregar pacientes para o formulário de edição', err);
      },
    });
  }
}
