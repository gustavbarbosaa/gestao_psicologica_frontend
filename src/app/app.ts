import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginService } from '@core/services/login-service';
import { Login } from '@features/login/pages/login/login';
import { ZardToastComponent } from '@shared/components/toast/toast.component';
import { LayoutPages } from '@shared/components/layout-pages/layout-pages';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ZardToastComponent, Login, LayoutPages],
  template: `
    @if (estadoUsuarioLogado()) {
      <app-layout-pages>
        <router-outlet />
      </app-layout-pages>

      <z-toaster></z-toaster>
    } @else if (!estadoUsuarioLogado()) {
      <app-login />
    } @else {
      <p>Carregando...</p>
    }
  `,
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly title = signal('gestao_psicologica_frontend');
  private loginService = inject(LoginService);

  protected readonly estadoUsuarioLogado = this.loginService.isLogado();

  ngOnInit(): void {
    this.loginService.verificaUsuarioLogado().subscribe();
  }
}
