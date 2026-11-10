import { X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import type { RefeicaoIa } from '../../../supabase/functions/_shared/iaContrato.ts'
import { ORCAMENTOS_DA_GAVETA, type IdPerguntaDaGaveta, type LinhaDaFicha, type PerguntaDaGaveta } from '@/domain/iaGaveta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'

/** D-1303 (5): o "Algo mais" vai só neste pedido, até 300 caracteres. */
export const MAXIMO_DO_ALGO_MAIS = 300

/** As respostas da gaveta enquanto ela está aberta; o sono tem os dois horários. */
export type RespostasDaGaveta = Readonly<Partial<Record<IdPerguntaDaGaveta | 'sono-acorda' | 'sono-dorme', string>>>

interface PedidoDaIaProps {
  readonly ficha: readonly LinhaDaFicha[]
  readonly aoEditarNaFicha: () => void
  readonly meta: string
  readonly aoMudarMeta: (texto: string) => void
  readonly textoDaMeta: string
  /** D-1363: a meta digitada não vale (a linha embaixo diz por quê). */
  readonly metaInvalida?: boolean | undefined
  readonly perguntas: readonly PerguntaDaGaveta[]
  readonly respostas: RespostasDaGaveta
  readonly aoMudarResposta: (id: keyof RespostasDaGaveta, valor: string) => void
  /** Ao sair do campo (D-1351): a resposta vai para a ficha. */
  readonly aoGravarResposta: (id: IdPerguntaDaGaveta) => void
  readonly refeicoes: readonly RefeicaoIa[]
  /** Os índices das refeições tiradas da sugestão. */
  readonly tiradas: ReadonlySet<number>
  readonly aoTirar: (indice: number) => void
  readonly aoRecolocar: () => void
  readonly algoMais: string
  readonly aoMudarAlgoMais: (texto: string) => void
  readonly autorizacao: ReactNode
}

function Bloco({ titulo, idTitulo, lado, children, primeiro = false }: { readonly titulo: ReactNode; readonly idTitulo: string; readonly lado?: ReactNode; readonly children: ReactNode; readonly primeiro?: boolean }) {
  return (
    <section aria-labelledby={idTitulo} className={primeiro ? 'flex flex-col gap-2.5 py-4' : 'flex flex-col gap-2.5 border-t border-bordersubtle py-4'}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={idTitulo} className="text-sm font-bold text-heading">
          {titulo}
        </h3>
        {lado}
      </div>
      {children}
    </section>
  )
}

/** D-1303: o pedido numa tela só, sem passos numerados. */
export function PedidoDaIa(p: PedidoDaIaProps) {
  const id = useId()
  const fora = p.refeicoes.filter((_, i) => p.tiradas.has(i))
  return (
    <div className="flex flex-col">
      <Bloco
        primeiro
        titulo="A ficha tem"
        idTitulo={`${id}-ficha`}
        lado={
          <Button variant="link" size="sm" className="h-auto px-0 text-sm max-sm:min-h-11" onClick={p.aoEditarNaFicha}>
            Editar na ficha
          </Button>
        }
      >
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {p.ficha.map((f) => (
            <div key={f.rotulo} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{f.rotulo}</dt>
              <dd className="break-words text-sm text-foreground">{f.valor}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-1 pt-1">
          <label htmlFor={`${id}-meta`} className="text-sm font-semibold text-foreground">
            Meta de energia do dia
          </label>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Input
                id={`${id}-meta`}
                inputMode="numeric"
                className="numeros w-24 text-right font-semibold"
                value={p.meta}
                onChange={(e) => p.aoMudarMeta(e.target.value)}
                aria-invalid={p.metaInvalida ? true : undefined}
                aria-describedby={p.textoDaMeta ? `${id}-meta-linha` : undefined}
              />
              kcal
            </span>
            {p.textoDaMeta ? (
              <span id={`${id}-meta-linha`} className={p.metaInvalida ? 'text-xs font-medium text-foreground' : 'text-xs text-muted-foreground'}>
                {p.textoDaMeta}
              </span>
            ) : null}
          </div>
        </div>
      </Bloco>

      {p.perguntas.length > 0 ? (
        <Bloco titulo="Falta na ficha" idTitulo={`${id}-falta`} lado={<span className="text-xs text-muted-foreground">As respostas ficam salvas na ficha.</span>}>
          <div className="flex flex-col gap-3">
            {p.perguntas.map((q) =>
              q.tipo === 'sono' ? (
                <div key={q.id} role="group" aria-labelledby={`${id}-${q.id}`} className="flex flex-col gap-1.5">
                  <span id={`${id}-${q.id}`} className="text-sm font-semibold text-foreground">
                    {q.rotulo}
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {(['sono-acorda', 'sono-dorme'] as const).map((campo) => (
                      <label key={campo} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        {campo === 'sono-acorda' ? 'Acorda' : 'Dorme'}
                        <Input
                          type="time"
                          className="w-32"
                          value={p.respostas[campo] ?? ''}
                          onChange={(e) => p.aoMudarResposta(campo, e.target.value)}
                          onBlur={() => p.aoGravarResposta('sono-horario')}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : q.tipo === 'orcamento' ? (
                <div key={q.id} className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-foreground">{q.rotulo}</span>
                  <SeletorSegmentado
                    rotulo={q.rotulo}
                    opcoes={ORCAMENTOS_DA_GAVETA.map((o) => ({ valor: o, rotulo: o }))}
                    valor={p.respostas.orcamento ?? ''}
                    aoEscolher={(valor) => {
                      p.aoMudarResposta('orcamento', valor)
                    }}
                    className="flex w-full flex-wrap [&>button]:flex-1"
                  />
                </div>
              ) : (
                <div key={q.id} className="flex flex-col gap-1.5">
                  <label htmlFor={`${id}-${q.id}`} className="text-sm font-semibold text-foreground">
                    {q.rotulo}
                  </label>
                  <Input
                    id={`${id}-${q.id}`}
                    placeholder={q.exemplo}
                    value={p.respostas[q.id] ?? ''}
                    onChange={(e) => p.aoMudarResposta(q.id, e.target.value)}
                    onBlur={() => p.aoGravarResposta(q.id)}
                  />
                </div>
              ),
            )}
          </div>
        </Bloco>
      ) : null}

      <Bloco titulo="Refeições e horários" idTitulo={`${id}-ref`}>
        <ul className="flex flex-wrap gap-2">
          {p.refeicoes.map((r, i) =>
            p.tiradas.has(i) ? null : (
              <li key={`${r.nome}-${i}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-surfacerow pl-3 pr-0.5 text-sm font-semibold text-foreground sm:h-9">
                <span className="numeros font-semibold text-infotext">{r.horario}</span>
                {r.nome}
                <Button variant="ghost" size="iconsm" className="rounded-full" aria-label={`Tirar ${r.nome} da sugestão`} onClick={() => p.aoTirar(i)}>
                  <X aria-hidden="true" />
                </Button>
              </li>
            ),
          )}
        </ul>
        {fora.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {`Fora da sugestão: ${fora.map((r) => r.nome).join(', ')} `}
            <Button variant="link" size="sm" className="h-auto px-0 align-baseline text-sm max-sm:min-h-11" onClick={p.aoRecolocar}>
              Recolocar
            </Button>
          </p>
        ) : null}
      </Bloco>

      <Bloco
        titulo={<label htmlFor={`${id}-mais`}>Algo mais</label>}
        idTitulo={`${id}-mais-titulo`}
        lado={<span className="numeros text-xs text-muted-foreground">{`Opcional · ${p.algoMais.length}/${MAXIMO_DO_ALGO_MAIS}`}</span>}
      >
        <Textarea
          id={`${id}-mais`}
          rows={2}
          maxLength={MAXIMO_DO_ALGO_MAIS}
          className="min-h-16"
          placeholder="Ex.: jantar leve; leva marmita fria"
          value={p.algoMais}
          onChange={(e) => p.aoMudarAlgoMais(e.target.value.slice(0, MAXIMO_DO_ALGO_MAIS))}
        />
      </Bloco>

      {p.autorizacao}
    </div>
  )
}
