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

/**
 * Uma quantidade só, como na folha (spec conduta-da-nutricionista, D-297): a medida caseira; sem medida, o peso (CB-156).
 * Plano em "Gramas" chega sem medida, e aqui sai só o peso.
 */
function Quantidade({ item }: { readonly item: ItemDaDieta }) {
  if (item.medida === null) return <strong className="numeros font-bold text-heading">{`${formatarNumero(item.gramas, 0)} g`}</strong>
  return <strong className="font-bold text-heading">{item.medida}</strong>
}

function Itens({ itens }: { readonly itens: readonly ItemDaDieta[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((item, i) => (
        <li key={`${i}-${item.alimento}`} className="flex flex-col text-base leading-snug">
          <Quantidade item={item} />
          <span className="text-foreground [overflow-wrap:anywhere]">{item.alimento}</span>
        </li>
      ))}
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

export function MeuPlano({ dieta, primeiroNome }: MeuPlanoProps) {
  const dia = dataPorExtenso(dieta.copiadaEm)
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
