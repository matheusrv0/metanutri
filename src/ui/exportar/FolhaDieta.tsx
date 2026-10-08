import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { NOME_DA_BASE } from '@/domain/baseMetanutri.ts'
import { medidaEquivalente } from '@/domain/busca.ts'
import {
  assinaturaDaFolha,
  lembretesDoDia,
  linhaFinaDaFolha,
  OPCOES_IMPRESSAO_PADRAO,
  type AssinaturaDaFolha,
  type OpcoesImpressao,
} from '@/domain/folhaDieta.ts'
import { dataPorExtenso } from '@/domain/formatarData.ts'
import { listaDeCompras, missoesDoPlano } from '@/domain/missoes.ts'
import { listaDeRestricoes } from '@/domain/pacientes.ts'
import { lerPerfil } from '@/domain/perfil.ts'
import { ALIMENTOS, buscarAlimento } from '@/domain/tabelas.ts'
import { trocasDoPlano } from '@/domain/trocas.ts'
import type { Caso, ItemPlano, Plano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { regraDaLinhaFina } from './linhaFina.ts'

interface FolhaDietaProps {
  readonly caso: Caso
  readonly plano: Plano
  /** Restrições da ficha do paciente, para não sugerir troca proibida. */
  readonly restricoes?: string | undefined
  /** Quem assina o plano (spec ajustes-de-uso). Sem ela, valem os campos de estágio do plano. */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  /** Lista de compras e trocas, marcadas na janela de imprimir (CA-317). */
  readonly opcoes?: OpcoesImpressao | undefined
}

/** Colunas da quantidade e do alimento: a medida mais longa ("2 colheres de servir e meia · 150 g") cabe numa linha. */
const COLUNAS = 'grid grid-cols-1 gap-x-4 sm:grid-cols-[minmax(0,16.5rem)_minmax(0,1fr)]'

/** "6 colheres de sopa · 150 g"; sem medida caseira, só o peso (CA-309). */
function Quantidade({ item }: { readonly item: ItemPlano }) {
  const medida = medidaEquivalente(item.alimentoId, item.gramas)
  const gramas = `${formatarNumero(item.gramas, 0)} g`
  if (!medida) return <strong className="font-bold text-heading">{gramas}</strong>
  return (
    <span>
      <strong className="font-bold text-heading">{medida.texto}</strong>
      <span className="text-muted-foreground">{` · ${gramas}`}</span>
    </span>
  )
}

function Itens({ itens }: { readonly itens: readonly ItemPlano[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {itens.map((item) => (
        <li key={item.id} className={COLUNAS}>
          <Quantidade item={item} />
          <span>{buscarAlimento(item.alimentoId)?.descricao ?? 'Alimento removido'}</span>
        </li>
      ))}
    </ul>
  )
}

function QuemAssina({ assinatura }: { readonly assinatura: AssinaturaDaFolha }) {
  if (assinatura.tipo === 'vazia') return null
  if (assinatura.tipo === 'nutricionista') {
    return (
      <div className="text-right">
        <p className="text-base font-semibold text-heading">{assinatura.linha || 'Nutricionista'}</p>
        {assinatura.linha ? <p className="text-muted-foreground">Nutricionista</p> : null}
      </div>
    )
  }
  return (
    <div className="text-right">
      {assinatura.estagiario ? (
        <p>
          <span className="text-muted-foreground">Estagiário(a): </span>
          <span className="font-semibold text-heading">{assinatura.estagiario}</span>
        </p>
      ) : null}
      {assinatura.preceptor ? (
        <p>
          <span className="text-muted-foreground">Preceptor(a): </span>
          <span className="font-semibold text-heading">{assinatura.preceptor}</span>
        </p>
      ) : null}
    </div>
  )
}

function Assinaturas({ assinatura }: { readonly assinatura: AssinaturaDaFolha }) {
  const linhas =
    assinatura.tipo === 'nutricionista'
      ? [{ nome: assinatura.linha, papel: 'Nutricionista' }]
      : assinatura.tipo === 'estagio'
        ? [
            { nome: assinatura.estagiario, papel: 'Estagiário(a)' },
            { nome: assinatura.preceptor, papel: 'Preceptor(a)' },
          ]
        : [{ nome: '', papel: 'Assinatura' }]
  return (
    <div role="group" aria-label="Assinaturas" className="grid gap-8 sm:grid-cols-2">
      {linhas.map((l) => (
        <div key={l.papel} className={`flex flex-col items-center gap-1 pt-10 ${linhas.length === 1 ? 'sm:col-start-2' : ''}`}>
          <span aria-hidden="true" className="w-full border-b border-foreground" />
          {l.nome ? <span className="font-semibold text-heading">{l.nome}</span> : null}
          <span className="text-muted-foreground">{l.papel}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Folha da dieta para o paciente: só o que ele usa, em letra de ler sem óculos
 * (spec pdf-e-telas-limpas, US-B1). Na impressão, o navegador salva em PDF.
 */
export function FolhaDieta({ caso, plano, restricoes, assinatura = null, opcoes = OPCOES_IMPRESSAO_PADRAO }: FolhaDietaProps) {
  const quem = assinaturaDaFolha(assinatura, caso)
  const linhaFina = linhaFinaDaFolha(caso, quem)
  const lembretes = lembretesDoDia(missoesDoPlano(plano, { pesoKg: caso.pesoKg }))
  const compras = opcoes.listaDeCompras ? listaDeCompras(plano) : []
  const trocas = opcoes.trocas
    ? trocasDoPlano(plano, buscarAlimento, { alimentos: ALIMENTOS, porAlimento: 2, restricoes: listaDeRestricoes(restricoes ?? '') })
    : []
  const perfil = lerPerfil(useArmazenamento())
  const nome = caso.nome.trim() || 'Sem nome'
  const data = dataPorExtenso(caso.dataConsulta)
  const orientacoes = caso.orientacoes.trim()
  const receitas = caso.receitas.trim()

  return (
    <article className="folha-dieta mx-auto flex max-w-[820px] flex-col gap-6 bg-card p-4 text-sm sm:p-10 leading-relaxed text-foreground">
      <style>{regraDaLinhaFina(linhaFina.esquerda, linhaFina.direita)}</style>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          {perfil.logo ? <img src={perfil.logo} alt="" className="h-12 w-auto self-start" /> : <Logo variante="claro" tamanho={24} />}
          <div>
            <h2 className="font-titulo text-3xl font-bold leading-tight text-heading">Plano alimentar</h2>
            <p className="text-base text-muted-foreground">{data ? `${nome} · ${data}` : nome}</p>
          </div>
        </div>
        <QuemAssina assinatura={quem} />
      </header>
      {/* A régua da marca: teal e, no fim, o laranja como grafismo (o laranja nunca carrega texto). */}
      <div aria-hidden="true" className="-mt-2 flex">
        <span className="flex-[86] border-t-[3px] border-primary" />
        <span className="flex-[14] border-t-[3px] border-laranja" />
      </div>

      <div className="flex flex-col">
        {plano.refeicoes.map((refeicao) => {
          const principal = refeicao.opcoes.principal.filter((i) => i.gramas > 0)
          const substitutos = (
            [
              ['Opção 2', refeicao.opcoes.substituto1.filter((i) => i.gramas > 0)],
              ['Opção 3', refeicao.opcoes.substituto2.filter((i) => i.gramas > 0)],
            ] as const
          ).filter(([, itens]) => itens.length > 0)
          const vazia = principal.length === 0 && substitutos.length === 0
          return (
            <section
              key={refeicao.id}
              aria-label={`${refeicao.horario} ${refeicao.nome}`}
              className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 break-inside-avoid border-b border-border py-4 last:border-0"
            >
              <span className="numeros text-xl font-bold leading-snug text-primary">{refeicao.horario}</span>
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="font-titulo text-xl font-bold leading-snug text-heading">{refeicao.nome}</h3>
                {principal.length > 0 ? <Itens itens={principal} /> : null}
                {substitutos.map(([rotulo, itens]) => (
                  <div key={rotulo} className="-ml-3 flex flex-col gap-1 rounded-lg bg-muted px-3 py-2">
                    <p className="font-bold text-muted-foreground">{rotulo}</p>
                    <Itens itens={itens} />
                  </div>
                ))}
                {vazia ? <p className="text-muted-foreground">Sem alimentos nesta refeição.</p> : null}
              </div>
            </section>
          )
        })}
      </div>

      <div className="fim-da-folha flex flex-col gap-5">
        {lembretes.length > 0 ? (
          <section aria-label="No dia a dia" className="flex break-inside-avoid flex-col gap-2">
            <h3 className="font-titulo text-lg font-bold text-heading">No dia a dia</h3>
            <ul className="flex flex-col gap-1.5">
              {lembretes.map((m) => (
                <li key={m.id} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="mt-1 size-4 shrink-0 rounded border-[1.5px] border-foreground" />
                  <span>{m.texto}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {orientacoes ? (
          <section aria-label="Orientações" className="flex flex-col gap-1.5">
            <h3 className="font-titulo text-lg font-bold text-heading">Orientações</h3>
            <p className="whitespace-pre-wrap">{caso.orientacoes}</p>
          </section>
        ) : null}

        {receitas ? (
          <section aria-label="Receitas" className="flex flex-col gap-1.5">
            <h3 className="font-titulo text-lg font-bold text-heading">Receitas</h3>
            <p className="whitespace-pre-wrap">{caso.receitas}</p>
          </section>
        ) : null}

        {/* Assinatura e linha final andam juntas e não ficam sozinhas no topo de uma página. */}
        <div className="fecho-da-folha flex break-before-avoid break-inside-avoid flex-col gap-5">
          <Assinaturas assinatura={quem} />

          <p className="text-xs text-muted-foreground">
            {`${caso.modo === 'rapido' ? 'Plano montado em prescrição rápida, sem avaliação antropométrica. ' : ''}A prescrição é responsabilidade do nutricionista. Composição dos alimentos: ${NOME_DA_BASE}.`}
          </p>
        </div>
      </div>

      {compras.length > 0 || trocas.length > 0 ? (
        <div className="anexos-da-folha flex flex-col gap-6 break-before-page">
          {compras.length > 0 ? (
            <section aria-label="Lista de compras" className="flex flex-col gap-2">
              <h3 className="font-titulo text-lg font-bold text-heading">Lista de compras</h3>
              <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                {compras.map((c) => (
                  <li key={c.descricao} className="border-b border-dotted border-border">
                    {`${c.descricao} — `}
                    <span className="numeros">{`${formatarNumero(c.gramas, 0)} g`}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {trocas.length > 0 ? (
            <section aria-label="Trocas" className="flex flex-col gap-2">
              <h3 className="font-titulo text-lg font-bold text-heading">Trocas</h3>
              <p className="text-muted-foreground">Mesmo tipo de alimento, na quantidade certa. Pode trocar sem perguntar.</p>
              <ul aria-label="Trocas" className="flex flex-col">
                {trocas.map((g) => (
                  <li key={g.alimentoId} className={`${COLUNAS} break-inside-avoid border-t border-border py-2`}>
                    <strong className="font-bold text-heading">{g.descricao}</strong>
                    <span className="flex flex-col">
                      {g.trocas.map((t) => (
                        <span key={t.alimentoId} className="troca">{`${t.descricao} · ${t.medida ? t.medida.texto : `${formatarNumero(t.gramas, 0)} g`}`}</span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
