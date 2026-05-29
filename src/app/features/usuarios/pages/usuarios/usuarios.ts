import { CommonModule, NgClass } from '@angular/common';
import { Component, computed, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { UsuarioService } from '@core/services/usuario-service';
import { CadastroUsuario } from '@features/usuarios/components/cadastro-usuario/cadastro-usuario';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { ZardDialogService } from '@shared/components/dialog/dialog.service';
import { ZardIconComponent } from '@shared/components/icon';
import { iUsuarioResponse } from '@shared/models/usuario.model';
import { ToastService } from '@shared/services/toast-service';

@Component({
  selector: 'app-usuarios',
  imports: [CommonModule, NgClass, ZardIconComponent, ZardButtonComponent],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class Usuarios implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly toastService = inject(ToastService);
  private readonly dialog = inject(ZardDialogService);
  private readonly vcr = inject(ViewContainerRef);

  protected readonly loading = signal(true);
  protected readonly atualizandoUsuarioId = signal<string | null>(null);
  protected readonly usuarios = signal<iUsuarioResponse[]>([]);

  protected readonly usuariosOrdenados = computed(() =>
    [...this.usuarios()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
  );

  ngOnInit(): void {
    this.carregarUsuarios();
  }

  protected abrirCadastroUsuario(): void {
    this.dialog.create({
      zContent: CadastroUsuario,
      zTitle: 'Novo usuário',
      zHideFooter: true,
      zViewContainerRef: this.vcr,
      zData: {
        onSaved: () => this.carregarUsuarios(),
      },
    });
  }

  protected carregarUsuarios(): void {
    this.loading.set(true);

    this.usuarioService.listarUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.exibirToastErro('Erro', 'Não foi possível carregar os usuários.');
      },
    });
  }

  protected alternarSituacao(usuario: iUsuarioResponse): void {
    if (usuario.ativo) {
      this.dialog.create({
        zContent: `Tem certeza que deseja inativar o usuário ${usuario.nome}?`,
        zTitle: 'Confirmar inativação',
        zViewContainerRef: this.vcr,
        zOkText: 'Inativar',
        zCancelText: 'Cancelar',
        zOkDestructive: true,
        zOnOk: () => {
          this.confirmarToggleSituacao(usuario);
        },
      });
      return;
    }

    this.confirmarToggleSituacao(usuario);
  }

  private confirmarToggleSituacao(usuario: iUsuarioResponse): void {
    if (this.atualizandoUsuarioId() === usuario.id) {
      return;
    }

    this.atualizandoUsuarioId.set(usuario.id);

    this.usuarioService.toggleSituacaoUsuario(usuario.id).subscribe({
      next: (usuarioAtualizado) => {
        this.usuarios.update((usuarios) =>
          usuarios.map((item) => (item.id === usuarioAtualizado.id ? usuarioAtualizado : item)),
        );
        this.atualizandoUsuarioId.set(null);
        this.toastService.exibirToastSucesso(
          'Usuário atualizado',
          `Usuário ${usuarioAtualizado.ativo ? 'ativado' : 'inativado'} com sucesso.`,
        );
      },
      error: (err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Tente novamente.';
        this.atualizandoUsuarioId.set(null);
        this.toastService.exibirToastErro('Erro ao atualizar usuário', mensagem);
      },
    });
  }

  protected getIniciais(nome: string): string {
    if (!nome) return '';

    const partes = nome.trim().split(/\s+/);

    if (partes.length === 1) {
      return partes[0].substring(0, 2).toUpperCase();
    }

    return (partes[0][0] + partes[1][0]).toUpperCase();
  }
}
