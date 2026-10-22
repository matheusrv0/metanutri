import { LayoutTemplate, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { copiaParaOPlano, RECEITAS_NA_REFEICAO } from '@/domain/receitas.ts'
import {
  adicionarItem,
  adicionarReceita,
  adicionarRefeicao,
  atualizarGramas,
  escolherMedida,
  mudarHorario,
  removerItem,
  removerRefeicao,
  renomearRefeicao,
  type GerarId,
} from '@/domain/plano.ts'
import { tipoDaRefeicao } from '@/domain/sugestoes.ts'
import type { MedidaCaseira } from '@/domain/busca.ts'
import { unidadeDo } from '@/domain/liquido.ts'
import { MEUS_ALIMENTOS_NOVOS, PRIMEIRO_ID_PRODUTO } from '@/domain/produtos.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import type { ModoQuantidade, OpcaoId, Plano } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { DialogoNovaMedida } from '../alimentos/DialogoNovaMedida.tsx'
import { useMedidasProprias } from '../estado/usarMedidasProprias.ts'
import { useMeusAlimentos } from '../estado/usarMeusAlimentos.ts'
import { useSugestoes } from '../estado/usarSugestoes.ts'
import { DialogoModelos } from '../modelos/DialogoModelos.tsx'
import { CartaoRefeicao } from './CartaoRefeicao.tsx'
import { ModoDasQuantidades } from './ModoDasQuantidades.tsx'

interface TelaPlanoProps {
  readonly plano: Plano
  readonly aoAlterarPlano: (novo: Plano) => void
  readonly gerarId?: GerarId
  /** Conteúdo extra no fim de uma opção (calculadora de substitutos). */
  readonly extraDaOpcao?: (refeicaoId: string, opcao: OpcaoId) => ReactNode
  /** A busca da refeição põe receita (spec receitas-com-calculo, D-274a). Padrão: a constante da publicação. */
  readonly receitasNaRefeicao?: boolean
  /** Como o paciente lê as quantidades e a troca do modo (spec alimentos-e-gramaturas, D-376). Sem eles, não aparece. */
  readonly modo?: ModoQuantidade | undefined
  readonly aoMudarModo?: ((modo: ModoQuantidade) => void) | undefined
  /** "+ Nova medida…" na linha do plano (D-387) e na entrada rápida (D-432). */
  readonly aoCriarMedida?: ((alimentoId: number, aoCriar: (medida: MedidaCaseira) => void, nomeInicial?: string) => void) | undefined
}

const idPadrao: GerarId = () => globalThis.crypto.randomUUID()

/** Etapa 2: refeições do dia com entrada rápida de alimentos (CA-12 a CA-21). */
export function TelaPlano({
  plano,
  aoAlterarPlano,
  gerarId = idPadrao,
  extraDaOpcao,
  receitasNaRefeicao = RECEITAS_NA_REFEICAO,
  modo,
  aoMudarModo,
  aoCriarMedida,
}: TelaPlanoProps) {
  const [modelosAbertos, setModelosAbertos] = useState(false)
  const sugestoes = useSugestoes()
  // D-387 (spec alimentos-e-gramaturas): "+ Nova medida…" na linha, gravada como medida própria da conta. O alimento
  // próprio só guarda a medida no cadastro dele com o formulário novo ligado (publicação 2): a versão no ar refaz o item
  // ao editar e apagaria a medida (D-383); até lá, ela mora na chave das medidas da conta (correção A, D-433).
  const medidasProprias = useMedidasProprias()
  const meusAlimentos = useMeusAlimentos()
  const [novaMedida, setNovaMedida] = useState<{ readonly alimentoId: number; readonly aoCriar: (m: MedidaCaseira) => void; readonly nome: string } | null>(null)
  const criarMedida =
    aoCriarMedida ?? ((alimentoId: number, aoCriar: (m: MedidaCaseira) => void, nomeInicial?: string) => setNovaMedida({ alimentoId, aoCriar, nome: nomeInicial ?? '' }))
  const alimentoDaMedida = novaMedida ? (buscarAlimento(novaMedida.alimentoId) ?? null) : null
  const salvarMedida = (m: MedidaCaseira): string | null => {
    if (!novaMedida) return null
    try {
      if (novaMedida.alimentoId >= PRIMEIRO_ID_PRODUTO && MEUS_ALIMENTOS_NOVOS) {
        const proprio = meusAlimentos.lista.find((p) => p.id === novaMedida.alimentoId)
        if (!proprio) return 'Este alimento foi excluído. Escolha outro.'
        meusAlimentos.salvar({ ...proprio, medidas: [...(proprio.medidas ?? []).filter((x) => x.nome !== m.nome), { nome: m.nome, gramas: m.gramas }] })
      } else {
        medidasProprias.salvar({ alimentoId: novaMedida.alimentoId, nome: m.nome, gramas: m.gramas })
      }
      novaMedida.aoCriar({ ...m, propria: true })
      return null
    } catch (erro) {
      return erro instanceof Error ? erro.message : 'Não foi possível salvar a medida. Tente de novo.'
    }
  }
  return (
    <div className="flex flex-col gap-4">
      {/* D-376: a escolha de como o paciente lê fica no topo da etapa, onde as quantidades são montadas. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        {modo && aoMudarModo ? <ModoDasQuantidades modo={modo} aoMudar={aoMudarModo} /> : <span />}
        <Button variant="outline" size="sm" onClick={() => setModelosAbertos(true)}>
          <LayoutTemplate aria-hidden="true" />
          Modelos de plano
        </Button>
      </div>

      {plano.refeicoes.map((refeicao) => {
        const tipo = tipoDaRefeicao(refeicao.nome, refeicao.horario)
        return (
          <CartaoRefeicao
            key={refeicao.id}
            refeicao={refeicao}
            tipo={tipo}
            sugestoes={sugestoes.listas[tipo]}
            aoSalvarSugestoes={(lista) => sugestoes.salvar(tipo, lista)}
            aoRenomear={(nome) => aoAlterarPlano(renomearRefeicao(plano, refeicao.id, nome))}
            aoMudarHorario={(horario) => aoAlterarPlano(mudarHorario(plano, refeicao.id, horario))}
            aoRemover={() => aoAlterarPlano(removerRefeicao(plano, refeicao.id))}
            aoAdicionarItem={(opcao, alimentoId, gramas, medida) => aoAlterarPlano(adicionarItem(plano, refeicao.id, opcao, { alimentoId, gramas, medida }, gerarId))}
            // Spec receitas-com-calculo, D-273: o plano guarda uma cópia da receita. Desligado na publicação 1 (D-274a).
            aoAdicionarReceita={
              receitasNaRefeicao
                ? (opcao, receita, gramas) => aoAlterarPlano(adicionarReceita(plano, refeicao.id, opcao, { receita: copiaParaOPlano(receita), gramas }, gerarId))
                : undefined
            }
            aoMudarGramas={(opcao, itemId, gramas) => aoAlterarPlano(atualizarGramas(plano, refeicao.id, opcao, itemId, gramas))}
            aoRemoverItem={(opcao, itemId) => aoAlterarPlano(removerItem(plano, refeicao.id, opcao, itemId))}
            aoMudarMedida={(opcao, itemId, medida) => aoAlterarPlano(escolherMedida(plano, refeicao.id, opcao, itemId, medida))}
            modo={modo ?? 'medida-caseira'}
            aoCriarMedida={criarMedida}
            {...(extraDaOpcao ? { extraDaOpcao: (opcao: OpcaoId) => extraDaOpcao(refeicao.id, opcao) } : {})}
          />
        )
      })}

      <Button
        variant="lightprimary"
        className="self-start"
        onClick={() => aoAlterarPlano(adicionarRefeicao(plano, { nome: 'Nova refeição', horario: '10:00' }, gerarId))}
      >
        <Plus aria-hidden="true" />
        Adicionar refeição
      </Button>

      <DialogoModelos aberto={modelosAbertos} plano={plano} aoUsar={aoAlterarPlano} aoFechar={() => setModelosAbertos(false)} />
      <DialogoNovaMedida
        alimento={alimentoDaMedida}
        unidade={unidadeDo(alimentoDaMedida ?? undefined)}
        nomeInicial={novaMedida?.nome ?? ''}
        aoSalvar={salvarMedida}
        aoFechar={() => setNovaMedida(null)}
      />
    </div>
  )
}
