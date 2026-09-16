import { Barcode, ClipboardList, Plus, TriangleAlert, UserRound } from 'lucide-react'
import { useMemo } from 'react'
import type { ModoPlano } from '@/domain/tipos.ts'
import { EscolherModo } from '../caso/EscolherModo.tsx'
import { formatarAlteracao } from '../casos/formatarAlteracao.ts'
import { Alert } from '../componentes/alert.tsx'
import { Button } from '../componentes/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '../componentes/card.tsx'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientes } from '../estado/contextoPacientes.ts'

interface TelaPainelProps {
  readonly aoNovoPlano: (modo: ModoPlano) => void
  readonly aoAbrirPlano: (casoId: string) => void
  readonly aoIrPara: (tela: 'pacientes' | 'casos' | 'produtos') => void
}

/** Primeira tela do dia: o que precisa de atenção, onde você parou e o que fazer agora. */
export function TelaPainel({ aoNovoPlano, aoAbrirPlano, aoIrPara }: TelaPainelProps) {
  const { casos, avisoArmazenamento } = useCasos()
  const { pacientes } = usePacientes()

  const recentes = useMemo(() => casos.slice(0, 5), [casos])
  const semPaciente = useMemo(() => casos.filter((c) => c.pacienteId === null).length, [casos])
  const semNome = useMemo(() => casos.filter((c) => c.nome.trim() === '').length, [casos])

  const numeros = [
    { rotulo: 'Pacientes', valor: pacientes.length, ir: () => aoIrPara('pacientes' as const) },
    { rotulo: 'Planos', valor: casos.length, ir: () => aoIrPara('casos' as const) },
    { rotulo: 'Sem paciente', valor: semPaciente, ir: () => aoIrPara('casos' as const) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Começar agora</CardTitle>
            <CardDescription>Escolha o caminho conforme o atendimento. Dá para trocar de rápido para completo depois.</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-3">
            <EscolherModo
              aoEscolher={aoNovoPlano}
              gatilho={
                <Button>
                  <Plus aria-hidden="true" />
                  Novo plano
                </Button>
              }
            />
            <Button variant="outline" onClick={() => aoIrPara('pacientes')}>
              <UserRound aria-hidden="true" />
              Pacientes
            </Button>
            <Button variant="outline" onClick={() => aoIrPara('produtos')}>
              <Barcode aria-hidden="true" />
              Cadastrar produto
            </Button>
          </div>
        </Card>

        <Card className="gap-0 p-0">
          <ul className="grid grid-cols-3">
            {numeros.map((n, i) => (
              <li key={n.rotulo} className={i > 0 ? 'border-l border-fio' : ''}>
                <button
                  type="button"
                  onClick={n.ir}
                  className="flex w-full flex-col gap-1 px-4 py-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="rotulo">{n.rotulo}</span>
                  <span className="numeros font-titulo text-2xl font-bold text-heading">{n.valor}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {avisoArmazenamento ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{avisoArmazenamento}</p>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Onde você parou</CardTitle>
            <CardDescription>Os últimos planos abertos neste aparelho.</CardDescription>
          </CardHeader>
          {recentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum plano ainda. Comece pelo botão acima.</p>
          ) : (
            <ul className="flex flex-col" aria-label="Planos recentes">
              {recentes.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-b border-fio py-2 last:border-0">
                  <ClipboardList className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-heading">{c.nome.trim() || 'Plano sem nome'}</p>
                    <p className="text-xs text-muted-foreground">
                      {`${c.modo === 'rapido' ? 'Prescrição rápida' : 'Atendimento completo'} · ${formatarAlteracao(c.atualizadoEm).toLowerCase()}`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => aoAbrirPlano(c.id)}>
                    Abrir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Precisa de atenção</CardTitle>
            <CardDescription>Coisas pequenas que atrapalham depois, na hora de entregar.</CardDescription>
          </CardHeader>
          <ul className="flex flex-col gap-2 text-sm">
            {semNome > 0 ? (
              <li className="flex items-center justify-between gap-3 border-b border-fio pb-2">
                <span>{`${semNome} ${semNome === 1 ? 'plano sem nome' : 'planos sem nome'}`}</span>
                <Button size="sm" variant="ghost" onClick={() => aoIrPara('casos')}>
                  Ver
                </Button>
              </li>
            ) : null}
            {semPaciente > 0 ? (
              <li className="flex items-center justify-between gap-3 border-b border-fio pb-2">
                <span>{`${semPaciente} ${semPaciente === 1 ? 'plano sem paciente vinculado' : 'planos sem paciente vinculado'}`}</span>
                <Button size="sm" variant="ghost" onClick={() => aoIrPara('casos')}>
                  Ver
                </Button>
              </li>
            ) : null}
            {pacientes.length === 0 ? (
              <li className="flex items-center justify-between gap-3 border-b border-fio pb-2">
                <span>Nenhum paciente cadastrado</span>
                <Button size="sm" variant="ghost" onClick={() => aoIrPara('pacientes')}>
                  Cadastrar
                </Button>
              </li>
            ) : null}
            {semNome === 0 && semPaciente === 0 && pacientes.length > 0 ? <li className="text-muted-foreground">Nada pendente por aqui.</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  )
}
