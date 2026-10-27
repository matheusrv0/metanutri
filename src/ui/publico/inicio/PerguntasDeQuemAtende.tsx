import { textoDosAlimentosProprios } from './exemploDaLanding.ts'
import { ESPACO_DE_SECAO, MARGEM, TITULO_XL } from './estiloDaLanding.ts'

interface PerguntasDeQuemAtendeProps {
  /** O formulário novo de Meus alimentos (publicação 2, D-540). */
  readonly formularioNovo: boolean
}

/**
 * "Perguntas de quem atende" (D-541; spec landing-v3, D-606): cada resposta é o que o app faz hoje. As respostas ficam no
 * HTML com a pergunta fechada (CB-535): quem lê a página pré-desenhada, e os buscadores, leem tudo.
 */
export function PerguntasDeQuemAtende({ formularioNovo }: PerguntasDeQuemAtendeProps) {
  const perguntas: readonly { readonly pergunta: string; readonly resposta: string }[] = [
    {
      pergunta: 'De onde vêm os valores dos alimentos?',
      // Spec landing-v3, D-606: a resposta do protótipo v3, sem a medida caseira.
      resposta:
        'Da Base MetaNutri, montada a partir de tabelas oficiais de composição e organizada pela nossa equipe, com os valores de cada alimento por 100 g.',
    },
    {
      pergunta: 'O MetaNutri prescreve no meu lugar?',
      resposta:
        'Não. Ele calcula e sugere; você escolhe o que entra no plano. Bebida alcoólica, ultraprocessado e gordura trans nunca aparecem nas sugestões.',
    },
    { pergunta: 'E o alimento que não está na base?', resposta: textoDosAlimentosProprios(formularioNovo).resposta },
    {
      pergunta: 'Onde ficam os dados dos pacientes?',
      resposta: 'Na sua conta, na nuvem, separados das outras contas. Você entra de qualquer computador ou celular.',
    },
    {
      pergunta: 'Sou estudante. Posso usar?',
      resposta:
        'Pode, com o e-mail da faculdade e o comprovante de matrícula. A assinatura Estudante é grátis por 12 meses ou até a formatura, o que vier antes, para casos de estudo e estágio supervisionado. O uso é não comercial.',
    },
    {
      pergunta: 'O paciente precisa baixar um aplicativo?',
      resposta: 'Não. Ele recebe um link, abre no celular e marca as missões do dia; se você quiser, o mesmo link mostra o plano alimentar. Sem conta e sem senha.',
    },
  ]

  return (
    <section aria-labelledby="titulo-perguntas" data-capitulo="teal" className={`bg-landing-teal text-landing-marfim ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <h2 id="titulo-perguntas" data-surge="" className={`${TITULO_XL} max-[720px]:text-[9vw]`}>
        Perguntas de quem atende
      </h2>
      <div className="mt-[52px] ml-[33%] grid gap-2.5 max-[720px]:ml-0">
        {perguntas.map(({ pergunta, resposta }) => (
          <details
            key={pergunta}
            data-surge=""
            className="group -mx-[22px] rounded-xl px-[22px] py-2.5 open:bg-landing-teal-fundo max-[720px]:-mx-(--landing-margem) max-[720px]:rounded-none max-[720px]:px-(--landing-margem)"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-(length:--landing-fs-lead) font-semibold tracking-[-0.01em] max-[720px]:text-[18px] [&::-webkit-details-marker]:hidden">
              {pergunta}
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="flex-none transition-transform duration-200 group-open:rotate-180"
              >
                <path d="M4 7l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </summary>
            <p className="max-w-[52ch] pt-1.5 pb-2.5 text-landing-tinta-resposta">{resposta}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
