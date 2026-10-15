// "Meu plano": a dieta no celular do paciente (spec dieta-no-link). O conteúdo é o da folha
// impressa que serve a quem come, em letra de ler no ônibus: refeição, medida caseira, os
// substitutos como "ou" e as orientações. Sem kcal e sem nutriente (D-150).
import { useId } from 'react'
import type { DietaDoLink, ItemDaDieta } from '@/domain/dietaDoLink.ts'
import { dataPorExtenso } from '@/domain/formatarData.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'

interface MeuPlanoProps {
  readonly dieta: DietaDoLink
  /** Como o paciente é chamado no título, igual à parte das missões. */
  readonly primeiroNome: string
}

/** "6 colheres de sopa · 150 g"; sem medida caseira, só o peso (CB-156), como na folha. */
function Quantidade({ item }: { readonly item: ItemDaDieta }) {
  const gramas = `${formatarNumero(item.gramas, 0)} g`
  if (item.medida === null) return <strong className="numeros font-bold text-heading">{gramas}</strong>
  return (
    <span>
      <strong className="font-bold text-heading">{item.medida}</strong>
      <span className="numeros text-muted-foreground">{` · ${gramas}`}</span>
    </span>
  )
}

function Itens({ itens }: { readonly itens: readonly ItemDaDieta[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((item, i) => (
        <li key={`${i}-${item.alimento}`} className="flex flex-col text-base leading-snug">
          <Quantidade item={item} />
          <span className="text-foreground">{item.alimento}</span>
        </li>
      ))}
    </ul>
  )
}

/** CA-532: o "ou" entre as opções, com um fio de cada lado. */
function Ou() {
  return (
    <p className="my-4 flex items-center gap-3 text-sm font-semibold text-muted-foreground">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      ou
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
      <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-foreground">{texto}</p>
    </section>
  )
}

export function MeuPlano({ dieta, primeiroNome }: MeuPlanoProps) {
  const dia = dataPorExtenso(dieta.copiadaEm)
  return (
    <div className="flex flex-col gap-3">
      <h1 className="mb-3 font-titulo text-2xl font-bold text-heading">{`Seu plano alimentar, ${primeiroNome}`}</h1>

      {dieta.refeicoes.map((refeicao, i) => (
        <section key={`${i}-${refeicao.horario}`} aria-label={`${refeicao.horario} ${refeicao.nome}`} className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 flex flex-wrap items-baseline gap-x-3 font-titulo text-lg font-semibold text-heading">
            <span className="numeros font-bold text-primary">{refeicao.horario}</span>{' '}
            <span>{refeicao.nome}</span>
          </h2>
          {refeicao.opcoes.map((itens, j) => (
            <div key={j}>
              {j > 0 ? <Ou /> : null}
              <Itens itens={itens} />
            </div>
          ))}
        </section>
      ))}

      {dieta.orientacoes ? <Texto titulo="Orientações" texto={dieta.orientacoes} /> : null}
      {dieta.receitas ? <Texto titulo="Receitas" texto={dieta.receitas} /> : null}

      {dia ? <p className="mt-5 text-center text-xs text-muted-foreground">{`Atualizada em ${dia}.`}</p> : null}
    </div>
  )
}
