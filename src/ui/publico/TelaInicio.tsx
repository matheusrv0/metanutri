import type { Ciclo, IdPlano } from '@/domain/conta.ts'
import { MEUS_ALIMENTOS_NOVOS } from '@/domain/produtos.ts'
import { ChavesDoPlano } from './inicio/ChavesDoPlano.tsx'
import { ComoFunciona } from './inicio/ComoFunciona.tsx'
import { FaixaComecar } from './inicio/FaixaComecar.tsx'
import { FotoDosLegumes } from './inicio/FotoDosLegumes.tsx'
import { GramaPorGrama } from './inicio/GramaPorGrama.tsx'
import { HeroiDaLanding } from './inicio/HeroiDaLanding.tsx'
import { PerguntasDeQuemAtende } from './inicio/PerguntasDeQuemAtende.tsx'
import { QuantoCusta } from './inicio/QuantoCusta.tsx'
import { VitrineDoCobrir } from './inicio/VitrineDoCobrir.tsx'

interface TelaInicioProps {
  readonly aoComecar: () => void
  /** "Assinar o Solo": o mesmo caminho do "Assinar" de Preços (D-544). */
  readonly aoEscolher: (plano: IdPlano, ciclo: Ciclo) => void
  /** O formulário novo de Meus alimentos (publicação 2, D-540). Os testes passam os dois valores. */
  readonly formularioNovo?: boolean
}

/**
 * A landing (spec landing-escura, protótipo aprovado pelo dono em 27/10/2026; spec landing-v3), na ordem da D-534, com
 * "Grama por grama" no lugar de "Na medida da cozinha". A barra do topo e o rodapé são da moldura (`MolduraDaLanding`),
 * que também cuida do tema da landing, escuro por padrão.
 */
export function TelaInicio({ aoComecar, aoEscolher, formularioNovo = MEUS_ALIMENTOS_NOVOS }: TelaInicioProps) {
  return (
    <>
      <HeroiDaLanding aoComecar={aoComecar} />
      <VitrineDoCobrir />
      <ChavesDoPlano formularioNovo={formularioNovo} />
      <FotoDosLegumes />
      <ComoFunciona />
      <GramaPorGrama />
      <QuantoCusta aoEscolher={aoEscolher} />
      <PerguntasDeQuemAtende formularioNovo={formularioNovo} />
      <FaixaComecar aoComecar={aoComecar} />
    </>
  )
}
