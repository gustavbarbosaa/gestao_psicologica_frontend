import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginService } from '@core/services/login-service';
import { Login } from '@features/login/pages/login/login';
import { ContentComponent } from '@shared/components/layout/content.component';
import { LayoutComponent } from '@shared/components/layout/layout.component';
import { ZardToastComponent } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LayoutComponent, ContentComponent, ZardToastComponent, Login],
  template: `
    @if (estadoUsuarioLogado()) {
      <div class="flex flex-col items-center justify-center h-full w-full gap-6">
        <z-layout class="overflow-hidden rounded-lg">
          <z-content class="min-h-[200px] flex items-center justify-center h-full w-full">
            <router-outlet />
          </z-content>
        </z-layout>
      </div>
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
