import { textoDosAlimentosProprios } from './exemploDaLanding.ts'
import { ESPACO_DE_SECAO, MARGEM, TITULO_DE_SECAO } from './estiloDaLanding.ts'

interface PerguntasFrequentesProps {
  /** O formulário novo de Meus alimentos (publicação 2, D-540). */
  readonly formularioNovo: boolean
}

/**
 * "Perguntas frequentes" (spec landing-v3, D-672): as oito do protótipo v9, na ordem dele, cada resposta o que o app faz
 * hoje. A do estudante continua com o comprovante de matrícula e os 12 meses (D-541 e D-606); a do alimento que não
 * está na base segue a publicação 2. As respostas ficam no HTML com a pergunta fechada (CB-535): quem lê a página
 * pré-desenhada, e os buscadores, leem tudo.
 */
export function PerguntasFrequentes({ formularioNovo }: PerguntasFrequentesProps) {
  const perguntas: readonly { readonly pergunta: string; readonly resposta: string }[] = [
    {
      pergunta: 'De onde vêm os valores dos alimentos?',
      resposta:
        'Da Base MetaNutri, montada a partir de tabelas oficiais de composição e organizada pela nossa equipe, com os valores de cada alimento por 100 g.',
    },
    {
      pergunta: 'O MetaNutri substitui a conduta do nutricionista?',
      resposta:
        'Não. Ele calcula e sugere; a decisão sobre o que entra no plano é sempre sua. Bebidas alcoólicas, ultraprocessados e gordura trans nunca aparecem nas sugestões.',
    },
    {
      pergunta: 'Atende gestante, criança e idoso?',
      resposta:
        'Sim, de 1 ano de idade em diante, com as equações de gasto energético e as referências de cada fase: crianças e adolescentes, gestantes, lactantes e idosos.',
    },
    {
      pergunta: 'O paciente precisa baixar um aplicativo?',
      resposta: 'Não. Ele recebe um link, abre no celular e marca as missões do dia; se você quiser, o mesmo link mostra o plano alimentar. Sem conta e sem senha.',
    },
    {
      pergunta: 'Tem fidelidade? Como cancelo?',
      resposta: 'Não tem fidelidade. Você cancela quando quiser em Conta e assinatura, no próprio site.',
    },
    { pergunta: 'E o alimento que não está na base?', resposta: textoDosAlimentosProprios(formularioNovo).resposta },
    {
      pergunta: 'Onde ficam os dados dos pacientes?',
      resposta: 'Na sua conta, na nuvem, separados das outras contas. O paciente autoriza antes de receber o link.',
    },
    {
      pergunta: 'Sou estudante. Posso usar?',
      resposta:
        'Pode, com o e-mail da faculdade e o comprovante de matrícula. A assinatura Estudante é grátis por 12 meses ou até a formatura, o que vier antes, para casos de estudo e estágio supervisionado. O uso é não comercial.',
    },
  ]

  return (
    <section aria-labelledby="titulo-perguntas" data-fundo="teal" className={`bg-landing-teal text-landing-marfim ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <h2 id="titulo-perguntas" data-surge="" className={TITULO_DE_SECAO}>
        Perguntas frequentes
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
