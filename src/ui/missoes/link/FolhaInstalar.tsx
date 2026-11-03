import { Copy, Ellipsis, SquarePlus } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Plataforma } from '@/domain/instalarMeuPlano.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { FolhaDoLink } from './FolhaDoLink.tsx'
import { IconeMeuPlano } from './IconeMeuPlano.tsx'

interface FolhaInstalarProps {
  readonly aberta: boolean
  readonly aoFechar: () => void
  readonly plataforma: Plataforma
  readonly cor: string | null
}

/** O realce do botão que o passo pede: um anel no laranja da marca, que nunca leva texto. */
const REALCE = 'ring-2 ring-acentofundo'

/** O desenho da barra do Safari, com o ⋯ realçado (passo 1). */
const BarraDoSafari = () => (
  <span aria-hidden="true" className="flex items-center gap-2 rounded-2xl bg-surfacesunken p-3">
    <span className="grid h-8.5 min-w-0 flex-1 place-content-center truncate rounded-full bg-card px-3 text-xs text-muted-foreground">app.metanutri.com.br</span>
    <span className={`grid size-8.5 shrink-0 place-content-center rounded-full bg-card text-heading ${REALCE}`}>
      <Ellipsis className="size-4" />
    </span>
  </span>
)

/** O menu com "Adicionar à Tela de Início" realçado (passo 2). */
const MenuDoSafari = () => (
  <span aria-hidden="true" className="block rounded-2xl bg-surfacesunken p-3">
    <span className="flex flex-col overflow-hidden rounded-xl bg-card text-sm">
      <span className="flex h-9.5 items-center justify-between px-3 text-muted-foreground">
        Copiar
        <Copy className="size-3.5" />
      </span>
      <span className={`flex h-9.5 items-center justify-between rounded-lg px-3 font-bold text-heading ${REALCE}`}>
        Adicionar à Tela de Início
        <SquarePlus className="size-4" />
      </span>
    </span>
  </span>
)

/** A tela de adicionar, com o nome "Meu plano" e "Adicionar" realçado (passo 3). */
const Adicionar = () => (
  <span aria-hidden="true" className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl bg-surfacesunken p-3">
    <IconeMeuPlano className="size-11" />
    <span className="flex h-8.5 items-center rounded-lg bg-card px-2.5 text-sm text-heading">Meu plano</span>
    <span className={`rounded-lg px-2 py-1.5 text-sm font-bold text-heading ${REALCE}`}>Adicionar</span>
  </span>
)

/** O menu do navegador de dentro do app, com "Abrir no navegador" realçado. */
const AbrirNoNavegador = () => (
  <span aria-hidden="true" className="block rounded-2xl bg-surfacesunken p-3">
    <span className="flex flex-col overflow-hidden rounded-xl bg-card text-sm">
      <span className="flex h-9.5 items-center justify-between px-3 text-muted-foreground">
        Copiar link
        <Copy className="size-3.5" />
      </span>
      <span className={`flex h-9.5 items-center rounded-lg px-3 font-bold text-heading ${REALCE}`}>Abrir no navegador</span>
    </span>
  </span>
)

interface Passo {
  readonly texto: string
  readonly desenho: ReactNode
}

const PASSOS_DO_IPHONE: readonly Passo[] = [
  { texto: 'Toque em ⋯ na barra do Safari (ou em Compartilhar).', desenho: <BarraDoSafari /> },
  { texto: 'Toque em Adicionar à Tela de Início.', desenho: <MenuDoSafari /> },
  { texto: 'Confira o nome Meu plano e toque em Adicionar.', desenho: <Adicionar /> },
]

/** CA-2231: dentro do WhatsApp ou do Instagram, o primeiro passo é abrir no navegador. */
const ABRIR_NO_NAVEGADOR: Passo = { texto: 'Toque em ⋯ e em Abrir no navegador.', desenho: <AbrirNoNavegador /> }

/**
 * A folha de instalar (D-1219, CA-2230 e CA-2231): o iPhone não deixa o site instalar sozinho; a folha mostra os três
 * passos desenhados, com o botão do Safari realçado. Aberto dentro de outro app, ensina "Abrir no navegador" antes.
 */
export function FolhaInstalar({ aberta, aoFechar, plataforma, cor }: FolhaInstalarProps) {
  const passos = plataforma === 'dentro-de-app' ? [ABRIR_NO_NAVEGADOR, ...PASSOS_DO_IPHONE] : PASSOS_DO_IPHONE
  return (
    <FolhaDoLink aberta={aberta} aoFechar={aoFechar} titulo="Instalar o Meu plano" descricao="No iPhone, pelo Safari." cor={cor} tituloVisivel={false}>
      <div aria-hidden="true" className="-mt-4 flex items-center gap-3.5">
        <IconeMeuPlano className="size-15 shrink-0" />
        <span>
          <span className="block font-titulo text-xl font-extrabold tracking-tight text-heading">Instalar o Meu plano</span>
          <span className="block text-sm text-muted-foreground">No iPhone, pelo Safari.</span>
        </span>
      </div>
      <ol className="flex flex-col gap-3.5">
        {passos.map((passo, i) => (
          <li key={passo.texto} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3">
            <span aria-hidden="true" className="grid size-7 place-content-center rounded-full bg-surfacesunken text-sm font-extrabold text-heading">
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-2.5">
              <p className="pt-0.5 text-base text-foreground">{passo.texto}</p>
              {passo.desenho}
            </div>
          </li>
        ))}
      </ol>
      <Button size="lg" block variant="outline" onClick={aoFechar}>
        Entendi
      </Button>
    </FolhaDoLink>
  )
}
