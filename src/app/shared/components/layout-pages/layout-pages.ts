import { Component } from '@angular/core';
import { LayoutComponent } from '../layout/layout.component';
import { ContentComponent } from '../layout/content.component';
import { SidebarComponent } from '../layout/sidebar.component';

@Component({
  selector: 'app-layout-pages',
  imports: [LayoutComponent, ContentComponent, SidebarComponent],
  templateUrl: './layout-pages.html',
  styleUrl: './layout-pages.css',
})
export class LayoutPages {}
