import { Component, inject, OnInit, signal } from '@angular/core';
import { ZardIconComponent } from '@shared/components/icon';
import { PacienteService } from '@core/services/paciente-service';
import { ZardDialogService } from '@shared/components/dialog/dialog.service';
import { ViewContainerRef } from '@angular/core';
import { CadastroPaciente } from '../cadastro-paciente/cadastro-paciente';
import { LoginService } from '@core/services/login-service';
import { iPacienteMaxResponse } from '@shared/models/paciente.model';
import { ToastService } from '@shared/services/toast-service';
import { ZardTableImports } from '@shared/components/table';
import { CurrencyPipe, NgClass } from '@angular/common';
import { NgxMaskPipe } from 'ngx-mask';
import { EditarPaciente } from '../editar-paciente/editar-paciente';

@Component({
  selector: 'app-lista-pacientes',
  imports: [ZardTableImports, ZardIconComponent, NgClass, CurrencyPipe, NgxMaskPipe],
  templateUrl: './lista-pacientes.html',
  styleUrl: './lista-pacientes.css',
})
export class ListaPacientes implements OnInit {
  pacienteService = inject(PacienteService);
  usuarioService = inject(LoginService);
  toastService = inject(ToastService);
  private dialog = inject(ZardDialogService);
  private vcr = inject(ViewContainerRef);

  pacientes = signal<iPacienteMaxResponse[]>([]);

  ngOnInit(): void {
    this.carregarPacientes();
  }

  public carregarPacientes(): void {
    this.pacienteService.buscarPacientesPorUsuario().subscribe((response) => {
      this.pacientes.set(response);
    });
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

  abrirModal(pacienteId: string): void {
    if (!pacienteId) {
      this.dialog.create({
        zContent: CadastroPaciente,
        zTitle: 'Novo paciente',
        zHideFooter: true,
        zViewContainerRef: this.vcr,
        zData: {
          onSaved: () => this.carregarPacientes(),
        },
      });
    } else {
      const dialogRef = this.dialog.create({
        zContent: EditarPaciente,
        zTitle: 'Editar paciente',
        zHideFooter: true,
        zViewContainerRef: this.vcr,
        zData: {
          pacienteId: pacienteId,
          onSaved: () => this.carregarPacientes(),
        },
      });
    }
  }

  protected getIniciais(nomePaciente: string): string {
    if (!nomePaciente) return '';
    const partes = nomePaciente.trim().split(/\s+/);

    if (partes.length === 1) {
      return partes[0].substring(0, 2).toUpperCase();
    }

    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
}
