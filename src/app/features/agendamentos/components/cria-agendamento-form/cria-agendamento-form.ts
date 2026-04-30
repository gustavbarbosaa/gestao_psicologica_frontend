import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Z_MODAL_DATA } from '@shared/components/dialog/dialog.service';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginService } from '@core/services/login-service';
import { ZardSelectItemComponent } from '@shared/components/select/select-item.component';
import { ZardSelectComponent } from '@shared/components/select/select.component';
import { iAgendamentoRequest, iAgendamentoRequestForm } from '@shared/models/agendamento.model';
import { ZardIconComponent } from '@shared/components/icon';
import { PacienteService } from '@core/services/paciente-service';
import { iPacienteMaxResponse } from '@shared/models/paciente.model';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { TipoAtendimentoService } from '@core/services/tipo-atendimento';
import { iTipoAtendimento } from '@shared/models/tipo-atendimento.model';
import { format, parseISO, isValid } from 'date-fns';

@Component({
  selector: 'app-cria-agendamento-form',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    ZardSelectComponent,
    ZardSelectItemComponent,
    ZardIconComponent,
  ],
  templateUrl: './cria-agendamento-form.html',
  styleUrl: './cria-agendamento-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'criaAgendamentoForm',
})
export class CriaAgendamentoForm implements OnInit, OnDestroy {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly loginService = inject(LoginService);
  private readonly pacienteService = inject(PacienteService);
  private readonly tipoAtendimentoService = inject(TipoAtendimentoService);
  private readonly modalData = inject(Z_MODAL_DATA) as Partial<iAgendamentoRequest>;

  public form!: FormGroup<iAgendamentoRequestForm>;
  public pacientes = signal<iPacienteMaxResponse[]>([]);
  public tiposAtendimentos = signal<iTipoAtendimento[]>([]);
  public dadosCarregados = signal<boolean>(false);
  public buscaPaciente = signal<string>('');
  public pacienteDropdownAberto = signal<boolean>(false);
  public carregandoPacientes = signal<boolean>(false);
  public pacienteSelecionado = computed(() => {
    const pacienteId = this.form?.controls.pacienteId.value;

    return this.pacientes().find((paciente) => paciente.id === pacienteId);
  });
  public pacientesFiltrados = computed(() => {
    return this.pacientes().slice(0, 8);
  });
  private readonly buscaPaciente$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.iniciarForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private iniciarForm(): void {
    this.carregarTiposAtendimentos();

    this.form = this.formBuilder.group<iAgendamentoRequestForm>({
      dataHoraInicio: this.formBuilder.control('', Validators.required),
      duracaoEmMinutos: this.formBuilder.control(60, [Validators.required, Validators.min(15)]),
      pacienteId: this.formBuilder.control('', Validators.required),
      usuarioId: this.formBuilder.control(this.getUsuarioId(), Validators.required),
      tipoAtendimentoId: this.formBuilder.control('', Validators.required),
    });

    if (this.modalData && this.modalData.dataHoraInicio) {
      const dataRecebida =
        typeof this.modalData.dataHoraInicio === 'string'
          ? parseISO(this.modalData.dataHoraInicio)
          : this.modalData.dataHoraInicio;

      if (isValid(dataRecebida)) {
        const dataFormatada = format(dataRecebida, "yyyy-MM-dd'T'HH:mm");
        this.form.patchValue({ dataHoraInicio: dataFormatada });
      }
    }

    if (this.modalData.duracaoEmMinutos !== undefined) {
      this.form.patchValue({ duracaoEmMinutos: this.modalData.duracaoEmMinutos });
    }

    if (this.modalData.pacienteId) {
      this.form.patchValue({ pacienteId: this.modalData.pacienteId });
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
              pacientes.filter(
                (paciente) => paciente.ativo && this.pacienteCorrespondeAoTermo(paciente, termo),
              ),
            ),
            catchError((err) => {
              console.error('Erro ao carregar pacientes para o formulário de agendamento', err);
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
    this.pacienteService
      .buscarPacientesPorUsuario()
      .pipe(map((pacientes) => pacientes.filter((paciente) => paciente.ativo)))
      .subscribe({
        next: (pacientes) => {
          this.pacientes.set(pacientes);
          this.sincronizarBuscaPacienteSelecionado();
          this.dadosCarregados.set(true);
        },
        error: (err) => {
          this.dadosCarregados.set(false);
          console.error('Erro ao carregar pacientes para o formulário de agendamento', err);
        },
      });
  }

  carregarTiposAtendimentos() {
    this.tipoAtendimentoService.buscarTiposAtendimentos().subscribe({
      next: (dados) => {
        this.tiposAtendimentos.set(dados);
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

    return nome.includes(termoNormalizado) || Boolean(termoNumerico && telefone.includes(termoNumerico));
  }

  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
