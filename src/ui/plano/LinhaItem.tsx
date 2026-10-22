import { ArrowLeftRight, X } from 'lucide-react'
import type { MedidaCaseira } from '@/domain/busca.ts'
import { explicarCompletude } from '@/domain/completude.ts'
import { linhaDaFolha } from '@/domain/folhaDieta.ts'
import { unidadeDo } from '@/domain/liquido.ts'
import { emMeiasMedidas, medidaNaLinha, medidasDoSeletor } from '@/domain/medidaDoItem.ts'
import { MEUS_ALIMENTOS_NOVOS, nomeSemAlimento, PRIMEIRO_ID_PRODUTO } from '@/domain/produtos.ts'
import { textoDaQuantidade } from '@/domain/quantidadeNaFolha.ts'
import { ehItemDeReceita, nomeDaReceita, receitaComOQueComer, receitaDoItem, textoDaPorcao } from '@/domain/receitaNoPlano.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDeItens } from '@/domain/totais.ts'
import type { ItemPlano, MedidaDoItem, ModoQuantidade } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { MarcaSemDado } from '../adequacao/MarcaSemDado.tsx'
import { SeletorDeMedida } from './SeletorDeMedida.tsx'

interface LinhaItemProps {
  readonly item: ItemPlano
  readonly aoMudarGramas: (gramas: number) => void
  readonly aoRemover: () => void
  /** Abre a calculadora de substituto; só existe no Principal (CA-41). */
  readonly aoSubstituir?: (() => void) | undefined
  /**
   * Com ele, a linha edita quantidade + medida = gramas e mostra o que o paciente lê (spec alimentos-e-gramaturas, G2 e
   * G3). Sem ele (ingrediente de receita), só os gramas e a medida automática, como antes.
   */
  readonly aoMudarMedida?: ((medida: MedidaDoItem | null) => void) | undefined
  /** Como o paciente lê as quantidades (D-376). */
  readonly modo?: ModoQuantidade | undefined
  /** "+ Nova medida…" no seletor (D-387). */
  readonly aoCriarMedida?: ((alimentoId: number, aoCriar: (medida: MedidaCaseira) => void) => void) | undefined
}

/**
 * A energia da receita pelos ingredientes; sem nenhum dado de energia, `null` (travessão, nunca zero). `semDado` conta os
 * ingredientes sem energia, para a † (D-318 da integracao-rodada-1910).
 */
function energiaDaReceita(item: ItemPlano): { readonly kcal: number | null; readonly semDado: number } {
  const { total, semDado } = totaisDeItens([item], buscarAlimento).nutrientes.energia_kcal
  return { kcal: semDado > 0 && total === 0 ? null : total, semDado }
}

/**
 * CA-19: gramas editáveis, medida caseira, kcal e remoção. Spec receitas-com-calculo, CA-873: a receita mostra o nome
 * dela e "Receita · 1 unidade" embaixo, e não tem substituto. Spec alimentos-e-gramaturas (G2, G3, G5): quantidade +
 * medida = gramas, ligados, e "O paciente lê" no modo do plano.
 */
