import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WhatsappService {
  abrirConversa(telefone: string, mensagem: string, destino?: Window): void {
    const telefoneFormatado = this.formatarTelefone(telefone);
    const mensagemFormatada = encodeURIComponent(mensagem);
    const url = `https://wa.me/${telefoneFormatado}?text=${mensagemFormatada}`;

    if (destino) {
      destino.location.href = url;
      return;
    }

    const janela = window.open(url, '_blank');

    if (!janela) {
      window.location.href = url;
    }
  }

  formatarTelefone(telefone?: string): string | null {
    const somenteNumeros = telefone?.replace(/\D/g, '');

    if (!somenteNumeros) {
      return null;
    }

    return somenteNumeros.startsWith('55') ? somenteNumeros : `55${somenteNumeros}`;
  }
}
