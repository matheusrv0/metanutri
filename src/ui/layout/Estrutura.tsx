import { TriangleAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { AvisoPrimeiroAcesso } from '../casos/AvisoPrimeiroAcesso.tsx'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@ds/componentes/overlay/sheet.tsx'
import type { ModoPlano } from '@/domain/tipos.ts'
import { useMigracaoIncompleta } from '../estado/contextoArmazenamento.ts'
import { useNuvem } from '../estado/contextoNuvem.ts'
import { COPIA_GRANDE_DEMAIS } from '../estado/mensagemDoBanco.ts'
import { AvisoNuvem } from '../nuvem/AvisoNuvem.tsx'
import { SituacaoDaNuvem } from '../nuvem/SituacaoDaNuvem.tsx'
import type { Rota } from '../navegacao.ts'
import { Cabecalho, type PassoTrilha } from './Cabecalho.tsx'
import { MenuLateral, type CasoAtual } from './MenuLateral.tsx'

interface EstruturaProps {
  readonly rota: Rota
  readonly navegar: (rota: Rota) => void
  readonly casoAtual: CasoAtual | null
  readonly aoNovoCaso: (modo: ModoPlano) => void
  readonly titulo: string
  readonly trilha?: readonly PassoTrilha[] | undefined
  readonly acoes?: ReactNode
  readonly children: ReactNode
  /** Pendências do administrador. Nulo ou ausente: a conta não é administradora e o item não aparece (CA-292). */
  readonly aprovacoesPendentes?: number | null | undefined
}

/** Layout do MaterialM: menu lateral fixo de 270 px (gaveta abaixo de 1280 px), cabeçalho e conteúdo em até 1400 px. */
export function Estrutura({ rota, navegar, casoAtual, aoNovoCaso, titulo, trilha, acoes, children, aprovacoesPendentes }: EstruturaProps) {
  const [menuAberto, setMenuAberto] = useState(false)
  // CA-473: parte dos dados de antes não coube na conta; o resto aparece quando houver espaço.
  const migracaoIncompleta = useMigracaoIncompleta()
  // CB-123: a pessoa tirou a capa da trava de tamanho para reduzir os dados; a frase fica aqui até caber (DP-9).
  const nuvem = useNuvem()
  const reduzindo = nuvem !== null && nuvem.estado.trava === 'grande-demais' && nuvem.estado.reduzindo

  useEffect(() => {
    document.title = `${titulo} · MetaNutri`
  }, [titulo])

  const fecharMenu = () => setMenuAberto(false)

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#conteudo"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('conteudo')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] xl:block">
        <MenuLateral rota={rota} navegar={navegar} casoAtual={casoAtual} aoNovoCaso={aoNovoCaso} aprovacoesPendentes={aprovacoesPendentes} />
      </aside>

      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="left" className="w-[280px] border-none p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação principal do MetaNutri</SheetDescription>
          <MenuLateral rota={rota} navegar={navegar} casoAtual={casoAtual} aoNovoCaso={aoNovoCaso} aoEscolher={fecharMenu} aprovacoesPendentes={aprovacoesPendentes} />
        </SheetContent>
      </Sheet>

      <div className="xl:pl-[264px]">
        <Cabecalho titulo={titulo} trilha={trilha} acoes={acoes} situacao={<SituacaoDaNuvem />} aoAbrirMenu={() => setMenuAberto(true)} />
        <main id="conteudo" tabIndex={-1} className="mx-auto max-w-[1400px] px-4 py-6 focus:outline-none sm:px-8 sm:py-8">
          {migracaoIncompleta ? (
            <Alert variant="warning" className="mb-6">
              <TriangleAlert aria-hidden="true" />
              <p>
                Parte dos dados guardados antes neste aparelho ainda não apareceu: o armazenamento do navegador está cheio. Feche outras abas do
                MetaNutri e recarregue a página.
              </p>
            </Alert>
          ) : null}
          {reduzindo ? (
            <Alert variant="warning" className="mb-6">
              <TriangleAlert aria-hidden="true" />
              <p>{COPIA_GRANDE_DEMAIS}</p>
            </Alert>
          ) : null}
          {children}
        </main>
      </div>

      {/* Boas-vindas só aqui dentro: quem está na página pública ainda não entrou no sistema. */}
      <AvisoPrimeiroAcesso />
      {/* Quem já usava fica sabendo, uma vez, que os dados agora ficam na nuvem (spec dados-na-nuvem, DP-26). */}
      <AvisoNuvem />
    </div>
  )
}
