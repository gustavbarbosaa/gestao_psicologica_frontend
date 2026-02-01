import { Component, OnInit, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { ListaPacientes } from '@features/pacientes/components/lista-pacientes/lista-pacientes';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { ZardDialogService } from '@shared/components/dialog/dialog.service';
import { CadastroPaciente } from '@features/pacientes/components/cadastro-paciente/cadastro-paciente';
import { ZardIconComponent } from '@shared/components/icon';
import { ZardInputGroupComponent } from '@shared/components/input-group';
import { ZardSelectItemComponent } from '@shared/components/select/select-item.component';
import { ZardSelectComponent } from '@shared/components/select/select.component';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pacientes',
  imports: [
    ListaPacientes,
    ZardButtonComponent,
    ZardIconComponent,
    ZardInputGroupComponent,
    ZardSelectItemComponent,
    ZardSelectComponent,
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css',
})
export class Pacientes implements OnInit {
  private dialog = inject(ZardDialogService);
  private fb = inject(FormBuilder);

  formFiltro!: FormGroup;

  @ViewChild('lista') lista?: ListaPacientes;
  private vcr = inject(ViewContainerRef);

  ngOnInit(): void {
    this.iniciarForm();

    this.formFiltro.valueChanges.subscribe((valores) => {
      this.lista?.filtrarLista({
        nome: valores.nome,
        ativo: valores.ativo,
      });
    });
  }

  private iniciarForm(): void {
    this.formFiltro = this.fb.group({
      nome: [''],
      ativo: ['todos'],
    });
  }

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