export function LinhaItem({ item, aoMudarGramas, aoRemover, aoSubstituir, aoMudarMedida, modo = 'medida-caseira', aoCriarMedida }: LinhaItemProps) {
  const deReceita = ehItemDeReceita(item)
  const receita = receitaDoItem(item)
  const alimento = deReceita ? undefined : buscarAlimento(item.alimentoId)
  // D-248 (spec revisao-geral-trabalho): o alimento excluído em "Meus alimentos" fica com o nome do que aconteceu, sem valores.
  const descricao = deReceita ? nomeDaReceita(receita) : (alimento?.descricao ?? nomeSemAlimento(item.alimentoId))
  const incompleto = alimento ? explicarCompletude(alimento) : null
  const porCem = alimento?.nutrientes.energia_kcal ?? null
  // A tabela não traz energia deste alimento: mostra travessão, nunca zero (princípio do produto).
  const daReceita = deReceita ? energiaDaReceita(item) : null
  const kcal = daReceita ? daReceita.kcal : porCem === null ? null : (porCem * item.gramas) / 100
  const substituir = deReceita || !alimento ? undefined : aoSubstituir
  const unidade = unidadeDo(alimento)
  const temOQueComer = deReceita ? receitaComOQueComer(receita, buscarAlimento) : alimento !== undefined

  const editaMedida = aoMudarMedida !== undefined && alimento !== undefined
  const naLinha = medidaNaLinha(item)
  const medidasDoAlimento = alimento ? medidasDoSeletor(alimento.id) : []
  // A medida guardada que não está mais entre as do alimento (medida própria excluída) continua na lista (CA-1162).
  const medidas =
    naLinha && !medidasDoAlimento.some((m) => m.nome === naLinha.nome)
      ? [...medidasDoAlimento, { nome: naLinha.nome, gramas: naLinha.gramasPorMedida }]
      : medidasDoAlimento
  const leitura = temOQueComer ? textoDaQuantidade(linhaDaFolha(item, buscarAlimento, modo).quantidade) : null

  // Sem a medida de antes, vira a meia medida mais perto dos gramas: escolher a medida não joga o peso para longe.
  const escolher = (m: MedidaCaseira | null) => {
    if (!aoMudarMedida) return
    if (m === null) return aoMudarMedida(null)
    const quantidade = naLinha ? naLinha.quantidade : emMeiasMedidas(item.gramas, m.gramas) || 1
    aoMudarMedida({ nome: m.nome, quantidade, gramasPorMedida: m.gramas })
  }

  const kcalTexto = (
    <span
      className="numeros shrink-0 pt-0.5 text-sm font-medium text-heading"
      title={kcal === null ? 'A tabela de composição não traz energia para este alimento.' : undefined}
    >
      {kcal === null ? '— kcal' : `${formatarNumero(kcal, 0)} kcal`}
      {kcal !== null && daReceita ? <MarcaSemDado semDado={daReceita.semDado} /> : null}
    </span>
  )

  const acoes = (
    <div className="flex shrink-0 items-center">
      {/* Sem o alimento, não há o que comparar para um substituto equivalente; a receita também não tem (CA-873). */}
      {substituir ? (
        <Button variant="ghost" size="iconsm" onClick={substituir} aria-label={`Substituir ${descricao}`}>
          <ArrowLeftRight aria-hidden="true" />
        </Button>
      ) : null}
      <Button variant="ghost" size="iconsm" onClick={aoRemover} aria-label={`Remover ${descricao}`}>
        <X aria-hidden="true" />
      </Button>
    </div>
  )

  const campoGramas = (
    // No celular, 84 px bastam para "1000 g"; o resto da largura fica para o nome da medida.
    <div className="w-[5.25rem] shrink-0 sm:w-24">
      <CampoNumero
        rotulo={`Gramas de ${descricao}`}
        rotuloOculto
        valor={item.gramas}
        // CB-04: zero é aceito e não soma nada; negativo é ignorado.
        aoMudar={(v) => v !== null && v >= 0 && aoMudarGramas(v)}
        sufixo={unidade}
      />
    </div>
  )

  if (!editaMedida) {
    const medidaTexto = deReceita
      ? ['Receita', receita ? textoDaPorcao(receita, item.gramas) : null].filter(Boolean).join(' · ')
      : (naLinha?.texto ?? null)
    return (
      // No celular o nome fica numa linha só e os controles descem; no desktop tudo na mesma linha.
      <li className="flex flex-col gap-1 border-b border-border py-2 last:border-0 sm:flex-row sm:items-center sm:gap-3">
        <div className="min-w-0 sm:flex-1">
          <p className="truncate text-sm text-foreground" title={incompleto ? `${descricao} — ${incompleto}` : descricao}>
            {descricao}
          </p>
          {medidaTexto ? <p className="truncate text-xs text-muted-foreground">{medidaTexto}</p> : null}
          {modo && aoMudarMedida && leitura ? <p className="text-xs text-muted-foreground">{`O paciente lê: ${leitura}`}</p> : null}
          {/* D-248, revisão de 20/10/2026: a folha e o link deixam o item excluído de fora; a nutricionista fica sabendo aqui. */}
          {/* CB-317 (integracao-rodada-1910): a receita sem o que comer também fica de fora. */}
          {temOQueComer ? null : <p className="text-xs text-warningtext">Não aparece no plano impresso nem no link do paciente.</p>}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {campoGramas}
          <span className="flex-1 sm:w-20 sm:flex-none sm:text-right">{kcalTexto}</span>
          {acoes}
        </div>
      </li>
    )
  }

  const aproximada = naLinha?.aproximada === true
  const automatica = naLinha?.origem === 'automatica'
  // D-383: a medida de um alimento próprio entra no cadastro dele, que só se edita com o formulário novo ligado.
  const criar =
    aoCriarMedida && alimento && (alimento.id < PRIMEIRO_ID_PRODUTO || MEUS_ALIMENTOS_NOVOS) ? () => aoCriarMedida(alimento.id, (m) => escolher(m)) : undefined

  return (
    // G2: o nome; quantidade + medida = gramas; o que o paciente lê. No celular, as três linhas; nada passa de 360 px.
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-0">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 truncate pt-0.5 text-sm font-medium text-foreground" title={incompleto ? `${descricao} — ${incompleto}` : descricao}>
          {descricao}
        </p>
        {kcalTexto}
        {acoes}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {naLinha ? (
          <>
            {aproximada ? (
              <span className="shrink-0 text-base font-semibold text-warningtext" title="Os gramas não fecham em meia medida.">
                <span aria-hidden="true">≈</span>
                <span className="sr-only">aproximadamente</span>
              </span>
            ) : null}
            <div className="w-14 shrink-0 sm:w-16">
              <CampoNumero
                rotulo={`Quantidade de ${descricao}`}
                rotuloOculto
                valor={naLinha.quantidade}
                aoMudar={(v) => {
                  if (v === null || v < 0 || !aoMudarMedida) return
                  aoMudarMedida({ nome: naLinha.nome, quantidade: v, gramasPorMedida: naLinha.gramasPorMedida })
                }}
              />
            </div>
          </>
        ) : null}
        {medidas.length > 0 || criar ? (
          <SeletorDeMedida
            rotulo={`Medida de ${descricao}`}
            medidas={medidas}
            valor={naLinha?.nome ?? null}
            unidade={unidade}
            aoEscolher={escolher}
            aoCriarMedida={criar}
            className="flex-1 sm:w-56 sm:flex-none"
          />
        ) : null}
        {naLinha ? (
          <span aria-hidden="true" className="shrink-0 text-sm text-muted-foreground">
            =
          </span>
        ) : null}
        {campoGramas}
      </div>

      {leitura ? (
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>
            {'O paciente lê: '}
            <span className={aproximada ? 'font-medium text-warningtext' : 'font-medium text-foreground'}>{leitura}</span>
            {automatica ? ' · medida automática' : null}
          </span>
          {aproximada ? (
            <Button variant="link" size="sm" className="h-auto px-0 text-xs max-sm:min-h-11" onClick={() => aoMudarMedida?.(null)}>
              Usar só gramas
            </Button>
          ) : null}
          {automatica && naLinha ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs max-sm:min-h-11"
              // G5: fixar guarda a medida com os gramas de agora; o peso não muda.
              onClick={() => aoMudarMedida?.({ nome: naLinha.nome, quantidade: item.gramas / naLinha.gramasPorMedida, gramasPorMedida: naLinha.gramasPorMedida })}
            >
              Fixar a medida
            </Button>
          ) : null}
        </p>
      ) : null}
      {medidasDoAlimento.length === 0 ? <p className="text-xs text-muted-foreground">Sem medida caseira na base.{criar ? ' Crie a sua.' : ''}</p> : null}
    </li>
  )
}
