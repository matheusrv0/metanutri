import { ArrowRight, FolderOpen, Plus } from 'lucide-react'
import { calcularEnergia } from './domain/energia.ts'
import { criarExemplo } from './domain/exemplo.ts'
import { idadeDe, listaDeRestricoes } from './domain/pacientes.ts'
import type { ModoPlano } from './domain/tipos.ts'
import { TelaAdequacao } from './ui/adequacao/TelaAdequacao.tsx'
import { EscolherModo } from './ui/caso/EscolherModo.tsx'
import { TelaCaso } from './ui/caso/TelaCaso.tsx'
import { AvisoPrimeiroAcesso } from './ui/casos/AvisoPrimeiroAcesso.tsx'
import { TelaCasos } from './ui/casos/TelaCasos.tsx'
import { Button } from './ui/componentes/button.tsx'
import { Card } from './ui/componentes/card.tsx'
import { useCasos } from './ui/estado/contextoCasos.ts'
import { ProvedorCasos } from './ui/estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from './ui/estado/ProvedorPacientes.tsx'
import { usePacientes } from './ui/estado/contextoPacientes.ts'
import { useCasoAberto } from './ui/estado/usarCasoAberto.ts'
import { TelaPlano } from './ui/plano/TelaPlano.tsx'
import { TelaPainel } from './ui/painel/TelaPainel.tsx'
import { TelaPaciente } from './ui/pacientes/TelaPaciente.tsx'
import { TelaPacientes } from './ui/pacientes/TelaPacientes.tsx'
import { TelaAjuda } from './ui/ajuda/TelaAjuda.tsx'
import { TelaConta } from './ui/conta/TelaConta.tsx'
import { MolduraPublica, type DestinoPublico } from './ui/publico/MolduraPublica.tsx'
import { SecaoPrecos } from './ui/publico/SecaoPrecos.tsx'
import { TelaEntrar } from './ui/publico/TelaEntrar.tsx'
import { TelaInicio } from './ui/publico/TelaInicio.tsx'
import { useConta } from './ui/estado/usarConta.ts'
import { TelaConfiguracoes } from './ui/config/TelaConfiguracoes.tsx'
import { TelaProdutos } from './ui/produtos/TelaProdutos.tsx'
import { FaixaResumo } from './ui/resumo/FaixaResumo.tsx'
import { ResumoDoDia } from './ui/resumo/ResumoDoDia.tsx'
import { MenuExportar } from './ui/exportar/MenuExportar.tsx'
import { EtapasDoCaso } from './ui/layout/EtapasDoCaso.tsx'
import { Estrutura } from './ui/layout/Estrutura.tsx'
import type { CasoAtual } from './ui/layout/MenuLateral.tsx'
import { ETAPAS } from './ui/navegacao.ts'
import { useRota } from './ui/usarRota.ts'

