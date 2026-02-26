import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  signal,
  ViewChild,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { ZardDialogService } from '@shared/components/dialog/dialog.service';
import { CriaAgendamentoForm } from '@features/agendamentos/components/cria-agendamento-form/cria-agendamento-form';
import { iAgendamentoRequest } from '@shared/models/agendamento.model';
import { AgendamentoService } from '@core/services/agendamento-service';
import { ToastService } from '@shared/services/toast-service';
import { Subject, takeUntil } from 'rxjs';
import { TipoAtendimentoService } from '@core/services/tipo-atendimento';
import { EditarAgendamentoForm } from '@features/agendamentos/components/editar-agendamento/editar-agendamento-form';
import { format, differenceInMinutes, parseISO } from 'date-fns';

@Component({
  selector: 'app-agendamentos',
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './agendamentos.html',
  styleUrl: './agendamentos.css',
})
export class Agendamentos implements OnInit, OnDestroy, AfterViewInit {
  private readonly dialogService = inject(ZardDialogService);
  private readonly agendamentoService = inject(AgendamentoService);
  private readonly toastService = inject(ToastService);
  private readonly tipoAtendimentoService = inject(TipoAtendimentoService);
  private readonly DURACAO_PADRAO_EM_MINUTOS = 60;

  protected calendarOptions!: CalendarOptions;
  protected eventosCalendario = signal<any[]>([]);

  private readonly destroy$ = new Subject<void>();

  legendasStatus = [
    { label: 'Pendente', status: 'PENDENTE' },
    { label: 'Confirmado', status: 'CONFIRMADO' },
    { label: 'Cobrança Gerada', status: 'COBRANCA_GERADA' },
    { label: 'Outros', status: 'DEFAULT' },
  ];

  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  ngOnInit(): void {
    this.calendarOptions = this.iniciarCalendario();

    this.agendamentoService.agendamentoCriado$
      .pipe(takeUntil(this.destroy$))
      .subscribe((novoAgendamento) => {
        this.adicionarEventoUnicoNoCalendario(novoAgendamento);
      });
  }

