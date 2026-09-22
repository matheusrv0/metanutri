import { Barcode, Check, CloudOff, FileText, Search, ShieldCheck, Target, X } from 'lucide-react'
import { adequacaoDoExemplo, coberturaDeCalcio, LACUNAS_DA_BASE } from '@/domain/vitrine.ts'
import { BarraAdequacao } from '../adequacao/BarraAdequacao.tsx'
import { FlowButton } from '../componentes/flow-button.tsx'
import { GridPattern } from '../componentes/grid-pattern.tsx'
import { TextHighlight } from '../componentes/text-highlight.tsx'

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

const CONFRONTO = [
  ['Micronutriente em falta', 'Mostra a porcentagem e para.', 'Sugere cinco alimentos de grupos diferentes, com a porção que resolve.'],
  ['Buraco na tabela', 'Soma como zero, sem avisar.', 'Mostra hachura e diz qual alimento não tem o dado.'],
  ['Medida caseira', 'Só gramas, ou conversão genérica.', 'Medidas referidas da POF/IBGE, por alimento.'],
  ['Documento final', 'PDF padrão do sistema.', 'Word no modelo do estágio, com campo de preceptor e assinatura.'],
  ['Onde ficam os dados', 'Servidor da empresa, com conta.', 'No seu navegador. Sem conta, sem nuvem, sem internet.'],
] as const

const CAPACIDADES = [
  [Search, 'Escreva como você fala', 'Digite “150 arroz integral” e tecle Enter. A medida caseira da POF e as kcal aparecem sozinhas, e a busca avisa quando a tabela só tem parte dos nutrientes.'],
  [Target, 'Cobrir a falta', 'Escolhe alimentos de grupos diferentes, calcula a porção que fecha a meta e mostra quantas kcal isso soma no dia.'],
  [Barcode, 'Industrializado pelo rótulo', 'Leia o código de barras pela câmera. Os campos vêm preenchidos da Open Food Facts para você conferir com a embalagem.'],
  [FileText, 'Sai pronto para entregar', 'Dieta para imprimir, aconselhamento em Word no modelo do estágio e memorial de cálculo. A folha do paciente vai com a lista de trocas.'],
] as const

