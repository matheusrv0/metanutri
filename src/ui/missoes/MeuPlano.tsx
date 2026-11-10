// O Plano do link (spec lado-do-paciente, D-1205 e D-1206; antes, "Meu plano" da spec dieta-no-link): a dieta no celular
// do paciente, com o conteúdo da folha impressa que serve a quem come. Cada refeição num cartão, com o horário e o nome;
// as opções viram um seletor dentro do cartão (cada toque mostra uma opção inteira, CA-645); cada alimento numa linha,
// com o nome à esquerda e as gramas à direita (D-1206). Sem kcal e sem nutriente (D-150). O nome e a quantidade seguem as
// regras da folha, aplicadas na hora sobre a cópia guardada (spec revisao-geral-publica, D-231).
import { useEffect, useId, useRef, useState } from 'react'
import type { MissaoDoDia } from '@/domain/acompanhamento.ts'
import type { DietaDoLink, ItemDaDieta, ReceitaDaDieta } from '@/domain/dietaDoLink.ts'
import { modoDaCopia, paraOPaciente } from '@/domain/dietaParaPaciente.ts'
import { textoDaQuantidade } from '@/domain/quantidadeNaFolha.ts'
import type { RotuloDaRefeicao } from '@/domain/refeicaoDaHora.ts'
import type { ModoQuantidade } from '@/domain/tipos.ts'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ds/componentes/navigation/tabs.tsx'
import { atualizadoEm, quantidadeNoPlano, tituloDoPlano } from './link/textosDoLink.ts'
import { Visto } from './link/Visto.tsx'

interface MeuPlanoProps {
  readonly dieta: DietaDoLink
  /** Como o paciente é chamado no título; vazio, sem nome (CB-1227). */
  readonly primeiroNome: string
  /** O dia de hoje, para "Atualizado em" levar o ano só quando é outro. Sem ele, vale o da cópia. */
  readonly hoje?: string
  /** D-1205: a missão de Hoje de cada refeição (pelo índice), para "Marcar como feita"; nula na refeição que não é missão. */
  readonly missaoDaRefeicao?: (indice: number) => MissaoDoDia | null
  readonly aoAlternar?: (missaoId: string, feita: boolean) => void
  readonly acabouDeMarcar?: string | null
  /** CA-2210: a refeição da hora ("Agora" ou "Próxima"). */
  readonly daHora?: { readonly indice: number; readonly rotulo: RotuloDaRefeicao } | null
  /** A refeição para rolar ao abrir: a do "Ver" ou a da hora (D-1205, D-1206). */
  readonly rolarPara?: number | null
}

