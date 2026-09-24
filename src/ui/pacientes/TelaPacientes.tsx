import { Plus, UserRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { idadeDe } from '@/domain/pacientes.ts'
import { formatarAlteracao } from '../casos/formatarAlteracao.ts'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientes } from '../estado/contextoPacientes.ts'

interface TelaPacientesProps {
  readonly aoAbrir: (id: string) => void
}

/** Lista de pacientes: quem é atendido, com quantos planos cada um tem. */
export function TelaPacientes({ aoAbrir }: TelaPacientesProps) {
  const { pacientes, repositorio } = usePacientes()
  const { casos } = useCasos()
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return pacientes
      .filter((p) => (termo === '' ? true : p.nome.toLowerCase().includes(termo)))
      .map((p) => {
        const planos = casos.filter((c) => c.pacienteId === p.id)
        const ultimo = planos.map((c) => c.atualizadoEm).sort((a, b) => b.localeCompare(a))[0] ?? null
        return { paciente: p, planos: planos.length, ultimo }
      })
  }, [pacientes, casos, busca])

  const criar = () => aoAbrir(repositorio.criar('').id)

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Pacientes</CardTitle>
          <CardDescription>Cada pessoa guarda restrições, condições clínicas e o histórico de planos que você montou.</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <CampoTexto rotulo="Buscar paciente" valor={busca} aoMudar={setBusca} placeholder="Nome…" />
          </div>
          <Button onClick={criar}>
            <Plus aria-hidden="true" />
            Novo paciente
          </Button>
        </div>
      </Card>

      {lista.length === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <span className="flex size-11 items-center justify-center rounded-full border border-primary/25 bg-lightprimary text-primary">
            <UserRound className="size-6" aria-hidden="true" />
          </span>
          <h2 className="card-title">{busca.trim() ? 'Ninguém com esse nome' : 'Nenhum paciente ainda'}</h2>
          <p className="max-w-[52ch] text-sm text-muted-foreground">
            Cadastre a pessoa uma vez. Os planos seguintes reaproveitam restrições, condições e o histórico.
          </p>
          <Button onClick={criar}>
            <Plus aria-hidden="true" />
            Cadastrar paciente
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3" aria-label="Pacientes">
          {lista.map(({ paciente, planos, ultimo }) => {
            const idade = idadeDe(paciente.nascimento)
            const nome = paciente.nome.trim() || 'Paciente sem nome'
            return (
              <li key={paciente.id}>
                <Card className="gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-lightprimary text-primary">
                      <UserRound className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="card-title truncate text-base">{nome}</h2>
                      <p className="text-xs text-muted-foreground">
                        {[idade ? `${idade.anos} anos` : null, paciente.objetivo.trim() || null].filter(Boolean).join(' · ') || 'Sem dados ainda'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {planos === 0 ? 'Nenhum plano ainda' : `${planos} ${planos === 1 ? 'plano' : 'planos'}`}
                    {ultimo ? ` · ${formatarAlteracao(ultimo).toLowerCase()}` : ''}
                  </p>
                  <Button variant="lightprimary" className="w-full" onClick={() => aoAbrir(paciente.id)} aria-label={`Abrir ${nome}`}>
                    Abrir ficha
                  </Button>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
