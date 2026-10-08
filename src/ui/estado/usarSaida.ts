import { useRef, useState } from 'react'
import { useMigracaoIncompleta } from './contextoArmazenamento.ts'
import { useNuvem } from './contextoNuvem.ts'
import type { ValorConta } from './usarConta.ts'

export interface ValorSaida {
  /** "Sair": sai na hora quando a nuvem tem tudo; senão, tenta salvar e só pergunta se não der. */
  readonly pedirSair: () => Promise<void>
  /** CA-479: há mudança que não chegou à nuvem e se perde se a pessoa sair agora. */
  readonly perguntando: boolean
  readonly saindo: boolean
  readonly ficar: () => void
  readonly sairMesmoAssim: () => Promise<void>
}

/**
 * Só existe "Sair" (spec dados-na-nuvem, D-131). A cópia de trabalho do navegador é apagada ao sair;
 * a pergunta (CA-479) aparece só quando há mudança que não deu para salvar (DP-11). A nuvem para antes
 * de a cópia ser apagada: nada do espaço vazio vai para a nuvem, e as outras abas ficam sabendo.
 */
export function useSaida(conta: Pick<ValorConta, 'sair'>, aoSaiu: () => void): ValorSaida {
  const nuvem = useNuvem()
  // DP-22: dado de antes que não coube na conta também não está na nuvem.
  const migracaoIncompleta = useMigracaoIncompleta()
  const [perguntando, setPerguntando] = useState(false)
  const [saindo, setSaindo] = useState(false)
  // A saída já começou: um segundo pedido (clique duplo) não sai de novo.
  const jaSaindo = useRef(false)

  const sair = async () => {
    if (jaSaindo.current) return
    jaSaindo.current = true
    setSaindo(true)
    nuvem?.parar()
    await conta.sair()
    setSaindo(false)
    setPerguntando(false)
    aoSaiu()
  }

  const pedirSair = async () => {
    if (saindo || jaSaindo.current) return
    if (migracaoIncompleta) {
      setPerguntando(true)
      return
    }
    if (nuvem !== null && (nuvem.estado.pendente || nuvem.estado.salvando)) {
      // Com internet e a cópia aberta, o que falta vai agora; antes de abrir ou com a área travada, não adianta tentar.
      if (nuvem.estado.trava === null && nuvem.estado.fase === 'pronta') {
        setSaindo(true)
        const foi = await nuvem.salvarAgora()
        setSaindo(false)
        if (foi) return sair()
      }
      setPerguntando(true)
      return
    }
    await sair()
  }

  return { pedirSair, perguntando, saindo, ficar: () => setPerguntando(false), sairMesmoAssim: sair }
}
