import { Component, inject, OnInit, signal } from '@angular/core';
import { LayoutComponent } from '../layout/layout.component';
import { ContentComponent } from '../layout/content.component';
import { SidebarComponent } from '../layout/sidebar.component';
import { Logo } from '../logo/logo';
import { AvatarInfo } from '../avatar-info/avatar-info';
import { MenuPrincipal } from '../menu-principal/menu-principal';
import { LoginService } from '@core/services/login-service';
import { ZardIconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-layout-pages',
  imports: [
    LayoutComponent,
    ContentComponent,
    SidebarComponent,
    Logo,
    AvatarInfo,
    MenuPrincipal,
    ZardIconComponent,
  ],
  templateUrl: './layout-pages.html',
  styleUrl: './layout-pages.css',
})
export class LayoutPages implements OnInit {
  private loginService = inject(LoginService);

  usuario = this.loginService.usuario;
  protected readonly menuMobileAberto = signal(false);

  ngOnInit(): void {
    this.loginService.carregarUsuario().subscribe();
  }

  protected abrirMenuMobile(): void {
    this.menuMobileAberto.set(true);
  }

  protected fecharMenuMobile(): void {
    this.menuMobileAberto.set(false);
  }
}
