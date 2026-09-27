// Porta de entrada pública, no formato da referência (site de marketing da Outline):
// herói centrado com a tese e a captura do produto logo abaixo, depois seções
// alternadas em que a imagem carrega o argumento e o texto explica.
//
// A tese: dizer o que comer. A pesquisa de mercado verificou sete concorrentes
// brasileiros e nenhum sugere alimento para cobrir o micro que falta — "o espaço mais
// limpo", "a parte mais defensável". As missões diárias são o argumento de venda, não
// o diferencial: check-in e metas já existem em WebDiet, Nutrium, DietSystem e Dietbox.
//
// Esta página já chegou a liderar com adesão, em 27/09, por leitura errada do plano de
// negócio — que chama adesão de "argumento de venda" e "aquisição", não de diferencial.
//
// As imagens são capturas do MetaNutri rodando, com o caso de exemplo (fictício), e
// são geradas a partir do próprio app. Nada aqui é mockup.
import { ArrowRight, Barcode, Check, FileText, Search, Target } from 'lucide-react'
import { LACUNAS_DA_BASE } from '@/domain/vitrine.ts'
import { DIAS_NA_SEMANA_PARA_EM_DIA, DIAS_PARA_SUMIR } from '@/domain/acompanhamento.ts'
import { cn } from '@/lib/utils'
import { FlowButton } from '@ds/componentes/efeitos/flow-button.tsx'
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
  ['Monte o plano', 'Digite “150 arroz integral” e tecle Enter. Medida caseira, kcal, macros e micros aparecem sozinhos.'],
  ['Veja o que falta', 'A adequação de 15 vitaminas e minerais, mais a fibra, comparada com a DRI da idade e da condição.'],
  ['Cubra com alimento', 'O botão cobrir sugere até cinco alimentos de grupos diferentes, com a porção que fecha a falta.'],
] as const

const CAPACIDADES = [
  [Search, 'Escreva como você fala', 'Digite “150 arroz integral” e tecle Enter. A medida caseira da POF e as kcal aparecem sozinhas, e a busca avisa quando a tabela só tem parte dos nutrientes.'],
  [Target, 'Prescrição rápida', 'Nome, sexo, idade e a meta de kcal. Serve para retorno e ajuste, e vira atendimento completo a qualquer momento — o contrário não, para não apagar medida.'],
  [Barcode, 'Industrializado pelo rótulo', 'Leia o código de barras pela câmera. Os campos vêm preenchidos da Open Food Facts para você conferir com a embalagem.'],
  [FileText, 'Sai pronto para entregar', 'Dieta para imprimir, aconselhamento em Word no modelo do estágio e memorial de cálculo. A folha do paciente vai com a lista de trocas.'],
] as const

/** Uma seção de argumento: a imagem prova, o texto explica. Alterna de lado. */
function Recurso({
  titulo,
  chamada,
  texto,
  imagem,
  alt,
  invertida = false,
  telefone = false,
  nota,
  sobreposta,
  children,
}: {
  readonly titulo: string
  readonly chamada: string
  readonly texto: string
  readonly imagem: string
  readonly alt: string
  readonly invertida?: boolean
  readonly telefone?: boolean
  /** Dito embaixo da imagem quando ela mostra dado inventado para ilustrar. */
  readonly nota?: string
  /** Segunda captura que se sobrepõe à primeira por baixo — o truque de camadas da referência. */
  readonly sobreposta?: { readonly src: string; readonly alt: string }
  readonly children?: React.ReactNode
}) {
  return (
    <section className="mx-auto grid max-w-[1140px] items-center gap-10 px-4 py-14 sm:px-8 md:grid-cols-2 md:gap-16 md:py-20">
      <div className={cn('min-w-0', invertida ? 'md:order-2' : null)}>
        <div className={cn('relative', sobreposta ? 'pb-16' : null)}>
          <img
            src={imagem}
            alt={alt}
            loading="lazy"
            className={cn(
              'w-full rounded-2xl border border-border bg-card shadow-pop',
              telefone ? 'mx-auto block max-w-[300px]' : null,
            )}
          />
          {sobreposta ? (
            <img src={sobreposta.src} alt={sobreposta.alt} loading="lazy" className="absolute bottom-0 left-0 w-full rounded-2xl border border-border bg-card shadow-pop" />
          ) : null}
        </div>
        {nota ? <p className="mt-3 text-center text-xs text-muted-foreground">{nota}</p> : null}
      </div>

      <div className={cn('min-w-0', invertida ? 'md:order-1' : null)}>
        <p className="text-sm font-semibold text-muted-foreground">{titulo}</p>
        <h2 className="mt-2 font-titulo text-[clamp(26px,3.4vw,40px)] font-normal leading-[1.14] tracking-[-0.4px] text-balance">{chamada}</h2>
        <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">{texto}</p>
        {children}
      </div>
    </section>
  )
}

