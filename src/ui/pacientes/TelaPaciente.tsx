import { ClipboardList, Copy, Plus, Trash, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { idadeDe, type Paciente } from '@/domain/pacientes.ts'
import type { ModoPlano, Sexo } from '@/domain/tipos.ts'
import { formatarAlteracao } from '../casos/formatarAlteracao.ts'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { EscolherModo } from '../caso/EscolherModo.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientes } from '../estado/contextoPacientes.ts'
import { EvolucaoPeso, type PontoEvolucao } from './EvolucaoPeso.tsx'

interface TelaPacienteProps {
  readonly pacienteId: string
  readonly aoAbrirPlano: (casoId: string) => void
  readonly aoNovoPlano: (pacienteId: string, modo: ModoPlano) => void
  readonly aoVoltar: () => void
}

/** Ficha do paciente: dados, restrições, histórico de planos e evolução do peso. */
export function TelaPaciente({ pacienteId, aoAbrirPlano, aoNovoPlano, aoVoltar }: TelaPacienteProps) {
  const { repositorio, atualizar } = usePacientes()
  const { casos, repositorio: repoCasos, atualizar: atualizarCasos } = useCasos()
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  const paciente = repositorio.obter(pacienteId)

  const planos = useMemo(() => casos.filter((c) => c.pacienteId === pacienteId), [casos, pacienteId])

  const evolucao = useMemo<readonly PontoEvolucao[]>(() => {
    return planos
      .map((resumo) => {
        const registro = repoCasos.obter(resumo.id)
        const peso = registro?.caso.pesoKg ?? null
        const data = registro?.caso.dataConsulta ?? resumo.atualizadoEm.slice(0, 10)
        return peso === null ? null : { data, pesoKg: peso }
      })
      .filter((p): p is PontoEvolucao => p !== null)
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [planos, repoCasos])

  if (!paciente) {
    return (
      <Card className="items-start gap-4">
        <p>Este paciente não existe mais neste aparelho.</p>
        <Button variant="lightprimary" onClick={aoVoltar}>
          Voltar para Pacientes
        </Button>
      </Card>
    )
  }

  /** O retorno começa do plano anterior: copia tudo, troca a data e abre a cópia. */
  const duplicar = (casoId: string) => {
    const copia = repoCasos.duplicar(casoId)
    atualizarCasos()
    aoAbrirPlano(copia.caso.id)
  }

  const alterar = (mudanca: Partial<Paciente>) => {
    repositorio.salvar({ ...paciente, ...mudanca })
    atualizar()
  }

  const idade = idadeDe(paciente.nascimento)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>{idade ? `${idade.anos} anos e ${idade.meses} meses hoje.` : 'A idade é calculada pela data de nascimento.'}</CardDescription>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto rotulo="Nome" valor={paciente.nome} aoMudar={(v) => alterar({ nome: v })} placeholder="Maria Silva…" />
            <CampoTexto rotulo="Data de nascimento" tipo="date" valor={paciente.nascimento ?? ''} aoMudar={(v) => alterar({ nascimento: v || null })} />
            <GrupoOpcoes<Sexo>
              rotulo="Sexo"
              opcoes={[
                { valor: 'F', rotulo: 'Feminino' },
                { valor: 'M', rotulo: 'Masculino' },
              ]}
              valor={paciente.sexo}
              aoEscolher={(sexo) => alterar({ sexo })}
            />
            <CampoTexto rotulo="Objetivo" valor={paciente.objetivo} aoMudar={(v) => alterar({ objetivo: v })} placeholder="Emagrecimento, ganho de massa…" />
            <CampoTexto rotulo="Telefone" valor={paciente.telefone} aoMudar={(v) => alterar({ telefone: v })} />
            <CampoTexto rotulo="E-mail" valor={paciente.email} aoMudar={(v) => alterar({ email: v })} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restrições e saúde</CardTitle>
            <CardDescription>Uma por linha. O que estiver aqui some das sugestões de alimento.</CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restricoes">Não come ou não pode comer</Label>
            <Textarea
              id="restricoes"
              rows={3}
              value={paciente.restricoes}
              onChange={(e) => alterar({ restricoes: e.target.value })}
              placeholder={'leite\nlactose\ncamarão'}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="condicoes">Condições clínicas</Label>
              <Textarea id="condicoes" rows={3} value={paciente.condicoesClinicas} onChange={(e) => alterar({ condicoesClinicas: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="medicamentos">Medicamentos</Label>
              <Textarea id="medicamentos" rows={3} value={paciente.medicamentos} onChange={(e) => alterar({ medicamentos: e.target.value })} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anamnese</CardTitle>
            <CardDescription>Rotina, horários, preferências e aversões. É o que faz o plano colar na vida da pessoa.</CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="anamnese">Anotações</Label>
            <Textarea id="anamnese" rows={5} value={paciente.anamnese} onChange={(e) => alterar({ anamnese: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obs-paciente">Observações</Label>
            <Textarea id="obs-paciente" rows={3} value={paciente.observacoes} onChange={(e) => alterar({ observacoes: e.target.value })} />
          </div>
        </Card>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Apagar paciente</CardTitle>
            <CardDescription>Os planos continuam salvos, mas perdem o vínculo com esta ficha.</CardDescription>
          </CardHeader>
          {confirmandoExclusao ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  repositorio.excluir(paciente.id)
                  atualizar()
                  aoVoltar()
                }}
              >
                <Trash aria-hidden="true" />
                Apagar mesmo assim
              </Button>
              <Button variant="ghost" onClick={() => setConfirmandoExclusao(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="self-start" onClick={() => setConfirmandoExclusao(true)}>
              <Trash aria-hidden="true" />
              Apagar paciente
            </Button>
          )}
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card className="gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" aria-hidden="true" />
              <CardTitle>Histórico de planos</CardTitle>
            </div>
            <EscolherModo
              aoEscolher={(modo) => aoNovoPlano(paciente.id, modo)}
              gatilho={
                <Button size="sm" variant="lightprimary">
                  <Plus aria-hidden="true" />
                  Novo plano
                </Button>
              }
            />
          </div>
          {planos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum plano para este paciente ainda.</p>
          ) : (
            <ul className="flex flex-col" aria-label="Planos do paciente">
              {planos.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-heading">{p.nome.trim() || 'Plano sem nome'}</p>
                    <p className="text-xs text-muted-foreground">
                      {`${p.modo === 'rapido' ? 'Prescrição rápida' : 'Atendimento completo'} · ${formatarAlteracao(p.atualizadoEm).toLowerCase()}`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => duplicar(p.id)} title="Começar o retorno a partir deste plano">
                    <Copy aria-hidden="true" />
                    <span className="sr-only">{`Duplicar ${p.nome.trim() || 'plano sem nome'}`}</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => aoAbrirPlano(p.id)}>
                    Abrir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4">
          <div className="flex items-center gap-2">
            <UserRound className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>Evolução do peso</CardTitle>
          </div>
          <EvolucaoPeso pontos={evolucao} />
        </Card>

        {paciente.restricoes.trim() ? (
          <Alert variant="info">
            <UserRound aria-hidden="true" />
            <p>As restrições desta ficha já filtram as sugestões do cobrir nos planos deste paciente.</p>
          </Alert>
        ) : null}
      </div>
    </div>
  )
}
