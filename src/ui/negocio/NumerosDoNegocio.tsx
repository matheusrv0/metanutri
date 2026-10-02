import type { ResumoDoNegocio } from '@/domain/negocio.ts'
import { diferencaEm30Dias, inteiro, parteQuePaga, reais } from '@/domain/negocioTextos.ts'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'

/** CA-345 a CA-349: os quatro cartões do topo. A receita é o destaque da tela. */
export function NumerosDoNegocio({ resumo }: { readonly resumo: ResumoDoNegocio }) {
  const usadas = `${inteiro(resumo.fundadorUsadas)} de ${inteiro(resumo.fundadorVagas)}`
  const sobram = Math.max(0, resumo.fundadorVagas - resumo.fundadorUsadas)
  return (
    <section aria-label="Resumo do negócio" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <CartaoNumero tom="teal" valor={reais(resumo.receitaCentavos)} rotulo="Receita por mês" apoio={diferencaEm30Dias(resumo.diferenca30DiasCentavos)} />
      <CartaoNumero valor={inteiro(resumo.assinaturasAtivas)} rotulo="Assinaturas ativas" apoio={parteQuePaga(resumo.parteQuePaga)} />
      <CartaoNumero valor={inteiro(resumo.contas)} rotulo="Contas" apoio={`+${inteiro(resumo.contasNovas30Dias)} em 30 dias`} />
      <CartaoNumero
        valor={usadas}
        rotulo="Preço de fundador"
        apoio={`${inteiro(sobram)} ${sobram === 1 ? 'vaga' : 'vagas'} com preço travado para sempre`}
        extra={<Progress value={(resumo.fundadorUsadas / resumo.fundadorVagas) * 100} aria-label={`${usadas} vagas usadas`} />}
      />
    </section>
  )
}
