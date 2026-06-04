import { Component, computed, inject, signal } from '@angular/core';
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
export class MenuPrincipal {
  private loginService = inject(LoginService);
  private toastService = inject(ToastService);

  protected loading = signal<boolean>(false);
  protected readonly isAdmin = computed(() => this.loginService.isAdmin());
  protected readonly listaMenus = computed(() => {
    const menus: iOpcaoMenuLateral[] = [
      {
        icone: 'layout-dashboard',
        titulo: 'Dashboard',
        url: '/home',
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
        url: '/financeiro',
      },
    ];

    if (this.loginService.hasAuthority('EVOLUCAO_VISUALIZAR')) {
      menus.push({
        icone: 'book-open-text',
        titulo: 'Evoluções',
        url: '/evolucoes',
      });
    }

    if (this.isAdmin()) {
      menus.push({
        icone: 'shield',
        titulo: 'Usuários',
        url: '/usuarios',
      });
    }

    return menus;
  });

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
