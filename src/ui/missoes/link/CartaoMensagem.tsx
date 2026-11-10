import { CalendarDays } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface CartaoMensagemProps {
  /** O texto livre da nutricionista; nulo sem mensagem (só a consulta aparece). */
  readonly mensagem: string | null
  /** "Ana Lima" (CA-2212); nulo quando a nuvem não disse (sem internet). */
  readonly nutricionista: string | null
  /** "3 nov.", o dia em que ela salvou a mensagem. */
  readonly data: string
  /** "Próxima consulta: ter., 17/11, às 14:30" (CA-2214); nula sem consulta. */
  readonly consulta: string | null
}

/** "Ana Lima" → "AL"; uma palavra, a primeira letra. */
const iniciais = (nome: string): string => {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : ''
  return `${primeira}${ultima}`.toUpperCase()
}

/**
 * A mensagem da nutricionista em Hoje (D-1208, CA-2212): o nome dela, a data e o texto; mais de 3 linhas fecham com
 * "Ler tudo". Abaixo, a próxima consulta (D-1209, CA-2214). O texto quebra em qualquer ponto: um endereço ou telefone
 * longo não empurra a página para o lado (CB-1218).
 */
export function CartaoMensagem({ mensagem, nutricionista, data, consulta }: CartaoMensagemProps) {
  const idTexto = useId()
  const texto = useRef<HTMLParagraphElement>(null)
  const [aberta, setAberta] = useState(false)
  const [corta, setCorta] = useState(false)

  // "Ler tudo" só quando o texto passa de 3 linhas na largura de agora.
  useLayoutEffect(() => {
    const el = texto.current
    if (!el || aberta) return
    setCorta(el.scrollHeight > el.clientHeight + 1)
  }, [mensagem, aberta])

  return (
    <section aria-label={nutricionista ? `Mensagem de ${nutricionista}` : 'Mensagem da nutricionista'} className="flex flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-3.5">
      {mensagem ? (
        <>
          <div className="flex items-center gap-2.5">
            {nutricionista ? (
              <span aria-hidden="true" className="grid size-8.5 shrink-0 place-content-center rounded-full bg-linkacao text-sm font-extrabold text-linkacaotexto">
                {iniciais(nutricionista)}
              </span>
            ) : null}
            <p className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
              {nutricionista ? <strong className="min-w-0 truncate text-sm font-bold text-heading">{nutricionista}</strong> : null}
              {data ? <span className="ml-auto shrink-0 text-xs text-muted-foreground">{data}</span> : null}
            </p>
          </div>
          <p
            ref={texto}
            id={idTexto}
            className={cn('text-base leading-relaxed whitespace-pre-line text-foreground [overflow-wrap:anywhere]', aberta ? null : 'line-clamp-3')}
          >
            {mensagem}
          </p>
          {corta && !aberta ? (
            <button
              type="button"
              aria-controls={idTexto}
              aria-expanded={false}
              onClick={() => setAberta(true)}
              className="-my-1.5 inline-flex min-h-11 self-start items-center rounded-sm text-sm font-bold text-heading underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8 sm:pointer-coarse:min-h-11"
            >
              Ler tudo
            </button>
          ) : null}
        </>
      ) : null}
      {consulta ? (
        <p className={cn('flex items-center gap-2 text-sm text-foreground', mensagem ? 'border-t border-border pt-2.5' : null)}>
          <CalendarDays className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{consulta}</span>
        </p>
      ) : null}
    </section>
  )
}
