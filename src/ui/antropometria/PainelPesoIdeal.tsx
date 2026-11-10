import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { calcularImc, IDADE_IDOSO } from '@/domain/antropometria.ts'
import { FONTES } from '@/domain/fontesAntropometria.ts'
import { idadeValida, medidaValida, naPrecisao } from '@/domain/linhaDoResultado.ts'
import { compleicaoDoCaso, linhaCompleicao, pesoAjustado, pesoIdeal } from '@/domain/pesoDeReferencia.ts'
import type { Caso } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoMedida } from './CampoMedida.tsx'
import { TRAVESSAO, comUnidade, faixaEmKg, fraseDoImcAlvo, textoDaFalta } from './textosDaAvaliacao.ts'

interface PainelPesoIdealProps {
  readonly caso: Caso
  readonly bruto: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly aoFechar: () => void
}

/** Uma linha do resultado do painel: o nome, o valor e a explicação embaixo. */
function linha(rotulo: string, valor: string, detalhe: ReactNode, grande = false) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <span className="text-sm text-foreground">{rotulo}</span>
      <strong className={grande ? 'numeros text-right text-lg font-semibold text-heading' : 'numeros text-right text-sm font-semibold text-heading'}>{valor}</strong>
      {detalhe ? <span className="col-span-2 text-xs text-muted-foreground">{detalhe}</span> : null}
    </div>
  )
}

/**
 * "Estimar peso ideal" (spec antropometria-telas, D-1409 e D-1463): a compleição de Grant, o IMC-alvo editável, o peso
 * ideal, a faixa de eutrofia e o peso ajustado, com as contas e as fontes do motor.
 */
export function PainelPesoIdeal({ caso, bruto, aoAlterar, aoFechar }: PainelPesoIdealProps) {
  const digitado = bruto.avaliacao.imcAlvo
  const ideal = pesoIdeal(caso, digitado)
  const idade = idadeValida(caso.idadeAnos)
  const idoso = idade !== null && idade >= IDADE_IDOSO

  let corpo: ReactNode
  if (idade === null) corpo = <p className="text-sm text-muted-foreground">Falta a idade para o peso ideal.</p>
  else if (ideal === null) corpo = <p className="text-sm text-muted-foreground">O peso ideal vale de 20 anos em diante, fora da gestação.</p>
  else {
    const compleicao = compleicaoDoCaso(caso)
    const grant = linhaCompleicao(caso)
    const padrao = pesoIdeal(caso, null)
    const imcPadrao = padrao?.calculou ? padrao.imcAlvo : null
    const peso = medidaValida(caso.pesoKg)
    const estatura = medidaValida(caso.estaturaCm)
    const ajustado = pesoAjustado(caso)
    const imc = peso !== null && estatura !== null ? naPrecisao(calcularImc(peso, estatura), 2) : null
    const textoDoAjustado =
      ajustado === null
        ? { valor: 'Não se aplica', detalhe: imc === null ? 'Só com IMC de 30 ou mais.' : `Só com IMC de 30 ou mais. O IMC é ${formatarNumero(imc, 2)}.` }
        : ajustado.calculou
          ? { valor: comUnidade(ajustado.pesoKg, 1, 'kg'), detalhe: `(peso − peso no IMC 25) × 0,25 + peso no IMC 25 (${ajustado.fonte.curta}).` }
          : { valor: TRAVESSAO, detalhe: textoDaFalta(ajustado.falta) }
    corpo = (
      <>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-sm font-semibold text-heading">Compleição</span>
            <span className="text-base font-semibold text-heading">{idoso ? 'Não se usa no idoso' : (grant?.situacao?.rotulo ?? TRAVESSAO)}</span>
            <span className="text-xs text-muted-foreground">
              {idoso
                ? 'No idoso, o IMC-alvo parte de 24,5.'
                : grant && grant.valor !== null
                  ? `Estatura ÷ punho = ${formatarNumero(grant.valor, 1)}`
                  : textoDaFalta(grant?.falta ?? [])}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <CampoMedida
              rotulo="IMC-alvo"
              unidade="kg/m²"
              valor={digitado}
              placeholder={imcPadrao === null ? undefined : formatarNumero(imcPadrao, 2)}
              aoMudar={(v) => aoAlterar({ avaliacao: { ...bruto.avaliacao, imcAlvo: v } })}
            />
            <span className="text-xs text-muted-foreground">{fraseDoImcAlvo(digitado !== null ? 'digitado' : idoso ? 'padrao-do-idoso' : 'compleicao', compleicao)}</span>
          </div>
        </div>
        <div className="grid">
          {ideal.calculou ? (
            <>
              {linha('Peso ideal', comUnidade(ideal.pesoKg, 1, 'kg'), null, true)}
              {linha(
                'Faixa de eutrofia',
                faixaEmKg(ideal.faixaKg.min ?? 0, ideal.faixaKg.max ?? 0),
                idoso ? 'IMC acima de 22 e abaixo de 27 nesta estatura.' : 'IMC de 18,50 a 24,99 nesta estatura.',
              )}
            </>
          ) : (
            linha('Peso ideal', TRAVESSAO, textoDaFalta(ideal.falta), true)
          )}
          {linha('Peso ajustado', textoDoAjustado.valor, textoDoAjustado.detalhe)}
        </div>
        <p className="text-xs text-muted-foreground">
          IMC-alvo pela compleição: {FONTES.saoCamilo2025.curta}. Compleição: {FONTES.grant1981.curta}.
        </p>
      </>
    )
  }

  return (
    <section aria-labelledby="titulo-peso-ideal" className="grid gap-3.5 rounded-2xl bg-surfacerow p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="titulo-peso-ideal" className="text-sm font-bold text-heading">
          Estimar peso ideal
        </h3>
        <Button variant="ghost" size="iconsm" aria-label="Fechar a estimativa" onClick={aoFechar}>
          <X aria-hidden="true" />
        </Button>
      </div>
      {corpo}
    </section>
  )
}
