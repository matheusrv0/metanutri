// "Meu plano": a dieta no celular do paciente (spec dieta-no-link). O conteúdo é o da folha
// impressa que serve a quem come, em letra de ler no ônibus: refeição, medida caseira, os
// substitutos como "ou" e as orientações. Sem kcal e sem nutriente (D-150). O nome e a quantidade
// seguem as regras da folha, aplicadas na hora sobre a cópia guardada (spec revisao-geral-publica, D-231).
import { useId } from 'react'
import type { DietaDoLink, ItemDaDieta, ReceitaDaDieta } from '@/domain/dietaDoLink.ts'
import { modoDaCopia, paraOPaciente } from '@/domain/dietaParaPaciente.ts'
import { dataPorExtenso } from '@/domain/formatarData.ts'
import { textoDaQuantidade, type QuantidadeNaFolha } from '@/domain/quantidadeNaFolha.ts'
import type { ModoQuantidade } from '@/domain/tipos.ts'

interface MeuPlanoProps {
  readonly dieta: DietaDoLink
  /** Como o paciente é chamado no título, igual à parte das missões. */
  readonly primeiroNome: string
}

/**
 * A quantidade como na folha (spec alimentos-e-gramaturas, D-376 e D-377): a medida com o peso, só a medida ou só o
 * peso, na escolha do plano; sem medida que sirva, o peso (CB-156).
 */
function Quantidade({ quantidade }: { readonly quantidade: QuantidadeNaFolha }) {
  return <strong className="numeros font-bold text-heading">{textoDaQuantidade(quantidade)}</strong>
}

function Itens({ itens, modo }: { readonly itens: readonly ItemDaDieta[]; readonly modo: ModoQuantidade }) {
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((item, i) => {
        const paciente = paraOPaciente(item, modo)
        return (
          <li key={`${i}-${item.alimento}`} className="flex flex-col text-base leading-snug">
            <Quantidade quantidade={paciente.quantidade} />
            <span className="text-foreground [overflow-wrap:anywhere]">{paciente.nome}</span>
          </li>
        )
      })}
    </ul>
  )
}

// CA-554: os textos que vêm do nutricionista quebram em qualquer ponto ([overflow-wrap:anywhere]): um endereço
// longo nas orientações não empurra a página do celular para o lado.

/**
 * CA-532: o "ou" entre as opções, com um fio de cada lado. Spec impressao-do-plano, CA-645: com os rótulos da folha
 * impressa, "Opção 1" em cima da primeira e "ou · Opção 2" entre elas, para o paciente ver que a refeição inteira é
 * trocada. É só desenho: a cópia guardada no link não muda.
 */
function RotuloDaOpcao({ numero }: { readonly numero: number }) {
  if (numero === 1) return <p className="mb-2 text-sm font-semibold text-muted-foreground">Opção 1</p>
  return (
    <p className="my-4 flex items-center gap-3 text-sm font-semibold text-muted-foreground">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span>{`ou · Opção ${numero}`}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </p>
  )
}

function Texto({ titulo, texto }: { readonly titulo: string; readonly texto: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-border bg-card p-5">
      <h2 id={id} className="font-titulo text-lg font-semibold text-heading">
        {titulo}
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-foreground [overflow-wrap:anywhere]">{texto}</p>
    </section>
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
      <Itens itens={receita.ingredientes} modo={modo} />
      {receita.preparo ? <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground [overflow-wrap:anywhere]">{receita.preparo}</p> : null}
    </article>
  )
}

/** CA-884: "Receitas" com as receitas do plano e, depois, o texto livre de antes. */
function Receitas({ receitas, texto, modo }: { readonly receitas: readonly ReceitaDaDieta[]; readonly texto: string; readonly modo: ModoQuantidade }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
      <h2 id={id} className="font-titulo text-lg font-semibold text-heading">
        Receitas
      </h2>
      {receitas.length > 0 ? (
        <div className="flex flex-col">
          {receitas.map((r, i) => (
            <ReceitaDoLink key={`${i}-${r.nome}`} receita={r} modo={modo} />
          ))}
        </div>
      ) : null}
      {texto ? <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground [overflow-wrap:anywhere]">{texto}</p> : null}
    </section>
  )
}

export function MeuPlano({ dieta, primeiroNome }: MeuPlanoProps) {
  const dia = dataPorExtenso(dieta.copiadaEm)
  // A escolha de quantidade do plano (spec conduta-da-nutricionista, D-297; integracao-rodada-1910, D-319 e CB-316).
  const modo: ModoQuantidade = modoDaCopia(dieta)
  return (
    <div className="flex flex-col gap-3">
      <h1 className="mb-3 font-titulo text-2xl font-bold text-heading [overflow-wrap:anywhere]">{`Seu plano alimentar, ${primeiroNome}`}</h1>

      {dieta.refeicoes.map((refeicao, i) => (
        <section key={`${i}-${refeicao.horario}`} aria-label={`${refeicao.horario} ${refeicao.nome}`} className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 flex flex-wrap items-baseline gap-x-3 font-titulo text-lg font-semibold text-heading">
            <span className="numeros font-bold text-primary">{refeicao.horario}</span>{' '}
            <span className="min-w-0 [overflow-wrap:anywhere]">{refeicao.nome}</span>
          </h2>
          {refeicao.opcoes.map((itens, j) => (
            <div key={j}>
              {refeicao.opcoes.length > 1 ? <RotuloDaOpcao numero={j + 1} /> : null}
              <Itens itens={itens} modo={modo} />
            </div>
          ))}
        </section>
      ))}

      {dieta.orientacoes ? <Texto titulo="Orientações" texto={dieta.orientacoes} /> : null}
      {(dieta.receitasDoPlano?.length ?? 0) > 0 || dieta.receitas ? <Receitas receitas={dieta.receitasDoPlano ?? []} texto={dieta.receitas} modo={modo} /> : null}

      {dia ? <p className="mt-5 text-center text-xs text-muted-foreground">{`Atualizada em ${dia}.`}</p> : null}
    </div>
  )
}
