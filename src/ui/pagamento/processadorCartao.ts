// O formulário do cartão fala com a operadora de pagamento por esta interface, e só por
// ela (spec checkout-proprio). A implementação de verdade é processadorMercadoPago.ts; os
// testes das telas usam a de mentira (processadorFalso.test-utils.ts). O nome da operadora
// não aparece na tela (D-71).
import type { CampoSeguro, DadosDoCartao } from '@/domain/cartao.ts'

/** O `style` dos campos seguros: o iframe não enxerga o CSS da página, então vai em valores. */
export type EstiloDosCampos = Readonly<Record<string, string>>

export interface MontagemDosCampos {
  /** O id do elemento onde cada campo seguro entra. */
  readonly alvos: Readonly<Record<CampoSeguro, string>>
  readonly estilo: EstiloDosCampos
  readonly placeholders: Readonly<Record<CampoSeguro, string>>
  /** O nome de cada campo para o leitor de tela, dentro do iframe. */
  readonly rotulos: Readonly<Record<CampoSeguro, string>>
}

/** O que a operadora reconheceu pelos primeiros números do cartão. */
export interface InfoDoCartao {
  readonly bandeira: string
  /** `credit_card`, `debit_card`, `prepaid_card`… `null` quando a operadora não disse. */
  readonly tipo: string | null
  /** Os primeiros números (até 8), para o cartão desenhado. */
  readonly bin: string
}

export type EventoDosCampos =
  | { readonly tipo: 'validade'; readonly campo: CampoSeguro; readonly valido: boolean }
  | { readonly tipo: 'cartao'; readonly cartao: InfoDoCartao | null }

/** O gerador do código do cartão recusou. `codigos` são os da operadora, quando ela diz. */
export class ErroDoCartao extends Error {
  readonly codigos: readonly string[]

  constructor(codigos: readonly string[]) {
    super('A operadora não gerou o código do cartão.')
    this.name = 'ErroDoCartao'
    this.codigos = codigos
  }
}

export interface ProcessadorCartao {
  /** Põe os três campos seguros nos alvos. Rejeita se o script ou os campos não abrirem (CB-88). */
  montar(montagem: MontagemDosCampos, aoEvento: (evento: EventoDosCampos) => void): Promise<void>
  /** Troca o cartão pelo código de uso único; um novo a cada chamada (CB-90). Rejeita com ErroDoCartao. */
  gerarToken(titular: { readonly nome: string; readonly cpf: string }): Promise<DadosDoCartao>
  /** CA-373: apaga o código de segurança, recriando o campo. */
  limparCodigo(): void
  /** CA-370: o foco vai para dentro do campo seguro. */
  focar(campo: CampoSeguro): void
  desmontar(): void
}

export type CriarProcessador = () => ProcessadorCartao

export type ResultadoDoCartao = { readonly ok: true; readonly dados: DadosDoCartao } | { readonly ok: false; readonly erro: string }

/** O que o `ref` do FormularioCartao oferece a quem o usa (checkout e Trocar cartão). */
export interface ControleDoCartao {
  /** CA-370: mostra os erros embaixo de cada campo e põe o foco no primeiro. Diz se está tudo certo. */
  conferir(): boolean
  /**
   * Troca o cartão pelo código de uso único (CB-90: um novo a cada envio). Quem chama não
   * pode sobrepor chamadas: cada uma gera um código novo, e o clique duplo é barrado por
   * quem usa o formulário.
   */
  gerar(): Promise<ResultadoDoCartao>
  /** CA-373: depois de uma recusa, apaga o código de segurança. */
  limparCodigo(): void
}

/**
 * R-34 e D-87: a letra do site dentro dos campos seguros. A Manrope vem do `customFonts`. Se ela não
 * carregar, vale a do sistema (a mesma lista da `--font-corpo`), nunca a serifada do navegador.
 */
export const FONTE_DOS_CAMPOS = "Manrope, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
export const URL_DA_FONTE = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&display=swap'

/**
 * CA-368: a cor do texto, a do placeholder e o tamanho da letra dos campos seguros, lidos
 * dos tokens do tema aplicado. A caixa em volta (altura, canto, fundo, foco) é nossa.
 * Token que não resolveu fica de fora, em vez de ir vazio para o iframe.
 */
export function estiloDosCampos(ler: (token: string) => string): EstiloDosCampos {
  const valores: Record<string, string> = {
    color: ler('--text-strong'),
    placeholderColor: ler('--text-subtle'),
    fontSize: ler('--fonte-md'),
    fontFamily: FONTE_DOS_CAMPOS,
    height: '100%',
    padding: '0',
  }
  return Object.fromEntries(Object.entries(valores).filter(([, valor]) => valor !== ''))
}

/** O valor de um token no tema aplicado agora (a classe `dark` mora no <html>). */
export const lerTokenDoTema = (token: string): string => getComputedStyle(document.documentElement).getPropertyValue(token).trim()
