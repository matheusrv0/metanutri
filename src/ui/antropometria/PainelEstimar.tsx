import { X } from 'lucide-react'
import { estimativasDeAltura, estimativasDePeso, type Estimativa } from '@/domain/estimativas.ts'
import { idadeValida, medidaValida } from '@/domain/linhaDoResultado.ts'
import type { Caso, MedidasCorporais } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { AJUDAS } from './ajudas.ts'
import { CampoMedida } from './CampoMedida.tsx'
import { TRAVESSAO, comUnidade, textoDaFalta, textoDoErro, textoDosLados } from './textosDaAvaliacao.ts'

interface PainelEstimarProps {
  /** O plano como vale (com a ficha): sexo, idade e gestação. */
  readonly caso: Caso
  /** O plano gravado, sobre o qual as mudanças se aplicam. */
  readonly bruto: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly aoFechar: () => void
}

/** A estimativa da tela: a primeira da ordem do motor que tem valor; sem nenhuma, a recomendada (D-1462). */
const escolhida = (lista: readonly Estimativa[]): Estimativa | null => lista.find((e) => e.valor !== null) ?? lista[0] ?? null

const arredondar1 = (v: number) => Math.round(v * 10) / 10

/** Uma linha do resultado: o valor estimado, o erro, a fonte e o lado; sem valor, o que falta. */
function linhaDaEstimativa(rotulo: string, estimativa: Estimativa | null) {
  const valor = estimativa?.valor ?? null
  const detalhe = !estimativa
    ? null
    : valor === null
      ? textoDaFalta(estimativa.falta)
      : [textoDoErro(estimativa.erro), estimativa.fonte.curta, textoDosLados(estimativa.lados)].filter((t) => t !== null).join(' · ')
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <span className="text-sm text-foreground">{rotulo}</span>
      <strong className="numeros text-right text-lg font-semibold text-heading">{valor === null ? TRAVESSAO : comUnidade(valor, 1, estimativa?.unidade ?? '')}</strong>
      {detalhe ? <span className="col-span-2 text-xs text-muted-foreground">{detalhe}</span> : null}
      {valor !== null && estimativa && estimativa.avisos.length > 0 ? <span className="col-span-2 text-xs text-muted-foreground">{estimativa.avisos.join(' ')}</span> : null}
    </div>
  )
}

/**
 * "Estimar altura e peso atual" (spec antropometria-telas, D-1408 e D-1462): as equações do motor (Chumlea no idoso,
 * Rabito no adulto), com os campos que elas pedem, no lado de cada estudo. "Usar os estimados" grava os dois.
 */
export function PainelEstimar({ caso, bruto, aoAlterar, aoFechar }: PainelEstimarProps) {
  const idade = idadeValida(caso.idadeAnos)
  const vale = idade !== null && idade >= 18 && caso.condicao.tipo !== 'gestante'
  const idoso = idade !== null && idade >= 60
  const medidas = bruto.medidasCorporais
  const mudar = (campo: keyof MedidasCorporais) => (v: number | null) => aoAlterar({ medidasCorporais: { ...medidas, [campo]: v } })

  const altura = escolhida(estimativasDeAltura(caso))
  const peso = escolhida(estimativasDePeso(caso))
  const valorDaAltura = altura?.valor ?? null
  const valorDoPeso = peso?.valor ?? null
  const pronto = valorDaAltura !== null && valorDoPeso !== null
  const estatura = medidaValida(caso.estaturaCm)
  const pesoHoje = medidaValida(caso.pesoKg)
  const medidosHoje = `${estatura === null ? TRAVESSAO : `${formatarNumero(estatura, 1)} cm`} · ${pesoHoje === null ? TRAVESSAO : `${formatarNumero(pesoHoje, 1)} kg`}`

  return (
    <section aria-labelledby="titulo-estimar" className="grid gap-3.5 rounded-2xl bg-surfacerow p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="titulo-estimar" className="text-sm font-bold text-heading">
          Estimar altura e peso atual
        </h3>
        <Button variant="ghost" size="iconsm" aria-label="Fechar a estimativa" onClick={aoFechar}>
          <X aria-hidden="true" />
        </Button>
      </div>
      {idade === null ? (
        <p className="text-sm text-muted-foreground">Falta a idade para estimar.</p>
      ) : !vale ? (
        <p className="text-sm text-muted-foreground">As estimativas valem de 18 anos em diante, fora da gestação.</p>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-3 sm:grid-cols-2">
            {idoso ? <CampoMedida rotulo="Altura do joelho" unidade="cm" valor={medidas.alturaDoJoelhoCm} aoMudar={mudar('alturaDoJoelhoCm')} ajuda={AJUDAS.alturaDoJoelho} /> : null}
            <CampoMedida rotulo="Semienvergadura" unidade="cm" valor={medidas.semienvergaduraCm} aoMudar={mudar('semienvergaduraCm')} ajuda={AJUDAS.semienvergadura} />
            {idoso ? (
              <>
                <CampoMedida rotulo="Braço relaxado direito" unidade="cm" valor={medidas.bracoRelaxadoDireitoCm} aoMudar={mudar('bracoRelaxadoDireitoCm')} ajuda={AJUDAS.braco} />
                <CampoMedida rotulo="Panturrilha direita" unidade="cm" valor={bruto.circunferenciaPanturrilhaCm} aoMudar={(v) => aoAlterar({ circunferenciaPanturrilhaCm: v })} ajuda={AJUDAS.panturrilha} faixa="circunferenciaPanturrilhaCm" />
              </>
            ) : (
              <>
                <CampoMedida rotulo="Braço relaxado esquerdo" unidade="cm" valor={medidas.bracoRelaxadoEsquerdoCm} aoMudar={mudar('bracoRelaxadoEsquerdoCm')} ajuda={AJUDAS.braco} />
                <CampoMedida rotulo="Panturrilha esquerda" unidade="cm" valor={medidas.panturrilhaEsquerdaCm} aoMudar={mudar('panturrilhaEsquerdaCm')} ajuda={AJUDAS.panturrilha} faixa="circunferenciaPanturrilhaCm" />
              </>
            )}
            <CampoMedida rotulo="Abdômen" unidade="cm" valor={medidas.abdomenCm} aoMudar={mudar('abdomenCm')} ajuda={AJUDAS.abdomen} />
          </div>
          <p className="text-xs text-muted-foreground">
            {idoso
              ? 'Chumlea mediu no lado direito; Rabito, no esquerdo. Sem o lado da equação, vale o outro, e a linha diz qual. A subescapular vem das dobras.'
              : 'Rabito mediu no lado esquerdo. Sem ele, vale o direito, e a linha diz qual.'}
          </p>
          <div className="grid">
            {linhaDaEstimativa('Altura estimada', altura)}
            {linhaDaEstimativa('Peso estimado', peso)}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 border-t border-border pt-2.5">
              <span className="text-sm text-foreground">Medidos hoje</span>
              <strong className="numeros text-right text-sm font-semibold text-heading">{medidosHoje}</strong>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={!pronto}
              onClick={() => {
                if (valorDaAltura === null || valorDoPeso === null) return
                aoAlterar({ estaturaCm: arredondar1(valorDaAltura), pesoKg: arredondar1(valorDoPeso), avaliacao: { ...bruto.avaliacao, origemPesoEstatura: 'estimadas' } })
                aoFechar()
              }}
            >
              Usar os estimados
            </Button>
            <Button size="sm" variant="soft" onClick={aoFechar}>
              Fechar
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
