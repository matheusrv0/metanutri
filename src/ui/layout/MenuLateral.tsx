import { Barcode, ClipboardList, FolderOpen, HardDrive, LayoutDashboard, Plus, Settings, TriangleAlert, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCasos } from '../estado/contextoCasos.ts'
import type { ModoPlano } from '@/domain/tipos.ts'
import { EscolherModo } from '../caso/EscolherModo.tsx'
import type { Rota } from '../navegacao.ts'
import { ItemMenu } from './ItemMenu.tsx'
import { SeletorTema } from './SeletorTema.tsx'

export interface CasoAtual {
  readonly id: string
  readonly nome: string
}

interface MenuLateralProps {
  readonly rota: Rota
  /** Caso aberto agora ou o último alterado; `null` quando não há casos. */
  readonly casoAtual: CasoAtual | null
  readonly navegar: (rota: Rota) => void
  readonly aoNovoCaso: (modo: ModoPlano) => void
  readonly aoEscolher?: () => void
}

function Secao({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="rotulo px-3 pb-2 text-lombadafraca">{titulo}</p>
      {children}
    </div>
  )
}

/**
 * Lombada da publicação: capa com o nome, índice em duas seções e, no pé,
 * onde os dados ficam e a aparência.
 */
export function MenuLateral({ rota, casoAtual, navegar, aoNovoCaso, aoEscolher }: MenuLateralProps) {
  const { casos, avisoArmazenamento } = useCasos()
  const ir = (r: Rota) => {
    navegar(r)
    aoEscolher?.()
  }

  return (
    <nav aria-label="Menu principal" className="flex h-full flex-col bg-lombada text-lombadatexto">
      <div className="flex shrink-0 flex-col gap-1 border-b border-lombadafio px-5 py-5">
        <span className="font-titulo text-[22px] font-bold uppercase leading-none tracking-[0.12em] [font-stretch:80%]">MetaNutri</span>
        <span className="rotulo text-lombadafraca">Planejador alimentar</span>
      </div>

      <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-2 py-5">
        <EscolherModo
          aoEscolher={(modo) => {
            aoNovoCaso(modo)
            aoEscolher?.()
          }}
          gatilho={
            <button
              type="button"
              className="mx-1 flex items-center justify-center gap-2 rounded-xs bg-papel px-4 py-2.5 text-sm font-semibold text-tinta transition-colors hover:bg-lombadatexto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lombadatexto/60 [&_svg]:size-4"
            >
              <Plus aria-hidden="true" />
              Novo caso
            </button>
          }
        />

        <Secao titulo="Trabalho">
          <ItemMenu icone={<LayoutDashboard aria-hidden="true" />} rotulo="Painel" ativo={rota.tela === 'painel'} aoClicar={() => ir({ tela: 'painel' })} />
          <ItemMenu
            icone={<UserRound aria-hidden="true" />}
            rotulo="Pacientes"
            ativo={rota.tela === 'pacientes' || rota.tela === 'paciente'}
            aoClicar={() => ir({ tela: 'pacientes' })}
          />
          <ItemMenu
            icone={<FolderOpen aria-hidden="true" />}
            rotulo="Planos"
            ativo={rota.tela === 'casos'}
            aoClicar={() => ir({ tela: 'casos' })}
            extra={
              casos.length > 0 ? (
                <span className="numeros rounded-xs border border-lombadafio px-1.5 py-0.5 text-[11px] text-lombadafraca">
                  {casos.length}
                  <span className="sr-only"> {casos.length === 1 ? 'caso' : 'casos'}</span>
                </span>
              ) : null
            }
          />
          {casoAtual ? (
            <ItemMenu
              icone={<ClipboardList aria-hidden="true" />}
              rotulo={rota.tela === 'planejador' ? 'Caso aberto' : 'Continuar caso'}
              detalhe={casoAtual.nome || 'Caso sem nome'}
              ativo={rota.tela === 'planejador'}
              aoClicar={() => ir({ tela: 'planejador', casoId: casoAtual.id, aba: rota.tela === 'planejador' ? rota.aba : 'caso' })}
            />
          ) : null}
        </Secao>

        <Secao titulo="Alimentos">
          <ItemMenu icone={<Barcode aria-hidden="true" />} rotulo="Meus produtos" ativo={rota.tela === 'produtos'} aoClicar={() => ir({ tela: 'produtos' })} />
        </Secao>

        <Secao titulo="Sistema">
          <ItemMenu icone={<Settings aria-hidden="true" />} rotulo="Configurações" ativo={rota.tela === 'config'} aoClicar={() => ir({ tela: 'config' })} />
        </Secao>

      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-lombadafio px-4 py-4">
        {avisoArmazenamento ? (
          <p role="status" className="flex items-start gap-2 text-xs text-warningtext">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {avisoArmazenamento}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-xs text-lombadafraca">
            <HardDrive className="size-4 shrink-0" aria-hidden="true" />
            Casos salvos só neste aparelho
          </p>
        )}
        <SeletorTema />
      </div>
    </nav>
  )
}
