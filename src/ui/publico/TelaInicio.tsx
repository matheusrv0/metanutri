import type { Ciclo, IdPlano } from '@/domain/conta.ts'
import { MEUS_ALIMENTOS_NOVOS } from '@/domain/produtos.ts'
import { AcompanhamentoDaAdesao } from './inicio/AcompanhamentoDaAdesao.tsx'
import { AdequacaoDoExemplo } from './inicio/AdequacaoDoExemplo.tsx'
import { ComoFunciona } from './inicio/ComoFunciona.tsx'
import { FaixaComecar } from './inicio/FaixaComecar.tsx'
import { FotoDosLegumes } from './inicio/FotoDosLegumes.tsx'
import { Funcionalidades } from './inicio/Funcionalidades.tsx'
import { HeroiDaLanding } from './inicio/HeroiDaLanding.tsx'
import { PerguntasFrequentes } from './inicio/PerguntasFrequentes.tsx'
import { PlanosEPrecos } from './inicio/PlanosEPrecos.tsx'
import { QuantidadesEmGramas } from './inicio/QuantidadesEmGramas.tsx'

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
      <AdequacaoDoExemplo />
      <AcompanhamentoDaAdesao />
      <Funcionalidades formularioNovo={formularioNovo} />
      <FotoDosLegumes />
      <ComoFunciona />
      <QuantidadesEmGramas />
      <PlanosEPrecos aoEscolher={aoEscolher} />
      <PerguntasFrequentes formularioNovo={formularioNovo} />
      <FaixaComecar aoComecar={aoComecar} />
    </>
  )
}
