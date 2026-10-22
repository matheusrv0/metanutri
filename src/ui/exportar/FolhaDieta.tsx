import { Fragment, useId } from 'react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { modoDeQuantidade } from '@/domain/caso.ts'
import { FRASE_PROPOSTA, propostaNaDieta } from '@/domain/documentoDoPaciente.ts'
import {
  assinaturaDaFolha,
  comprasDaFolha,
  linhaDaAguaNaFolha,
  linhaDaFolha,
  linhaFinaDaFolha,
  OPCOES_IMPRESSAO_PADRAO,
  opcoesDaRefeicao,
  receitasDaFolha,
  TROCAS_PEDIDAS_PELA_FOLHA,
  trocasDaFolha,
  type OpcoesImpressao,
  type ReceitaDaFolha,
} from '@/domain/folhaDieta.ts'
import { dataPorExtenso } from '@/domain/formatarData.ts'
import { lerPerfil } from '@/domain/perfil.ts'
import { quantidadeNaFolha, type QuantidadeNaFolha } from '@/domain/quantidadeNaFolha.ts'
import { descreverSuplemento, suplementosParaDocumento, type Suplemento } from '@/domain/suplementos.ts'
import { ALIMENTOS, buscarAlimento } from '@/domain/tabelas.ts'
import { trocasDoPlano } from '@/domain/trocas.ts'
import type { Caso, ItemPlano, ModoQuantidade, Plano } from '@/domain/tipos.ts'
import { montarRestricoes, SEM_RESTRICOES, type RestricoesDoPaciente } from '@/domain/restricoes.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { LinhasDeAssinatura } from './LinhasDeAssinatura.tsx'
import { regraDaLinhaFina } from './linhaFina.ts'
import { QuemAssina } from './QuemAssina.tsx'

interface FolhaDietaProps {
  readonly caso: Caso
  readonly plano: Plano
  /** Restrições da ficha do paciente, para não sugerir troca proibida. */
  /** As restrições da ficha; um texto (versão de antes da ficha única) vale como "Outros alimentos que não come". */
  readonly restricoes?: RestricoesDoPaciente | string | undefined
  /** Quem assina o plano (spec ajustes-de-uso). Sem ela, valem os campos de estágio do plano. */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  /** Lista de compras e trocas, marcadas na janela de imprimir (CA-317). */
  readonly opcoes?: OpcoesImpressao | undefined
  /** Os suplementos da ficha do paciente do plano (spec anamnese-e-prescricoes, CA-577). */
  readonly suplementos?: readonly Suplemento[] | undefined
}

/**
 * Colunas do alimento e da quantidade. A do alimento tem largura fixa, para a quantidade ficar perto do nome e
 * alinhada entre as refeições; nome longo quebra a linha. No celular, a quantidade vai embaixo do nome.
 */
const COLUNAS = 'grid grid-cols-1 gap-x-6 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]'

/** Nas trocas, o alimento do plano à esquerda e as trocas dele ao lado. */
const COLUNAS_TROCAS = 'grid grid-cols-1 gap-x-6 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]'

/**
 * Uma quantidade por linha, pela escolha do plano (spec conduta-da-nutricionista, D-297): em "Medida caseira", a medida;
 * em "Gramas", ou sem medida que sirva, o peso.
 */
function Quantidade({ quantidade }: { readonly quantidade: QuantidadeNaFolha }) {
  // No celular a quantidade vai embaixo do nome, em cinza; no papel e na tela larga, na cor do texto.
  return (
    <span className="text-muted-foreground sm:text-foreground">
      {quantidade.medida ?? `${formatarNumero(quantidade.gramas, 0)} g`}
    </span>
  )
}