/** Um alimento: o nome à esquerda, a quantidade à direita e, no "Medida e gramas", a medida embaixo do nome (CA-2209). */
function Itens({ itens, modo }: { readonly itens: readonly ItemDaDieta[]; readonly modo: ModoQuantidade }) {
  return (
    <ul className="flex flex-col">
      {itens.map((item, i) => {
        const paciente = paraOPaciente(item, modo)
        const { direita, embaixo } = quantidadeNoPlano(paciente.quantidade)
        return (
          <li key={`${i}-${item.alimento}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3.5 gap-y-0.5 border-t border-border py-2.5 first:border-0 first:pt-0.5">
            <span className="text-base leading-snug font-semibold text-heading [overflow-wrap:anywhere]">{paciente.nome}</span>
            <span className="numeros text-right text-base font-extrabold whitespace-nowrap text-heading">{direita}</span>
            {embaixo ? <span className="col-start-1 text-sm text-muted-foreground">{embaixo}</span> : null}
          </li>
        )
      })}
    </ul>
  )
}

// CA-554: os textos que vêm do nutricionista quebram em qualquer ponto ([overflow-wrap:anywhere]): um endereço
// longo nas orientações não empurra a página do celular para o lado.

function Texto({ titulo, texto }: { readonly titulo: string; readonly texto: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <h2 id={id} className="text-base font-extrabold text-heading">
        {titulo}
      </h2>
      <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">{texto}</p>
    </section>
  )
}

/** Os ingredientes de uma receita, como a folha: a quantidade e o nome (spec receitas-com-calculo, CA-884). */
function Ingredientes({ itens, modo }: { readonly itens: readonly ItemDaDieta[]; readonly modo: ModoQuantidade }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {itens.map((item, i) => {
        const paciente = paraOPaciente(item, modo)
        return (
          <li key={`${i}-${item.alimento}`} className="text-base leading-snug">
            <strong className="numeros font-bold text-heading">{textoDaQuantidade(paciente.quantidade)}</strong>{' '}
            <span className="text-foreground [overflow-wrap:anywhere]">{paciente.nome}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** Uma receita do plano: o nome, o rendimento, os ingredientes com a medida e o modo de preparo (spec receitas-com-calculo). */
function ReceitaDoLink({ receita, modo }: { readonly receita: ReceitaDaDieta; readonly modo: ModoQuantidade }) {
  const id = useId()
  return (
    <article aria-labelledby={id} className="flex flex-col gap-2 border-t border-border py-4 first:border-0 first:pt-0 last:pb-0">
      <h3 id={id} className="text-base font-semibold text-heading [overflow-wrap:anywhere]">
        {receita.nome}
      </h3>
      <p className="numeros text-sm text-muted-foreground">{receita.rendimento}</p>
      <Ingredientes itens={receita.ingredientes} modo={modo} />
      {receita.preparo ? <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">{receita.preparo}</p> : null}
    </article>
  )
}

/** CA-884: "Receitas" com as receitas do plano e, depois, o texto livre de antes. */
function Receitas({ receitas, texto, modo }: { readonly receitas: readonly ReceitaDaDieta[]; readonly texto: string; readonly modo: ModoQuantidade }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <h2 id={id} className="text-base font-extrabold text-heading">
        Receitas
      </h2>
      {receitas.length > 0 ? (
        <div className="flex flex-col">
          {receitas.map((r, i) => (
            <ReceitaDoLink key={`${i}-${r.nome}`} receita={r} modo={modo} />
          ))}
        </div>
      ) : null}
      {texto ? <p className="text-base leading-relaxed whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">{texto}</p> : null}
    </section>
  )
}

/** D-1205 e CA-2207: "Marcar como feita" (ou "Feita hoje", com o visto verde), no pé da refeição que é missão. */
function MarcarRefeicao({ missao, acabouDeMarcar, aoAlternar }: { readonly missao: MissaoDoDia; readonly acabouDeMarcar: boolean; readonly aoAlternar: (missaoId: string, feita: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={missao.feita}
      onClick={() => aoAlternar(missao.id, !missao.feita)}
      className={cn(
        'inline-flex min-h-11 items-center gap-2.5 self-start rounded-full py-0 pr-3.5 pl-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'transition-transform duration-150 ease-[var(--ease-marcar)] motion-safe:active:scale-[0.97]',
        // CA-2215: "Marcar como feita" na cor dela; feita, o verde de "feita" (estado, nunca a cor da marca).
        missao.feita ? 'text-successtext' : 'text-linkacao hover:bg-surfacerow',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-5.5 shrink-0 place-content-center rounded-full border-2 transition-colors ease-[var(--ease-marcar)]',
          missao.feita ? 'border-stateok bg-stateok text-textoninverse duration-200' : 'border-linkacao duration-[120ms]',
          missao.feita && acabouDeMarcar ? 'mp-pulso' : null,
        )}
      >
        {missao.feita ? <Visto desenhar={acabouDeMarcar} className="size-3" /> : null}
      </span>
      {missao.feita ? 'Feita hoje' : 'Marcar como feita'}
    </button>
  )
}

export function MeuPlano({ dieta, primeiroNome, hoje, missaoDaRefeicao, aoAlternar, acabouDeMarcar = null, daHora = null, rolarPara = null }: MeuPlanoProps) {
  // A escolha de quantidade do plano (spec conduta-da-nutricionista, D-297; integracao-rodada-1910, D-319 e CB-316).
  const modo: ModoQuantidade = modoDaCopia(dieta)
  const atualizado = atualizadoEm(dieta.copiadaEm, hoje ?? dieta.copiadaEm)
  const [opcoes, setOpcoes] = useState<Readonly<Record<number, string>>>({})
  const cartoes = useRef(new Map<number, HTMLElement>())

  // D-1205 e D-1206: o Plano abre rolado até a refeição pedida ("Ver") ou a da hora; sem ela, no topo.
  useEffect(() => {
    const alvo = rolarPara === null ? null : cartoes.current.get(rolarPara)
    alvo?.scrollIntoView?.({ block: 'start' })
  }, [rolarPara])

  return (
    <div className="flex flex-col gap-3">
      <h1 className="mb-1 font-titulo text-2xl leading-tight font-extrabold tracking-tight text-heading [overflow-wrap:anywhere]">{tituloDoPlano(primeiroNome)}</h1>

      {dieta.refeicoes.map((refeicao, i) => {
        const missao = missaoDaRefeicao?.(i) ?? null
        const rotulo = daHora?.indice === i ? daHora.rotulo : null
        return (
          <section
            key={`${i}-${refeicao.horario}`}
            ref={(el) => {
              if (el) cartoes.current.set(i, el)
              else cartoes.current.delete(i)
            }}
            aria-label={`${refeicao.horario} ${refeicao.nome}`}
            className="flex scroll-mt-20 flex-col gap-3 rounded-2xl border border-border bg-card px-4 pt-4 pb-3"
          >
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="flex min-w-0 flex-wrap items-baseline gap-x-2.5">
                <span className="numeros text-base font-extrabold text-muted-foreground">{refeicao.horario}</span>{' '}
                <span className="min-w-0 text-lg font-extrabold tracking-tight text-heading [overflow-wrap:anywhere]">{refeicao.nome}</span>
              </h2>
              {rotulo ? <span className="inline-flex h-5.5 items-center rounded-full bg-linkacao px-2.5 text-xs font-bold text-linkacaotexto">{rotulo}</span> : null}
            </div>

            {refeicao.opcoes.length > 1 ? (
              <Tabs value={opcoes[i] ?? '0'} onValueChange={(valor) => setOpcoes((atual) => ({ ...atual, [i]: valor }))}>
                <TabsList aria-label={`Opções de ${refeicao.nome.toLocaleLowerCase('pt-BR')}`} className="flex max-w-full flex-wrap gap-1 self-start rounded-3xl border-0 bg-surfacesunken p-0.75">
                  {refeicao.opcoes.map((_, j) => (
                    <TabsTrigger
                      key={j}
                      value={String(j)}
                      className="h-11 rounded-full px-3.5 font-bold text-muted-foreground data-[state=active]:bg-linkacao data-[state=active]:text-linkacaotexto data-[state=active]:after:hidden sm:h-9 sm:pointer-coarse:h-11"
                    >
                      {`Opção ${j + 1}`}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {refeicao.opcoes.map((itens, j) => (
                  <TabsContent key={j} value={String(j)} className="mt-3">
                    <Itens itens={itens} modo={modo} />
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <Itens itens={refeicao.opcoes[0] ?? []} modo={modo} />
            )}

            {missao && aoAlternar ? <MarcarRefeicao missao={missao} acabouDeMarcar={acabouDeMarcar === missao.id} aoAlternar={aoAlternar} /> : null}
          </section>
        )
      })}

      {dieta.orientacoes ? <Texto titulo="Orientações" texto={dieta.orientacoes} /> : null}
      {(dieta.receitasDoPlano?.length ?? 0) > 0 || dieta.receitas ? <Receitas receitas={dieta.receitasDoPlano ?? []} texto={dieta.receitas} modo={modo} /> : null}

      {atualizado ? <p className="mt-2 text-center text-sm text-muted-foreground">{atualizado}</p> : null}
    </div>
  )
}
