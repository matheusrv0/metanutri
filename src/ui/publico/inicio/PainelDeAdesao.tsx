import { MISSOES_DO_EXEMPLO, PAINEL_DO_EXEMPLO } from './exemploDaLanding.ts'
import { BOTAO } from './estiloDaLanding.ts'

interface PainelDeAdesaoProps {
  /** Quantas missões a Maria marcou hoje no celular do exemplo. */
  readonly feitasHoje: number
}

type Dia = 'cheio' | 'vazio' | 'futuro'

interface PacienteDoPainel {
  readonly sigla: string
  readonly nome: string
  readonly estado: string
  /** A cor da bolinha do estado (token do tema). */
  readonly cor: string
  /** A semana, de segunda a domingo. */
  readonly dias: readonly Dia[]
  /** O que a semana diz, para o leitor de tela (as bolinhas são desenho). */
  readonly semana: string
}

const FUTURO: readonly Dia[] = ['futuro', 'futuro', 'futuro', 'futuro', 'futuro']

const COLUNAS = 'grid-cols-[minmax(0,1fr)_repeat(7,18px)] gap-x-2.5 max-[720px]:grid-cols-[minmax(0,1fr)_repeat(7,14px)] max-[720px]:gap-x-[5px]'

const BOLINHA: Readonly<Record<Dia, string>> = {
  cheio: 'bg-landing-destaque',
  vazio: 'shadow-[inset_0_0_0_2px_var(--landing-borda)]',
  futuro: 'shadow-[inset_0_0_0_2px_var(--landing-borda)] opacity-35',
}

/**
 * O painel de Adesão do exemplo (spec landing-v3, D-661): três pacientes de exemplo, marcados assim para o leitor de
 * tela. A bolinha de hoje da Maria acende quando uma missão do celular está marcada, e o estado dela é anunciado. O
 * "Chamar no WhatsApp" é imagem do botão (D-550): no exemplo, não há para quem mandar.
 */
export function PainelDeAdesao({ feitasHoje }: PainelDeAdesaoProps) {
  const total = MISSOES_DO_EXEMPLO.length
  const marcouHoje = feitasHoje > 0
  const pacientes: readonly PacienteDoPainel[] = [
    {
      sigla: 'JP',
      nome: 'João Pereira',
      estado: PAINEL_DO_EXEMPLO.semMarcar,
      cor: 'before:bg-landing-tinta',
      dias: ['vazio', 'vazio', ...FUTURO],
      semana: 'Nenhuma marcação nesta semana.',
    },
    {
      sigla: 'AB',
      nome: 'Ana Beatriz Costa',
      estado: PAINEL_DO_EXEMPLO.atencao,
      cor: 'before:bg-landing-ambar',
      dias: ['cheio', 'vazio', ...FUTURO],
      semana: 'Marcou na segunda.',
    },
    {
      sigla: 'MS',
      nome: 'Maria Santos',
      estado: marcouHoje ? `${PAINEL_DO_EXEMPLO.emDia} · ${feitasHoje} de ${total} hoje` : 'Ainda não marcou hoje',
      cor: 'before:bg-landing-destaque',
      dias: ['cheio', marcouHoje ? 'cheio' : 'vazio', ...FUTURO],
      semana: marcouHoje ? 'Marcou na segunda e hoje.' : 'Marcou na segunda.',
    },
  ]

  return (
    <div
      role="group"
      aria-label="Pacientes de exemplo"
      className="w-full rounded-3xl bg-landing-cartao p-7 shadow-(--landing-sombra-cartao) max-[1100px]:max-w-[560px] max-[720px]:p-[18px]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <strong className="text-lg font-extrabold">Adesão</strong>
        <span className="text-[13px] text-landing-tinta-suave">esta semana</span>
      </div>
      <div aria-hidden="true" className={`mt-[18px] grid px-3 ${COLUNAS}`}>
        <span />
        {PAINEL_DO_EXEMPLO.dias.map((dia, i) => (
          <span
            // A semana repete letras (S, Q) e a lista é fixa: a posição é a chave.
            key={i}
            className={`text-center text-[11px] font-bold ${i === PAINEL_DO_EXEMPLO.hoje ? 'text-landing-destaque' : 'text-landing-tinta-suave'}`}
          >
            {dia}
          </span>
        ))}
      </div>
      <ul className="mt-2 grid list-none gap-2 p-0">
        {pacientes.map((paciente) => (
          <li key={paciente.nome} className={`grid items-center rounded-[14px] bg-landing-afundado p-3 ${COLUNAS}`}>
            <span className="grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-0.5">
              <b aria-hidden="true" className="row-span-2 grid size-9 place-items-center rounded-full bg-landing-cartao text-xs font-extrabold">
                {paciente.sigla}
              </b>
              <strong className="truncate text-sm font-extrabold" title={paciente.nome}>
                {paciente.nome}
              </strong>
              <em
                aria-live={paciente.sigla === 'MS' ? 'polite' : undefined}
                className={`inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-landing-tinta-suave not-italic before:size-[7px] before:flex-none before:rounded-full before:content-[''] ${paciente.cor}`}
              >
                {paciente.estado}
              </em>
              <span className="sr-only">{paciente.semana}</span>
            </span>
            {paciente.dias.map((dia, i) => (
              <i
                key={i}
                aria-hidden="true"
                data-dia={i === PAINEL_DO_EXEMPLO.hoje ? 'hoje' : undefined}
                className={`size-3.5 justify-self-center rounded-full transition-[background-color,box-shadow,scale] duration-300 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none max-[720px]:size-[11px] ${BOLINHA[dia]} ${
                  paciente.sigla === 'MS' && i === PAINEL_DO_EXEMPLO.hoje && dia === 'cheio' ? 'scale-125' : ''
                }`}
              />
            ))}
            {paciente.sigla === 'JP' ? (
              <div className="col-span-full mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[12.5px] text-landing-tinta-suave">
                <span>Mensagem pronta para retomar o plano</span>
                <span aria-hidden="true" className={`${BOTAO} min-h-[34px] px-3.5 text-[13px]`}>
                  Chamar no WhatsApp
                </span>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
