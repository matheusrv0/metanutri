import { Component, type ReactNode } from 'react'
import { recarregarComVersaoNova } from './recarregarComVersaoNova.ts'
import { TelaDeErro } from './TelaDeErro.tsx'

interface LimiteDeErroProps {
  readonly children: ReactNode
  /** O que "Recarregar" faz; padrão: pedir a versão nova e recarregar a página. */
  readonly recarregar?: () => Promise<void>
}

interface EstadoDoLimite {
  readonly quebrou: boolean
}

/**
 * Spec receitas-com-calculo, D-274b e CA-888a: segura o erro de qualquer tela que quebra ao desenhar e mostra a tela de
 * erro com "Recarregar", em vez da página em branco. É componente de classe porque o React só segura erro de desenho
 * assim (`getDerivedStateFromError`); é a única exceção à convenção de componente de função (PLAN, DP-272).
 * Não apaga nada: quem desmonta é só a árvore das telas; o que não tinha subido continua contado no aparelho.
 */
export class LimiteDeErro extends Component<LimiteDeErroProps, EstadoDoLimite> {
  override state: EstadoDoLimite = { quebrou: false }

  static getDerivedStateFromError(): EstadoDoLimite {
    return { quebrou: true }
  }

  override render(): ReactNode {
    if (!this.state.quebrou) return this.props.children
    return <TelaDeErro aoRecarregar={this.props.recarregar ?? (() => recarregarComVersaoNova())} />
  }
}
