import { LayoutTemplate, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  adicionarItem,
  adicionarRefeicao,
  atualizarGramas,
  mudarHorario,
  removerItem,
  removerRefeicao,
  renomearRefeicao,
  type GerarId,
} from '@/domain/plano.ts'
import type { OpcaoId, Plano } from '@/domain/tipos.ts'
import { Button } from '../componentes/button.tsx'
import { DialogoModelos } from '../modelos/DialogoModelos.tsx'
import { CartaoRefeicao } from './CartaoRefeicao.tsx'

interface TelaPlanoProps {
  readonly plano: Plano
  readonly aoAlterarPlano: (novo: Plano) => void
  readonly gerarId?: GerarId
  /** Conteúdo extra no fim de uma opção (calculadora de substitutos). */
  readonly extraDaOpcao?: (refeicaoId: string, opcao: OpcaoId) => ReactNode
}

const idPadrao: GerarId = () => globalThis.crypto.randomUUID()

/** Etapa 2: refeições do dia com entrada rápida de alimentos (CA-12 a CA-21). */
export function TelaPlano({ plano, aoAlterarPlano, gerarId = idPadrao, extraDaOpcao }: TelaPlanoProps) {
  const [modelosAbertos, setModelosAbertos] = useState(false)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setModelosAbertos(true)}>
          <LayoutTemplate aria-hidden="true" />
          Modelos de plano
        </Button>
      </div>

      {plano.refeicoes.map((refeicao) => (
        <CartaoRefeicao
          key={refeicao.id}
          refeicao={refeicao}
          aoRenomear={(nome) => aoAlterarPlano(renomearRefeicao(plano, refeicao.id, nome))}
          aoMudarHorario={(horario) => aoAlterarPlano(mudarHorario(plano, refeicao.id, horario))}
          aoRemover={() => aoAlterarPlano(removerRefeicao(plano, refeicao.id))}
          aoAdicionarItem={(opcao, alimentoId, gramas) => aoAlterarPlano(adicionarItem(plano, refeicao.id, opcao, { alimentoId, gramas }, gerarId))}
          aoMudarGramas={(opcao, itemId, gramas) => aoAlterarPlano(atualizarGramas(plano, refeicao.id, opcao, itemId, gramas))}
          aoRemoverItem={(opcao, itemId) => aoAlterarPlano(removerItem(plano, refeicao.id, opcao, itemId))}
          {...(extraDaOpcao ? { extraDaOpcao: (opcao: OpcaoId) => extraDaOpcao(refeicao.id, opcao) } : {})}
        />
      ))}

      <Button
        variant="lightprimary"
        className="self-start"
        onClick={() => aoAlterarPlano(adicionarRefeicao(plano, { nome: 'Nova refeição', horario: '10:00' }, gerarId))}
      >
        <Plus aria-hidden="true" />
        Adicionar refeição
      </Button>

      <DialogoModelos aberto={modelosAbertos} plano={plano} aoUsar={aoAlterarPlano} aoFechar={() => setModelosAbertos(false)} />
    </div>
  )
}
