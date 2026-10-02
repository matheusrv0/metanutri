import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'

interface CartaoAoVivoProps {
  readonly bandeira: string | null
  /** Os primeiros números que a operadora devolveu (até 8); o desenho mostra os 6 primeiros. */
  readonly bin: string | null
  readonly nome: string
}

/**
 * O cartão que se desenha enquanto a pessoa digita (protótipo v2): a bandeira e os 6
 * primeiros números que a operadora reconheceu, e o nome. A validade fica escondida: ela
 * mora no campo seguro, e a página não a enxerga. É enfeite; o leitor de tela lê os campos.
 */
export function CartaoAoVivo({ bandeira, bin, nome }: CartaoAoVivoProps) {
  const seis = (bin ?? '').replace(/\D/g, '').slice(0, 6).padEnd(6, '•')
  const numero = `${seis.slice(0, 4)} ${seis.slice(4)}•• •••• ••••`
  return (
    <div
      aria-hidden="true"
      data-cartao-ao-vivo=""
      className="relative flex aspect-[1.586] w-full max-w-90 flex-col justify-between overflow-hidden rounded-xl bg-[image:var(--gradient-ink)] p-5 text-textonbrand"
    >
      <IconeMarca nome="check" destaque className="absolute -bottom-10 -right-8 size-52 opacity-15" />
      <div className="relative flex items-center justify-between gap-3">
        <span className="h-6 w-8 rounded-sm bg-marfim/60" />
        <span className="font-titulo text-sm font-extrabold tracking-wide">{bandeira ?? 'Cartão de crédito'}</span>
      </div>
      <span className="relative font-dados text-lg tracking-widest">{numero}</span>
      <div className="relative flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-2xs uppercase tracking-widest opacity-70">Titular</span>
          <span className="block truncate font-titulo text-sm font-bold tracking-wide">{nome.trim().toUpperCase() || 'NOME NO CARTÃO'}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-2xs uppercase tracking-widest opacity-70">Validade</span>
          <span className="block font-dados text-sm">••/••</span>
        </span>
      </div>
    </div>
  )
}
