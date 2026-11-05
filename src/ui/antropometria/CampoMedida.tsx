import { useId, useState, type ReactNode } from 'react'
import { erroDaFaixa, lerNumero, type MedidaComFaixa } from '@/domain/caso.ts'
import { Input } from '@ds/componentes/forms/input.tsx'
import { cn } from '@ds/lib/cn.ts'
import type { AjudaDaMedida as Ajuda } from './ajudas.ts'
import { AjudaDaMedida } from './AjudaDaMedida.tsx'

interface CampoMedidaProps {
  /** O nome visível da medida, com o "?" ao lado quando há `ajuda`. Sem ele, o campo vai só (linha de tabela). */
  readonly rotulo?: string | undefined
  /** O nome lido pelo leitor de tela quando o rótulo visível não basta ("Braço relaxado, lado direito, em centímetros"). */
  readonly rotuloAcessivel?: string | undefined
  readonly valor: number | null
  readonly aoMudar: (valor: number | null) => void
  readonly unidade: string
  readonly ajuda?: Ajuda | undefined
  /** Onde a ajuda abre (classes de posição), quando o padrão cobriria outra coisa. */
  readonly posicaoDaAjuda?: string | undefined
  /** No celular, "Dir." ou "Esq." dentro do campo, à esquerda (D-1440). */
  readonly lado?: 'Dir.' | 'Esq.' | undefined
  /** O ponto da dobra exigida pelo protocolo e o "(usada no protocolo)" para o leitor de tela (D-1412). */
  readonly marcada?: boolean | undefined
  /** A dobra que o protocolo não usa: apagada e guardada (D-1412). */
  readonly apagada?: boolean | undefined
  /** Texto curto embaixo do rótulo (o ponto da cintura, "Técnica em conferência"). */
  readonly abaixoDoRotulo?: ReactNode
  /** O valor que vale com o campo vazio (o IMC-alvo padrão, D-1463). */
  readonly placeholder?: string | undefined
  /** A faixa da etapa 1 que o campo confere, com a frase dela (peso, estatura, cintura e panturrilha; D-1522). */
  readonly faixa?: MedidaComFaixa | undefined
  readonly className?: string | undefined
}

const paraTexto = (valor: number | null) => (valor === null ? '' : String(valor).replace('.', ','))

/**
 * O que está errado no texto digitado, ou `null` (D-1522 e D-1525): texto que não é número (CB-1409), número fora da
 * faixa da etapa 1, e zero ou negativo nas medidas sem faixa. Texto com erro fica no campo e não vira dado.
 */
function erroDoTexto(texto: string, faixa: MedidaComFaixa | undefined): string | null {
  if (texto.trim() === '') return null
  const numero = lerNumero(texto)
  if (numero === null) return 'Use só números, com vírgula.'
  if (faixa) return erroDaFaixa(faixa, numero)
  return numero > 0 ? null : 'Use um número maior que zero.'
}

/** O número que o texto grava no plano: `null` quando vazio ou com erro. */
const lerValido = (texto: string, faixa: MedidaComFaixa | undefined): number | null => (erroDoTexto(texto, faixa) === null ? lerNumero(texto) : null)

/**
 * Uma medida da avaliação (spec antropometria-telas, D-1407 a D-1412): o número com a unidade dentro do campo e o "?" da
 * ajuda. Guarda o texto digitado enquanto a pessoa escreve ("68," ainda não é número, CB-12); texto que não é número,
 * número fora da faixa e zero ficam no campo, com a frase, e não viram dado (CB-1409, D-1522, D-1525).
 */
export function CampoMedida({ rotulo, rotuloAcessivel, valor, aoMudar, unidade, ajuda, posicaoDaAjuda, lado, marcada = false, apagada = false, abaixoDoRotulo, placeholder, faixa, className }: CampoMedidaProps) {
  const id = useId()
  const [texto, setTexto] = useState(() => paraTexto(valor))
  const [valorConhecido, setValorConhecido] = useState(valor)

  // Ajuste durante a renderização (padrão do React): só reescreve o texto quando o valor veio de fora.
  if (valor !== valorConhecido) {
    setValorConhecido(valor)
    if (lerValido(texto, faixa) !== valor) setTexto(paraTexto(valor))
  }
  const mensagem = erroDoTexto(texto, faixa)

  const campo = (
    <div className="relative min-w-0">
      {lado ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground sm:hidden">
          {lado}
        </span>
      ) : null}
      <Input
        id={id}
        inputMode="decimal"
        value={texto}
        placeholder={placeholder}
        aria-label={rotuloAcessivel}
        aria-invalid={mensagem !== null || undefined}
        aria-describedby={mensagem !== null ? `${id}-erro` : undefined}
        onChange={(e) => {
          setTexto(e.target.value)
          aoMudar(lerValido(e.target.value, faixa))
        }}
        className={cn('numeros text-right', unidade.length > 2 ? 'pr-15' : 'pr-10', lado && 'max-sm:pl-12', apagada && 'border-borderdefault bg-transparent text-muted-foreground')}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unidade}</span>
    </div>
  )
  const erro =
    mensagem !== null ? (
      <p id={`${id}-erro`} className="text-xs text-warningtext">
        {mensagem}
      </p>
    ) : null

  if (rotulo === undefined) {
    return (
      <div className={cn('flex min-w-0 flex-col gap-1', className)}>
        {campo}
        {erro}
      </div>
    )
  }
  return (
    <div className={cn('relative flex min-w-0 flex-col gap-1.5', className)}>
      <div className="flex min-h-6 items-center gap-1.5">
        {marcada ? <span aria-hidden="true" className="size-1.75 shrink-0 rounded-full bg-primary" /> : null}
        <label htmlFor={id} className={cn('min-w-0 text-sm font-semibold', apagada ? 'font-medium text-muted-foreground' : 'text-heading')}>
          {rotulo}
          {marcada ? <span className="sr-only"> (usada no protocolo)</span> : null}
        </label>
        {ajuda ? <AjudaDaMedida nome={rotulo} ajuda={ajuda} posicao={posicaoDaAjuda} /> : null}
      </div>
      {abaixoDoRotulo}
      {campo}
      {erro}
    </div>
  )
}
