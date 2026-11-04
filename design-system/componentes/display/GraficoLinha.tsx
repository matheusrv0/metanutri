import { useState } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Linha de uma série só, ponto por valor (a evolução do peso e da gordura no Histórico da antropometria; spec
 * antropometria-telas, D-1426 e D-1487). Um eixo só, nunca dois: duas medidas são dois gráficos. A linha e os pontos são
 * da primeira série de gráfico (`--chart-1`, teal no claro e teal claro no escuro); laranja nunca, porque isto é painel
 * de dado. O texto (marcas, datas, o último valor e a dica) fica na tinta do texto, nunca na cor da série.
 *
 * O eixo x é proporcional à posição de cada ponto (os dias desde a primeira avaliação). Valor `null` não vira ponto nem
 * zero: a linha liga os pontos que têm valor. Cada ponto tem uma coluna de toque do tamanho do vão até os vizinhos, que
 * é um botão: o mouse e o teclado mostram a dica, e o nome do botão é a dica inteira, para o leitor de tela.
 */
export interface PontoDaLinha {
  readonly chave: string
  /** A posição no eixo x, crescente (dias, por exemplo). */
  readonly x: number
  /** `null`: sem valor aqui; não vira ponto. */
  readonly valor: number | null
  /** Embaixo do eixo: "12/05". */
  readonly rotulo: string
  /** A dica: o título ("08/09/2026"), o valor ("72,6 kg") e o detalhe ("−1,5 kg desde 07/07"). */
  readonly dica: { readonly titulo: string; readonly valor: string; readonly detalhe: string }
}

interface GraficoLinhaProps {
  /** O nome do gráfico para o leitor de tela: "Peso, kg". */
  readonly descricao: string
  readonly pontos: readonly PontoDaLinha[]
  /** Como as marcas do eixo y são escritas. */
  readonly formatarMarca: (valor: number) => string
  /** Escrito ao lado do último ponto: "71,5 kg". */
  readonly rotuloDoUltimo: string
  readonly className?: string | undefined
}

export interface EscalaDoEixo {
  readonly min: number
  readonly max: number
  readonly marcas: readonly number[]
}

/** Sem resto de ponto flutuante: 0,1 × 3 dá 0,3, não 0,30000000000000004. */
const limpo = (valor: number) => Number(valor.toFixed(10))

/**
 * Marcas redondas para os valores (D-1487): o passo é 1, 2 ou 5 × 10ⁿ, para umas 3 a 6 marcas, e sobra pelo menos um
 * quarto de passo entre o valor da ponta e a borda (o peso de 71,5 a 75,8 kg vai de 70 a 78, de 2 em 2).
 */
