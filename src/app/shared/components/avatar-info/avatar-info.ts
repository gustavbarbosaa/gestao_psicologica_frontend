import { Component, computed, input } from '@angular/core';
import { ZardAvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'app-avatar-info',
  imports: [ZardAvatarComponent],
  templateUrl: './avatar-info.html',
  styleUrl: './avatar-info.css',
})
export class AvatarInfo {
  nome = input.required<string>();
  email = input.required<string>();

  iniciais = computed(() => {
    const nome = this.nome()?.trim();

    if (!nome) return '';

    const partes = nome.split(/\s+/);

    if (partes.length > 1) {
      return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
    }

    const palavra = partes[0];
    const meio = Math.floor(palavra.length / 2);

    return (palavra.charAt(0) + palavra.charAt(meio)).toUpperCase();
  });
}
