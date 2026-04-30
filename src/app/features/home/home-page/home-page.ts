import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AgendamentoService } from '@core/services/agendamento-service';
import { ZardButtonComponent } from '@shared/components/button/button.component';
import { ZardIconComponent } from '@shared/components/icon/icon.component';
import {
  iAgendamentoResponse,
  StatusAtendimento,
  StatusPagamento,
} from '@shared/models/agendamento.model';
import { ToastService } from '@shared/services/toast-service';
import {
  endOfDay,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
} from 'date-fns';

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, RouterLink, ZardButtonComponent, ZardIconComponent],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit {
  private readonly agendamentoService = inject(AgendamentoService);
  private readonly toastService = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly agendamentos = signal<iAgendamentoResponse[]>([]);

  protected readonly hoje = new Date();
  protected readonly inicioDia = startOfDay(this.hoje);
  protected readonly fimDia = endOfDay(this.hoje);
  protected readonly inicioMes = startOfMonth(this.hoje);
  protected readonly fimMes = endOfMonth(this.hoje);

  protected readonly agendamentosHoje = computed(() =>
    this.agendamentos()
      .filter((agendamento) =>
        this.estaNoIntervalo(agendamento.dataHoraInicio, this.inicioDia, this.fimDia),
      )
      .sort((a, b) => this.compararPorData(a, b)),
  );

  protected readonly agendamentosMes = computed(() =>
    this.agendamentos().filter((agendamento) =>
      this.estaNoIntervalo(agendamento.dataHoraInicio, this.inicioMes, this.fimMes),
    ),
  );

  protected readonly proximosAtendimentos = computed(() =>
    this.agendamentosHoje()
      .filter(
        (agendamento) => parseISO(agendamento.dataHoraInicio).getTime() >= this.hoje.getTime(),
      )
      .slice(0, 5),
  );

  protected readonly pendencias = computed(() =>
    this.agendamentosMes()
      .filter((agendamento) => this.deveCobrar(agendamento))
      .sort((a, b) => this.compararPorData(a, b))
      .slice(0, 6),
  );

  protected readonly resumo = computed(() => {
    const agendamentosHoje = this.agendamentosHoje();
    const agendamentosMes = this.agendamentosMes();

    return {
      atendimentosHoje: agendamentosHoje.length,
      confirmadosHoje: agendamentosHoje.filter((item) => item.statusAtendimento === 'CONFIRMADO')
        .length,
      receitaTotalMes: this.somarValores(agendamentosMes),
      receitaConfirmadaMes: this.somarValores(
        agendamentosMes.filter((item) => item.statusPagamento === 'CONFIRMADO'),
      ),
      receitaPendenteMes: this.somarValores(
        agendamentosMes.filter((item) => this.deveCobrar(item)),
      ),
      pagamentosPendentes: agendamentosMes.filter((item) => this.deveCobrar(item)).length,
      concluidosMes: agendamentosMes.filter((item) => item.statusAtendimento === 'CONCLUIDO')
        .length,
    };
  });

  ngOnInit(): void {
    this.carregarAgendamentos();
  }

  protected carregarAgendamentos(): void {
    this.loading.set(true);

    this.agendamentoService.buscarAgendamentosPorUsuario().subscribe({
      next: (agendamentos) => {
        this.agendamentos.set(agendamentos);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toastService.exibirToastErro(
          'Erro',
          'Nao foi possivel carregar os dados do dashboard.',
        );
      },
    });
  }

  protected formatarDataHora(data: string): string {
    return format(parseISO(data), 'dd/MM HH:mm');
  }

  protected formatarHora(data: string): string {
    return format(parseISO(data), 'HH:mm');
  }

  protected formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  protected getLabelStatus(status: StatusAtendimento | StatusPagamento): string {
    const labels: Record<string, string> = {
      CRIADO: 'Criado',
      CONFIRMADO: 'Confirmado',
      CANCELADO: 'Cancelado',
      CONCLUIDO: 'Concluido',
      REAGENDADO: 'Reagendado',
      NAO_COMPARECEU: 'Nao compareceu',
      PENDENTE: 'Pendente',
      COBRANCA_GERADA: 'Cobranca gerada',
    };

    return labels[status] ?? status;
  }

  protected getClasseStatus(status: StatusAtendimento | StatusPagamento): string {
    const classes: Record<string, string> = {
      CRIADO: 'status-neutral',
      CONFIRMADO: 'status-success',
      CANCELADO: 'status-danger',
      CONCLUIDO: 'status-success',
      REAGENDADO: 'status-info',
      NAO_COMPARECEU: 'status-muted',
      PENDENTE: 'status-warning',
      COBRANCA_GERADA: 'status-info',
    };

    return classes[status] ?? 'status-neutral';
  }

  protected valorAgendamento(agendamento: iAgendamentoResponse): number {
    return Number(agendamento.tipoAtendimento?.valorPadraoTipoAtendimento ?? 0);
  }

  protected getIniciais(nomePaciente: string): string {
    if (!nomePaciente) return '';

    const partes = nomePaciente.trim().split(/\s+/);

    if (partes.length === 1) {
      return partes[0].substring(0, 2).toUpperCase();
    }

    return (partes[0][0] + partes[1][0]).toUpperCase();
  }

  protected percentualRecebidoMes(): number {
    const total = this.resumo().receitaTotalMes;

    if (!total) {
      return 0;
    }

    return Math.min(100, Math.round((this.resumo().receitaConfirmadaMes / total) * 100));
  }

  private estaNoIntervalo(data: string, start: Date, end: Date): boolean {
    return isWithinInterval(parseISO(data), { start, end });
  }

  private compararPorData(a: iAgendamentoResponse, b: iAgendamentoResponse): number {
    return parseISO(a.dataHoraInicio).getTime() - parseISO(b.dataHoraInicio).getTime();
  }

  private somarValores(agendamentos: iAgendamentoResponse[]): number {
    return agendamentos.reduce((total, item) => total + this.valorAgendamento(item), 0);
  }

  private deveCobrar(agendamento: iAgendamentoResponse): boolean {
    return (
      agendamento.statusAtendimento !== 'CANCELADO' && agendamento.statusPagamento !== 'CONFIRMADO'
    );
  }
}
