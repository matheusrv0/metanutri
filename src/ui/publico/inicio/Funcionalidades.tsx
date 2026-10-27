import { textoDosAlimentosProprios, VITAMINAS_E_MINERAIS } from './exemploDaLanding.ts'
import { APOIO, ESPACO_DE_SECAO, MARGEM, TITULO_DE_SECAO } from './estiloDaLanding.ts'

interface FuncionalidadesProps {
  /** O formulário novo de Meus alimentos (publicação 2, D-540). */
  readonly formularioNovo: boolean
}

/**
 * "Funcionalidades" (spec landing-v3, D-663): nove itens, só texto, com os textos do protótipo v9. O logotipo segue o
 * glossário, e o cadastro de alimentos diz o que a publicação de Meus alimentos permite.
 */
export function Funcionalidades({ formularioNovo }: FuncionalidadesProps) {
  const itens: readonly { readonly titulo: string; readonly texto: string }[] = [
    {
      titulo: 'Prescrição rápida ou completa',
      texto: 'Comece só com sexo, idade e meta de calorias, ou faça o atendimento completo com antropometria e gasto energético.',
    },
    {
      titulo: 'Adequação de micronutrientes',
      texto: `${VITAMINAS_E_MINERAIS} vitaminas e minerais e a fibra, comparados com a referência para a idade, o sexo e a fase da vida.`,
    },
    {
      titulo: 'Sugestão do que comer',
      texto: 'Até 5 alimentos para cada nutriente abaixo da meta, com a porção em gramas, quanto cobrem e as calorias.',
    },
    {
      titulo: 'Gasto energético e hidratação',
      texto: 'Equações para adultos, crianças, adolescentes, gestantes e lactantes, e a água calculada pelo peso.',
    },
    { titulo: 'Avaliação antropométrica', texto: 'IMC, circunferências, dobras cutâneas e bioimpedância, com a evolução do peso na ficha.' },
    {
      titulo: 'Anamnese, restrições e alergias',
      texto: 'Roteiro de anamnese editável. Alimentos que batem com alergias e restrições da ficha saem das sugestões.',
    },
    {
      titulo: 'Substitutos, receitas e modelos',
      texto: 'Substitutos com equivalência calculada, receitas com valor por porção e modelos de plano para reutilizar.',
    },
    { titulo: 'Cadastro de alimentos', texto: textoDosAlimentosProprios(formularioNovo).funcionalidade },
    {
      titulo: 'Documentos prontos',
      texto: 'PDF com lista de compras, Word no modelo do estágio e pedido de exames, com o seu logotipo e o seu CRN.',
    },
  ]

  return (
    <section id="funcionalidades" aria-labelledby="titulo-funcionalidades" className={`bg-landing-chao ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <h2 id="titulo-funcionalidades" data-surge="" className={TITULO_DE_SECAO}>
        Funcionalidades
      </h2>
      <p data-surge="" className={APOIO}>
        Todas incluídas em qualquer assinatura.
      </p>
      <ul className="mt-14 grid list-none grid-cols-3 gap-x-12 gap-y-10 p-0 max-[1100px]:grid-cols-2 max-[720px]:grid-cols-1">
        {itens.map((item) => (
          <li key={item.titulo} data-surge="">
            <h3 className="text-[19px] leading-[1.25] font-extrabold tracking-[-0.01em]">{item.titulo}</h3>
            <p className="mt-1.5 max-w-[38ch] text-base text-landing-tinta-suave">{item.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
