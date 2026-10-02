import { useMemo } from 'react'
import { assinaturasPorPlano, funilDe30Dias, receitaPorMes, resumirNegocio, situacoesDeAssinatura } from '@/domain/negocio.ts'
import type { ValorNegocio } from '../estado/usarNegocio.ts'
import { AssinaturasPorPlano } from './AssinaturasPorPlano.tsx'
import { ListaDeContas } from './ListaDeContas.tsx'
import { NumerosDoNegocio } from './NumerosDoNegocio.tsx'
import { QuemChegou } from './QuemChegou.tsx'
import { ReceitaPorMes } from './ReceitaPorMes.tsx'

export const URL_MERCADO_PAGO = 'https://www.mercadopago.com.br/activities'

/** Negócio: só para administrador (spec painel-do-dono; protótipo "Painel do dono MetaNutri"). */
export function TelaNegocio({ negocio }: { readonly negocio: ValorNegocio }) {
  const { dados, erro } = negocio

  // "Agora" é a hora da leitura: os 30 dias e o mês atual batem com os números lidos.
  const calculado = useMemo(() => {
    if (!dados) return null
    const resumo = resumirNegocio(dados.contas, dados.historico, dados.lidoEm)
    return {
      resumo,
      barras: receitaPorMes(dados.historico, resumo.receitaCentavos, dados.lidoEm),
      linhas: assinaturasPorPlano(dados.contas),
      situacoes: situacoesDeAssinatura(dados.contas, dados.lidoEm),
      funil: funilDe30Dias(dados.contas, dados.lidoEm),
    }
  }, [dados])

  return (
    <div className="flex flex-col gap-5">
      {erro ? (
        <p role="alert" className="rounded-xl bg-lighterror p-3 text-sm text-errortext">
          {erro}
        </p>
      ) : null}
      {!dados && !erro ? (
        <p role="status" className="text-sm text-muted-foreground">
          Lendo os números…
        </p>
      ) : null}
      {dados && calculado ? (
        <>
          <NumerosDoNegocio resumo={calculado.resumo} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <ReceitaPorMes barras={calculado.barras} />
            <AssinaturasPorPlano linhas={calculado.linhas} situacoes={calculado.situacoes} />
          </div>
          <QuemChegou funil={calculado.funil} uso={dados.uso} />
          <ListaDeContas contas={dados.contas} agora={dados.lidoEm} />
        </>
      ) : null}
      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-1 text-sm text-muted-foreground">
        <span>Planos e pacientes ficam no aparelho de cada nutricionista e não aparecem aqui.</span>
        <span>
          Taxas, estornos e repasses:{' '}
          <a
            href={URL_MERCADO_PAGO}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-heading underline-offset-4 hover:underline"
          >
            Abrir o Mercado Pago
          </a>
        </span>
      </footer>
    </div>
  )
}