export function TelaInicio({ aoAbrirSistema, aoVerPrecos, aoVerExemplo, aoVerAlimentos }: TelaInicioProps) {
  return (
    <>
      {/* Herói: a tese sozinha no centro, e a prova logo abaixo. */}
      <section className="relative isolate overflow-hidden bg-[image:var(--gradient-brand-soft)]">
        <GridPattern squares={CELULAS} className="[mask-image:radial-gradient(120%_80%_at_50%_10%,#000_30%,transparent_75%)]" />

        <div className="relative mx-auto grid max-w-[900px] justify-items-center gap-6 px-4 pb-10 pt-16 text-center sm:px-8 sm:pt-24">
          <h1 className="font-titulo text-[clamp(34px,6vw,64px)] font-normal leading-[1.06] tracking-[-0.8px] text-balance">
            Todo software diz que faltou cálcio.
            <br />O MetaNutri diz <TextHighlight delay={0.45}>o que comer</TextHighlight>.
          </h1>

          <p className="max-w-[54ch] text-lg leading-relaxed text-muted-foreground">
            A adequação de 15 vitaminas e minerais, mais a fibra, comparada com a DRI. Quando falta, o botão{' '}
            <strong className="font-semibold text-foreground">cobrir</strong> sugere alimentos de verdade, com a porção em gramas e
            em medida caseira. E os macros andam ao vivo enquanto você monta.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <FlowButton onClick={aoVerExemplo}>Abrir um plano pronto</FlowButton>
            <FlowButton tom="linha" onClick={aoVerPrecos}>
              Ver preços
            </FlowButton>
          </div>

          <p className="text-[13px] text-muted-foreground">Grátis para começar, sem cartão. Funciona sem internet.</p>
        </div>

        {/* A captura do produto fecha o herói, como na referência. */}
        <div className="relative mx-auto grid max-w-[1140px] justify-items-center px-4 pb-16 sm:px-8">
          {/* A captura termina no meio da lista de propósito: o degradê diz que
              continua, em vez de parecer imagem cortada por acidente. */}
          <img
            src="imagens/adequacao.png"
            alt="O painel de adequação do MetaNutri: cálcio a 66% e ferro a 48% da meta, marcados como abaixo, com o botão cobrir ao lado de cada um."
            className="w-full max-w-[900px] rounded-2xl border border-border bg-card shadow-pop [mask-image:linear-gradient(to_bottom,#000_82%,transparent_99%)]"
          />
        </div>
      </section>

      {/* Três passos, em texto: é o produto inteiro numa frase cada. */}
      <section className="border-y border-bordersubtle bg-surfacebrandsoft">
        <div className="mx-auto grid max-w-[1140px] gap-8 px-4 py-14 sm:px-8 md:grid-cols-3 md:gap-12">
          {PASSOS.map(([titulo, texto], i) => (
            <div key={titulo} className="grid gap-2">
              <span aria-hidden="true" className="inline-block h-1 w-8 rounded-full bg-laranja" />
              <span className="numeros font-titulo text-sm font-semibold text-muted-foreground">{`0${i + 1}`}</span>
              <h2 className="font-titulo text-xl font-medium tracking-[-0.2px]">{titulo}</h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <Recurso
        titulo="O diferencial"
        chamada="“Faltam 617 mg de cálcio” não resolve. “140 g de caruru” resolve."
        texto="Todo software calcula a adequação e pinta de vermelho. Nenhum concorrente brasileiro diz o que comer para fechar. O botão cobrir sugere até cinco alimentos de grupos diferentes, com a porção em gramas e em medida caseira, quanto da falta cada um cobre e quantas kcal isso soma no dia — respeitando o que ainda cabe no gasto energético."
        imagem="imagens/cobrir.png"
        alt="A gaveta cobrir aberta para o cálcio: faltam 617,61 mg, cabem 1.312 kcal, e a lista de alimentos sugeridos com a porção de cada um."
      >
        <ul className="mt-6 grid gap-2.5">
          {['Medidas caseiras da POF/IBGE, por alimento', 'Referência individual (RDA) ou coletiva (EAR)', 'A fonte de cada número, a um clique'].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[15px]">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </Recurso>

      <Recurso
        titulo="Macronutrientes"
        chamada="Proteína, carboidrato e gordura andam enquanto você monta"
        texto="Cada macro tem a faixa recomendada da idade (AMDR) em destaque, o marcador do plano andando a cada alimento, e a frase que responde à pergunta de verdade: “Faltam 6 pontos para a faixa”, “Dentro da faixa”, “10 pontos acima”. Também em gramas por quilo de peso."
        imagem="imagens/macros.png"
        alt="O medidor de macros: proteína e carboidrato dentro da faixa, gordura abaixo, cada um com a faixa recomendada e a distância até ela."
        invertida
        telefone
      />

      <Recurso
        titulo="Para o plano não morrer na gaveta"
        chamada="O paciente marca o que fez, e você vê quem está sumindo"
        texto={`O plano vira missões que o paciente abre num link, sem baixar app. Quem marcou em ${DIAS_NA_SEMANA_PARA_EM_DIA} dias ou mais na semana aparece como em dia; quem passa ${DIAS_PARA_SUMIR} dias sem marcar sobe para o topo, mesmo que tenha ido bem na semana passada. Check-in básico os concorrentes já têm — aqui ele nasce do plano que você montou.`}
        imagem="imagens/missoes-paciente.png"
        alt="A tela do paciente no celular: as missões do dia, com duas marcadas e o progresso."
        telefone
        sobreposta={{
          src: 'imagens/adesao.png',
          alt: 'Painel de adesão do MetaNutri com dados de exemplo: três pacientes ordenados por urgência, com selo de sumindo, atenção e em dia.',
        }}
        nota="Telas do MetaNutri; a lista de adesão usa dados de exemplo."
      />

      {/* O que mais tem, sem virar grade de cartões iguais. */}
      <section className="mx-auto max-w-[1140px] px-4 py-14 sm:px-8 md:py-20">
        <h2 className="max-w-[18ch] font-titulo text-[clamp(26px,3.4vw,40px)] font-normal leading-[1.14] tracking-[-0.4px] text-balance">
          O que o estágio cobra, <TextHighlight>numa sessão só</TextHighlight>
        </h2>

        <div className="mt-2">
          {CAPACIDADES.map(([Icone, titulo, texto]) => (
            <div key={titulo} className="grid items-start gap-x-7 gap-y-2.5 border-b border-bordersubtle py-7 md:grid-cols-[52px_minmax(0,300px)_minmax(0,1fr)]">
              <span aria-hidden="true" className="grid size-11 place-content-center rounded-md bg-lightprimary text-primary">
                <Icone className="size-5" />
              </span>
              <h3 className="font-titulo text-xl font-medium tracking-[-0.2px]">{titulo}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* A base, com as lacunas admitidas. É o que separa este produto dos outros. */}
      <section className="border-y border-bordersubtle bg-surfacebrandsoft">
        <div className="mx-auto grid max-w-[1140px] gap-10 px-4 py-14 sm:px-8 md:grid-cols-2 md:gap-16 md:py-20">
          <div>
            <h2 className="font-titulo text-[clamp(26px,3.4vw,40px)] font-normal leading-[1.14] tracking-[-0.4px] text-balance">
              A base que ninguém mostra
            </h2>
            <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
              Menos de um em cada cinco alimentos da TACO tem os 20 nutrientes medidos. O resto tem buraco. Quase todo software
              trata buraco como zero, e o plano fecha bonito numa conta errada.
            </p>
            <p className="mt-5 text-[17px] font-semibold text-foreground">Aqui, falta de dado aparece como falta de dado.</p>
            <p className="mt-5 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
              Vitamina D, B12 e folato não existem na tabela. Dava para importar da USDA casando por nome, mas “arroz, tipo 1,
              cozido” e “rice, white, cooked” não são o mesmo alimento. Número plausível e errado é pior que número ausente.
            </p>
            <button
              type="button"
              onClick={aoVerAlimentos}
              className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:bg-surfaceinverse hover:text-textoninverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver a tabela de alimentos
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div>
            {LACUNAS_DA_BASE.map((l) => (
              <div key={l.rotulo} className="grid gap-2 border-b border-bordersubtle py-4.5 last:border-0">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="numeros whitespace-nowrap font-titulo text-3xl font-normal">{l.valor}</span>
                  <span className="min-w-0 max-w-[26ch] text-right text-sm text-muted-foreground">{l.rotulo}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${l.proporcao}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conversão: a única faixa teal cheia da página. Os botões invertem
          (marfim com teal por cima) porque o FlowButton, teal sobre teal, sumiria. */}
      <section className="bg-surfacebrand text-textonbrand">
        <div className="mx-auto grid max-w-[1140px] justify-items-center gap-5 px-4 py-16 text-center sm:px-8 md:py-24">
          <Logo variante="escuro" soSimbolo tamanho={44} />
          <h2 className="max-w-[22ch] font-titulo text-[clamp(26px,3.6vw,44px)] font-normal leading-[1.14] tracking-[-0.4px] text-textonbrand text-balance">
            Abra um dia inteiro já montado
          </h2>
          <p className="max-w-[48ch] text-[15px] text-textonbrandmuted">
            Seis refeições, dois substitutos no almoço, 103% do gasto calculado. Mexa à vontade — e gere o link para ver a tela
            do paciente por dentro.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={aoVerExemplo}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-textonbrand px-6 text-sm font-semibold text-surfacebrand transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-textonbrand focus-visible:ring-offset-2 focus-visible:ring-offset-surfacebrand"
            >
              Ver o plano de exemplo
            </button>
            <button
              type="button"
              onClick={aoAbrirSistema}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-borderonbrand px-6 text-sm font-semibold text-textonbrand transition-colors hover:bg-borderonbrand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-textonbrand focus-visible:ring-offset-2 focus-visible:ring-offset-surfacebrand"
            >
              Ver o painel
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
