/** O cartão pequeno de Conta e plano (protótipo v2): a bandeira e os 4 últimos números. Enfeite: o texto ao lado diz o mesmo. */
export function MiniCartao({ bandeira, final }: { readonly bandeira: string | null; readonly final: string | null }) {
  return (
    <div aria-hidden="true" className="flex aspect-[1.586] w-24 flex-col justify-between rounded-sm bg-[image:var(--gradient-ink)] px-2.5 py-2 text-2xs text-textonbrand">
      <span className="truncate font-semibold">{bandeira ?? 'Cartão'}</span>
      <span className="font-dados text-xs tracking-wider">{`•••• ${final ?? '••••'}`}</span>
    </div>
  )
}
