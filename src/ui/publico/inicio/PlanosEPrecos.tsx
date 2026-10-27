import { useId, useState, type CSSProperties } from 'react'
import type { Ciclo, IdPlano } from '@/domain/conta.ts'
import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { CartaoDePlano } from './CartaoDePlano.tsx'
import { APOIO, ESPACO_DE_SECAO, MARGEM, PILULA_QUE_QUEBRA, TITULO_DE_SECAO } from './estiloDaLanding.ts'
import { cartoesDosPlanos, extrasDosPlanos, pacientesNaRegua, planoIndicado, REGUA_DE_PACIENTES, veredito } from './precosDaLanding.ts'

interface PlanosEPrecosProps {
  /** O mesmo caminho do "Assinar" de Preços (D-544 e D-670). */
  readonly aoEscolher: (plano: IdPlano, ciclo: Ciclo) => void
  /** O contato do MetaNutri; nulo, a Clínica fica sem o botão (CB-542 e CB-658). Os testes passam outro. */
  readonly contato?: string | null
}

const CICLOS: readonly { readonly ciclo: Ciclo; readonly texto: string }[] = [
  { ciclo: 'mensal', texto: 'Mensal' },
  { ciclo: 'anual', texto: 'Anual' },
]

/** O botão de contorno dos cartões de baixo (Estudante e Clínica). */
const BOTAO_CONTORNO = `${PILULA_QUE_QUEBRA} border border-landing-contorno bg-transparent text-landing-tinta hover:bg-landing-afundado`

/** O texto vem antes; quando não sobra lugar ao lado, o botão desce para baixo dele (revisão `break-ui`). */
const CARTAO_DE_BAIXO =
  'flex flex-wrap items-center justify-between gap-5 rounded-[22px] border border-landing-borda bg-landing-cartao px-7 py-6 max-[720px]:flex-col max-[720px]:items-start max-[720px]:px-6'

/**
 * "Planos e preços" (spec landing-v3, D-666 a D-671): a troca Mensal e Anual, a régua de pacientes ativos com o
 * veredito, os cartões Free, Solo e Pro (o indicado pela régua sobe e ganha o feixe), o Estudante, a Clínica e a nota do
 * pagamento. Tudo de `PLANOS`. Ao abrir: mensal e 12 pacientes, o Solo indicado.
 */
