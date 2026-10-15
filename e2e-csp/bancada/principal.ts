// A bancada da regra de conteúdo (spec seguranca-lote-4, CA-486). Monta, com o código do site, os campos do cartão do
// Mercado Pago e a verificação contra robôs do Cloudflare de verdade, sob a mesma <meta> do site. O teste
// (e2e-csp/csp-terceiros.spec.ts) lê o andamento nos atributos `data-*` do <body>.
import { estiloDosCampos, lerTokenDoTema } from '@/ui/pagamento/processadorCartao.ts'
import { criarProcessadorMercadoPago } from '@/ui/pagamento/processadorMercadoPago.ts'
import { carregarTurnstile } from '@/ui/publico/conta/turnstile.ts'

/** A chave PÚBLICA de teste do Mercado Pago, a mesma da documentação do repositório. Não cobra nada. */
const CHAVE_DE_TESTE_DO_PAGAMENTO = 'APP_USR-5178310a-e7c1-47e6-867e-d9bb01fc0f5d'
/** A chave de teste do Cloudflare que sempre aprova. */
const CHAVE_DE_TESTE_DA_VERIFICACAO = '1x00000000000000000000AA'

const marcar = (nome: 'campos' | 'bandeira' | 'token' | 'verificacao', valor: string): void => {
  document.body.dataset[nome] = valor
}
const nada = (): void => undefined

const processador = criarProcessadorMercadoPago(CHAVE_DE_TESTE_DO_PAGAMENTO)
processador
  .montar(
    {
      alvos: { numero: 'cartao-numero', validade: 'cartao-validade', codigo: 'cartao-codigo' },
      estilo: estiloDosCampos(lerTokenDoTema),
      placeholders: { numero: '0000 0000 0000 0000', validade: 'MM/AA', codigo: 'CVV' },
      rotulos: { numero: 'Número do cartão', validade: 'Validade', codigo: 'Código de segurança' },
    },
    (evento) => {
      if (evento.tipo === 'cartao') marcar('bandeira', evento.cartao?.bandeira ?? '')
    },
  )
  .then(
    () => marcar('campos', 'prontos'),
    () => marcar('campos', 'falhou'),
  )

document.getElementById('gerar')?.addEventListener('click', () => {
  processador.gerarToken({ nome: 'APRO', cpf: '12345678909' }).then(
    (dados) => marcar('token', `final ${dados.final}`),
    () => marcar('token', 'falhou'),
  )
})

carregarTurnstile().then(
  (api) => {
    const alvo = document.getElementById('verificacao')
    if (!alvo) return
    api.render(alvo, {
      sitekey: CHAVE_DE_TESTE_DA_VERIFICACAO,
      action: 'login',
      appearance: 'interaction-only',
      theme: 'auto',
      language: 'pt-br',
      size: 'flexible',
      'refresh-expired': 'auto',
      'response-field': false,
      callback: () => marcar('verificacao', 'token'),
      'expired-callback': nada,
      'error-callback': (codigo) => marcar('verificacao', `erro ${codigo}`),
      'timeout-callback': () => marcar('verificacao', 'tempo esgotado'),
      'unsupported-callback': () => marcar('verificacao', 'sem suporte'),
      'before-interactive-callback': nada,
      'after-interactive-callback': nada,
    })
  },
  () => marcar('verificacao', 'falhou'),
)
