import type { ResumoDoNegocio } from '@/domain/negocio.ts'
import { diferencaEm30Dias, inteiro, parteQuePaga, reais } from '@/domain/negocioTextos.ts'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'

/**
 * CA-345 a CA-348: os três cartões do topo. A receita é o destaque da tela e, na grade de
 * duas colunas, ocupa a linha inteira para não sobrar buraco. No celular, a coluna encolhe (`minmax(0,1fr)`, D-800):
 * coluna `auto` crescia com a receita de oito dígitos e a página rolava para o lado (spec ajustes-mobile, M-014).
 */
export function NumerosDoNegocio({ resumo }: { readonly resumo: ResumoDoNegocio }) {
  return (
    <section aria-label="Resumo do negócio" className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <CartaoNumero
        tom="teal"
        valor={reais(resumo.receitaCentavos)}
        rotulo="Receita por mês"
        apoio={diferencaEm30Dias(resumo.diferenca30DiasCentavos)}
        className="sm:col-span-2 xl:col-span-1"
      />
      <CartaoNumero valor={inteiro(resumo.assinaturasAtivas)} rotulo="Assinaturas ativas" apoio={parteQuePaga(resumo.parteQuePaga)} />
      <CartaoNumero valor={inteiro(resumo.contas)} rotulo="Contas" apoio={`+${inteiro(resumo.contasNovas30Dias)} em 30 dias`} />
    </section>
  )
}
