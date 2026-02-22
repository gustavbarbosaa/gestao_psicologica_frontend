import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
  ViewContainerRef,
} from '@angular/core';
import { ZardDialogService } from '@shared/components/dialog/dialog.service';
import { TipoAtendimentoService } from '@core/services/tipo-atendimento';
import { CriarTipoAtendimento } from '@features/tipos-atendimento/components/criar-tipo-atendimento/criar-tipo-atendimento';
import { iTipoAtendimento } from '@shared/models/tipo-atendimento.model';
import { ZardIconComponent } from '@shared/components/icon';
import { ToastService } from '@shared/services/toast-service';
import { ZardButtonComponent } from '@shared/components/button/button.component';

@Component({
  selector: 'app-lista-tipos-atendimento',
  standalone: true,
  imports: [CommonModule, ZardIconComponent, ZardButtonComponent],
  templateUrl: './lista-tipos-atendimento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaTiposAtendimento implements OnInit {
  private readonly dialogService = inject(ZardDialogService);
  private readonly tipoService = inject(TipoAtendimentoService);
  private readonly toastService = inject(ToastService);
  private readonly vcr = inject(ViewContainerRef);

  public tipos = signal<iTipoAtendimento[]>([]);

  ngOnInit(): void {
    this.carregarTipos();
  }

  carregarTipos(): void {
    this.tipoService.buscarTiposAtendimentos().subscribe({
      next: (dados) => this.tipos.set(dados),
      error: () =>
        this.toastService.exibirToastErro('Erro', 'Falha ao carregar tipos de atendimento.'),
    });
  }

  abrirCriar(): void {
    this.dialogService.create({
      zContent: CriarTipoAtendimento,
      zViewContainerRef: this.vcr,
      zData: { onSaved: () => this.carregarTipos() },
      zTitle: 'Criar tipo de atendimento',
    });
  }

  editarTipo(tipo: iTipoAtendimento): void {
    this.dialogService.create({
      zContent: CriarTipoAtendimento,
      zViewContainerRef: this.vcr,
      zData: { id: tipo.id, onSaved: () => this.carregarTipos() },
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
}