/** O alimento primeiro, com o nome que o paciente entende (CA-623), e a quantidade ao lado. */
function Itens({ itens, modo }: { readonly itens: readonly ItemPlano[]; readonly modo: ModoQuantidade }) {
  return (
    <ul className="flex flex-col gap-1">
      {itens.map((item) => {
        // Spec receitas-com-calculo, CA-879: a receita sai pelo nome dela, com a porção; a quantidade segue a escolha do
        // plano (spec conduta-da-nutricionista, D-297).
        const linha = linhaDaFolha(item, buscarAlimento, modo)
        return (
          <li key={item.id} className={COLUNAS}>
            <span className="font-medium text-heading">{linha.nome}</span>
            <span className="sr-only">, </span>
            <Quantidade quantidade={linha.quantidade} />
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Uma receita na seção "Receitas" (spec receitas-com-calculo, CA-880): o nome, o rendimento, os ingredientes da receita
 * inteira pela regra da lista de compras e o modo de preparo. Não se parte entre duas páginas.
 */
function ReceitaNaFolha({ receita }: { readonly receita: ReceitaDaFolha }) {
  const id = useId()
  return (
    <article aria-labelledby={id} className="flex break-inside-avoid flex-col gap-1 pt-1">
      <h4 id={id} className="font-bold text-heading">
        {receita.nome}
      </h4>
      <p className="numeros text-muted-foreground">{receita.rendimento}</p>
      <ul className="flex flex-col">
        {receita.ingredientes.map((i, n) => (
          <li key={`${n}-${i.nome}`}>
            {`${i.nome} — `}
            <Quantidade quantidade={i.quantidade} />
          </li>
        ))}
      </ul>
      {receita.preparo ? <p className="whitespace-pre-wrap">{receita.preparo}</p> : null}
    </article>
  )
}

/**
 * O rótulo de cada opção, quando a refeição tem mais de uma (spec impressao-do-plano, D-184): "Opção 1" pequeno em
 * cima da primeira; "ou · Opção 2" sobre um fio fino antes das outras, sem caixa. Diz que a refeição inteira é trocada.
 */
function RotuloDaOpcao({ numero }: { readonly numero: number }) {
  if (numero === 1) return <p className="text-sm font-semibold text-muted-foreground">Opção 1</p>
  return (
    <p className="flex items-center gap-3 pt-1 text-sm font-semibold text-muted-foreground">
      <span>{`ou · Opção ${numero}`}</span>
      <span aria-hidden="true" className="flex-1 border-t border-border" />
    </p>
  )
}

/**
 * Folha da dieta para o paciente: só o que ele usa, em letra de ler sem óculos
 * (spec pdf-e-telas-limpas, US-B1). Na impressão, o navegador salva em PDF.
 */
export function FolhaDieta({ caso, plano, restricoes, assinatura = null, opcoes = OPCOES_IMPRESSAO_PADRAO, suplementos = [] }: FolhaDietaProps) {
  const quem = assinaturaDaFolha(assinatura, caso)
  const linhaFina = linhaFinaDaFolha(caso, quem)
  const compras = opcoes.listaDeCompras ? comprasDaFolha(plano, buscarAlimento) : []
  // CB-188: pelo nome do paciente, sem trocar um alimento por ele mesmo.
  const trocas = opcoes.trocas
    ? trocasDaFolha(
        trocasDoPlano(plano, buscarAlimento, { alimentos: ALIMENTOS, porAlimento: TROCAS_PEDIDAS_PELA_FOLHA, restricoes: typeof restricoes === 'string' ? montarRestricoes({ marcadas: [], texto: restricoes, doencas: [], naoGosta: '' }) : (restricoes ?? SEM_RESTRICOES) }),
        buscarAlimento,
      )
    : []
  const perfil = lerPerfil(useArmazenamento())
  const modo = modoDeQuantidade(caso)
  const nome = caso.nome.trim() || 'Sem nome'
  const data = dataPorExtenso(caso.dataConsulta)
  const orientacoes = caso.orientacoes.trim()
  const agua = linhaDaAguaNaFolha(caso)
  const receitas = caso.receitas.trim()
  const receitasCalculadas = receitasDaFolha(plano, buscarAlimento, modo)
  const suplementosDaFolha = suplementosParaDocumento(suplementos)

  return (
    <article className="folha-dieta papel mx-auto flex max-w-[820px] flex-col gap-6 bg-card p-4 text-sm sm:p-10 leading-relaxed text-foreground">
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

      {/* Sem régua de cor no topo (spec impressao-do-plano, CA-633): um fio fino separa o topo das refeições. */}
      <div className="-mt-2 flex flex-col border-t border-border">
        {plano.refeicoes.map((refeicao) => {
          const opcoesDaFolha = opcoesDaRefeicao(refeicao, buscarAlimento)
          return (
            <section
              key={refeicao.id}
              aria-label={`${refeicao.horario} ${refeicao.nome}`}
              className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 break-inside-avoid border-b border-border py-4 last:border-0"
            >
              {/* CA-620: o horário na cor do nome da refeição; a cor de ação vira marfim no tema escuro. */}
              <span className="numeros text-xl font-bold leading-snug text-heading">{refeicao.horario}</span>
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="font-titulo text-xl font-bold leading-snug text-heading">{refeicao.nome}</h3>
                {/* CA-631 e CA-632: com mais de uma opção, cada uma com o rótulo, na ordem em que aparece; com uma só, nada. */}
                {opcoesDaFolha.map((itens, i) => (
                  <Fragment key={itens[0]?.id ?? i}>
                    {opcoesDaFolha.length > 1 ? <RotuloDaOpcao numero={i + 1} /> : null}
                    <Itens itens={itens} modo={modo} />
                  </Fragment>
                ))}
                {opcoesDaFolha.length === 0 ? <p className="text-muted-foreground">Sem alimentos nesta refeição.</p> : null}
              </div>
            </section>
          )
        })}
      </div>

      {/* CA-633: depois das refeições, só o que a nutricionista escreveu ou marcou, e a assinatura. */}
      <div className="fim-da-folha flex flex-col gap-5">
        {orientacoes || agua ? (
          <section aria-label="Orientações" className="flex flex-col gap-1.5">
            <h3 className="font-titulo text-lg font-bold text-heading">Orientações</h3>
            {/* Spec conduta-da-nutricionista, D-298: a linha da água primeiro, sem caixa de marcar. */}
            {agua ? <p>{agua}</p> : null}
            {orientacoes ? <p className="whitespace-pre-wrap">{caso.orientacoes}</p> : null}
          </section>
        ) : null}

        {suplementosDaFolha.length > 0 ? (
          <section aria-label="Suplementos" className="flex flex-col gap-1.5">
            <h3 className="font-titulo text-lg font-bold text-heading">Suplementos</h3>
            {/* CA-584: plano de estágio leva a frase de proposta, como as folhas do paciente. */}
            {propostaNaDieta(assinatura, caso) ? <p className="font-semibold">{FRASE_PROPOSTA}</p> : null}
            <ul className="flex flex-col gap-1.5">
              {suplementosDaFolha.map((s) => {
                const linha = descreverSuplemento(s)
                const observacao = s.observacao.trim()
                return (
                  <li key={s.id} className="break-inside-avoid">
                    <strong className="font-bold text-heading">{s.nome.trim()}</strong>
                    {linha ? <span>{` · ${linha}`}</span> : null}
                    {observacao ? <span className="block whitespace-pre-wrap break-words text-muted-foreground">{observacao}</span> : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {receitasCalculadas.length > 0 || receitas ? (
          <section aria-label="Receitas" className="flex flex-col gap-1.5">
            <h3 className="font-titulo text-lg font-bold text-heading">Receitas</h3>
            {/* Spec receitas-com-calculo, CA-880: cada receita do plano inteira; o texto livre antigo vem depois. */}
            {receitasCalculadas.map((r, i) => (
              <ReceitaNaFolha key={`${i}-${r.nome}`} receita={r} />
            ))}
            {receitas ? <p className="whitespace-pre-wrap">{caso.receitas}</p> : null}
          </section>
        ) : null}

        {/* A assinatura não fica sozinha no topo de uma página. Em prescrição rápida, a última linha diz que não houve
            avaliação (CA-634; spec prescricao-rapida-e-base, princípio 4). */}
        <div className="fecho-da-folha flex break-before-avoid break-inside-avoid flex-col gap-5">
          <LinhasDeAssinatura assinatura={quem} />
          {caso.modo === 'rapido' ? <p className="text-xs text-muted-foreground">Plano montado em prescrição rápida, sem avaliação antropométrica.</p> : null}
        </div>
      </div>

      {compras.length > 0 || trocas.length > 0 ? (
        <div className="anexos-da-folha flex flex-col gap-6 break-before-page">
          {compras.length > 0 ? (
            <section aria-label="Lista de compras" className="flex flex-col gap-2">
              <h3 className="font-titulo text-lg font-bold text-heading">Lista de compras</h3>
              <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                {compras.map((c) => (
                  <li key={c.nome} className="border-b border-dotted border-border">
                    {`${c.nome} — `}
                    {/* CA-643: a quantidade do dia pela regra da refeição. */}
                    <Quantidade quantidade={quantidadeNaFolha(c.alimentoId, c.gramas, modo)} />
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
                  <li key={g.alimentoId} className={`${COLUNAS_TROCAS} break-inside-avoid border-t border-border py-2`}>
                    <strong className="font-bold text-heading">{g.nome}</strong>
                    <span className="flex flex-col">
                      {g.trocas.map((t) => (
                        <span key={t.alimentoId} className="troca">
                          {`${t.nome} · `}
                          {/* CA-644: a mesma regra da refeição. */}
                          <Quantidade quantidade={quantidadeNaFolha(t.alimentoId, t.gramas, modo)} />
                        </span>
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