  ngAfterViewInit(): void {
    this.carregarAgendamentosIniciais();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private iniciarCalendario(): CalendarOptions {
    return {
      initialView: 'timeGridWeek',
      plugins: [dayGridPlugin, interactionPlugin, timeGridPlugin],
      weekends: false,
      locale: ptBrLocale,
      locales: [ptBrLocale],
      editable: true,
      eventDurationEditable: true,
      eventDrop: (arg) => this.handleEventResizeOrDrop(arg),
      eventResize: (arg) => this.handleEventResizeOrDrop(arg),
      dateClick: (arg: DateClickArg) => this.handleDateClick(arg),
      eventDisplay: 'block',
      eventClassNames: function (arg) {
        const status = arg.event.extendedProps['agendamento'].statusAtendimento;

        return ['status-' + status.toLowerCase()];
      },
      eventContent: (arg) => this.criaCardEventAgenddamento(arg),
      eventClick: (arg: EventClickArg) => this.handleEventClick(arg),
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      },
      slotLabelFormat: {
        hour: '2-digit',
        minute: '2-digit',
        omitZeroMinute: false,
        meridiem: false,
      },
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        meridiem: false,
      },
    };
  }

  handleEventResizeOrDrop(arg: EventResizeDoneArg | EventClickArg): void {
    const agendamento: any = (arg.event.extendedProps as any)?.agendamento;

    const dataHoraInicio = arg.event.start ? format(arg.event.start, "yyyy-MM-dd'T'HH:mm:ss") : '';
    const dataHoraFim = arg.event.end ? format(arg.event.end, "yyyy-MM-dd'T'HH:mm:ss") : '';

    const agendamentoRequest: iAgendamentoRequest = {
      dataHoraInicio: dataHoraInicio,
      duracaoEmMinutos: this.calculaDuracaoEmMinutos(dataHoraInicio, dataHoraFim),
      usuarioId: agendamento.usuario?.id || '',
      pacienteId: agendamento.paciente?.id || '',
      tipoAtendimentoId: agendamento.tipoAtendimento?.id || '',
    };

    this.agendamentoService.editarAgendamento(arg.event.id, agendamentoRequest).subscribe({
      next: (response) => {
        this.toastService.exibirToastSucesso(
          'Agendamento atualizado',
          `Agendamento para ${response.paciente.nome} atualizado.`,
        );
      },
      error: (err) => {
        const mensagem = err.error?.erros?.[0] ?? err.error?.message ?? 'Erro inesperado';

        this.toastService.exibirToastErro(
          'Erro',
          'Não foi possível atualizar o agendamento: ' + mensagem,
        );
        console.error('Erro ao editar agendamento', err);
      },
    });
  }

  carregarAgendamentosIniciais(): void {
    this.agendamentoService.buscarAgendamentosPorUsuario().subscribe({
      next: (agendamentos) => {
        const eventosFormatados = agendamentos.map((agendamento) => ({
          id: agendamento.id,
          title: agendamento.paciente.nome,
          start: agendamento.dataHoraInicio,
          end: agendamento.dataHoraFim,
          color: this.getCorAgendamentoPorStatus(agendamento.statusPagamento),
          extendedProps: { agendamento },
        }));

        const api = this.calendarComponent.getApi();
        api.removeAllEvents();
        api.addEventSource(eventosFormatados);
      },
      error: () => {
        this.toastService.exibirToastErro('Erro', 'Erro ao carregar agendamentos.');
      },
    });
  }

  private adicionarEventoUnicoNoCalendario(agendamento: any): void {
    const eventoFormatado = {
      id: agendamento.id,
      title: agendamento.paciente.nome,
      start: agendamento.dataHoraInicio,
      end: agendamento.dataHoraFim,
      color: this.getCorAgendamentoPorStatus(agendamento.statusPagamento),
      extendedProps: { agendamento },
    };

    this.calendarComponent.getApi().addEvent(eventoFormatado);
  }

  handleDateClick(arg: DateClickArg): void {
    this.abrirModal(arg);
  }

  private adicionarEventoNoCalendario(agendamento: any): void {
    const eventoFormatado = {
      id: agendamento.id,
      title: agendamento.paciente.nome,
      start: agendamento.dataHoraInicio,
      end: agendamento.dataHoraFim,
      color: this.getCorAgendamentoPorStatus(agendamento.statusPagamento),
      statusPagamento: agendamento.statusPagamento,
      extendedProps: { agendamento },
    };

    this.calendarComponent.getApi().addEvent(eventoFormatado);
  }

  carregarAgendamentos(): void {
    this.agendamentoService.buscarAgendamentosPorUsuario().subscribe({
      next: (agendamentos) => {
        this.adicionarEventoNoCalendario(agendamentos);
      },
      error: () => {
        this.toastService.exibirToastErro(
          'Erro ao carregar agendamentos',
          'Tente novamente mais tarde.',
        );
      },
    });
  }

  abrirModal(arg: DateClickArg): void {
    this.dialogService.create({
      zTitle: 'Cadastrar Agendamento',
      zDescription: `Preencha o formulário abaixo para criar um novo agendamento.`,
      zContent: CriaAgendamentoForm,
      zData: {
        dataHoraInicio: arg.date,
        duracaoEmMinutos: this.DURACAO_PADRAO_EM_MINUTOS,
        pacienteId: '',
        usuarioId: '',
      },
      zOkIcon: 'check',
      zCancelIcon: 'x',
      zOkText: 'Salvar',
      zCancelText: 'Cancelar',
      zOnOk: (instance) => {
        const form = instance.form;

        if (form.valid) {
          const payload = form.getRawValue() as iAgendamentoRequest;
          this.criarAgendamento(payload);
        } else {
          this.toastService.exibirToastErro(
            'Formulário inválido',
            'Por favor, preencha todos os campos corretamente.',
          );
        }
      },
    });
  }

  abrirModalEdicao(arg: DateClickArg): void {
    console.log(arg);
    this.dialogService.create({
      zTitle: 'Editar Agendamento',
      zDescription: `Preencha o formulário abaixo para editar o agendamento.`,
      zContent: EditarAgendamentoForm,
      zData: {
        dataHoraInicio: arg.date,
        duracaoEmMinutos: this.DURACAO_PADRAO_EM_MINUTOS,
        pacienteId: '',
        usuarioId: '',
      },
      zOkIcon: 'check',
      zCancelIcon: 'x',
      zOkText: 'Salvar',
      zCancelText: 'Cancelar',
      zOnOk: (instance) => {
        const form = instance.form;

        if (form.valid) {
          const payload = form.getRawValue() as iAgendamentoRequest;
          this.criarAgendamento(payload);
        } else {
          this.toastService.exibirToastErro(
            'Formulário inválido',
            'Por favor, preencha todos os campos corretamente.',
          );
        }
      },
    });
  }

  handleEventClick(arg: EventClickArg): void {
    const event = arg.event;

    const agendamento = (event.extendedProps as any)?.agendamento;

    if (!agendamento) {
      const agendamentoId = event.id;
      this.agendamentoService.buscarAgendamentosPorUsuario().subscribe({
        next: (agendamentos) => {
          const found = agendamentos.find((a) => a.id === agendamentoId);
          if (found) {
            this.abrirModalEdicaoComAgendamento(found);
          } else {
            this.toastService.exibirToastErro('Erro', 'Dados do agendamento não encontrados.');
          }
        },
        error: () => {
          this.toastService.exibirToastErro(
            'Erro',
            'Não foi possível carregar dados do agendamento.',
          );
        },
      });
      return;
    }

    this.abrirModalEdicaoComAgendamento(agendamento);
  }

  private abrirModalEdicaoComAgendamento(agendamento: any): void {
    this.dialogService.create({
      zTitle: 'Editar Agendamento',
      zDescription: `Preencha o formulário abaixo para editar o agendamento.`,
      zContent: EditarAgendamentoForm,
      zData: {
        dataHoraInicio: agendamento.dataHoraInicio,
        duracaoEmMinutos: this.calculaDuracaoEmMinutos(
          agendamento.dataHoraInicio,
          agendamento.dataHoraFim,
        ),
        pacienteId: agendamento.paciente?.id || '',
        usuarioId: agendamento.usuario?.id || '',
        tipoAtendimentoId: agendamento.tipoAtendimento?.id || '',
      },
      zOkIcon: 'check',
      zCancelIcon: 'x',
      zOkText: 'Salvar',
      zCancelText: 'Cancelar',
      zOnOk: (instance) => {
        const form = instance.form;

        if (form.valid) {
          const payload = form.getRawValue() as iAgendamentoRequest;
          this.agendamentoService.editarAgendamento(agendamento.id, payload).subscribe({
            next: (updated) => {
              this.toastService.exibirToastSucesso(
                'Agendamento atualizado',
                `Agendamento para ${updated.paciente.nome} atualizado.`,
              );

              const applyUpdated = (ag: any) => {
                const api = this.calendarComponent.getApi();
                const existing = api.getEventById(ag.id);

                const eventoFormatado = {
                  id: ag.id,
                  title: ag.paciente.nome,
                  start: ag.dataHoraInicio,
                  end: ag.dataHoraFim,
                  color: this.getCorAgendamentoPorStatus(ag.statusPagamento),
                  extendedProps: { agendamento: ag },
                };

                if (existing) {
                  existing.remove();
                }

                api.addEvent(eventoFormatado);
              };

              if (!updated.tipoAtendimento && (updated as any).tipoAtendimentoId) {
                this.tipoAtendimentoService
                  .buscarTipoAtendimentoPorId((updated as any).tipoAtendimentoId)
                  .subscribe({
                    next: (tipo) => {
                      (updated as any).tipoAtendimento = tipo;
                      applyUpdated(updated);
                    },
                    error: () => {
                      applyUpdated(updated);
                    },
                  });
              } else {
                applyUpdated(updated);
              }
            },
            error: (err) => {
              this.toastService.exibirToastErro(
                'Erro',
                'Não foi possível atualizar o agendamento.',
              );
              console.error('Erro ao editar agendamento', err);
            },
          });
        } else {
          this.toastService.exibirToastErro(
            'Formulário inválido',
            'Por favor, preencha todos os campos corretamente.',
          );
        }
      },
    });
  }

  private criarAgendamento(payload: iAgendamentoRequest): void {
    this.agendamentoService.criarAgendamento(payload).subscribe({
      next: (agendamento) => {
        this.toastService.exibirToastSucesso(
          'Agendamento criado com sucesso!',
          `Agendamento para ${agendamento.paciente.nome} criado.`,
        );
      },
      error: (err) => {
        this.toastService.exibirToastErro(
          'Erro ao criar agendamento',
          'Tente novamente mais tarde.',
        );
        console.error('Erro ao criar agendamento', err);
      },
    });
  }

  getCorAgendamentoPorStatus(statusPagamento: string): string {
    switch (statusPagamento) {
      case 'PENDENTE':
        return '#FFA500';
      case 'CONFIRMADO':
        return '#4CAF50';
      case 'COBRANCA_GERADA':
        return '#0288D1';
      default:
        return '#9E9E9E';
    }
  }

  private calculaDuracaoEmMinutos(dataHoraInicio: string, dataHoraFim: string): number {
    const inicio = parseISO(dataHoraInicio);
    const fim = parseISO(dataHoraFim);

    return differenceInMinutes(fim, inicio);
  }

  private criaCardEventAgenddamento(arg: EventContentArg) {
    const agendamento = arg.event.extendedProps['agendamento'];

    let iconPagamento = '';
    let iconTipo = '';
    let statusBorderClass = '';

    switch (agendamento.statusPagamento) {
      case 'PENDENTE':
        iconPagamento = 'fa-clock';
        break;
      case 'CONFIRMADO':
        iconPagamento = 'fa-check';
        break;
      case 'COBRANCA_GERADA':
        iconPagamento = 'fa-dollar-sign';
        break;
    }

    switch (agendamento.tipoAtendimento?.nome) {
      case 'PRESENCIAL':
        iconTipo = 'fa-building';
        break;
      case 'ONLINE':
        iconTipo = 'fa-video';
        break;
    }

    switch (agendamento.statusAtendimento) {
      case 'CONFIRMADO':
        statusBorderClass = 'border-primary';
        break;

      case 'CANCELADO':
        statusBorderClass = 'border-destructive';
        break;

      case 'EM_ANDAMENTO':
        statusBorderClass = 'border-chart-5';
        break;

      case 'CONCLUIDO':
        statusBorderClass = 'border-secondary-foreground';
        break;

      case 'REAGENDADO':
        statusBorderClass = 'border-chart-3';
        break;

      default:
        statusBorderClass = 'border-muted-foreground';
    }

    return {
      html: `
    <div class="
      h-full
      flex flex-col
      px-2 py-1
      bg-card
      text-card-foreground
      border border-border
      border-l-4 ${statusBorderClass}
      rounded-lg
      shadow-sm
      hover:bg-accent
      hover:shadow-md
      transition-all
      overflow-hidden
    ">

      <div class="flex items-start gap-1.5 min-w-0">

        <i class="fas ${iconTipo} text-xs text-muted-foreground shrink-0 mt-0.5"></i>

        <span class="text-sm font-medium truncate">
          ${arg.event.title}
        </span>

        <i class="fas ${iconPagamento} text-xs text-muted-foreground/70 shrink-0 ml-auto mt-0.5"></i>

      </div>

      <div class="
        flex items-center gap-1
        text-xs text-muted-foreground
        mt-0.5
        truncate
      ">
        <span class="whitespace-nowrap">${arg.timeText}</span>
        <span>•</span>
        <span class="font-medium truncate">
          ${agendamento.statusAtendimento}
        </span>
      </div>

    </div>
  `,
    };
  }
}
