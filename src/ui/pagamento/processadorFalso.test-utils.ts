// Processador de mentira para os testes das telas do cartão (spec checkout-proprio).
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import { act } from '@testing-library/react'
import type { CampoSeguro, DadosDoCartao } from '@/domain/cartao.ts'
import type { CriarProcessador, EventoDosCampos, MontagemDosCampos, ProcessadorCartao } from './processadorCartao.ts'

export const CARTAO_APROVADO: DadosDoCartao = { token: 'tok_teste_1', bandeira: 'Mastercard', final: '6351' }

export interface ProcessadorFalso {
  /** Sempre o mesmo objeto, como o do site: passe para `criarProcessador`. */
  readonly criar: CriarProcessador
  criados: number
  desmontados: number
  montagem: MontagemDosCampos | null
  /** Faz a montagem falhar (CB-88). */
  falharAoMontar: boolean
  /** O que o gerador do código devolve; troque para simular erro. */
  respostaDoToken: () => Promise<DadosDoCartao>
  readonly tokens: { readonly nome: string; readonly cpf: string }[]
  readonly focos: CampoSeguro[]
  limpezas: number
  /** Dispara um evento dos campos seguros, dentro do act. */
  emitir(evento: EventoDosCampos): void
  /** Os três campos válidos e um Mastercard de crédito. */
  preencher(): void
}

export function processadorFalso(): ProcessadorFalso {
  let avisar: (evento: EventoDosCampos) => void = () => undefined
  const falso: ProcessadorFalso = {
    criados: 0,
    desmontados: 0,
    montagem: null,
    falharAoMontar: false,
    respostaDoToken: async () => CARTAO_APROVADO,
    tokens: [],
    focos: [],
    limpezas: 0,
    emitir(evento) {
      act(() => avisar(evento))
    },
    preencher() {
      for (const campo of ['numero', 'validade', 'codigo'] as const) falso.emitir({ tipo: 'validade', campo, valido: true })
      falso.emitir({ tipo: 'cartao', cartao: { bandeira: 'Mastercard', tipo: 'credit_card', bin: '50314332' } })
    },
    criar: () => {
      falso.criados += 1
      const processador: ProcessadorCartao = {
        async montar(montagem, aoEvento) {
          falso.montagem = montagem
          avisar = aoEvento
          if (falso.falharAoMontar) throw new Error('campos bloqueados')
        },
        async gerarToken(titular) {
          falso.tokens.push(titular)
          return falso.respostaDoToken()
        },
        limparCodigo() {
          falso.limpezas += 1
        },
        focar(campo) {
          falso.focos.push(campo)
        },
        desmontar() {
          falso.desmontados += 1
        },
      }
      return processador
    },
  }
  return falso
}
