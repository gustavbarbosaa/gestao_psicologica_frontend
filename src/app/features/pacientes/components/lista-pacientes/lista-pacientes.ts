import { Component, inject, OnInit, signal } from '@angular/core';
import { ZardBadgeComponent } from '@shared/components/badge/badge.component';
import { ZardIconComponent } from '@shared/components/icon';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { PacienteService } from '@core/services/paciente-service';
import { LoginService } from '@core/services/login-service';
import { iPacienteMaxResponse } from '@shared/models/paciente.model';
import { ToastService } from '@shared/services/toast-service';
import { ZardTableImports } from '@shared/components/table';

@Component({
  selector: 'app-lista-pacientes',
  imports: [ZardTableImports, ZardButtonComponent, ZardBadgeComponent, ZardIconComponent],
  templateUrl: './lista-pacientes.html',
  styleUrl: './lista-pacientes.css',
})
export class ListaPacientes implements OnInit {
  pacienteService = inject(PacienteService);
  usuarioService = inject(LoginService);
  toastService = inject(ToastService);

  pacientes = signal<iPacienteMaxResponse[]>([]);

  ngOnInit(): void {
    this.carregarPacientes();
  }

  private carregarPacientes(): void {
    this.pacienteService.buscarPacientesPorUsuario().subscribe((response) => {
      this.pacientes.set(response);
    });
  }

  editarPaciente(pacienteId: string): void {
    // Lógica para editar paciente
  }

  removerPaciente(pacienteId: string): void {
    this.pacienteService.deletarPaciente(pacienteId).subscribe({
      next: () => {
        this.toastService.exibirToastSucesso('Sucesso', 'Paciente removido com sucesso.');
        this.carregarPacientes();
      },
      error: () => {
        this.toastService.exibirToastErro('Erro', 'Falha ao remover paciente.');
      },
    });
  }
}
