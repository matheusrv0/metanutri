import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useAcompanhamentos } from '../estado/contextoAcompanhamentos.ts'
import { ContextoArmazenamento } from '../estado/contextoArmazenamento.ts'
import { ProvedorAcompanhamentos } from '../estado/ProvedorAcompanhamentos.tsx'
import { ContextoEnvios, criarEnvios, useRegistrarEnvio, type Envio, type ValorEnvios } from './contextoEnvios.ts'

vi.mock('../estado/supabase.ts', () => ({ obterSupabase: () => null, supabaseConfigurado: () => false }))

describe('os envios que a saída por tempo espera (spec separacao-site-app, DP-SA-8)', () => {
  it('chama todos os registrados juntos, e um que falha não segura os outros', async () => {
    const envios = criarEnvios()
    const feitos: string[] = []
    envios.registrar(async () => {
      feitos.push('links')
    })
    envios.registrar(async () => {
      throw new Error('sem internet')
    })
    const tirar = envios.registrar(async () => {
      feitos.push('tirado')
    })
    tirar()
    await expect(envios.enviarTodos()).resolves.toBeUndefined()
    expect(feitos).toEqual(['links'])
  })

  it('sem nada registrado, termina na hora', async () => {
    await expect(criarEnvios().enviarTodos()).resolves.toBeUndefined()
  })

  it('o componente registra enquanto está montado e tira ao desmontar; fora do vigia, não faz nada', () => {
    const registrados: Envio[] = []
    const tirados: Envio[] = []
    const valor: ValorEnvios = {
      registrar: (envio) => {
        registrados.push(envio)
        return () => tirados.push(envio)
      },
    }
    const envio: Envio = async () => undefined
    function Registra() {
      useRegistrarEnvio(envio)
      return null
    }
    const { unmount } = render(
      <ContextoEnvios.Provider value={valor}>
        <Registra />
      </ContextoEnvios.Provider>,
    )
    expect(registrados).toEqual([envio])
    unmount()
    expect(tirados).toEqual([envio])
    expect(() => render(<Registra />)).not.toThrow()
  })

  it('CA-1447 e CB-510: com a área de trabalho montada, a saída espera a leitura dos links, que reenvia os pendentes (D-105, CB-108)', () => {
    const envios = criarEnvios()
    const registrar = vi.spyOn(envios, 'registrar')
    let lerDaNuvem: (() => Promise<void>) | null = null
    function LerDaNuvem() {
      lerDaNuvem = useAcompanhamentos().lerDaNuvem
      return null
    }
    const envolver = (filho: ReactNode) => (
      <ContextoArmazenamento.Provider value={null}>
        <ContextoEnvios.Provider value={envios}>{filho}</ContextoEnvios.Provider>
      </ContextoArmazenamento.Provider>
    )
    const { unmount } = render(
      envolver(
        <ProvedorAcompanhamentos usuarioId="u1">
          <LerDaNuvem />
        </ProvedorAcompanhamentos>,
      ),
    )
    expect(lerDaNuvem).not.toBeNull()
    expect(registrar).toHaveBeenCalledWith(lerDaNuvem)
    unmount()
  })
})
