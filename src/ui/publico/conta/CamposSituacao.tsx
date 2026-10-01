import type { DadosSituacao, ErroSituacao, Situacao } from '@/domain/situacao.ts'
import { cn } from '@/lib/utils'
import { CaixaDeclaracao } from './CaixaDeclaracao.tsx'
import { CampoCrn } from './CampoCrn.tsx'

interface CamposSituacaoProps {
  readonly id: string
  readonly valor: DadosSituacao
  readonly aoMudar: (valor: DadosSituacao) => void
  readonly erro: ErroSituacao | null
  /** Veio pelo botão do plano Estudante (CA-267). */
  readonly travarEstudante?: boolean | undefined
}

const OPCOES: readonly { readonly valor: Situacao; readonly titulo: string; readonly detalhe: string }[] = [
  { valor: 'nutricionista', titulo: 'Nutricionista', detalhe: 'Tenho CRN' },
  { valor: 'estudante', titulo: 'Estudante de Nutrição', detalhe: 'Ainda na faculdade' },
]

/** O "Você é" do cadastro, com o CRN ou a declaração de matrícula (protótipo "Criar conta"). */
export function CamposSituacao({ id, valor, aoMudar, erro, travarEstudante = false }: CamposSituacaoProps) {
  const mudar = (parcial: Partial<DadosSituacao>) => aoMudar({ ...valor, ...parcial })

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold leading-none text-heading">Você é</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {OPCOES.map((opcao) => {
            const marcada = valor.situacao === opcao.valor
            const indisponivel = travarEstudante && opcao.valor !== 'estudante'
            return (
              <label
                key={opcao.valor}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg p-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  marcada ? 'border-2 border-primary bg-lightprimary p-[13px]' : 'border border-borderdefault bg-card',
                  indisponivel && 'cursor-not-allowed opacity-45',
                  erro === 'situacao-vazia' && !marcada && 'border-error',
                )}
              >
                <input
                  type="radio"
                  name={`${id}-situacao`}
                  value={opcao.valor}
                  checked={marcada}
                  disabled={indisponivel}
                  onChange={() => mudar({ situacao: opcao.valor })}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--brand-primary)]"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-heading">{opcao.titulo}</span>
                  <span className="text-xs text-muted-foreground">{opcao.detalhe}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {valor.situacao === 'nutricionista' ? (
        <>
          <CampoCrn
            id={id}
            regiao={valor.regiao}
            numero={valor.numero}
            aoMudar={(crn) => mudar(crn)}
            invalido={erro === 'crn-regiao' || erro === 'crn-numero'}
            dica="Vamos conferir seu registro no conselho. Você já pode usar tudo enquanto isso."
          />
          <CaixaDeclaracao id={`${id}-declara-crn`} marcada={valor.declarouCrn} aoMudar={(v) => mudar({ declarouCrn: v })} invalido={erro === 'declaracao-crn'}>
            Declaro que este CRN é meu e está ativo.
          </CaixaDeclaracao>
        </>
      ) : null}

      {valor.situacao === 'estudante' ? (
        <CaixaDeclaracao
          id={`${id}-declara-matricula`}
          marcada={valor.declarouMatricula}
          aoMudar={(v) => mudar({ declarouMatricula: v })}
          invalido={erro === 'declaracao-matricula'}
        >
          Declaro ter matrícula ativa no curso de Nutrição.
        </CaixaDeclaracao>
      ) : null}
    </div>
  )
}
