import { Component } from '@angular/core';
import { ListaTiposAtendimento } from '@features/tipos-atendimento/components/lista-tipos-atendimento/lista-tipos-atendimento';

@Component({
  selector: 'app-tipos-atendimento',
  imports: [ListaTiposAtendimento],
  templateUrl: './tipos-atendimento.html',
  styleUrl: './tipos-atendimento.css',
})
export class TiposAtendimento {}
