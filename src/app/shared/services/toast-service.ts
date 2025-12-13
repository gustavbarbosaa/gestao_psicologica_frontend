import { Injectable } from '@angular/core';
import { toast } from 'ngx-sonner';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  exibirToastSucesso(titulo: string, descricao: string): void {
    toast.success(titulo, {
      description: descricao,
    });
  }

  exibirToastErro(titulo: string, descricao: string): void {
    toast.error(titulo, {
      description: descricao,
    });
  }
}
