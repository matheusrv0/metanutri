import type { BaseDoPeso } from '@/domain/pesoDeReferencia.ts'
import type { ResultadoDaProteina } from '@/domain/pontoDePartida.ts'
import type { Objetivo } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Escolha } from './Escolha.tsx'
import { ROTULO_DA_BASE, ROTULO_DA_EVIDENCIA, TRAVESSAO, faixaEmGKg, faixaEmGramas } from './textosDaAvaliacao.ts'

const OBJETIVOS: readonly { readonly valor: Objetivo; readonly rotulo: string }[] = [
  { valor: 'emagrecer', rotulo: 'Emagrecer' },
  { valor: 'manter', rotulo: 'Manter o peso' },
  { valor: 'ganhar', rotulo: 'Ganhar massa muscular' },
]

const DE: Readonly<Record<BaseDoPeso, string>> = { 'peso-atual': 'peso', 'peso-ideal': 'peso ideal', 'peso-ajustado': 'peso ajustado', 'massa-magra': 'massa magra' }

interface BlocoProteinaProps {
  /** A sugestão do motor; `null` fora do adulto, na gestação e na lactação. */
  readonly resultado: ResultadoDaProteina | null
  /** Sem perfil escolhido, o bloco pede o perfil (D-1467). */
  readonly semPerfil: boolean
  readonly lactante: boolean
  readonly objetivo: Objetivo | null
  readonly aoMudarObjetivo: (objetivo: Objetivo) => void
  /** O idoso de 65 anos ou mais com doença marcada na ficha (D-1420, DP-AT-5). */
  readonly comDoencaNaFicha: boolean
  /** "Doença renal crônica" marcada na ficha: a pergunta da TFGe (D-1420). */
  readonly perguntaDaTfge: { readonly valor: boolean | null; readonly aoMudar: (valor: boolean) => void } | null
  readonly aoMudarBase: (base: BaseDoPeso) => void
}

/**
 * O bloco "Proteína" do ponto de partida (spec antropometria-telas, D-1418 e D-1420): o objetivo do plano, a faixa em
 * g/dia na base de cálculo, a faixa em g/kg e a fonte; com IMC de 30 ou mais, a escolha do peso de referência.
 */
export function BlocoProteina({ resultado, semPerfil, lactante, objetivo, aoMudarObjetivo, comDoencaNaFicha, perguntaDaTfge, aoMudarBase }: BlocoProteinaProps) {
  const sugestao = resultado?.calculou ? resultado : null
  let detalhe: string
  if (semPerfil) detalhe = 'Escolha o perfil de atividade.'
  else if (lactante) detalhe = 'A pesquisa não conferiu uma faixa de proteína para a lactação.'
  else if (!resultado) detalhe = ''
  else if (!resultado.calculou) detalhe = resultado.motivo
  else {
    const base = resultado.base ?? 'peso-atual'
    const deQue = resultado.base === null ? 'peso de referência' : DE[base]
    const emPeso = resultado.gKgDePeso && resultado.base !== 'peso-atual' ? ` (${faixaEmGKg(resultado.gKgDePeso, 'peso atual')})` : ''
    detalhe = `${faixaEmGKg(resultado.faixaGKg, deQue)}${emPeso} · ${resultado.fonte.curta}`
  }
  const escolherBase = sugestao !== null && sugestao.bases.length > 1

  return (
    <div className="grid gap-1.5 border-t border-border pt-3.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h3 className="text-sm font-semibold text-muted-foreground">Proteína</h3>
        {sugestao ? <span className="ml-auto text-xs text-muted-foreground">{ROTULO_DA_EVIDENCIA[sugestao.evidencia]}</span> : null}
      </div>
      <Escolha rotulo="Objetivo do plano" rotuloOculto compacto className="w-full sm:w-60" vazio="Escolha o objetivo" opcoes={OBJETIVOS} valor={objetivo} aoEscolher={aoMudarObjetivo} />
      {perguntaDaTfge ? (
        <Escolha
          rotulo="TFGe abaixo de 30, sem diálise"
          compacto
          className="w-full sm:w-60"
          vazio="Responda"
          opcoes={[
            { valor: 'sim', rotulo: 'Sim' },
            { valor: 'nao', rotulo: 'Não' },
          ]}
          valor={perguntaDaTfge.valor === null ? null : perguntaDaTfge.valor ? 'sim' : 'nao'}
          aoEscolher={(v) => perguntaDaTfge.aoMudar(v === 'sim')}
        />
      ) : null}
      {escolherBase ? (
        <Escolha
          rotulo="Peso de referência"
          compacto
          className="w-full sm:w-60"
          vazio="Escolha o peso de referência"
          opcoes={sugestao.bases.map((b) => ({
            valor: b.base,
            rotulo: b.pesoKg === null ? `${ROTULO_DA_BASE[b.base]} · ${TRAVESSAO}` : `${ROTULO_DA_BASE[b.base]} · ${formatarNumero(b.pesoKg, 1)} kg`,
            desativada: b.pesoKg === null,
          }))}
          valor={sugestao.base}
          aoEscolher={aoMudarBase}
        />
      ) : null}
      <p className="numeros text-2xl font-semibold tracking-tight text-heading">
        {sugestao?.gDia ? (
          <>
            {faixaEmGramas(sugestao.gDia)} <small className="text-sm font-medium tracking-normal text-muted-foreground">g/dia</small>
          </>
        ) : (
          TRAVESSAO
        )}
      </p>
      {detalhe ? <p className="text-sm text-muted-foreground">{detalhe}</p> : null}
      {comDoencaNaFicha && sugestao ? <p className="text-sm text-muted-foreground">Com doença na ficha: a faixa do PROT-AGE para doença aguda ou crônica.</p> : null}
      {sugestao && sugestao.avisos.length > 0 ? (
        <ul className="grid gap-0.5 text-xs text-muted-foreground">
          {sugestao.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
