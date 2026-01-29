import { Component, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { ListaPacientes } from '@features/pacientes/components/lista-pacientes/lista-pacientes';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { ZardDialogService } from '@shared/components/dialog/dialog.service';
import { CadastroPaciente } from '@features/pacientes/components/cadastro-paciente/cadastro-paciente';
import { ZardIconComponent } from '@shared/components/icon';
import { ZardInputGroupComponent } from '@shared/components/input-group';

@Component({
  selector: 'app-pacientes',
  imports: [ListaPacientes, ZardButtonComponent, ZardIconComponent, ZardInputGroupComponent],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css',
})
export class Pacientes {
  private dialog = inject(ZardDialogService);

  @ViewChild('lista') lista?: ListaPacientes;
  private vcr = inject(ViewContainerRef);

  abrirCadastro(): void {
    this.dialog.create({
      zContent: CadastroPaciente,
      zTitle: 'Novo paciente',
      zHideFooter: true,
      zViewContainerRef: this.vcr,
      zData: {
        onSaved: () => this.lista?.carregarPacientes(),
      },
    });
  }
}
