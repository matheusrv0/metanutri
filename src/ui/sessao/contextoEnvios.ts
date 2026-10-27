// Os envios que a saída por tempo espera (spec separacao-site-app, D-517 e DP-SA-8).
//
// A cópia de trabalho a saída manda pela nuvem (`salvarAgora`). Os links de paciente pendentes, quem reenvia é o
// `ProvedorAcompanhamentos` (D-105 e CB-108), que só existe com a área de trabalho montada: ele registra aqui o envio
// dele enquanto está montado, e a saída chama todos juntos. Fora da área, nada registrado: o link pendente conta como
// pendência e o espaço fica (CB-510).
import { createContext, useContext, useEffect } from 'react'

/** Um envio para a nuvem; termina quando acabou (deu certo ou não). */
export type Envio = () => Promise<void>

export interface ValorEnvios {
  /** Registra o envio; devolve como tirar o registro. */
  readonly registrar: (envio: Envio) => () => void
}

export interface RegistroDeEnvios extends ValorEnvios {
  /** Chama todos os envios registrados juntos; um que falha não segura os outros. */
  readonly enviarTodos: () => Promise<void>
}

export function criarEnvios(): RegistroDeEnvios {
  const envios = new Set<Envio>()
  return {
    registrar(envio) {
      envios.add(envio)
      return () => {
        envios.delete(envio)
      }
    },
    async enviarTodos() {
      await Promise.allSettled([...envios].map((envio) => envio()))
    },
  }
}

/** `null` fora do vigia da sessão (modo local, testes de tela): registrar não faz nada. */
export const ContextoEnvios = createContext<ValorEnvios | null>(null)

/** Registra o envio enquanto o componente está montado. */
export function useRegistrarEnvio(envio: Envio): void {
  const envios = useContext(ContextoEnvios)
  useEffect(() => envios?.registrar(envio), [envios, envio])
}
