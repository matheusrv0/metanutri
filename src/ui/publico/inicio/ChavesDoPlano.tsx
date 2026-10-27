import { useState } from 'react'
import { AGUA_DO_EXEMPLO, FEIJAO_NA_CONCHA, textoDosAlimentosProprios } from './exemploDaLanding.ts'
import { MARGEM, TITULO_L } from './estiloDaLanding.ts'
import { FaixaComChave, type CorDaFaixa } from './FaixaComChave.tsx'

interface ChavesDoPlanoProps {
  /** O formulário novo de Meus alimentos (publicação 2, D-540). */
  readonly formularioNovo: boolean
}

interface Chave {
  readonly frase: string
  readonly efeito: string
  readonly cor: CorDaFaixa
}

/** "O plano sai do seu jeito" (D-539): cinco chaves; as duas primeiras começam ligadas. Cada efeito é o que o app faz. */
export function ChavesDoPlano({ formularioNovo }: ChavesDoPlanoProps) {
  const chaves: readonly Chave[] = [
    {
      frase: 'Medida caseira junto dos gramas',
      efeito: `${FEIJAO_NA_CONCHA.paraPaciente}: ${FEIJAO_NA_CONCHA.medida} (${FEIJAO_NA_CONCHA.gramas}).`,
      cor: 'teal',
    },
    {
      frase: 'Água calculada pelo peso',
      efeito: `Maria, ${AGUA_DO_EXEMPLO.pesoKg} kg: ${AGUA_DO_EXEMPLO.mlPorKg} ml por quilo dá ${AGUA_DO_EXEMPLO.litros} litros por dia.`,
      cor: 'cartao',
    },
    {
      frase: 'Respeitar a alergia a leite',
      efeito: 'O iogurte sai das sugestões de cálcio, e a linha do plano avisa se um alimento bater com a alergia.',
      cor: 'teal-medio',
    },
    { frase: 'Plano no celular da paciente', efeito: 'Ela abre um link, sem instalar nada, e marca o que cumpriu no dia.', cor: 'cartao' },
    { frase: 'Alimentos que a base ainda não tem', efeito: textoDosAlimentosProprios(formularioNovo).efeito, cor: 'marfim' },
  ]
  const [ligadas, setLigadas] = useState<readonly boolean[]>([true, true, false, false, false])

  return (
    <section aria-labelledby="titulo-chaves" data-capitulo="chao" className="bg-landing-chao pt-[136px] max-[720px]:pt-[104px]">
      <h2 id="titulo-chaves" data-surge="" className={`pb-9 ${TITULO_L} ${MARGEM}`}>
        O plano sai do seu jeito
      </h2>
      {chaves.map((chave, i) => (
        <FaixaComChave
          key={chave.frase}
          {...chave}
          ligada={ligadas[i] === true}
          aoVirar={() => setLigadas((antes) => antes.map((ligada, j) => (j === i ? !ligada : ligada)))}
        />
      ))}
    </section>
  )
}