export function escalaDoEixo(valores: readonly number[]): EscalaDoEixo {
  const finitos = valores.filter(Number.isFinite)
  if (finitos.length === 0) return { min: 0, max: 1, marcas: [0, 1] }
  let menor = Math.min(...finitos)
  let maior = Math.max(...finitos)
  if (menor === maior) {
    const folga = Math.max(Math.abs(menor) * 0.05, 1)
    menor -= folga
    maior += folga
  }
  const bruto = (maior - menor) / 3
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const passo = [1, 2, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? 10 * potencia
  let min = Math.floor(menor / passo) * passo
  let max = Math.ceil(maior / passo) * passo
  if (menor - min < passo / 4) min -= passo
  if (max - maior < passo / 4) max += passo
  // Medida que não fica negativa (peso, cintura, %) não ganha marca abaixo de zero.
  if (menor >= 0 && min < 0) min = 0
  const marcas: number[] = []
  for (let k = Math.round(min / passo); k <= Math.round(max / passo); k++) marcas.push(limpo(k * passo))
  return { min: limpo(min), max: limpo(max), marcas }
}

/** Uma porcentagem para o `style`, sem resto de ponto flutuante. */
const pct = (fracao: number) => `${Number((fracao * 100).toFixed(3))}%`

/** Abaixo desta distância (em fração da largura), a data do meio não cabe entre as vizinhas e não é escrita. */
const VAO_MINIMO_DAS_DATAS = 0.12

/** Quais datas ficam embaixo do eixo: a primeira, a última e as do meio que não encostam na anterior escrita. */
function datasEscritas(posicoes: readonly number[]): ReadonlySet<number> {
  const escritas: number[] = []
  posicoes.forEach((x, i) => {
    const ultimaEscrita = escritas.at(-1)
    if (ultimaEscrita === undefined || x - (posicoes[ultimaEscrita] ?? 0) >= VAO_MINIMO_DAS_DATAS) escritas.push(i)
  })
  const ultima = posicoes.length - 1
  if (ultima > 0 && escritas.at(-1) !== ultima) {
    // A última data sempre sai; a do meio que encostaria nela fica de fora.
    if (escritas.length > 1 && (posicoes[ultima] ?? 0) - (posicoes[escritas.at(-1) ?? 0] ?? 0) < VAO_MINIMO_DAS_DATAS) escritas.pop()
    escritas.push(ultima)
  }
  return new Set(escritas)
}

export function GraficoLinha({ descricao, pontos, formatarMarca, rotuloDoUltimo, className }: GraficoLinhaProps) {
  const [ativo, setAtivo] = useState<string | null>(null)
  const xs = pontos.map((p) => p.x)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  // Todos no mesmo x (ou um só): em fila, pela ordem; um ponto só fica no meio.
  const posicaoX = (p: PontoDaLinha, i: number) => (xMax > xMin ? (p.x - xMin) / (xMax - xMin) : pontos.length > 1 ? i / (pontos.length - 1) : 0.5)
  const comValor = pontos.flatMap((p, i) => (p.valor === null || !Number.isFinite(p.valor) ? [] : [{ ponto: p, valor: p.valor, x: posicaoX(p, i) }]))
  const escala = escalaDoEixo(comValor.map((p) => p.valor))
  const posicaoY = (valor: number) => 1 - (valor - escala.min) / (escala.max - escala.min)
  const escritas = datasEscritas(comValor.map((p) => p.x))
  const ultimo = comValor.at(-1)

  return (
    <div role="group" aria-label={descricao} className={cn('min-w-0 pb-7', className)}>
      <div className="numeros relative ml-9 mr-16 h-56 sm:h-64">
        {escala.marcas.map((m) => (
          <span key={m} aria-hidden="true">
            <span className="absolute inset-x-0 h-px bg-border" style={{ top: pct(posicaoY(m)) }} />
            <span className="absolute right-full mr-2 -translate-y-1/2 whitespace-nowrap text-xs text-muted-foreground" style={{ top: pct(posicaoY(m)) }}>
              {formatarMarca(m)}
            </span>
          </span>
        ))}

        {comValor.length > 1 ? (
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <polyline
              points={comValor.map((p) => `${Number((p.x * 100).toFixed(3))},${Number((posicaoY(p.valor) * 100).toFixed(3))}`).join(' ')}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : null}

        {comValor.map(({ ponto: p, x }) =>
          p.chave === ativo ? <span key="mira" aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-borderdefault" style={{ left: pct(x) }} /> : null,
        )}

        {comValor.map(({ ponto: p, valor, x }, i) => (
          <span key={p.chave} aria-hidden="true">
            <span
              data-ponto=""
              className={cn(
                'pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-(--chart-1) motion-safe:transition-transform motion-safe:duration-150',
                p.chave === ativo && 'scale-125',
              )}
              style={{ left: pct(x), top: pct(posicaoY(valor)) }}
            />
            {escritas.has(i) ? (
              <span
                className={cn(
                  'absolute top-full mt-2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground',
                  // No celular, só a primeira e a última (D-1440).
                  i > 0 && i < comValor.length - 1 && 'hidden sm:block',
                )}
                style={{ left: pct(x) }}
              >
                {p.rotulo}
              </span>
            ) : null}
          </span>
        ))}

        {ultimo ? (
          <span aria-hidden="true" className="absolute translate-x-2.5 -translate-y-1/2 whitespace-nowrap text-sm font-semibold text-heading" style={{ left: pct(ultimo.x), top: pct(posicaoY(ultimo.valor)) }}>
            {rotuloDoUltimo}
          </span>
        ) : null}

        {comValor.map(({ ponto: p, x }, i) => {
          // A coluna de toque vai do meio do vão com o vizinho da esquerda ao meio do vão com o da direita.
          const inicio = i === 0 ? 0 : (x + (comValor[i - 1]?.x ?? x)) / 2
          const fim = i === comValor.length - 1 ? 1 : (x + (comValor[i + 1]?.x ?? x)) / 2
          const largura = Math.max(fim - inicio, 0.04)
          return (
            <button
              key={p.chave}
              type="button"
              aria-label={[p.dica.titulo, p.dica.valor, p.dica.detalhe].filter(Boolean).join(' · ')}
              className="absolute -inset-y-2 cursor-crosshair rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left: pct(Math.min(inicio, 1 - largura)), width: pct(largura) }}
              onMouseEnter={() => setAtivo(p.chave)}
              onMouseLeave={() => setAtivo((a) => (a === p.chave ? null : a))}
              onFocus={() => setAtivo(p.chave)}
              onBlur={() => setAtivo((a) => (a === p.chave ? null : a))}
            />
          )
        })}

        {comValor.map(({ ponto: p, x }, i) => {
          if (p.chave !== ativo) return null
          // Na metade direita, a dica abre para a esquerda do ponto, para não passar da borda do cartão.
          const lado = x > 0.5 || (i === comValor.length - 1 && comValor.length > 1) ? 'esquerda' : 'direita'
          return (
            <div
              key="dica"
              aria-hidden="true"
              data-lado={lado}
              className={cn(
                'pointer-events-none absolute top-0 z-10 flex min-w-36 flex-col gap-0.5 whitespace-nowrap rounded-lg bg-heading px-3 py-2 text-xs text-card shadow-pop',
                lado === 'esquerda' ? '-translate-x-full -ml-3' : 'ml-3',
              )}
              style={{ left: pct(x) }}
            >
              <span>{p.dica.titulo}</span>
              <span className="text-sm font-semibold">{p.dica.valor}</span>
              {p.dica.detalhe ? <span>{p.dica.detalhe}</span> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
