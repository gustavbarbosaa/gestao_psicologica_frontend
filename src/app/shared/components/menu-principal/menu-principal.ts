import { Component, OnInit } from '@angular/core';
import { iOpcaoMenuLateral } from '@shared/models/opcao-menu.model';
import { ZardIconComponent } from '../icon/icon.component';
import { RouterLink } from '@angular/router';
import { ZardDividerComponent } from '../divider/divider.component';

@Component({
  selector: 'app-menu-principal',
  imports: [ZardIconComponent, RouterLink, ZardDividerComponent],
  templateUrl: './menu-principal.html',
  styleUrl: './menu-principal.css',
})
export class MenuPrincipal implements OnInit {
  listaMenus: iOpcaoMenuLateral[] = [];

  private iniciarListaMenus(): void {
    this.listaMenus = [
      {
        icone: 'layout-dashboard',
        titulo: 'Dashboard',
        url: '#',
      },
      {
        icone: 'calendar',
        titulo: 'Agendamentos',
        url: '#',
      },
      {
        icone: 'users',
        titulo: 'Pacientes',
        url: '#',
      },
      {
        icone: 'circle-dollar-sign',
        titulo: 'Financeiro',
        url: '#',
      },
      {
        icone: 'file-text',
        titulo: 'Relatórios',
        url: '#',
      },
    ];
  }

  ngOnInit(): void {
    this.iniciarListaMenus();
  }
}
