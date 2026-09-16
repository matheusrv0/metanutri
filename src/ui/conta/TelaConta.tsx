import { BadgeCheck, CloudOff, LogIn, LogOut, Sparkles, UserRound } from 'lucide-react'
import { useState } from 'react'
import { planoPorId, PLANOS } from '@/domain/conta.ts'
import { Alert } from '../componentes/alert.tsx'
import { Button } from '../componentes/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '../componentes/card.tsx'
import type { ValorConta } from '../estado/usarConta.ts'

interface TelaContaProps {
  readonly conta: ValorConta
  readonly aoEntrar: () => void
  readonly aoVerPrecos: () => void
  readonly aoIrParaConfig: () => void
}

/** Estado da conta: quem está conectado, qual plano e o que fazer sem conta. */
export function TelaConta({ conta, aoEntrar, aoVerPrecos, aoIrParaConfig }: TelaContaProps) {
  const [saindo, setSaindo] = useState(false)
  const plano = conta.sessao ? planoPorId(conta.sessao.plano) : null

  const sair = async () => {
    setSaindo(true)
    await conta.sair()
    setSaindo(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Sua conta</CardTitle>
          <CardDescription>
            {conta.sessao ? 'Conectado. Seus dados podem ser levados para outro aparelho.' : 'O MetaNutri funciona sem conta. Ela serve para usar em mais de um aparelho.'}
          </CardDescription>
        </CardHeader>

        {conta.carregando ? (
          <p className="text-sm text-muted-foreground">Conferindo a sessão…</p>
        ) : conta.sessao ? (
          <div className="flex flex-wrap items-center gap-4">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-content-center rounded-md border border-fioforte bg-lightprimary text-primary">
              <UserRound className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-titulo text-lg font-semibold text-heading">{conta.sessao.nome}</p>
              <p className="truncate text-sm text-muted-foreground">{conta.sessao.email}</p>
            </div>
            <Button variant="outline" onClick={() => void sair()} disabled={saindo}>
              <LogOut aria-hidden="true" />
              {saindo ? 'Saindo…' : 'Sair'}
            </Button>
          </div>
        ) : conta.disponivel ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">Você está usando o modo local: tudo salvo neste navegador.</p>
            <Button onClick={aoEntrar}>
              <LogIn aria-hidden="true" />
              Entrar ou criar conta
            </Button>
          </div>
        ) : (
          <Alert variant="info">
            <CloudOff aria-hidden="true" />
            <div>
              <p className="font-medium">A conta na nuvem ainda não foi ligada neste projeto.</p>
              <p className="mt-1 text-sm">
                Falta criar o projeto no Supabase e preencher as duas chaves em <code className="rounded-xs bg-muted px-1">.env.local</code>. O passo a passo está no
                README. Enquanto isso, o backup em Configurações leva tudo para outro aparelho.
              </p>
              <Button variant="lightprimary" size="sm" className="mt-3" onClick={aoIrParaConfig}>
                Ir para o backup
              </Button>
            </div>
          </Alert>
        )}
      </Card>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Seu plano</CardTitle>
          <CardDescription>Nenhuma cobrança está ativa. Os planos pagos entram quando a conta na nuvem estiver no ar.</CardDescription>
        </CardHeader>

        <div className="flex flex-wrap items-center gap-3 border border-fio p-4">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-content-center rounded-md border border-primary/40 bg-lightprimary text-primary">
            <BadgeCheck className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-heading">{plano?.nome ?? 'Estudante'}</p>
            <p className="text-sm text-muted-foreground">{plano?.resumo ?? PLANOS[0]?.resumo}</p>
          </div>
          <span className="numeros font-titulo text-xl font-bold text-heading">{(plano?.mensal ?? 0) === 0 ? 'Grátis' : `R$ ${plano?.mensal}/mês`}</span>
        </div>

        <Button variant="outline" className="self-start" onClick={aoVerPrecos}>
          <Sparkles aria-hidden="true" />
          Ver os planos
        </Button>
      </Card>
    </div>
  )
}
