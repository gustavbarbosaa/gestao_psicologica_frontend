import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ContentComponent } from '@shared/components/layout/content.component';
import { LayoutComponent } from '@shared/components/layout/layout.component';
import { ZardToastComponent } from '@shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LayoutComponent, ContentComponent, ZardToastComponent],
  template: ` <div class="flex flex-col items-center justify-center h-full w-full gap-6">
      <z-layout class="overflow-hidden rounded-lg">
        <z-content class="min-h-[200px] flex items-center justify-center h-full w-full">
          <router-outlet />
        </z-content>
      </z-layout>
    </div>
    <z-toaster></z-toaster>`,
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('gestao_psicologica_frontend');
}