/** Porta de entrada pública: a tese no título, a prova ao lado dela. */
export function TelaInicio({ aoAbrirSistema, aoVerPrecos, aoVerExemplo, aoVerAlimentos }: TelaInicioProps) {
  const barras = adequacaoDoExemplo()
  const cobrir = coberturaDeCalcio().slice(0, 3)

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <GridPattern
          squares={CELULAS}
          className="[mask-image:radial-gradient(120%_85%_at_50%_18%,#000_35%,transparent_78%)]"
        />

        <div className="relative mx-auto grid max-w-[1266px] items-center gap-12 px-4 pb-24 pt-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16">
          <div className="grid justify-items-start gap-6">
            <h1 className="font-titulo text-[clamp(34px,5.6vw,60px)] font-normal leading-[1.06] tracking-[-0.6px] text-balance">
              Todo software diz que faltou cálcio.
              <br />O MetaNutri diz <TextHighlight delay={0.45}>o que comer</TextHighlight>.
            </h1>

            <p className="max-w-[46ch] text-lg leading-relaxed text-muted-foreground">
              Monte o plano, veja a adequação dos 20 nutrientes e feche a falta com alimento de verdade — em gramas, em medida
              caseira, com a fonte do número do lado.
            </p>

            <div className="flex flex-wrap gap-3">
              <FlowButton onClick={aoVerExemplo}>Abrir um plano pronto</FlowButton>
              <FlowButton tom="linha" onClick={aoVerPrecos}>
                Ver preços
              </FlowButton>
            </div>

            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" aria-hidden="true" /> Sem cartão
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CloudOff className="size-4 text-primary" aria-hidden="true" /> Funciona sem internet
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> Nada sai do navegador
              </li>
            </ul>
          </div>

          {/* Um pedaço da interface de verdade respondendo à promessa do título. */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-alto">
            <div className="flex items-baseline justify-between gap-3 px-5 pb-3.5 pt-5">
              <div>
                <h2 className="text-[17px] font-semibold">Adequação do dia</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">Exemplo · Maria, 28 anos · RDA individual</p>
              </div>
              <span className="numeros text-[13px] text-muted-foreground">18 de 20</span>
            </div>

            <div className="grid gap-4 px-5 pb-5">
              {barras.map((b) => (
                <BarraAdequacao key={b.nome} {...b} />
              ))}
            </div>

            <div className="grid gap-3.5 border-t border-fio bg-muted px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Cobrir os 320 mg que faltam</p>
                <span className="text-[13px] text-muted-foreground">grupos diferentes</span>
              </div>
              <ul className="grid gap-2.5">
                {cobrir.map((c) => (
                  <li key={c.descricao} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{c.descricao}</p>
                      <p className="text-[13px] text-muted-foreground">{c.medida}</p>
                    </div>
                    <span className="numeros text-[13px] text-muted-foreground">{`${c.gramas} g`}</span>
                    <span className="numeros text-[13px] font-semibold text-primary">{`+${c.cobre} mg`}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Onde o concorrente para: o posicionamento, em texto, sem cartão */}
      <section className="mx-auto max-w-[1266px] px-4 py-20 sm:px-8 sm:py-24">
        <h2 className="max-w-[16ch] font-titulo text-[clamp(26px,3.8vw,45px)] font-normal leading-[1.14] tracking-[-0.4px] text-balance">
          Onde o concorrente para
        </h2>
        <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">
          Não é falta de tabela: é que a conta termina no diagnóstico. A estudante fecha o software, abre a planilha e vai caçar
          alimento na mão. São essas duas horas que o MetaNutri corta.
        </p>

        <div className="mt-10">
          {/* Empilhado, as colunas viram linhas: a legenda diz o que cada ícone marca. */}
          <p className="flex flex-wrap gap-x-5 gap-y-1 pb-3 text-[13px] font-semibold text-muted-foreground md:hidden">
            <span className="inline-flex items-center gap-1.5">
              <X className="size-3.5" aria-hidden="true" /> Software de nutrição comum
            </span>
            <span className="inline-flex items-center gap-1.5 text-primary">
              <Check className="size-3.5" aria-hidden="true" /> MetaNutri
            </span>
          </p>
          <div className="hidden gap-x-8 pb-3 md:grid md:grid-cols-[minmax(0,210px)_minmax(0,1fr)_minmax(0,1fr)]">
            <p />
            <p className="text-[13px] font-semibold text-muted-foreground">Software de nutrição comum</p>
            <p className="text-[13px] font-semibold text-primary">MetaNutri</p>
          </div>
          <div className="border-t border-fio">
            {CONFRONTO.map(([rotulo, eles, nos]) => (
              <div key={rotulo} className="grid items-baseline gap-x-8 gap-y-1.5 border-b border-fio py-6 md:grid-cols-[minmax(0,210px)_minmax(0,1fr)_minmax(0,1fr)]">
                <p className="text-sm font-semibold">{rotulo}</p>
                <p className="flex items-start gap-2.5 text-[15px] text-muted-foreground">
                  <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>{eles}</span>
                </p>
                <p className="flex items-start gap-2.5 text-[15px] font-medium">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{nos}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capacidades: lista com fios, não cartões iguais */}
      <section className="mx-auto max-w-[1266px] px-4 pb-20 sm:px-8 sm:pb-24">
        <h2 className="max-w-[18ch] font-titulo text-[clamp(26px,3.8vw,45px)] font-normal leading-[1.14] tracking-[-0.4px] text-balance">
          O que o estágio cobra, <TextHighlight>numa sessão só</TextHighlight>
        </h2>

        <div className="mt-2">
          {CAPACIDADES.map(([Icone, titulo, texto]) => (
            <div key={titulo} className="grid items-start gap-x-7 gap-y-2.5 border-b border-fio py-7 md:grid-cols-[52px_minmax(0,300px)_minmax(0,1fr)]">
              <span aria-hidden="true" className="grid size-11 place-content-center rounded-md bg-lightprimary text-primary">
                <Icone className="size-5" />
              </span>
              <h3 className="font-titulo text-xl font-medium tracking-[-0.2px]">{titulo}</h3>
              <p className="text-[15px] leading-relaxed text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* A base, com as lacunas admitidas */}
      <section className="mx-auto max-w-[1266px] px-4 pb-20 sm:px-8 sm:pb-24">
        <div className="overflow-hidden rounded-2xl bg-lombada text-lombadatexto">
          <div className="grid gap-10 p-8 md:grid-cols-2 md:gap-16 md:p-14">
            <div>
              <h2 className="font-titulo text-[clamp(26px,3.8vw,45px)] font-normal leading-[1.14] tracking-[-0.4px] text-lombadatexto text-balance">
                A base que ninguém mostra
              </h2>
              <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-lombadafraca">
                Menos de um em cada cinco alimentos da TACO tem os 20 nutrientes medidos. O resto tem buraco. Quase todo software
                trata buraco como zero, e o plano fecha bonito numa conta errada.
              </p>
              <p className="mt-5 text-[17px] font-semibold text-lombadatexto">Aqui, falta de dado aparece como falta de dado.</p>
              <p className="mt-5 max-w-[44ch] text-sm leading-relaxed text-lombadafraca">
                Vitamina D, B12 e folato não existem na tabela. Dava para importar da USDA casando por nome, mas “arroz, tipo 1,
                cozido” e “rice, white, cooked” não são o mesmo alimento. Número plausível e errado é pior que número ausente.
              </p>
              <button
                type="button"
                onClick={aoVerAlimentos}
                className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-full border border-lombadafio px-5 text-sm font-semibold transition-colors hover:bg-lombadatexto hover:text-lombada focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lombadatexto"
              >
                Ver a tabela de alimentos
              </button>
            </div>

            <div>
              {LACUNAS_DA_BASE.map((l) => (
                <div key={l.rotulo} className="grid gap-2 border-b border-lombadafio py-4.5 last:border-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="numeros whitespace-nowrap font-titulo text-3xl font-normal">{l.valor}</span>
                    <span className="min-w-0 max-w-[26ch] text-right text-sm text-lombadafraca">{l.rotulo}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-lombadafio">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${l.proporcao}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Conversão */}
      <section className="mx-auto max-w-[1266px] px-4 pb-20 sm:px-8 sm:pb-24">
        <div className="grid justify-items-center gap-5 rounded-2xl border border-border bg-muted px-6 py-14 text-center">
          <h2 className="max-w-[20ch] font-titulo text-[clamp(26px,3.8vw,45px)] font-normal leading-[1.14] tracking-[-0.4px] text-balance">
            Abra um dia inteiro já montado
          </h2>
          <p className="max-w-[48ch] text-[15px] text-muted-foreground">
            Seis refeições, dois substitutos no almoço, 103% do gasto calculado. Mexa à vontade.
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
