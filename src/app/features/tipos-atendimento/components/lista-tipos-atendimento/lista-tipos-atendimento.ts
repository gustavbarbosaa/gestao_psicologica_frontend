import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ViewContainerRef,
} from '@angular/core';
import { UsuarioService } from '@core/services/usuario-service';
import { ZardDialogService } from '@shared/components/dialog/dialog.service';
import { TipoAtendimentoService } from '@core/services/tipo-atendimento';
import { CriarTipoAtendimento } from '@features/tipos-atendimento/components/criar-tipo-atendimento/criar-tipo-atendimento';
import { iTipoAtendimento } from '@shared/models/tipo-atendimento.model';
import { ZardIconComponent } from '@shared/components/icon';
import { ToastService } from '@shared/services/toast-service';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { iUsuarioResponse } from '@shared/models/usuario.model';
import { LoginService } from '@core/services/login-service';

type GrupoTipoAtendimento = {
  usuarioId: string;
  nomeUsuario: string;
  usuarioAtual: boolean;
  tipos: iTipoAtendimento[];
};

@Component({
  selector: 'app-lista-tipos-atendimento',
  standalone: true,
  imports: [CommonModule, ZardIconComponent, ZardButtonComponent],
  templateUrl: './lista-tipos-atendimento.html',
  styleUrl: './lista-tipos-atendimento.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaTiposAtendimento implements OnInit {
  private readonly dialogService = inject(ZardDialogService);
  private readonly tipoService = inject(TipoAtendimentoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly loginService = inject(LoginService);
  private readonly toastService = inject(ToastService);
  private readonly vcr = inject(ViewContainerRef);

  public readonly usuarioEhAdmin = this.loginService.isAdmin();
  public tipos = signal<iTipoAtendimento[]>([]);
  public usuarios = signal<iUsuarioResponse[]>([]);
  public gruposAbertos = signal<string[]>([]);
  public tiposAgrupados = computed(() => {
    const usuarioAtualId = this.loginService.usuario()?.id;
    const usuariosPorId = new Map(this.usuarios().map((usuario) => [usuario.id, usuario]));
    const grupos = this.tipos().reduce((mapa, tipo) => {
      const usuario = usuariosPorId.get(tipo.usuarioId);
      const nomeUsuario = usuario?.nome ?? 'Usuário não identificado';
      const chave = tipo.usuarioId || 'sem-usuario';
      const grupoAtual = mapa.get(chave);

      if (grupoAtual) {
        grupoAtual.tipos.push(tipo);
        return mapa;
      }

      mapa.set(chave, {
        usuarioId: chave,
        nomeUsuario,
        usuarioAtual: Boolean(usuarioAtualId && tipo.usuarioId === usuarioAtualId),
        tipos: [tipo],
      });

      return mapa;
    }, new Map<string, GrupoTipoAtendimento>());

    return [...grupos.values()]
      .map((grupo) => ({
        ...grupo,
        tipos: [...grupo.tipos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      }))
      .sort((a, b) => {
        if (a.usuarioAtual !== b.usuarioAtual) {
          return a.usuarioAtual ? -1 : 1;
        }

        return a.nomeUsuario.localeCompare(b.nomeUsuario, 'pt-BR');
      });
  });

  ngOnInit(): void {
    if (this.usuarioEhAdmin) {
      this.carregarUsuarios();
    }

    this.carregarTipos();
  }

  carregarTipos(): void {
    this.tipoService.buscarTiposAtendimentos().subscribe({
      next: (dados) => {
        this.tipos.set(dados);
        this.gruposAbertos.set(
          this.tiposAgrupados().map((grupo) => grupo.usuarioId),
        );
      },
      error: () =>
        this.toastService.exibirToastErro('Erro', 'Falha ao carregar tipos de atendimento.'),
    });
  }

  carregarUsuarios(): void {
    this.usuarioService.listarUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
      },
      error: () => {
        this.toastService.exibirToastErro('Erro', 'Falha ao carregar os usuários.');
      },
    });
  }

  abrirCriar(): void {
    this.dialogService.create({
      zContent: CriarTipoAtendimento,
      zViewContainerRef: this.vcr,
      zData: { onSaved: () => this.carregarTipos() },
      zOnOk: (component) => {
        component.criarTipoAtendimento();
        return false;
      },
      zCancelText: 'Cancelar',
      zOkText: 'Salvar',
      zTitle: 'Criar tipo de atendimento',
    });
  }

  editarTipo(tipo: iTipoAtendimento): void {
    this.dialogService.create({
      zContent: CriarTipoAtendimento,
      zViewContainerRef: this.vcr,
      zData: { id: tipo.id, onSaved: () => this.carregarTipos() },
      zOnOk: (component) => {
        component.criarTipoAtendimento();
        return false;
      },
      zCancelText: 'Cancelar',
      zOkText: 'Salvar',
      zTitle: 'Editar tipo de atendimento',
    });
  }

  deletarTipo(tipoId: string): void {
    if (!confirm('Confirma exclusão do tipo de atendimento?')) return;

    this.tipoService.deletarTipoAtendimento(tipoId).subscribe({
      next: () => {
        this.toastService.exibirToastSucesso('Sucesso', 'Tipo de atendimento excluído.');
        this.carregarTipos();
      },
      error: () =>
        this.toastService.exibirToastErro('Erro', 'Falha ao excluir tipo de atendimento.'),
    });
  }

  public grupoAberto(usuarioId: string): boolean {
    return this.gruposAbertos().includes(usuarioId);
  }

  public alternarGrupo(usuarioId: string): void {
    this.gruposAbertos.update((grupos) =>
      grupos.includes(usuarioId)
        ? grupos.filter((grupoId) => grupoId !== usuarioId)
        : [...grupos, usuarioId],
    );
  }
}
