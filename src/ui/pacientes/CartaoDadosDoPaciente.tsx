import { idadeNaData, type Paciente } from '@/domain/pacientes.ts'
import { menorDe18, podeGestarOuLactar, type PerfilDaFicha } from '@/domain/regrasDaFicha.ts'
import type { Sexo } from '@/domain/tipos.ts'
import { normalizarTelefone } from '@/domain/whatsapp.ts'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { CampoGestacaoLactacao } from './CampoGestacaoLactacao.tsx'

interface CartaoDadosDoPacienteProps {
  readonly paciente: Paciente
  readonly perfil: PerfilDaFicha
  /** O dia de hoje (AAAA-MM-DD). */
  readonly hoje: string
  readonly aoAlterar: (mudanca: Partial<Paciente>) => void
  /** O WhatsApp sem telefone leva até o campo (spec whatsapp-e-retorno, CA-517). */
  readonly focarTelefone?: boolean | undefined
}

/** CA-516: o telefone preenchido que o WhatsApp não aceita ganha a dica. */
const DICA_TELEFONE = 'Para o WhatsApp, use DDD e número do Brasil.'

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/**
 * Parte 1 da ficha (spec ficha-unica, D-359): quem é a pessoa. Escola e ano e Responsável abaixo de 18 anos; Gestação
 * ou lactação só para o sexo feminino de 14 a 50 anos (R1). Campo fora da regra com dado continua à vista (CB-341).
 */
export function CartaoDadosDoPaciente({ paciente, perfil, hoje, aoAlterar, focarTelefone = false }: CartaoDadosDoPacienteProps) {
  const idade = idadeNaData(paciente.nascimento, hoje)
  const menor = menorDe18(perfil)
  const gestacaoVale = podeGestarOuLactar(perfil)
  const comGestacao = gestacaoVale || (paciente.momentoDeVida !== null && paciente.momentoDeVida.tipo !== 'nenhum')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do paciente</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <CampoTexto rotulo="Nome" valor={paciente.nome} aoMudar={(nome) => aoAlterar({ nome })} placeholder="Maria Silva…" />
        <CampoTexto
          rotulo="Data de nascimento"
          tipo="date"
          valor={paciente.nascimento ?? ''}
          aoMudar={(v) => aoAlterar({ nascimento: v || null })}
          dica={idade ? `${plural(idade.anos, 'ano', 'anos')} e ${plural(idade.meses, 'mês', 'meses')} hoje.` : 'A idade é calculada pela data de nascimento.'}
        />
        <GrupoOpcoes<Sexo>
          rotulo="Sexo"
          opcoes={[
            { valor: 'F', rotulo: 'Feminino' },
            { valor: 'M', rotulo: 'Masculino' },
          ]}
          valor={paciente.sexo}
          aoEscolher={(sexo) => aoAlterar({ sexo })}
        />
        <CampoTexto
          rotulo="Telefone"
          valor={paciente.telefone}
          aoMudar={(telefone) => aoAlterar({ telefone })}
          dica={paciente.telefone.trim() !== '' && normalizarTelefone(paciente.telefone) === null ? DICA_TELEFONE : undefined}
          focar={focarTelefone}
        />
        <CampoTexto rotulo="E-mail" valor={paciente.email} aoMudar={(email) => aoAlterar({ email })} />
        <CampoTexto rotulo={menor ? 'Escola e ano' : 'Ocupação'} valor={paciente.ocupacao} aoMudar={(ocupacao) => aoAlterar({ ocupacao })} />
        <CampoNumero rotulo="Pessoas que moram na casa" valor={paciente.pessoasNaCasa} aoMudar={(v) => aoAlterar({ pessoasNaCasa: v === null ? null : Math.round(v) })} />
        {menor || paciente.responsavel.trim() !== '' ? (
          <CampoTexto rotulo="Responsável" valor={paciente.responsavel} aoMudar={(responsavel) => aoAlterar({ responsavel })} />
        ) : null}
        {comGestacao ? (
          <CampoGestacaoLactacao
            valor={paciente.momentoDeVida}
            hoje={hoje}
            valeParaAPessoa={gestacaoVale}
            aoMudar={(momentoDeVida) => aoAlterar({ momentoDeVida })}
          />
        ) : null}
      </div>
    </Card>
  )
}
