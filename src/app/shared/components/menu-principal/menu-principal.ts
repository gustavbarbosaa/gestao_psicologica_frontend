import { Component, inject, OnInit, signal } from '@angular/core';
import { iOpcaoMenuLateral } from '@shared/models/opcao-menu.model';
import { ZardIconComponent } from '../icon/icon.component';
import { RouterLink } from '@angular/router';
import { ZardDividerComponent } from '../divider/divider.component';
import { LoginService } from '@core/services/login-service';
import { ToastService } from '@shared/services/toast-service';

@Component({
  selector: 'app-menu-principal',
  imports: [ZardIconComponent, RouterLink, ZardDividerComponent],
  templateUrl: './menu-principal.html',
  styleUrl: './menu-principal.css',
})
export class MenuPrincipal implements OnInit {
  private loginService = inject(LoginService);
  private toastService = inject(ToastService);

  protected loading = signal<boolean>(false);

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
        url: '/agendamentos',
      },
      {
        icone: 'settings',
        titulo: 'Tipos de atendimento',
        url: '/tipos-atendimento',
      },
      {
        icone: 'users',
        titulo: 'Pacientes',
        url: '/pacientes',
      },
      {
        icone: 'circle-dollar-sign',
        titulo: 'Financeiro',
        url: '#',
      },
    ];
  }

  ngOnInit(): void {
    this.iniciarListaMenus();
  }

  logout(): void {
    this.loading.set(true);

    this.loginService.logout().subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.exibirToastSucesso('Você saiu com sucesso!', 'Saindo da conta...');
      },
      error: () => {
        this.loading.set(false);
        this.toastService.exibirToastErro('Erro ao sair da conta.', 'Tente novamente mais tarde.');
      },
      complete: () => {
        this.loading.set(false);
      },
    });
  }
}
