// Porta de entrada pública, no formato da referência (site de marketing da Outline):
// herói centrado com a tese e a captura do produto logo abaixo, depois seções
// alternadas em que a imagem carrega o argumento e o texto explica.
//
// A tese mudou em 27/09: a landing vendia o painel de micros, e o plano de negócio
// diz que a frase que abre a venda é a adesão do paciente — "a aquisição tem que vir
// pelo assunto adesão, não pela categoria software". Os micros continuam, como a
// segunda função que carrega o produto.
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
  ['Monte o plano', 'Digite “150 arroz integral” e tecle Enter. Medida caseira, kcal e micros aparecem sozinhos.'],
  ['Mande o link', 'O plano vira uma lista curta que o paciente abre no celular. Sem baixar app, sem criar conta.'],
  ['Veja quem está sumindo', `Quem passa ${DIAS_PARA_SUMIR} dias sem marcar aparece no topo — antes de sumir de vez.`],
] as const

const CAPACIDADES = [
  [Search, 'Escreva como você fala', 'Digite “150 arroz integral” e tecle Enter. A medida caseira da POF e as kcal aparecem sozinhas, e a busca avisa quando a tabela só tem parte dos nutrientes.'],
  [Target, 'Cobrir a falta', 'Escolhe alimentos de grupos diferentes, calcula a porção que fecha a meta e mostra quantas kcal isso soma no dia.'],
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
  readonly children?: React.ReactNode
}) {
  return (
    <section className="mx-auto grid max-w-[1140px] items-center gap-10 px-4 py-14 sm:px-8 md:grid-cols-2 md:gap-16 md:py-20">
      <div className={cn('min-w-0', invertida ? 'md:order-2' : null)}>
        <img
          src={imagem}
          alt={alt}
          loading="lazy"
          className={cn(
            'w-full rounded-xl border border-border bg-card shadow-pop',
            telefone ? 'mx-auto max-w-[280px]' : null,
          )}
        />
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
      <section className="relative isolate overflow-hidden">
        <GridPattern squares={CELULAS} className="[mask-image:radial-gradient(120%_80%_at_50%_10%,#000_30%,transparent_75%)]" />

        <div className="relative mx-auto grid max-w-[900px] justify-items-center gap-6 px-4 pb-10 pt-16 text-center sm:px-8 sm:pt-24">
          <h1 className="font-titulo text-[clamp(34px,6vw,64px)] font-normal leading-[1.06] tracking-[-0.8px] text-balance">
            Seu paciente para de abandonar a dieta na{' '}
            <TextHighlight delay={0.45}>segunda semana</TextHighlight>
          </h1>

          <p className="max-w-[54ch] text-lg leading-relaxed text-muted-foreground">
            O plano alimentar vira missões diárias que o paciente marca no celular. Você vê quem está sumindo antes de sumir de
            vez — e monta o plano em minutos, com a adequação dos micronutrientes do lado.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <FlowButton onClick={aoVerExemplo}>Abrir um plano pronto</FlowButton>
            <FlowButton tom="linha" onClick={aoVerPrecos}>
              Ver preços
            </FlowButton>
          </div>

          <p className="text-[13px] text-muted-foreground">Grátis para começar, sem cartão. O paciente não precisa baixar nada.</p>
        </div>

        {/* A captura do produto fecha o herói, como na referência. */}
        <div className="relative mx-auto grid max-w-[1140px] justify-items-center px-4 pb-16 sm:px-8">
          {/* A captura termina no meio da lista de propósito: o degradê diz que
              continua, em vez de parecer imagem cortada por acidente. */}
          <img
            src="imagens/missoes-paciente.png"
            alt="A tela que o paciente abre no celular: as missões do dia, com duas marcadas e o progresso 2 de 5."
            className="w-full max-w-[300px] rounded-2xl border border-border bg-card shadow-pop [mask-image:linear-gradient(to_bottom,#000_72%,transparent_99%)]"
          />
        </div>
      </section>

      {/* Três passos, em texto: é o produto inteiro numa frase cada. */}
      <section className="border-y border-bordersubtle bg-surfacesunken">
        <div className="mx-auto grid max-w-[1140px] gap-8 px-4 py-14 sm:px-8 md:grid-cols-3 md:gap-12">
          {PASSOS.map(([titulo, texto], i) => (
            <div key={titulo} className="grid gap-2">
              <span className="numeros font-titulo text-sm font-semibold text-muted-foreground">{`0${i + 1}`}</span>
              <h2 className="font-titulo text-xl font-medium tracking-[-0.2px]">{titulo}</h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <Recurso
        titulo="Missões diárias"
        chamada="O plano vira tarefa do dia, não um PDF que ninguém abre"
        texto="As refeições por horário, a fruta, os vegetais e a água saem do plano que você montou — e cada missão mostra de onde veio. O paciente toca no que fez. Não precisa de conta nem de aplicativo: é um link que ele guarda."
        imagem="imagens/link-missoes.png"
        alt="O cartão do nutricionista: o link do paciente, com o progresso do dia e os dias marcados na semana."
      />

      <Recurso
        titulo="Adesão"
        chamada="A pergunta que o software dos outros não responde: quem está sumindo?"
        texto={`Quem marcou missão em ${DIAS_NA_SEMANA_PARA_EM_DIA} dias ou mais na semana aparece como em dia. Quem passa ${DIAS_PARA_SUMIR} dias sem marcar sobe para o topo da lista, mesmo que tenha ido bem na semana passada — é exatamente esse o caso que não pode ficar escondido atrás de uma média.`}
        imagem="imagens/adesao.png"
        alt="Painel de adesão do MetaNutri com dados de exemplo: três pacientes ordenados por urgência, com selo de sumindo, atenção e em dia."
        invertida
        nota="Tela do MetaNutri com dados de exemplo."
      />

      <Recurso
        titulo="Micronutrientes"
        chamada="Todo software diz que faltou cálcio. Este diz o que comer."
        texto="A adequação dos 20 nutrientes comparada com a DRI, e um botão cobrir que sugere até cinco alimentos de grupos diferentes para fechar a falta — com a porção em gramas, em medida caseira, quanto da falta cobrem e quantas kcal somam."
        imagem="imagens/adequacao.png"
        alt="Painel de micronutrientes: cálcio e ferro abaixo da meta, com o botão cobrir ao lado."
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
      <section className="border-y border-bordersubtle bg-surfacesunken">
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

      {/* Conversão */}
      <section className="mx-auto max-w-[1140px] px-4 py-16 sm:px-8 md:py-24">
        <div className="grid justify-items-center gap-5 text-center">
          <h2 className="max-w-[22ch] font-titulo text-[clamp(26px,3.6vw,44px)] font-normal leading-[1.14] tracking-[-0.4px] text-balance">
            Abra um dia inteiro já montado
          </h2>
          <p className="max-w-[48ch] text-[15px] text-muted-foreground">
            Seis refeições, dois substitutos no almoço, 103% do gasto calculado. Mexa à vontade — e gere o link para ver a tela
            do paciente por dentro.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <FlowButton onClick={aoVerExemplo}>Ver o plano de exemplo</FlowButton>
            <FlowButton tom="linha" onClick={aoAbrirSistema}>
              Ver o painel
            </FlowButton>
          </div>
        </div>
      </section>
    </>
  )
}
