// Porta de entrada pública. Uma ação principal (começar grátis, em laranja), quatro
// blocos e texto curto: o usuário achou a versão anterior cinza, longa e confusa.
//
// A tese continua a de 27/09: o diferencial é dizer o que comer. As imagens são
// capturas do próprio MetaNutri com um caso de exemplo, geradas em 2x.
import { ArrowRight, Barcode, Check, FileText, WifiOff, Zap } from 'lucide-react'
import { LACUNAS_DA_BASE } from '@/domain/vitrine.ts'
import { cn } from '@/lib/utils'
import { GridPattern } from '@ds/componentes/efeitos/grid-pattern.tsx'
import { TextHighlight } from '@ds/componentes/efeitos/text-highlight.tsx'
import { Logo } from '@ds/componentes/display/Logo.tsx'

interface TelaInicioProps {
  readonly aoAbrirSistema: () => void
  readonly aoVerPrecos: () => void
  readonly aoVerExemplo: () => void
  readonly aoVerAlimentos: () => void
}

/** Células cheias da grade: espalhadas, sem formar desenho. */
const CELULAS = [
  [3, 1], [9, 2], [2, 5], [11, 4], [6, 7], [14, 3],
  [17, 6], [4, 9], [20, 1], [23, 5], [26, 8], [8, 10],
] as const

const PASSOS = [
  ['Monte o plano', 'Digite “150 arroz” e tecle Enter. Calorias e nutrientes aparecem na hora.'],
  ['Veja o que falta', 'Vitaminas e minerais abaixo do recomendado ficam marcados.'],
  ['Complete com comida', 'O MetaNutri sugere o alimento e a quantidade certa.'],
] as const

const EXTRAS = [
  [Zap, 'Plano rápido para retorno, só com nome, idade e calorias'],
  [Barcode, 'Produto de mercado pelo código de barras'],
  [FileText, 'Plano em Word e PDF, pronto para entregar'],
  [WifiOff, 'Funciona sem internet'],
] as const

/** Botão principal da área pública: laranja fechado, 5,18:1 com letra branca. */
const botaoPrincipal =
  'inline-flex min-h-11 items-center gap-2 rounded-full bg-acentofundo px-6 text-sm font-semibold text-textoacento shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

const botaoSecundario =
  'inline-flex min-h-11 items-center gap-2 rounded-full border border-borderdefault bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Imagem de produto: moldura, sombra e, quando a captura é cortada, degradê no fim. */
function Captura({ src, alt, cortada = false, className }: { readonly src: string; readonly alt: string; readonly cortada?: boolean; readonly className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={cn(
        'w-full rounded-2xl border border-border bg-card shadow-pop',
        cortada ? '[mask-image:linear-gradient(to_bottom,#000_75%,transparent)]' : null,
        className,
      )}
    />
  )
}

