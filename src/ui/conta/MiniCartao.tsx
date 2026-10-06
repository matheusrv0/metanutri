/**
 * O cartão pequeno de Conta e plano (protótipo v2): a bandeira e os 4 últimos números.
 * É o único lugar da tela que mostra o cartão (CA-389): por isso tem nome para o leitor de
 * tela ("Mastercard final 6351"). Sem o cartão gravado, é só enfeite e fica escondido dele.
 */
export function MiniCartao({ bandeira, final, nome }: { readonly bandeira: string | null; readonly final: string | null; readonly nome: string | null }) {
  return (
    <div
      role={nome ? 'img' : undefined}
      aria-label={nome ?? undefined}
      aria-hidden={nome ? undefined : true}
      className="flex aspect-[1.586] w-24 flex-col justify-between rounded-sm bg-[image:var(--gradient-ink)] px-2.5 py-2 text-2xs text-textonbrand"
    >
      <span className="truncate font-semibold">{bandeira ?? 'Cartão'}</span>
      <span className="font-dados text-xs tracking-wider">{`•••• ${final ?? '••••'}`}</span>
    </div>
  )
}
