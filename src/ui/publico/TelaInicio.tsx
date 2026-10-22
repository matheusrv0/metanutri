import { ArrowLeftRight, ArrowUpRight, ClipboardList, Cloud, CookingPot, FileText, Pill, type LucideIcon } from 'lucide-react'
import { DIAS_PARA_SUMIR } from '@/domain/acompanhamento.ts'
import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { MAXIMO_SUGESTOES } from '@/domain/cobrir.ts'
import { DIAS_PACIENTE_ATIVO, planoPorId, type PlanoAssinatura } from '@/domain/conta.ts'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface TelaInicioProps {
  readonly aoComecar: () => void
  readonly aoVerPrecos: () => void
}

const BASE = import.meta.env.BASE_URL

function rolarAte(id: string) {
  globalThis.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** D-327: os números da página vêm do domínio. A fibra entra na adequação, mas não é vitamina nem mineral. */
const NUTRIENTES = MICRONUTRIENTES_ADEQUACAO.length
const VITAMINAS_E_MINERAIS = MICRONUTRIENTES_ADEQUACAO.filter((chave) => chave !== 'fibra_g').length

const reais = (valor: number) => valor.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 })
const pacientes = (plano: PlanoAssinatura) =>
  plano.limitePacientesAtivos === null ? 'Pacientes ilimitados.' : `${plano.limitePacientesAtivos} pacientes ativos.`

interface Parte {
  readonly titulo: string
  readonly paragrafos: readonly string[]
  readonly captura: 'cobrir' | 'missoes'
  readonly largura: number
  readonly altura: number
  readonly alt: string
}

/**
 * CA-1174 (spec textos-e-promessas): as duas funções que carregam o produto, cada uma com a tela real do app. A
 * primeira diz o que uma busca por nutriente não faz (D-403): a conta do que falta e a porção que fecha a diferença.
 */
const PARTES: readonly Parte[] = [
  {
    titulo: 'Monte o plano e cubra o que falta',
    paragrafos: [
      'Digite “150 arroz” e tecle Enter: o alimento entra na refeição já com a medida caseira, e as calorias e os macros do dia se atualizam.',
      'Uma lista dos alimentos mais ricos em cálcio não diz quanto pôr no prato. O MetaNutri calcula quanto falta em cada nutriente abaixo da meta, e o botão Cobrir propõe o alimento e a porção que fecham a diferença, em gramas e, quando a base tem, em medida caseira.',
      'As sugestões vêm de grupos diferentes e respeitam as restrições do paciente. Se nem uma porção realista fecha a diferença, a sugestão mostra quanto ela cobre. Você escolhe, e o alimento entra na refeição.',
    ],
    captura: 'cobrir',
    // Correção A (D-438): capturas refeitas depois das porções realistas e da refeição de cada alimento.
    largura: 448,
    altura: 568,
    alt: 'Tela do botão Cobrir sugerindo leite desnatado no lanche e quiabo no almoço para completar o cálcio.',
  },
  {
    titulo: 'Acompanhe o paciente entre as consultas',
    paragrafos: [
      'O plano vira missões diárias num link. O paciente abre no celular, sem baixar aplicativo nem criar conta, e marca o que cumpriu. Se você quiser, o mesmo link mostra o plano alimentar.',
      `Na tela Adesão, quem fica ${DIAS_PARA_SUMIR} dias sem marcar sobe para o topo da lista. Você manda o link e os lembretes pelo WhatsApp, com a mensagem pronta.`,
    ],
    captura: 'missoes',
    largura: 390,
    altura: 788,
    alt: 'Tela de missões do paciente com 2 missões feitas no dia.',
  },
]

/** CA-1175: só o que existe no produto, um recurso por item. */
const RECURSOS: readonly { readonly icone: LucideIcon; readonly titulo: string; readonly texto: string }[] = [
  {
    icone: ClipboardList,
    titulo: 'Anamnese e avaliação',
    texto: 'Roteiro de anamnese editável, antropometria, composição corporal e gasto energético com a fórmula à mostra.',
  },
  {
    icone: ArrowLeftRight,
    titulo: 'Substitutos e trocas',
    texto: 'Cada refeição com a opção principal e até dois substitutos equivalentes, e a lista de trocas no plano impresso.',
  },
  {
    icone: CookingPot,
    titulo: 'Receitas e alimentos próprios',
    texto: 'Receitas com valor nutricional por porção e, em Meus alimentos, produtos cadastrados pelo rótulo ou pelo código de barras. Os dois entram na refeição pela busca, como qualquer alimento.',
  },
  { icone: Pill, titulo: 'Suplementos e exames', texto: 'Prescrição de suplementos e pedido de exames prontos para imprimir, com a sua assinatura.' },
  {
    icone: FileText,
    titulo: 'Documentos',
    texto: 'Plano alimentar em PDF, com nomes de alimentos que o paciente entende. Aconselhamento nutricional e memorial de cálculo em Word.',
  },
  { icone: Cloud, titulo: 'Na sua conta', texto: 'Planos e pacientes salvos na nuvem. Abra no computador ou no celular.' },
]

