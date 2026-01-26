import { Component } from '@angular/core';
import { ListaPacientes } from '@features/pacientes/components/lista-pacientes/lista-pacientes';

@Component({
  selector: 'app-pacientes',
  imports: [ListaPacientes],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css',
})
export class Pacientes {}