function Recurso({
  rotulo,
  titulo,
  texto,
  itens,
  invertida = false,
  children,
}: {
  readonly rotulo: string
  readonly titulo: string
  readonly texto: string
  readonly itens?: readonly string[]
  readonly invertida?: boolean
  readonly children: React.ReactNode
}) {
  return (
    <section className="mx-auto grid max-w-[1080px] items-center gap-10 px-4 py-12 sm:px-8 md:grid-cols-2 md:gap-14 md:py-16">
      <div className={cn('min-w-0', invertida ? 'md:order-2' : null)}>{children}</div>
      <div className={cn('min-w-0', invertida ? 'md:order-1' : null)}>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-acento">{rotulo}</p>
        <h2 className="mt-2 font-titulo text-[clamp(22px,2.6vw,30px)] font-semibold leading-[1.2] tracking-[-0.3px] text-balance">{titulo}</h2>
        <p className="mt-3 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">{texto}</p>
        {itens ? (
          <ul className="mt-5 grid gap-2">
            {itens.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm">
                <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-content-center rounded-full bg-acentoclaro">
                  <Check className="size-3 text-acento" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}

export function TelaInicio({ aoAbrirSistema, aoVerPrecos, aoVerExemplo, aoVerAlimentos }: TelaInicioProps) {
  return (
    <>
      {/* Herói: a frase, uma ação, e o produto logo abaixo. */}
      <section className="relative isolate overflow-hidden bg-[image:var(--gradient-brand-soft)]">
        <GridPattern squares={CELULAS} className="[mask-image:radial-gradient(120%_80%_at_50%_10%,#000_30%,transparent_75%)]" />

        <div className="relative mx-auto grid max-w-[760px] justify-items-center gap-5 px-4 pb-10 pt-14 text-center sm:px-8 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-acentoclaro px-3 py-1 text-xs font-semibold text-acento">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-laranja" />
            Grátis para começar
          </span>

          <h1 className="font-titulo text-[clamp(30px,4.6vw,50px)] font-semibold leading-[1.1] tracking-[-0.8px] text-balance">
            Todo software diz que faltou cálcio. O MetaNutri diz <TextHighlight delay={0.45}>o que comer</TextHighlight>.
          </h1>

          <p className="max-w-[48ch] text-base leading-relaxed text-muted-foreground">
            Veja o que falta no plano e receba sugestões de alimentos do dia a dia, com a quantidade certa em gramas e em medida
            caseira.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={aoAbrirSistema} className={botaoPrincipal}>
              Começar grátis
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={aoVerExemplo} className={botaoSecundario}>
              Ver um plano pronto
            </button>
          </div>

          <p className="text-xs text-muted-foreground">Sem cartão · Sem instalar nada</p>
        </div>

        <div className="relative mx-auto max-w-[900px] px-4 pb-14 sm:px-8">
          <Captura
            src="imagens/adequacao.png"
            alt="Tela de nutrientes do MetaNutri: cálcio, ferro e magnésio abaixo do recomendado, cada um com o botão Cobrir."
            cortada
          />
        </div>
      </section>

      {/* Como funciona: três passos. O menu leva direto para cá. */}
      <section id="como-funciona" className="scroll-mt-24 border-y border-bordersubtle bg-surfacebrandsoft">
        <div className="mx-auto max-w-[1080px] px-4 py-12 sm:px-8">
          <h2 className="text-center font-titulo text-[clamp(22px,2.6vw,30px)] font-semibold tracking-[-0.3px]">Como funciona</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {PASSOS.map(([titulo, texto], i) => (
              <li key={titulo} className="flex gap-4 rounded-2xl bg-card p-5 shadow-sm">
                <span className="numeros grid size-9 shrink-0 place-content-center rounded-full bg-acentofundo text-sm font-bold text-textoacento">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-titulo text-base font-semibold">{titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Recurso
        rotulo="O diferencial"
        titulo="Faltou cálcio? Aparece o que comer, e quanto."
        texto="Outros programas só mostram que está faltando. O MetaNutri sugere até cinco alimentos de grupos diferentes, com a quantidade que resolve e as calorias que isso soma no dia."
        itens={['Quantidade em gramas e em medida caseira', 'Alimentos do dia a dia, não de receita rara', 'Um clique coloca no plano']}
      >
        <Captura
          src="imagens/cobrir.png"
          alt="Sugestões para completar o cálcio: cada alimento com a quantidade, quanto da falta ele cobre e as calorias."
          cortada
          className="mx-auto max-w-[420px]"
        />
      </Recurso>

      <Recurso
        rotulo="Proteína, carboidrato e gordura"
        titulo="Você vê se está na medida enquanto monta"
        texto="Cada um mostra a faixa recomendada para a idade e avisa em palavras simples: “dentro da faixa”, “faltam 6 pontos”, “passou um pouco”."
        invertida
      >
        <Captura src="imagens/macros.png" alt="Medidor de proteína, carboidrato e gordura com a faixa recomendada de cada um." className="mx-auto max-w-[340px]" />
      </Recurso>

      <Recurso
        rotulo="Acompanhamento"
        titulo="O paciente marca no celular o que fez no dia"
        texto="O plano vira uma lista curta num link, sem baixar aplicativo. Você vê quem está seguindo e quem sumiu, antes da próxima consulta."
      >
        <div className="relative pb-14">
          <Captura src="imagens/missoes-paciente.png" alt="Tela do paciente no celular com as tarefas do dia." className="mx-auto block max-w-[270px]" cortada />
          <Captura
            src="imagens/adesao.png"
            alt="Lista de pacientes com dados de exemplo: um sumido, um em atenção e um em dia."
            className="absolute bottom-0 left-0"
          />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Telas do MetaNutri com dados de exemplo.</p>
      </Recurso>

      {/* O resto do produto, em uma linha cada. */}
      <section className="mx-auto max-w-[1080px] px-4 pb-12 sm:px-8">
        <ul className="grid gap-3 rounded-2xl border border-bordersubtle bg-card p-6 sm:grid-cols-2">
          {EXTRAS.map(([Icone, texto]) => (
            <li key={texto} className="flex items-center gap-3 text-sm">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-content-center rounded-xl bg-acentoclaro text-acento">
                <Icone className="size-4" />
              </span>
              {texto}
            </li>
          ))}
        </ul>
      </section>

      {/* Honestidade da tabela: o que separa o produto dos outros. Curto. */}
      <section className="border-y border-bordersubtle bg-surfacebrandsoft">
        <div className="mx-auto grid max-w-[1080px] gap-8 px-4 py-12 sm:px-8 md:grid-cols-2 md:gap-14">
          <div>
            <h2 className="font-titulo text-[clamp(22px,2.6vw,30px)] font-semibold tracking-[-0.3px]">Sem número inventado</h2>
            <p className="mt-3 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
              A tabela brasileira de alimentos tem lacunas. Quando um nutriente não foi medido, o MetaNutri avisa, em vez de contar
              como zero e fechar a conta errado.
            </p>
            <button
              type="button"
              onClick={aoVerAlimentos}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-acento underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver a tabela de alimentos
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div>
            {LACUNAS_DA_BASE.map((l) => (
              <div key={l.rotulo} className="grid gap-1.5 border-b border-bordersubtle py-3.5 last:border-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="numeros font-titulo text-2xl font-semibold">{l.valor}</span>
                  <span className="max-w-[26ch] text-right text-sm text-muted-foreground">{l.rotulo}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-laranja" style={{ width: `${l.proporcao}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fechamento: a faixa teal, com a mesma ação do topo. */}
      <section className="bg-surfacebrand text-textonbrand">
        <div className="mx-auto grid max-w-[760px] justify-items-center gap-4 px-4 py-16 text-center sm:px-8">
          <Logo variante="escuro" soSimbolo tamanho={40} />
          <h2 className="font-titulo text-[clamp(22px,3vw,34px)] font-semibold tracking-[-0.3px] text-textonbrand text-balance">
            Monte o próximo plano em minutos
          </h2>
          <p className="max-w-[44ch] text-[15px] text-textonbrandmuted">Grátis para começar. Veja os planos quando precisar de mais pacientes.</p>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={aoAbrirSistema} className={botaoPrincipal}>
              Começar grátis
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={aoVerPrecos}
              className="inline-flex min-h-11 items-center rounded-full border border-borderonbrand px-6 text-sm font-semibold text-textonbrand transition-colors hover:bg-borderonbrand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-textonbrand"
            >
              Ver preços
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