function Conteudo() {
  const [rota, navegar] = useRota()
  const { casos, repositorio, atualizar } = useCasos()
  const { pacientes } = usePacientes()
  const { registro, alterarCaso, alterarPlano } = useCasoAberto(rota.tela === 'planejador' ? rota.casoId : '')
  const conta = useConta()

  const recente = casos[0]
  const casoAtual: CasoAtual | null = registro
    ? { id: registro.caso.id, nome: registro.caso.nome }
    : recente
      ? { id: recente.id, nome: recente.nome }
      : null

  const novoCaso = (modo: ModoPlano, pacienteId: string | null = null) => {
    const criado = repositorio.criar('')
    const paciente = pacienteId ? pacientes.find((p) => p.id === pacienteId) ?? null : null
    const idade = paciente ? idadeDe(paciente.nascimento) : null
    const salvo = repositorio.salvar({
      caso: {
        ...criado.caso,
        modo,
        pacienteId,
        // O plano já nasce com o que a ficha do paciente sabe.
        nome: paciente?.nome ?? criado.caso.nome,
        sexo: paciente?.sexo ?? criado.caso.sexo,
        idadeAnos: idade?.anos ?? criado.caso.idadeAnos,
        idadeMesesAdicionais: idade?.meses ?? criado.caso.idadeMesesAdicionais,
      },
      plano: criado.plano,
    })
    atualizar()
    navegar({ tela: 'planejador', casoId: salvo.caso.id, aba: 'caso' })
  }

  // Primeiro acesso: um dia inteiro montado, para entender o sistema mexendo nele.
  const verExemplo = () => {
    const salvo = repositorio.salvar(criarExemplo(() => globalThis.crypto.randomUUID(), new Date().toISOString().slice(0, 10)))
    atualizar()
    navegar({ tela: 'planejador', casoId: salvo.caso.id, aba: 'plano' })
  }

  const irPara = (destino: DestinoPublico) => navegar({ tela: destino })

  // Escolher plano ainda não cobra: leva para a conta, que é o passo que existe.
  const escolherPlano = () => navegar({ tela: 'entrar' })

  if (rota.tela === 'inicio') {
    return (
      <MolduraPublica atual="inicio" aoIrPara={irPara} estrelas={55}>
        <TelaInicio aoAbrirSistema={() => navegar({ tela: 'painel' })} aoVerPrecos={() => navegar({ tela: 'precos' })} aoVerExemplo={verExemplo} />
      </MolduraPublica>
    )
  }

  if (rota.tela === 'precos') {
    return (
      <MolduraPublica atual="precos" aoIrPara={irPara} estrelas={30}>
        <SecaoPrecos aoEscolher={escolherPlano} />
      </MolduraPublica>
    )
  }

  if (rota.tela === 'entrar') {
    return (
      <MolduraPublica atual="entrar" aoIrPara={irPara} estrelas={25}>
        <TelaEntrar conta={conta} aoEntrar={() => navegar({ tela: 'painel' })} aoAbrirSistema={() => navegar({ tela: 'painel' })} />
      </MolduraPublica>
    )
  }

  const base = { rota, navegar, casoAtual, aoNovoCaso: novoCaso } as const
  const irParaCasos = { rotulo: 'Planos', aoClicar: () => navegar({ tela: 'casos' }) }

  if (rota.tela === 'painel') {
    return (
      <Estrutura {...base} titulo="Painel" subtitulo="Seu dia no MetaNutri">
        <TelaPainel
          aoNovoPlano={(modo) => novoCaso(modo)}
          aoAbrirPlano={(casoId) => navegar({ tela: 'planejador', casoId, aba: 'caso' })}
          aoIrPara={(tela) => navegar({ tela })}
          aoVerExemplo={verExemplo}
        />
      </Estrutura>
    )
  }

  if (rota.tela === 'pacientes') {
    return (
      <Estrutura {...base} titulo="Pacientes" subtitulo="Quem você atende">
        <TelaPacientes aoAbrir={(id) => navegar({ tela: 'paciente', pacienteId: id })} />
      </Estrutura>
    )
  }

  if (rota.tela === 'paciente') {
    const paciente = pacientes.find((p) => p.id === rota.pacienteId)
    return (
      <Estrutura
        {...base}
        titulo={paciente?.nome.trim() || 'Paciente sem nome'}
        trilha={[{ rotulo: 'Pacientes', aoClicar: () => navegar({ tela: 'pacientes' }) }]}
      >
        <TelaPaciente
          pacienteId={rota.pacienteId}
          aoAbrirPlano={(casoId) => navegar({ tela: 'planejador', casoId, aba: 'caso' })}
          aoNovoPlano={(pacienteId, modo) => novoCaso(modo, pacienteId)}
          aoVoltar={() => navegar({ tela: 'pacientes' })}
        />
      </Estrutura>
    )
  }

  if (rota.tela === 'ajuda') {
    return (
      <Estrutura {...base} titulo="Ajuda" subtitulo="Primeiros passos e fontes">
        <TelaAjuda aoIrPara={(tela) => navegar({ tela })} />
      </Estrutura>
    )
  }

  if (rota.tela === 'conta') {
    return (
      <Estrutura {...base} titulo="Conta e plano" subtitulo="Acesso e assinatura">
        <TelaConta
          conta={conta}
          aoEntrar={() => navegar({ tela: 'entrar' })}
          aoVerPrecos={() => navegar({ tela: 'precos' })}
          aoIrParaConfig={() => navegar({ tela: 'config' })}
        />
      </Estrutura>
    )
  }

  if (rota.tela === 'config') {
    return (
      <Estrutura {...base} titulo="Configurações" subtitulo="Perfil, marca e seus dados">
        <TelaConfiguracoes />
      </Estrutura>
    )
  }

  if (rota.tela === 'produtos') {
    return (
      <Estrutura {...base} titulo="Meus produtos" subtitulo="Cadastrados pelo rótulo">
        <TelaProdutos />
      </Estrutura>
    )
  }

  if (rota.tela === 'planejador') {
    if (!registro) {
      return (
        <Estrutura {...base} titulo="Plano não encontrado" trilha={[irParaCasos]}>
          <Card className="items-start gap-4">
            <p>Este plano não existe mais neste aparelho. Ele pode ter sido excluído em outra aba.</p>
            <Button variant="lightprimary" onClick={() => navegar({ tela: 'casos' })}>
              <FolderOpen aria-hidden="true" />
              Voltar para Planos
            </Button>
          </Card>
        </Estrutura>
      )
    }

    const pacienteDoPlano = registro.caso.pacienteId ? pacientes.find((p) => p.id === registro.caso.pacienteId) ?? null : null
    const restricoesDoPaciente = pacienteDoPlano ? listaDeRestricoes(pacienteDoPlano.restricoes) : []

    const indice = ETAPAS.findIndex((e) => e.aba === rota.aba)
    const etapa = ETAPAS[indice]
    const proxima = ETAPAS[indice + 1]
    return (
      <Estrutura
        {...base}
        titulo={registro.caso.nome || 'Plano sem nome'}
        subtitulo={
          etapa
            ? `${registro.caso.modo === 'rapido' ? 'Prescrição rápida' : 'Atendimento completo'} · Etapa ${etapa.numero} de ${ETAPAS.length}: ${etapa.rotulo}`
            : undefined
        }
        trilha={[irParaCasos]}
        acoes={<MenuExportar caso={registro.caso} plano={registro.plano} />}
      >
        <div className="flex flex-col gap-6">
          <EtapasDoCaso abaAtual={rota.aba} aoEscolher={(aba) => navegar({ tela: 'planejador', casoId: rota.casoId, aba })} />

          {rota.aba === 'caso' ? (
            <TelaCaso
              caso={registro.caso}
              aoAlterar={alterarCaso}
              pacientes={pacientes.map((p) => ({ id: p.id, nome: p.nome }))}
              aoVincularPaciente={(pacienteId) => alterarCaso({ pacienteId })}
              lateral={<ResumoDoDia caso={registro.caso} plano={registro.plano} aoAlterar={alterarCaso} />}
            />
          ) : rota.aba === 'plano' ? (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <TelaPlano plano={registro.plano} aoAlterarPlano={alterarPlano} />
              <ResumoDoDia caso={registro.caso} plano={registro.plano} aoAlterar={alterarCaso} />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <FaixaResumo caso={registro.caso} plano={registro.plano} aoAlterar={alterarCaso} />
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
                restricoes={restricoesDoPaciente}
                aoAlterarCaso={alterarCaso}
                aoAlterarPlano={alterarPlano}
              />
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
      titulo="Planos"
      subtitulo="Salvos neste aparelho"
      acoes={
        <EscolherModo
          aoEscolher={novoCaso}
          gatilho={
            <Button size="sm" className="xl:hidden">
              <Plus aria-hidden="true" />
              Novo plano
            </Button>
          }
        />
      }
    >
      <TelaCasos aoAbrir={(id) => navegar({ tela: 'planejador', casoId: id, aba: 'caso' })} aoNovoCaso={novoCaso} />
    </Estrutura>
  )
}

export function App() {
  return (
    <ProvedorCasos>
      <ProvedorPacientes>
        <Conteudo />
        <AvisoPrimeiroAcesso />
      </ProvedorPacientes>
    </ProvedorCasos>
  )
}