/** CA-1176: Free, Solo e Pro, com os valores de `PLANOS`; o Estudante entra no texto do Free. */
const PRECOS = (() => {
  const free = planoPorId('free')
  const estudante = planoPorId('estudante')
  const solo = planoPorId('solo')
  const pro = planoPorId('pro')
  if (!free || !estudante || !solo || !pro) return []
  return [
    {
      id: 'free',
      valor: `R$ ${reais(free.mensal)}`,
      rotulo: free.nome,
      apoio: `${free.limitePacientesAtivos ?? ''} pacientes ativos, sem cartão. Estudante com comprovante de matrícula: ${estudante.limitePacientesAtivos ?? ''}.`,
      tom: 'branco',
    },
    { id: 'solo', valor: `R$ ${reais(solo.mensal)}`, rotulo: `${solo.nome}, por mês`, apoio: `${pacientes(solo)} ${solo.resumo}`, tom: 'teal' },
    { id: 'pro', valor: `R$ ${reais(pro.mensal)}`, rotulo: `${pro.nome}, por mês`, apoio: `${pacientes(pro)} ${pro.resumo}`, tom: 'branco' },
  ] as const
})()

// D-334, CA-1020 e CA-1027: prioridade alta, mas preguiçosa. Na landing à vista, o <head> já pré-carrega esta mesma foto
// (public/preparar-pagina.js, mesmo srcset e sizes); escondida (link do paciente, raiz com sessão), ela não baixa. O React
// 18 não conhece `fetchPriority`; o atributo vai em minúsculas, como o navegador lê.
const PRIORIDADE_ALTA = { fetchpriority: 'high' }

const TITULO_SECAO = 'text-[clamp(28px,3.4vw,36px)] font-bold leading-tight'

/**
 * Landing no estilo da referência Spora (spec estilo-spora), reescrita na spec site-publico-profissional (D-326) e com
 * o texto revisto na spec textos-e-promessas (D-402 a D-404): o diferencial no topo, como funciona, os recursos, quanto
 * custa e a faixa final. Foto só no topo (D-22); daqui para baixo, texto, números do domínio e telas reais.
 */
