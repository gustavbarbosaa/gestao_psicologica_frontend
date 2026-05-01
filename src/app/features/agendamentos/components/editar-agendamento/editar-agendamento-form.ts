import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ZardIconComponent } from '@shared/components/icon';
import { ZardSelectItemComponent } from '@shared/components/select/select-item.component';
import { ZardSelectComponent } from '@shared/components/select/select.component';
import {
  iAgendamentoRequestForm,
  iAgendamentoResponse,
  StatusAtendimento,
  StatusPagamento,
} from '@shared/models/agendamento.model';
import { iPacienteMaxResponse } from '@shared/models/paciente.model';
import { Z_MODAL_DATA } from '@shared/components/dialog/dialog.service';
import { LoginService } from '@core/services/login-service';
import { PacienteService } from '@core/services/paciente-service';
import { TipoAtendimentoService } from '@core/services/tipo-atendimento';
import { iTipoAtendimento } from '@shared/models/tipo-atendimento.model';
import { ToastService } from '@shared/services/toast-service';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';

type EditarAgendamentoModalData = {
  dataHoraInicio?: string | Date;
  duracaoEmMinutos?: number;
  pacienteId?: string;
  usuarioId?: string;
  tipoAtendimentoId?: string;
  agendamento?: iAgendamentoResponse;
  onChangeStatusAtendimento?: (status: StatusAtendimento) => Observable<iAgendamentoResponse>;
  onConfirmarPagamento?: () => void;
  onGerarCobranca?: () => Observable<iAgendamentoResponse>;
};

@Component({
  selector: 'app-editar-agendamento',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ZardSelectComponent,
    ZardSelectItemComponent,
    ZardIconComponent,
  ],
  templateUrl: './editar-agendamento-form.html',
  styleUrl: './editar-agendamento-form.css',
})
export class EditarAgendamentoForm implements OnInit, OnDestroy {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly loginService = inject(LoginService);
  private readonly pacienteService = inject(PacienteService);
  private readonly tipoAtendimentoService = inject(TipoAtendimentoService);
  private readonly toastService = inject(ToastService);
  private readonly modalData = inject(Z_MODAL_DATA) as EditarAgendamentoModalData | undefined;

  public dadosCarregados = signal<boolean>(false);
  public pacientes = signal<iPacienteMaxResponse[]>([]);
  public tipoAtendimentos = signal<iTipoAtendimento[]>([]);
  public agendamento = signal<iAgendamentoResponse | null>(null);
  public buscaPaciente = signal<string>('');
  public pacienteDropdownAberto = signal<boolean>(false);
  public carregandoPacientes = signal<boolean>(false);
  public horaAtual = signal<Date>(new Date());
  public pacienteSelecionado = computed(() => {
    const pacienteId = this.form.controls.pacienteId.value || this.agendamento()?.paciente.id;

    return this.pacientes().find((paciente) => paciente.id === pacienteId);
  });
  public pacientesFiltrados = computed(() => {
    return this.pacientes().slice(0, 8);
  });
  private readonly buscaPaciente$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private relogioNaoCompareceuId?: ReturnType<typeof setInterval>;
  public form = this.formBuilder.group<iAgendamentoRequestForm>({
    dataHoraInicio: this.formBuilder.control('', Validators.required),
    duracaoEmMinutos: this.formBuilder.control(60, [Validators.required, Validators.min(15)]),
    pacienteId: this.formBuilder.control('', Validators.required),
    usuarioId: this.formBuilder.control(this.getUsuarioId(), Validators.required),
    tipoAtendimentoId: this.formBuilder.control('', Validators.required),
  });

  ngOnInit(): void {
    this.iniciarForm();
    this.iniciarRelogioNaoCompareceu();
  }

