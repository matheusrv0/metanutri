import { ArrowUpRight } from 'lucide-react'
import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { ALIMENTOS } from '@/domain/tabelas.ts'
import { coberturaDeCalcio, pctAlimentosSemVitaminaA } from '@/domain/vitrine.ts'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'
import { RotuloSecao } from '@ds/componentes/display/RotuloSecao.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface TelaInicioProps {
  readonly aoComecar: () => void
  readonly aoVerPrecos: () => void
}

const BASE = import.meta.env.BASE_URL

function rolarAte(id: string) {
  globalThis.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const PASSOS = [
  { n: '01', titulo: 'Monte o plano', texto: 'Digite "150 arroz" e tecle Enter. O alimento entra na refeição.' },
  { n: '02', titulo: 'Veja o que falta', texto: 'O botão Cobrir sugere o alimento e a quantidade para fechar a meta.' },
  { n: '03', titulo: 'O paciente acompanha', texto: 'Ele marca pelo celular o que cumpriu. Você vê quem está sumindo.' },
] as const

const TITULO_SECAO = 'mt-4 text-[clamp(28px,3.4vw,36px)] font-bold leading-tight'

/**
 * Landing no estilo da referência Spora (mockup landing v2, spec estilo-spora).
 * Foto só no topo (D-22); daqui para baixo, texto, números verdadeiros e telas reais.
 */
export function TelaInicio({ aoComecar, aoVerPrecos }: TelaInicioProps) {
  return (
    <>
      <section aria-labelledby="titulo-inicio" className="overflow-hidden px-4 pb-12 sm:px-8">
        <div className="mx-auto max-w-[1216px]">
          <div className="relative">
            <p
              aria-hidden="true"
              className="pointer-events-none select-none text-center font-marca text-[clamp(88px,19vw,250px)] font-bold leading-none tracking-[-0.05em] text-card"
            >
              metanutri
            </p>
            <img
              src={`${BASE}imagens/pratos-heroi.webp`}
              srcSet={`${BASE}imagens/pratos-heroi-800.webp 800w, ${BASE}imagens/pratos-heroi.webp 1600w`}
              sizes="(max-width: 640px) 92vw, 900px"
              width={1600}
              height={712}
              decoding="async"
              alt="Três pratos vistos de cima: salada com grão-de-bico, tigela com tofu e legumes, prato com ovo e tomate."
              className="relative mx-auto -mt-[clamp(56px,13vw,190px)] h-auto w-[92%] max-w-[900px]"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr_auto] lg:items-end">
            <div>
              <Button onClick={() => rolarAte('como-funciona')}>Ver como funciona</Button>
              <h1 id="titulo-inicio" className="mt-4 text-[clamp(34px,5vw,52px)] font-bold leading-[1.02]">
                Faltou cálcio?{' '}
                <br />O MetaNutri diz{' '}
                <br />o que comer.
              </h1>
            </div>
            <p className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
              Monte o plano e veja o que falta de vitaminas e minerais. O MetaNutri sugere alimentos do dia a dia, com a quantidade em gramas e em medida
              caseira.
            </p>
            <div className="grid grid-cols-2 gap-3 lg:w-[400px]">
              <CartaoNumero
                valor={String(MICRONUTRIENTES_ADEQUACAO.length)}
                rotulo="nutrientes"
                apoio="conferidos em cada plano"
                aoClicar={() => rolarAte('o-diferencial')}
              />
              <CartaoNumero valor={String(ALIMENTOS.length)} rotulo="alimentos" apoio="da tabela brasileira (TACO)" aoClicar={() => rolarAte('fontes')} />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-problema" className="rounded-t-[36px] bg-card px-4 pb-20 pt-16 sm:px-14">
        <div className="mx-auto max-w-[1216px]">
          <RotuloSecao>O problema</RotuloSecao>
          <h2 id="titulo-problema" className="ml-auto mt-4 max-w-[26ch] text-right text-[clamp(26px,3.4vw,36px)] font-semibold leading-tight">
            Todo programa avisa que faltou ferro. <span className="text-muted-foreground">Nenhum diz o que pôr no prato para fechar a conta.</span>
          </h2>
          <p className="mt-4 text-right text-sm text-muted-foreground">O MetaNutri mostra o que falta e já sugere o alimento, com a quantidade.</p>

          <div className="mt-14 grid gap-4 md:grid-cols-[1fr_1fr_1.3fr]">
            <CartaoNumero tom="cinza" valor={String(coberturaDeCalcio().length)} rotulo="sugestões" apoio="de alimento para cada nutriente que falta" />
            <CartaoNumero tom="cinza" valor="g + colher" rotulo="quantidade" apoio="em gramas e em medida caseira" />
            <CartaoNumero
              tom="teal"
              valor={`${pctAlimentosSemVitaminaA()}%`}
              rotulo="dos alimentos da TACO"
              apoio="não têm vitamina A medida. Aqui a falta de dado aparece, nunca vira zero."
            />
          </div>

          <div id="como-funciona" className="mt-28 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <RotuloSecao>Como funciona</RotuloSecao>
                <h2 className={`${TITULO_SECAO} max-w-[16ch]`}>Um plano completo em minutos</h2>
              </div>
              <p className="max-w-[34ch] text-sm text-muted-foreground">Três passos, sem planilha e sem conta de cabeça.</p>
            </div>
            <ol className="mt-9 grid gap-6 md:grid-cols-3">
              {PASSOS.map((passo) => (
                <li key={passo.n} className="border-t border-border pt-5">
                  <span className="font-titulo text-sm font-bold text-acento">{passo.n}</span>
                  <h3 className="mt-2 text-xl font-bold">{passo.titulo}</h3>
                  <p className="mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">{passo.texto}</p>
                </li>
              ))}
            </ol>
          </div>

          <div id="o-diferencial" className="mt-28 grid scroll-mt-24 items-center gap-8 rounded-2xl bg-surfacerow p-6 sm:p-12 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <RotuloSecao>O diferencial</RotuloSecao>
              <h2 className={`${TITULO_SECAO} max-w-[14ch]`}>O diferencial, na tela de verdade</h2>
              <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
                Cálcio abaixo do recomendado? Um clique mostra o que comer e quanto. O paciente acompanha pelo celular.
              </p>
              <Button variant="laranja" className="mt-6" onClick={aoComecar}>
                Começar grátis
                <ArrowUpRight aria-hidden="true" />
              </Button>
            </div>
            <div className="relative min-h-[400px]">
              <figure className="absolute left-0 top-0 h-[370px] w-[min(300px,80%)] overflow-hidden rounded-xl bg-card px-4 pt-4 shadow-raised">
                <img src={`${BASE}imagens/cobrir.png`} alt="Tela do botão Cobrir sugerindo rúcula, iogurte e sardinha para completar o cálcio." className="w-full" loading="lazy" />
              </figure>
              <figure className="absolute bottom-0 right-0 h-[280px] w-[min(240px,62%)] overflow-hidden rounded-xl border-[6px] border-card bg-surfacerow shadow-raised">
                <img src={`${BASE}imagens/missoes-paciente.png`} alt="Tela de missões do paciente com 2 de 5 missões feitas no dia." className="w-full" loading="lazy" />
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-fecho" className="bg-surfacebrand px-4 py-14 sm:px-14">
        <div className="mx-auto flex max-w-[1216px] flex-wrap items-center justify-between gap-6">
          <h2 id="titulo-fecho" className="max-w-[18ch] text-[clamp(26px,3.2vw,34px)] font-bold leading-tight text-textonbrand">
            Monte o próximo plano em minutos
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="laranja" onClick={aoComecar}>
              Começar grátis
              <ArrowUpRight aria-hidden="true" />
            </Button>
            <Button variant="outline" className="border-borderonbrand bg-transparent text-textonbrand hover:border-textonbrand hover:text-textonbrand" onClick={aoVerPrecos}>
              Ver preços
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
