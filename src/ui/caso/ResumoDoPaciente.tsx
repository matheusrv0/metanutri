import { ExternalLink, TriangleAlert } from 'lucide-react'
import type { PlanoComFicha } from '@/domain/fichaNoPlano.ts'
import { textoDasDoencas } from '@/domain/doencas.ts'
import { momentoDaCondicao } from '@/domain/momentoDeVida.ts'
import { idadeNaData, type Paciente } from '@/domain/pacientes.ts'
import { RESTRICOES, listaDeTexto } from '@/domain/restricoes.ts'
import type { CondicaoFisiologica, Sexo } from '@/domain/tipos.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'

interface ResumoDoPacienteProps {
  readonly paciente: Paciente
  readonly comFicha: PlanoComFicha
  /** Grava na ficha (D-340): o que falta se preenche aqui e vai para lá. */
  readonly aoAlterarPaciente: (mudanca: Partial<Paciente>) => void
  /** Tira a condição gravada no plano antigo (D-344, "Usar a da ficha"). */
  readonly aoUsarDaFicha: () => void
  readonly aoAbrirFicha?: (() => void) | undefined
  /** Erros do caso que vêm da ficha (gestação para o sexo masculino, idade fora da faixa). */
  readonly erros: readonly string[]
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const SEXO: Readonly<Record<Sexo, string>> = { F: 'Feminino', M: 'Masculino' }

function textoDaCondicao(c: CondicaoFisiologica): string | null {
  if (c.tipo === 'gestante') return c.semanasGestacao === null ? 'Gestante' : `Gestante, ${plural(c.semanasGestacao, 'semana', 'semanas')}`
  if (c.tipo === 'lactante') return c.mesesPosParto === null ? 'Lactante' : `Lactante, ${plural(c.mesesPosParto, 'mês', 'meses')} após o parto`
  return null
}

/**
 * O paciente do plano, só de leitura (spec ficha-unica, D-345 e CA-1066): nome, idade na data da consulta, sexo,
 * gestação ou lactação, restrições e doenças, com "Abrir a ficha". O que falta na ficha se preenche aqui (CA-1032), e
 * o plano antigo com outra condição pede a escolha (D-344).
 */
export function ResumoDoPaciente({ paciente, comFicha, aoAlterarPaciente, aoUsarDaFicha, aoAbrirFicha, erros }: ResumoDoPacienteProps) {
  const { caso, dia, faltaNaFicha, condicaoDivergente, avisos } = comFicha
  const idade = idadeNaData(paciente.nascimento, dia)
  const restricoes = [
    ...RESTRICOES.filter((r) => paciente.restricoesMarcadas.includes(r.id)).map((r) => r.rotulo.toLowerCase()),
    ...listaDeTexto(paciente.restricoes),
  ]
  const doencas = textoDasDoencas(paciente)
  const daFicha = condicaoDivergente ? textoDaCondicao(condicaoDivergente.daFicha) : null
  const linhas = [
    [idade ? `${plural(idade.anos, 'ano', 'anos')} e ${plural(idade.meses, 'mês', 'meses')}` : null, paciente.sexo ? SEXO[paciente.sexo] : null, textoDaCondicao(caso.condicao)]
      .filter(Boolean)
      .join(' · '),
    restricoes.length > 0 ? `Restrições: ${restricoes.join(', ')}` : null,
    doencas ? `Doenças: ${doencas.charAt(0).toLowerCase()}${doencas.slice(1).replace(/\.$/, '')}` : null,
  ].filter((l): l is string => l !== null && l !== '')

  return (
    <div className="flex flex-col gap-4 sm:col-span-2">
      <div className="flex flex-col gap-1 rounded-lg bg-surfacerow px-4 py-3">
        <p className="text-sm font-semibold text-heading">{paciente.nome.trim() || 'Paciente sem nome'}</p>
        {linhas.map((linha) => (
          <p key={linha} className="text-sm text-foreground">
            {linha}
          </p>
        ))}
        {aoAbrirFicha ? (
          <Button variant="link" size="sm" className="h-auto min-h-11 self-start px-0 sm:min-h-8" onClick={aoAbrirFicha}>
            <ExternalLink aria-hidden="true" />
            Abrir a ficha
          </Button>
        ) : null}
      </div>

      {faltaNaFicha.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          {faltaNaFicha.includes('sexo') ? (
            <GrupoOpcoes<Sexo>
              rotulo="Sexo"
              opcoes={[
                { valor: 'F', rotulo: 'Feminino' },
                { valor: 'M', rotulo: 'Masculino' },
              ]}
              valor={null}
              aoEscolher={(sexo) => aoAlterarPaciente({ sexo })}
            />
          ) : null}
          {faltaNaFicha.includes('nascimento') ? (
            <CampoTexto
              rotulo="Data de nascimento"
              tipo="date"
              valor={paciente.nascimento ?? ''}
              aoMudar={(v) => aoAlterarPaciente({ nascimento: v || null })}
              dica="Fica salva na ficha do paciente."
            />
          ) : null}
          <p className="text-xs text-muted-foreground sm:col-span-2">A ficha ainda não tem esse dado: até lá, este plano usa o que ele já tinha.</p>
        </div>
      ) : null}

      {condicaoDivergente ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <p>
              {`Este plano gravou “${textoDaCondicao(condicaoDivergente.doPlano) ?? ''}”, e a ficha ${daFicha ? `diz “${daFicha}”` : 'não marca gestação nem lactação'}. Até você escolher, vale o que o plano gravou.`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  aoAlterarPaciente({ momentoDeVida: momentoDaCondicao(condicaoDivergente.doPlano, dia) })
                  aoUsarDaFicha()
                }}
              >
                Levar para a ficha
              </Button>
              <Button size="sm" variant="ghost" onClick={aoUsarDaFicha}>
                Usar a da ficha
              </Button>
            </div>
          </div>
        </Alert>
      ) : null}

      {[...avisos, ...erros].map((aviso) => (
        <Alert key={aviso} variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{aviso}</p>
        </Alert>
      ))}
    </div>
  )
}