export function PlanosEPrecos({ aoEscolher, contato = CONTATO_EMAIL }: PlanosEPrecosProps) {
  const [ciclo, setCiclo] = useState<Ciclo>('mensal')
  const [pacientes, setPacientes] = useState<number>(REGUA_DE_PACIENTES.aoAbrir)
  const regua = useId()
  const indicado = planoIndicado(pacientes)
  const { estudante, clinica } = extrasDosPlanos()
  const cheio = ((pacientes - REGUA_DE_PACIENTES.minimo) / (REGUA_DE_PACIENTES.maximo - REGUA_DE_PACIENTES.minimo)) * 100
  const [antes, depois] = veredito(pacientes).split(/(?<=o plano indicado é o )/)

  return (
    <section id="planos" aria-labelledby="titulo-planos" className={`relative overflow-hidden bg-landing-afundado ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <div className="mx-auto max-w-[760px] text-center">
        <h2 id="titulo-planos" data-surge="" className={`mx-auto ${TITULO_DE_SECAO}`}>
          Planos e preços
        </h2>
        <p data-surge="" className={`mx-auto ${APOIO}`}>
          Todos os planos incluem todas as funcionalidades. Muda só o número de pacientes ativos. Sem fidelidade e sem preço promocional.
        </p>
      </div>
      <div className="mx-auto mt-10 flex max-w-[1180px] flex-wrap items-center justify-center gap-x-11 gap-y-[18px] max-[720px]:flex-col">
        <div role="group" aria-label="Forma de cobrança" className="relative inline-grid grid-cols-2 rounded-full border border-landing-borda bg-landing-cartao p-1">
          <span
            aria-hidden="true"
            data-polegar=""
            className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-landing-acao transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)] motion-reduce:transition-none ${
              ciclo === 'anual' ? 'translate-x-full' : ''
            }`}
          />
          {CICLOS.map((opcao) => (
            <button
              key={opcao.ciclo}
              type="button"
              aria-pressed={ciclo === opcao.ciclo}
              onClick={() => setCiclo(opcao.ciclo)}
              className="relative z-10 min-h-11 rounded-full border-0 bg-transparent px-6 text-[15px] font-bold text-landing-tinta-suave transition-colors duration-300 aria-pressed:text-landing-acao-tinta"
            >
              {opcao.texto}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 max-[720px]:w-full max-[720px]:max-w-[420px]">
          <label htmlFor={regua} className="text-[15px] font-bold whitespace-nowrap">
            Pacientes ativos
          </label>
          <input
            id={regua}
            type="range"
            min={REGUA_DE_PACIENTES.minimo}
            max={REGUA_DE_PACIENTES.maximo}
            step={1}
            value={pacientes}
            aria-valuetext={pacientesNaRegua(pacientes)}
            onChange={(evento) => setPacientes(Number(evento.target.value))}
            style={{ '--landing-pct': `${cheio.toFixed(1)}%` } as CSSProperties}
            className="landing-regua w-60 max-[720px]:w-auto max-[720px]:min-w-[120px] max-[720px]:flex-1"
          />
          <output htmlFor={regua} className="min-w-[2.6ch] text-right text-[30px] font-extrabold tracking-[-0.03em]">
            {pacientes >= REGUA_DE_PACIENTES.maximo ? `${REGUA_DE_PACIENTES.maximo}+` : pacientes}
          </output>
        </div>
        <p aria-live="polite" className="basis-full text-center text-[15px] text-landing-tinta-suave">
          {antes}
          <b className="font-bold text-landing-tinta">{depois?.replace(/\.$/, '')}</b>.
        </p>
      </div>
      <div className="mx-auto mt-11 grid max-w-[1180px] grid-cols-3 gap-6 max-[1100px]:max-w-[520px] max-[1100px]:grid-cols-1">
        {cartoesDosPlanos().map((cartao, i) => (
          <div key={cartao.id} data-surge={String(i)}>
            <CartaoDePlano
              cartao={cartao}
              ciclo={ciclo}
              indicado={cartao.id === indicado}
              aoEscolher={() => aoEscolher(cartao.id, cartao.anual === null ? 'mensal' : ciclo)}
            />
          </div>
        ))}
      </div>
      <div className="mx-auto mt-6 grid max-w-[1180px] grid-cols-2 gap-6 max-[1100px]:max-w-[520px] max-[1100px]:grid-cols-1">
        <div data-surge="" className={CARTAO_DE_BAIXO}>
          <div className="min-w-[min(100%,16rem)] flex-1">
            <h3 className="text-lg font-extrabold">{estudante.nome}</h3>
            <p className="mt-1 text-[15px] text-landing-tinta-suave">{estudante.texto}</p>
          </div>
          <button type="button" className={BOTAO_CONTORNO} onClick={() => aoEscolher('estudante', 'mensal')}>
            {estudante.acao}
          </button>
        </div>
        <div data-surge="" className={CARTAO_DE_BAIXO}>
          <div className="min-w-[min(100%,16rem)] flex-1">
            <h3 className="text-lg font-extrabold">{clinica.nome}</h3>
            <p className="mt-1 text-[15px] text-landing-tinta-suave">{clinica.texto}</p>
          </div>
          {contato ? (
            <a href={`mailto:${contato}`} className={BOTAO_CONTORNO}>
              {clinica.acao}
            </a>
          ) : null}
        </div>
      </div>
      <p className="mx-auto mt-7 max-w-[1180px] text-center text-(length:--landing-fs-s) text-landing-tinta-suave">
        O pagamento é com cartão de crédito, aqui no site. Você cancela quando quiser em Conta e assinatura.
      </p>
    </section>
  )
}
