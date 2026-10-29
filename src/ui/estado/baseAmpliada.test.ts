// Spec base-ampliada, CA-1716 e CB-704: a base ampliada chega sob demanda, uma vez, e avisa quem espera.
import arquivo from '@/data/base-ampliada.json'
import type { ArquivoBaseAmpliada } from '@/domain/baseAmpliada.ts'
import { buscarAlimento, registrarBaseAmpliada } from '@/domain/tabelas.ts'
import { carregarBaseAmpliada, estadoDaBaseAmpliada, inscreverNaBaseAmpliada, prepararBaseAmpliadaParaTeste, versaoDaBaseAmpliada } from './baseAmpliada.ts'

const ARQUIVO = arquivo as unknown as ArquivoBaseAmpliada

afterEach(() => {
  prepararBaseAmpliadaParaTeste({ automatico: false })
  registrarBaseAmpliada([])
})

describe('carregarBaseAmpliada', () => {
  it('pede o arquivo uma vez, registra a base e avisa os inscritos', async () => {
    const carregar = vi.fn(() => Promise.resolve(ARQUIVO))
    prepararBaseAmpliadaParaTeste({ carregar })
    const aviso = vi.fn()
    const sair = inscreverNaBaseAmpliada(aviso)
    expect(estadoDaBaseAmpliada()).toBe('parada')
    const antes = versaoDaBaseAmpliada()
    const primeira = carregarBaseAmpliada()
    const segunda = carregarBaseAmpliada()
    expect(estadoDaBaseAmpliada()).toBe('carregando')
    await Promise.all([primeira, segunda])
    expect(carregar).toHaveBeenCalledTimes(1)
    expect(estadoDaBaseAmpliada()).toBe('pronta')
    expect(versaoDaBaseAmpliada()).toBeGreaterThan(antes)
    expect(aviso).toHaveBeenCalled()
    expect(buscarAlimento(100044)?.descricao).toBe('Tilápia, filé, grelhada')
    await carregarBaseAmpliada()
    expect(carregar).toHaveBeenCalledTimes(1)
    sair()
  })

  it('CB-704: sem rede, fica em erro; tentar de novo carrega', async () => {
    const carregar = vi.fn<() => Promise<ArquivoBaseAmpliada>>().mockRejectedValueOnce(new Error('sem rede')).mockResolvedValueOnce(ARQUIVO)
    prepararBaseAmpliadaParaTeste({ carregar })
    await carregarBaseAmpliada()
    expect(estadoDaBaseAmpliada()).toBe('erro')
    expect(buscarAlimento(100044)).toBeUndefined()
    await carregarBaseAmpliada()
    expect(estadoDaBaseAmpliada()).toBe('pronta')
    expect(buscarAlimento(100044)).toBeDefined()
  })

  it('o arquivo de verdade vem por import() e decodifica', async () => {
    prepararBaseAmpliadaParaTeste({})
    await carregarBaseAmpliada()
    expect(estadoDaBaseAmpliada()).toBe('pronta')
    expect(buscarAlimento(100044)?.ampliada?.fdcId).toBe(175177)
  })
})
