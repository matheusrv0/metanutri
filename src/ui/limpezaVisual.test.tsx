// Varreduras da spec limpeza-visual: o que vale para várias telas de uma vez.
import { act, render } from '@testing-library/react'
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import { TelaConta } from './conta/TelaConta.tsx'
import { negocioFalso } from './negocio/negocioFalso.test-utils.ts'
import { TelaNegocio } from './negocio/TelaNegocio.tsx'
import { processadorFalso } from './pagamento/processadorFalso.test-utils.ts'
import { contaFalsa } from './publico/conta/contaFalsa.test-utils.ts'
import { SecaoPrecos } from './publico/SecaoPrecos.tsx'
import { TelaCheckout } from './publico/TelaCheckout.tsx'
import { TelaInicio } from './publico/TelaInicio.tsx'
import { TelaTermos } from './publico/TelaTermos.tsx'

const PAGA: Assinatura = {
  ...SEM_ASSINATURA,
  plano: 'solo',
  planoPedido: 'solo',
  status: 'ativa',
  ciclo: 'mensal',
  valorCentavos: 3490,
  cartaoBandeira: 'Mastercard',
  cartaoFinal: '6351',
  proximaCobranca: '2999-11-02T15:00:00.000Z',
}

vi.mock('./estado/usarAssinatura.ts', () => ({
  useAssinatura: () => ({ assinatura: PAGA, recarregar: vi.fn(), cancelar: vi.fn(), trocarCartao: vi.fn() }),
}))

// O NumberFlow de verdade quebra no jsdom ao atualizar; aqui basta o número escrito.
vi.mock('@number-flow/react', () => ({
  default: ({ value, className }: { readonly value: number; readonly className?: string }) => <span className={className}>{value}</span>,
}))

// O TimelineContent da página de preços chama o IntersectionObserver, que o jsdom não tem.
class ObservadorFalso implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin: string = ''
  readonly scrollMargin: string = ''
  readonly thresholds: readonly number[] = []
  disconnect(): void {}
  observe(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve(): void {}
}
vi.stubGlobal('IntersectionObserver', ObservadorFalso)

const contaComSessao = () => contaFalsa({ sessao: { id: 'u1', email: 'ana@exemplo.com', nome: 'Ana' } })

/** As telas que a spec cita, cada uma montada sozinha. */
const TELAS: readonly (readonly [string, () => Promise<void> | void])[] = [
  ['landing', () => void render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)],
  ['Preços', () => void render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)],
  [
    'checkout',
    async () => {
      render(
        <TelaCheckout
          plano="solo"
          ciclo="mensal"
          email="ana@exemplo.com"
          assinaturaAtual={SEM_ASSINATURA}
          disponivel
          criarProcessador={processadorFalso().criar}
          aoTrocar={vi.fn()}
          aoAssinar={vi.fn()}
          aoIrParaPainel={vi.fn()}
          aoIrParaConta={vi.fn()}
          aoIrParaInicio={vi.fn()}
        />,
      )
      // A montagem dos campos seguros termina numa promessa.
      await act(async () => {})
    },
  ],
  [
    'Conta e plano',
    () =>
      void render(
        <TelaConta
          conta={contaComSessao()}
          perfil={null}
          pedido={null}
          meFormei={vi.fn()}
          aoMudouSituacao={vi.fn()}
          corrigirCrn={vi.fn()}
          aoEnviarComprovante={vi.fn()}
          aoEntrar={vi.fn()}
          aoVerPrecos={vi.fn()}
          aoIrParaConfig={vi.fn()}
          aoAssinar={vi.fn()}
          aoMudouAssinatura={vi.fn()}
          criarProcessador={null}
          aoSaiu={vi.fn()}
        />,
      ),
  ],
  ['Termos', () => void render(<TelaTermos />)],
  ['painel do dono', () => void render(<TelaNegocio negocio={negocioFalso()} />)],
]

describe('limpeza visual (spec limpeza-visual)', () => {
  it.each(TELAS)('CA-388: %s não fala em preço de fundador, vagas de fundador nem preço que não sobe', async (_nome, montar) => {
    await montar()
    expect(document.body.textContent).not.toMatch(/fundador|vagas?\b|preço travado|não sobe/i)
  })
})
