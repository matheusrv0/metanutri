// A marca do MetaNutri (kit de 27/09/2026, logo provisória do designer).
//
// O símbolo é um check de quatro bolinhas que crescem, uma por dia; a última, laranja,
// é a meta cumprida. Ele vem dos SVGs em public/marca/ e não muda de cor aqui: o kit
// proíbe redesenhar, recolorir, esticar, sombrear ou usar a versão clara em fundo escuro.
// O nome é texto, não imagem, para escalar e ser lido por leitor de tela.
//
// Grafia: o kit escreve "Meta Nutri"; o produto decidiu "MetaNutri" (decisões de 26/09
// e 27/09/2026). O designer precisa saber disso antes da versão final.

interface LogoProps {
  /**
   * `auto` segue o tema do app; `claro` força a versão para fundo claro (o PDF, por
   * exemplo); `escuro` força a versão para fundo escuro (um cartão teal no tema claro).
   */
  readonly variante?: 'auto' | 'claro' | 'escuro'
  /** Só o símbolo, sem o nome. */
  readonly soSimbolo?: boolean
  /** Altura do símbolo em pixels; o nome escala junto, na proporção do kit. */
  readonly tamanho?: number
  readonly className?: string
}

/** Proporção do kit: símbolo com 1,6× o corpo do nome, espaço de 0,35 em. */
const PROPORCAO_SIMBOLO = 1.6

export function Logo({ variante = 'auto', soSimbolo = false, tamanho = 28, className = '' }: LogoProps) {
  // Tudo escala pelo font-size, como no kit; o tamanho pedido é o do símbolo.
  const corpo = `${tamanho / PROPORCAO_SIMBOLO / 16}rem`

  const nome =
    variante === 'claro' ? 'text-marca' : variante === 'escuro' ? 'text-marfim' : 'text-marca dark:text-marfim'

  return (
    <span
      className={`inline-flex items-center gap-[0.35em] align-middle ${className}`}
      style={{ fontSize: corpo }}
      role="img"
      aria-label="MetaNutri"
    >
      {variante === 'claro' ? (
        <img src="marca/simbolo.svg" alt="" className="size-[1.6em] shrink-0" />
      ) : variante === 'escuro' ? (
        <img src="marca/simbolo-fundo-escuro.svg" alt="" className="size-[1.6em] shrink-0" />
      ) : (
        <>
          <img src="marca/simbolo.svg" alt="" className="size-[1.6em] shrink-0 dark:hidden" />
          <img src="marca/simbolo-fundo-escuro.svg" alt="" className="hidden size-[1.6em] shrink-0 dark:block" />
        </>
      )}
      {soSimbolo ? null : <span className={`font-marca font-bold leading-none tracking-[-0.035em] ${nome}`}>MetaNutri</span>}
    </span>
  )
}
