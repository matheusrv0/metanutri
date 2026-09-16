import { ArrowRight, FolderOpen, Plus } from 'lucide-react'
import { calcularEnergia } from './domain/energia.ts'
import { TelaAdequacao } from './ui/adequacao/TelaAdequacao.tsx'
import { TelaCaso } from './ui/caso/TelaCaso.tsx'
import { AvisoPrimeiroAcesso } from './ui/casos/AvisoPrimeiroAcesso.tsx'
import { TelaCasos } from './ui/casos/TelaCasos.tsx'
import { Button } from './ui/componentes/button.tsx'
import { Card } from './ui/componentes/card.tsx'
import { useCasos } from './ui/estado/contextoCasos.ts'
import { ProvedorCasos } from './ui/estado/ProvedorCasos.tsx'
import { useCasoAberto } from './ui/estado/usarCasoAberto.ts'
import { TelaPlano } from './ui/plano/TelaPlano.tsx'
import { ResumoDoDia } from './ui/resumo/ResumoDoDia.tsx'
import { TelaFontes } from './ui/fontes/TelaFontes.tsx'
import { EtapasDoCaso } from './ui/layout/EtapasDoCaso.tsx'
import { Estrutura } from './ui/layout/Estrutura.tsx'
import type { CasoAtual } from './ui/layout/MenuLateral.tsx'
import { ETAPAS } from './ui/navegacao.ts'
import { useRota } from './ui/usarRota.ts'

function Conteudo() {
  const [rota, navegar] = useRota()
  const { casos, repositorio, atualizar } = useCasos()
  const { registro, alterarCaso, alterarPlano } = useCasoAberto(rota.tela === 'planejador' ? rota.casoId : '')

  const recente = casos[0]
  const casoAtual: CasoAtual | null = registro
    ? { id: registro.caso.id, nome: registro.caso.nome }
    : recente
      ? { id: recente.id, nome: recente.nome }
      : null

  const novoCaso = () => {
    const salvo = repositorio.criar('')
    atualizar()
    navegar({ tela: 'planejador', casoId: salvo.caso.id, aba: 'caso' })
  }

  const base = { rota, navegar, casoAtual, aoNovoCaso: novoCaso } as const
  const irParaCasos = { rotulo: 'Meus casos', aoClicar: () => navegar({ tela: 'casos' }) }

  if (rota.tela === 'fontes') {
    return (
      <Estrutura {...base} titulo="Fontes científicas" subtitulo="De onde vem cada número do planejador">
        <TelaFontes />
      </Estrutura>
    )
  }

  if (rota.tela === 'planejador') {
    if (!registro) {
      return (
        <Estrutura {...base} titulo="Caso não encontrado" trilha={[irParaCasos]}>
          <Card className="items-start gap-4">
            <p>Este caso não existe mais neste aparelho. Ele pode ter sido excluído em outra aba.</p>
            <Button variant="lightprimary" onClick={() => navegar({ tela: 'casos' })}>
              <FolderOpen aria-hidden="true" />
              Voltar para Meus casos
            </Button>
          </Card>
        </Estrutura>
      )
    }

    const indice = ETAPAS.findIndex((e) => e.aba === rota.aba)
    const etapa = ETAPAS[indice]
    const proxima = ETAPAS[indice + 1]
    return (
      <Estrutura
        {...base}
        titulo={registro.caso.nome || 'Caso sem nome'}
        subtitulo={etapa ? `Etapa ${etapa.numero} de ${ETAPAS.length}: ${etapa.rotulo}` : undefined}
        trilha={[irParaCasos]}
      >
        <div className="flex flex-col gap-6">
          <EtapasDoCaso abaAtual={rota.aba} aoEscolher={(aba) => navegar({ tela: 'planejador', casoId: rota.casoId, aba })} />

          {rota.aba === 'caso' ? (
            <TelaCaso caso={registro.caso} aoAlterar={alterarCaso} lateral={<ResumoDoDia caso={registro.caso} plano={registro.plano} aoAlterar={alterarCaso} />} />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              {rota.aba === 'plano' ? (
                <TelaPlano plano={registro.plano} aoAlterarPlano={alterarPlano} />
              ) : (
                <TelaAdequacao
                  caso={registro.caso}
                  plano={registro.plano}
                  gastoEnergetico={
                    calcularEnergia(registro.caso, {
                      fator: registro.caso.energia.fator,
                      formula: registro.caso.energia.formula,
                      getManual: registro.caso.energia.getManual,
                    }).get
                  }
                  aoAlterarCaso={alterarCaso}
                  aoAlterarPlano={alterarPlano}
                />
              )}
              <ResumoDoDia caso={registro.caso} plano={registro.plano} aoAlterar={alterarCaso} />
            </div>
          )}

          {proxima ? (
            <div className="flex justify-end">
              <Button onClick={() => navegar({ tela: 'planejador', casoId: rota.casoId, aba: proxima.aba })}>
                Próxima etapa: {proxima.rotulo}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
      </Estrutura>
    )
  }

  return (
    <Estrutura
      {...base}
      titulo="Meus casos"
      subtitulo="Planos alimentares salvos neste aparelho"
      acoes={
        <Button size="sm" className="xl:hidden" onClick={novoCaso}>
          <Plus aria-hidden="true" />
          Novo caso
        </Button>
      }
    >
      <TelaCasos aoAbrir={(id) => navegar({ tela: 'planejador', casoId: id, aba: 'caso' })} aoNovoCaso={novoCaso} />
    </Estrutura>
  )
}

export function App() {
  return (
    <ProvedorCasos>
      <Conteudo />
      <AvisoPrimeiroAcesso />
    </ProvedorCasos>
  )
}