  ngOnDestroy(): void {
    if (this.relogioNaoCompareceuId) {
      clearInterval(this.relogioNaoCompareceuId);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  private iniciarRelogioNaoCompareceu(): void {
    this.relogioNaoCompareceuId = setInterval(() => {
      this.horaAtual.set(new Date());
    }, 60000);
  }

  private iniciarForm(): void {
    this.carregarTiposAtendimentos();
    this.agendamento.set(this.modalData?.agendamento ?? null);

    if (this.modalData && this.modalData.dataHoraInicio) {
      const dataRecebida = new Date(this.modalData.dataHoraInicio as any);

      const isMidnightUTC = dataRecebida.getUTCHours() === 0 && dataRecebida.getUTCMinutes() === 0;

      if (isMidnightUTC) {
        dataRecebida.setMinutes(dataRecebida.getMinutes() + dataRecebida.getTimezoneOffset());
      }

      if (!Number.isNaN(dataRecebida.getTime())) {
        const offset = dataRecebida.getTimezoneOffset() * 60000;
        const dataLocal = new Date(dataRecebida.getTime() - offset);
        const dataFormatada = dataLocal.toISOString().slice(0, 16);

        this.form.patchValue({ dataHoraInicio: dataFormatada });
      }
    }

    if (this.modalData?.duracaoEmMinutos !== undefined) {
      this.form.patchValue({ duracaoEmMinutos: this.modalData.duracaoEmMinutos });
    }

    if (this.modalData?.pacienteId) {
      this.form.patchValue({ pacienteId: this.modalData.pacienteId });
    }

    if (this.modalData?.tipoAtendimentoId) {
      this.form.patchValue({ tipoAtendimentoId: this.modalData.tipoAtendimentoId });
    }

    this.configurarAutocompletePacientes();
    this.buscarPacientesPorTermo('');
  }

  private getUsuarioId(): string {
    const usuario = this.loginService.usuario();

    if (!usuario) {
      return '';
    }

    return usuario.id;
  }

  private configurarAutocompletePacientes(): void {
    this.buscaPaciente$
      .pipe(
        map((termo) => termo.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termo) => {
          this.carregandoPacientes.set(true);

          return this.pacienteService.buscarPacientesPorUsuario(termo).pipe(
            map((pacientes) =>
              pacientes.filter((paciente) => this.pacienteCorrespondeAoTermo(paciente, termo)),
            ),
            catchError((err) => {
              console.error('Erro ao carregar pacientes para o formulário de edição', err);
              return of([]);
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((pacientes) => {
        this.pacientes.set(pacientes);
        this.sincronizarBuscaPacienteSelecionado();
        this.dadosCarregados.set(true);
        this.carregandoPacientes.set(false);
      });
  }

  buscarPacientesPorTermo(termo: string): void {
    this.buscaPaciente$.next(termo);
  }

  carregarPacientes(): void {
    this.pacienteService.buscarPacientesPorUsuario().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes);
        this.sincronizarBuscaPacienteSelecionado();
        this.dadosCarregados.set(true);
      },
      error: (err) => {
        this.dadosCarregados.set(false);
        console.error('Erro ao carregar pacientes para o formulário de edição', err);
      },
    });
  }

  abrirBuscaPaciente(): void {
    this.sincronizarBuscaPacienteSelecionado();
    this.pacienteDropdownAberto.set(true);
  }

  fecharBuscaPaciente(): void {
    globalThis.setTimeout(() => this.pacienteDropdownAberto.set(false), 120);
  }

  buscarPaciente(event: Event): void {
    const termo = (event.target as HTMLInputElement).value;

    this.buscaPaciente.set(termo);
    this.pacienteDropdownAberto.set(true);

    if (this.pacienteSelecionado()?.nome !== termo) {
      this.form.controls.pacienteId.setValue('');
    }

    this.buscarPacientesPorTermo(termo);
  }

  selecionarPaciente(paciente: iPacienteMaxResponse): void {
    this.form.controls.pacienteId.setValue(paciente.id);
    this.buscaPaciente.set(paciente.nome);
    this.pacienteDropdownAberto.set(false);
  }

  getIniciais(nome: string): string {
    return nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }

  formatarTelefone(telefone?: string): string {
    const numeros = telefone?.replaceAll(/\D/g, '') ?? '';

    if (numeros.length === 11) {
      return numeros.replace(/(\d{2})(\d)(\d{4})(\d{4})/, '($1) $2 $3-$4');
    }

    if (numeros.length === 10) {
      return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }

    return telefone ?? 'Sem telefone';
  }

  carregarTiposAtendimentos() {
    this.tipoAtendimentoService.buscarTiposAtendimentos().subscribe({
      next: (dados) => {
        this.tipoAtendimentos.set(dados);
        this.dadosCarregados.set(true);
      },
      error: (err) => {
        console.error(
          'Erro ao carregar os tipos de atendimento para o formulário de agendamento',
          err,
        );
        this.dadosCarregados.set(false);
      },
    });
  }

  get statusAtendimento(): StatusAtendimento | null {
    return this.agendamento()?.statusAtendimento ?? null;
  }

  get statusPagamento(): StatusPagamento | null {
    return this.agendamento()?.statusPagamento ?? null;
  }

  get podeConfirmarAtendimento(): boolean {
    return this.statusAtendimento === 'CRIADO' || this.statusAtendimento === 'REAGENDADO';
  }

  get podeConcluirAtendimento(): boolean {
    return this.statusAtendimento === 'CONFIRMADO';
  }

  get podeMarcarNaoCompareceu(): boolean {
    const dataHoraInicio = this.getDataHoraInicioSelecionada();

    return (
      this.statusAtendimento === 'CONFIRMADO' &&
      !!dataHoraInicio &&
      this.horaAtual().getTime() > dataHoraInicio.getTime()
    );
  }

  get podeReagendarAtendimento(): boolean {
    return this.statusAtendimento === 'CRIADO' || this.statusAtendimento === 'CONFIRMADO';
  }

  get podeCancelarAtendimento(): boolean {
    return (
      this.statusAtendimento === 'CRIADO' ||
      this.statusAtendimento === 'CONFIRMADO' ||
      this.statusAtendimento === 'REAGENDADO'
    );
  }

  get podeConfirmarPagamento(): boolean {
    return this.statusPagamento === 'PENDENTE' || this.statusPagamento === 'COBRANCA_GERADA';
  }

  get podeGerarCobranca(): boolean {
    return this.statusAtendimento === 'NAO_COMPARECEU' && this.statusPagamento === 'PENDENTE';
  }

  get podeEnviarMensagemCobranca(): boolean {
    return this.statusPagamento === 'COBRANCA_GERADA';
  }

  alterarStatusAtendimento(status: StatusAtendimento): void {
    const request = this.modalData?.onChangeStatusAtendimento?.(status);

    if (!request) {
      return;
    }

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (agendamento) => {
        this.agendamento.set(agendamento);
      },
      error: () => {
        // O toast de erro é exibido pela tela de agendamentos.
      },
    });
  }

  confirmarPagamento(): void {
    this.agendamento.update((agendamento) =>
      agendamento ? { ...agendamento, statusPagamento: 'CONFIRMADO' } : agendamento,
    );
    this.modalData?.onConfirmarPagamento?.();
  }

  gerarCobranca(): void {
    const urlWhatsapp = this.criarUrlMensagemCobranca();

    if (!urlWhatsapp) {
      return;
    }

    const abaWhatsapp = window.open('', '_blank');
    const request = this.modalData?.onGerarCobranca?.();

    if (!request) {
      abaWhatsapp?.close();
      return;
    }

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (agendamento) => {
        this.agendamento.set(agendamento);

        if (abaWhatsapp) {
          abaWhatsapp.location.href = urlWhatsapp;
        } else {
          window.open(urlWhatsapp, '_blank');
        }
      },
      error: () => {
        abaWhatsapp?.close();
      },
    });
  }

  enviarMensagemConfirmacao(): void {
    const paciente = this.getPacienteSelecionado();
    const telefone = this.formatarTelefoneParaWhatsapp(paciente?.telefone);
    const dataHoraInicio = this.getDataHoraInicioSelecionada();

    if (!paciente) {
      this.toastService.exibirToastErro('Paciente não encontrado', 'Selecione um paciente válido.');
      return;
    }

    if (!telefone) {
      this.toastService.exibirToastErro(
        'Telefone não informado',
        'Cadastre o telefone do paciente para enviar a mensagem.',
      );
      return;
    }

    if (!dataHoraInicio) {
      this.toastService.exibirToastErro(
        'Data inválida',
        'Informe a data e o horário do atendimento.',
      );
      return;
    }

    const mensagem = this.criarMensagemConfirmacao(paciente.nome, dataHoraInicio);
    const url = `https://web.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(mensagem)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  enviarMensagemCobranca(): void {
    const url = this.criarUrlMensagemCobranca();

    if (url) {
      window.open(url, '_blank');
    }
  }

  private criarUrlMensagemCobranca(): string | null | void {
    const paciente = this.getPacienteSelecionado();
    const telefone = this.formatarTelefoneParaWhatsapp(paciente?.telefone);
    const dataHoraInicio = this.getDataHoraInicioSelecionada();
    const valorAtendimento = this.getValorAtendimentoSelecionado();

    if (!paciente) {
      this.toastService.exibirToastErro('Paciente não encontrado', 'Selecione um paciente válido.');
      return;
    }

    if (!telefone) {
      this.toastService.exibirToastErro(
        'Telefone não informado',
        'Cadastre o telefone do paciente para enviar a mensagem.',
      );
      return;
    }

    if (!dataHoraInicio) {
      this.toastService.exibirToastErro(
        'Data inválida',
        'Informe a data e o horário do atendimento.',
      );
      return;
    }

    if (valorAtendimento === null) {
      this.toastService.exibirToastErro(
        'Valor não informado',
        'Cadastre o valor padrão do tipo de atendimento.',
      );
      return;
    }

    const mensagem = this.criarMensagemCobranca(paciente.nome, dataHoraInicio, valorAtendimento);
    const url = `https://web.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(mensagem)}`;

    return url;
  }

  private getPacienteSelecionado(): iPacienteMaxResponse | undefined {
    return this.pacienteSelecionado();
  }

  private getValorAtendimentoSelecionado(): number | null {
    const tipoAtendimentoId = this.form.controls.tipoAtendimentoId.value;
    const tipoAtendimentoSelecionado = this.tipoAtendimentos().find(
      (tipoAtendimento) => tipoAtendimento.id === tipoAtendimentoId,
    );
    const valor =
      tipoAtendimentoSelecionado?.valorPadraoTipoAtendimento ??
      this.agendamento()?.tipoAtendimento.valorPadraoTipoAtendimento;

    return typeof valor === 'number' ? valor : null;
  }

  private getDataHoraInicioSelecionada(): Date | null {
    const dataHoraInicio =
      this.form.controls.dataHoraInicio.value || this.agendamento()?.dataHoraInicio;
    const data = new Date(dataHoraInicio!);

    return Number.isNaN(data.getTime()) ? null : data;
  }

  private formatarTelefoneParaWhatsapp(telefone?: string): string | null {
    const apenasNumeros = telefone?.replaceAll(/\D/g, '');

    if (!apenasNumeros) {
      return null;
    }

    return apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
  }

  private criarMensagemConfirmacao(nomePaciente: string, dataHoraInicio: Date): string {
    const data = new Intl.DateTimeFormat('pt-BR').format(dataHoraInicio);
    const hora = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(dataHoraInicio);

    return `Olá, ${nomePaciente}. Passando apenas para lembrar do seu atendimento no dia ${data} às ${hora} horas, posso confirmar sua presença?`;
  }

  private criarMensagemCobranca(
    nomePaciente: string,
    dataHoraInicio: Date,
    valorAtendimento: number,
  ): string {
    const data = new Intl.DateTimeFormat('pt-BR').format(dataHoraInicio);
    const valor = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valorAtendimento);
    const hora = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(dataHoraInicio);

    return `Olá, ${nomePaciente}. Foi gerada uma cobrança no valor de ${valor}, referente ao atendimento do dia ${data} as ${hora} horas.`;
  }

  private sincronizarBuscaPacienteSelecionado(): void {
    const paciente = this.pacienteSelecionado();

    if (paciente) {
      this.buscaPaciente.set(paciente.nome);
    }
  }

  private pacienteCorrespondeAoTermo(paciente: iPacienteMaxResponse, termo: string): boolean {
    if (!termo) {
      return true;
    }

    const termoNormalizado = this.normalizarTexto(termo);
    const termoNumerico = termo.replaceAll(/\D/g, '');
    const nome = this.normalizarTexto(paciente.nome);
    const telefone = paciente.telefone?.replaceAll(/\D/g, '') ?? '';

    return (
      nome.includes(termoNormalizado) || Boolean(termoNumerico && telefone.includes(termoNumerico))
    );
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  labelStatus(status: string | null): string {
    const labels: Record<string, string> = {
      CRIADO: 'Criado',
      CONFIRMADO: 'Confirmado',
      CANCELADO: 'Cancelado',
      CONCLUIDO: 'Concluído',
      REAGENDADO: 'Reagendado',
      NAO_COMPARECEU: 'Não compareceu',
      PENDENTE: 'Pendente',
      COBRANCA_GERADA: 'Cobrança gerada',
    };

    return status ? (labels[status] ?? status) : 'Não informado';
  }
}