export function TelaInicio({ aoComecar, aoVerPrecos }: TelaInicioProps) {
  return (
    <>
      <section aria-labelledby="titulo-inicio" className="overflow-hidden px-4 pb-12 sm:px-8">
        <div className="mx-auto max-w-[1216px]">
          <img
            {...PRIORIDADE_ALTA}
            src={`${BASE}imagens/pratos-heroi.webp`}
            srcSet={`${BASE}imagens/pratos-heroi-800.webp 800w, ${BASE}imagens/pratos-heroi.webp 1600w`}
            sizes="(max-width: 640px) 92vw, 600px"
            width={1600}
            height={712}
            loading="lazy"
            alt="Três pratos vistos de cima: salada com grão-de-bico, tigela com tofu e legumes, prato com ovo e tomate."
            className="mx-auto mt-4 h-auto w-[92%] max-w-[600px]"
          />

          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <h1 id="titulo-inicio" className="text-[clamp(34px,5vw,52px)] font-bold leading-[1.02]">
                Faltou cálcio?{' '}
                <br />O MetaNutri diz{' '}
                <br />o que comer.
              </h1>
              <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
                Software para nutricionistas. Monte o plano alimentar, entregue em PDF e acompanhe o paciente pelo celular entre as consultas.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="laranja" onClick={aoComecar}>
                  Começar grátis
                  <ArrowUpRight aria-hidden="true" />
                </Button>
                <Button variant="outline" className="bg-transparent" onClick={aoVerPrecos}>
                  Ver preços
                </Button>
              </div>
            </div>
            {/* D-402: dois números do domínio que levam a Como funciona. O de alimentos da base saiu (decisão 9). */}
            <div className="grid grid-cols-2 gap-3 lg:w-[400px]">
              <CartaoNumero
                valor={String(NUTRIENTES)}
                rotulo="nutrientes na adequação"
                apoio={`${VITAMINAS_E_MINERAIS} vitaminas e minerais e a fibra`}
                aoClicar={() => rolarAte('como-funciona')}
              />
              <CartaoNumero
                valor={`Até ${MAXIMO_SUGESTOES}`}
                rotulo="sugestões de alimento"
                apoio="para cada nutriente abaixo da meta"
                aoClicar={() => rolarAte('como-funciona')}
              />
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" aria-labelledby="titulo-como-funciona" className="scroll-mt-24 rounded-t-[36px] bg-card px-4 pb-20 pt-16 sm:px-14">
        <div className="mx-auto max-w-[1216px]">
          <h2 id="titulo-como-funciona" className={TITULO_SECAO}>
            Como funciona
          </h2>
          <div className="mt-10 grid gap-6">
            {PARTES.map((parte, i) => (
              <div key={parte.captura} className="grid items-center gap-8 rounded-2xl bg-surfacerow p-6 sm:p-10 lg:grid-cols-2 lg:gap-12">
                <div className={i % 2 === 1 ? 'lg:order-2' : undefined}>
                  <h3 className="max-w-[24ch] text-2xl font-bold leading-tight">{parte.titulo}</h3>
                  {parte.paragrafos.map((paragrafo) => (
                    <p key={paragrafo} className="mt-4 max-w-[60ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {paragrafo}
                    </p>
                  ))}
                </div>
                {/* Capturas geradas do próprio app (scripts/capturas-landing.mjs), uma por tema: só a do tema da página carrega. */}
                <figure className="mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl bg-card shadow-raised ring-1 ring-border">
                  {(['claro', 'escuro'] as const).map((tema) => (
                    <img
                      key={tema}
                      src={`${BASE}imagens/${parte.captura}-${tema}.png`}
                      width={parte.largura}
                      height={parte.altura}
                      alt={parte.alt}
                      className={tema === 'claro' ? 'block h-auto w-full dark:hidden' : 'hidden h-auto w-full dark:block'}
                      loading="lazy"
                    />
                  ))}
                </figure>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="recursos" aria-labelledby="titulo-recursos" className="scroll-mt-24 bg-card px-4 pb-20 sm:px-14">
        <div className="mx-auto max-w-[1216px]">
          <h2 id="titulo-recursos" className={`${TITULO_SECAO} max-w-[22ch]`}>
            Do atendimento ao documento entregue
          </h2>
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((recurso) => (
              <li key={recurso.titulo} className="border-t border-border pt-5">
                <recurso.icone className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-bold">{recurso.titulo}</h3>
                <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">{recurso.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="quanto-custa" aria-labelledby="titulo-quanto-custa" className="scroll-mt-24 px-4 py-20 sm:px-14">
        <div className="mx-auto max-w-[1216px]">
          <h2 id="titulo-quanto-custa" className={TITULO_SECAO}>
            Quanto custa
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PRECOS.map((preco) => (
              <CartaoNumero key={preco.id} tom={preco.tom} valor={preco.valor} rotulo={preco.rotulo} apoio={preco.apoio} />
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-[60ch] text-sm text-muted-foreground">
              {`Todas as assinaturas têm as mesmas funções. O preço depende de quantos pacientes ativos você tem: quem teve plano alimentar ou missão nos últimos ${DIAS_PACIENTE_ATIVO} dias.`}
            </p>
            <Button variant="outline" className="bg-transparent" onClick={aoVerPrecos}>
              Comparar planos
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-fecho" className="bg-surfacebrand px-4 py-14 sm:px-14">
        <div className="mx-auto flex max-w-[1216px] flex-wrap items-center justify-between gap-6">
          <div>
            <h2 id="titulo-fecho" className="text-[clamp(26px,3.2vw,34px)] font-bold leading-tight text-textonbrand">
              Teste com um paciente real
            </h2>
            <p className="mt-2 text-sm text-textonbrandmuted">Grátis, sem cartão.</p>
          </div>
          <Button variant="laranja" onClick={aoComecar}>
            Começar grátis
            <ArrowUpRight aria-hidden="true" />
          </Button>
        </div>
      </section>
    </>
  )
}
