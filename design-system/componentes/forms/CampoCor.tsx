import { useId, useState } from 'react'
import { normalizarCor } from '@/domain/corDaMarca.ts'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { cn } from '@ds/lib/cn.ts'

/*
 * "Outra cor" (spec marca-no-link, D-953, CA-1958 e CB-954): o seletor de cor do navegador e o campo `#RRGGBB`, lado a
 * lado. Os dois escolhem a mesma cor. O campo aceita com ou sem `#`, em maiúscula ou minúscula; fora do formato, a cor
 * de antes continua e o erro aparece junto do campo, ligado a ele, quando a pessoa termina de digitar (7 caracteres) ou
 * sai do campo. Sem o seletor no navegador (CB-954), fica só o campo.
 */
export const FORMATO_DA_COR = 'Use o formato #RRGGBB.'

interface CampoCorProps {
  readonly rotulo: string
  /** A cor de agora, `#rrggbb`. Escolhida fora daqui (uma amostra, a sugestão), ela aparece no campo. */
  readonly valor: string
  /** Chamado só com uma cor válida, já em `#rrggbb`. */
  readonly aoEscolher: (cor: string) => void
  /** O id de uma descrição de fora que também fala da cor (o contraste, a recusa), ligada ao campo (CA-1980). */
  readonly descricaoId?: string
  readonly className?: string
}

/** O navegador tem o seletor de cor? Um navegador sem ele troca o tipo do campo para texto. */
function temSeletorDeCor(): boolean {
  if (typeof document === 'undefined') return false
  const teste = document.createElement('input')
  teste.setAttribute('type', 'color')
  return teste.type === 'color'
}

export function CampoCor({ rotulo, valor, aoEscolher, descricaoId, className }: CampoCorProps) {
  const id = useId()
  const idErro = `${id}-erro`
  const [seletor] = useState(temSeletorDeCor)
  const [texto, setTexto] = useState(valor.toUpperCase())
  const [tocado, setTocado] = useState(false)
  // A cor mudou fora do campo (amostra, seletor, sugestão): o campo passa a mostrá-la. Ajuste no render, sem efeito.
  const [valorVisto, setValorVisto] = useState(valor)
  if (valor !== valorVisto) {
    setValorVisto(valor)
    if (normalizarCor(texto) !== valor) {
      setTexto(valor.toUpperCase())
      setTocado(false)
    }
  }

  const valido = normalizarCor(texto) !== null
  const mostraErro = !valido && (tocado || texto.trim().length >= 7)
  const descricao = [mostraErro ? idErro : null, descricaoId ?? null].filter(Boolean).join(' ') || undefined

  const digitar = (novo: string) => {
    setTexto(novo)
    const cor = normalizarCor(novo)
    if (cor !== null && cor !== valor) aoEscolher(cor)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="flex items-center gap-2">
        {seletor ? (
          <input
            type="color"
            value={valor}
            onChange={(e) => {
              const cor = normalizarCor(e.target.value)
              if (cor !== null) aoEscolher(cor)
            }}
            aria-label="Escolher outra cor no seletor"
            className={cn(
              'size-11 shrink-0 cursor-pointer rounded-md border border-input bg-card p-1 sm:size-10 sm:pointer-coarse:size-11',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              '[&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-0',
            )}
          />
        ) : null}
        <Input
          id={id}
          value={texto}
          onChange={(e) => digitar(e.target.value)}
          onBlur={() => setTocado(true)}
          spellCheck={false}
          inputMode="text"
          autoCapitalize="characters"
          aria-invalid={mostraErro}
          aria-describedby={descricao}
          className="numeros w-36 uppercase"
        />
      </div>
      {mostraErro ? (
        <p id={idErro} className="text-sm text-errortext">
          {FORMATO_DA_COR}
        </p>
      ) : null}
    </div>
  )
}
