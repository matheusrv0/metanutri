import { formatarNumero } from '@/export/copiar-tabela.ts'

export interface PontoEvolucao {
  readonly data: string
  readonly pesoKg: number
}

/** Linha do peso ao longo dos planos. Sem biblioteca: eixo, marcas e rótulos desenhados aqui. */
export function EvolucaoPeso({ pontos }: { readonly pontos: readonly PontoEvolucao[] }) {
  if (pontos.length < 2) {
    return <p className="text-sm text-muted-foreground">A linha do peso aparece quando houver pelo menos dois planos com peso registrado.</p>
  }

  const largura = 640
  const altura = 200
  const margem = { esquerda: 48, direita: 16, topo: 16, baixo: 32 }
  const pesos = pontos.map((p) => p.pesoKg)
  const min = Math.floor(Math.min(...pesos) - 1)
  const max = Math.ceil(Math.max(...pesos) + 1)
  const faixa = max - min || 1

  const x = (i: number) => margem.esquerda + (i * (largura - margem.esquerda - margem.direita)) / (pontos.length - 1)
  const y = (peso: number) => margem.topo + ((max - peso) * (altura - margem.topo - margem.baixo)) / faixa

  const caminho = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.pesoKg).toFixed(1)}`).join(' ')
  const marcasY = [min, min + faixa / 2, max]
  const dataCurta = (iso: string) => {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
    return m ? `${m[3]}/${m[2]}` : ''
  }

  const primeiro = pontos[0]
  const ultimo = pontos[pontos.length - 1]
  const diferenca = primeiro && ultimo ? ultimo.pesoKg - primeiro.pesoKg : 0

  return (
    <figure className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full" role="img" aria-label="Evolução do peso ao longo dos planos">
        {marcasY.map((valor) => (
          <g key={valor}>
            <line x1={margem.esquerda} x2={largura - margem.direita} y1={y(valor)} y2={y(valor)} stroke="var(--fio)" strokeWidth="1" />
            <text x={margem.esquerda - 8} y={y(valor) + 4} textAnchor="end" fontSize="11" fill="var(--tinta-fraca)">
              {formatarNumero(valor, 0)}
            </text>
          </g>
        ))}
        <path d={caminho} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
        {pontos.map((p, i) => (
          <g key={`${p.data}-${i}`}>
            <circle cx={x(i)} cy={y(p.pesoKg)} r="4" fill="var(--color-primary)" />
            <text x={x(i)} y={altura - 10} textAnchor="middle" fontSize="11" fill="var(--tinta-fraca)">
              {dataCurta(p.data)}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="numeros text-xs text-muted-foreground">
        {`De ${formatarNumero(primeiro?.pesoKg ?? 0, 1)} kg a ${formatarNumero(ultimo?.pesoKg ?? 0, 1)} kg · ${
          diferenca === 0 ? 'sem variação' : `${diferenca > 0 ? '+' : ''}${formatarNumero(diferenca, 1)} kg`
        }`}
      </figcaption>
    </figure>
  )
}
