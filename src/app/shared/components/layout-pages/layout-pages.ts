import { Component, inject } from '@angular/core';
import { LayoutComponent } from '../layout/layout.component';
import { ContentComponent } from '../layout/content.component';
import { SidebarComponent } from '../layout/sidebar.component';
import { Logo } from '../logo/logo';
import { AvatarInfo } from '../avatar-info/avatar-info';
import { MenuPrincipal } from '../menu-principal/menu-principal';
import { LoginService } from '@core/services/login-service';

@Component({
  selector: 'app-layout-pages',
  imports: [LayoutComponent, ContentComponent, SidebarComponent, Logo, AvatarInfo, MenuPrincipal],
  templateUrl: './layout-pages.html',
  styleUrl: './layout-pages.css',
})
export class LayoutPages {
  private loginService = inject(LoginService);
  usuario = this.loginService.usuario;
}
