import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CHAVES_DE_DADOS, linhaDeResponsabilidade, montarBackup, PERFIL_VAZIO, restaurarBackup } from '@/domain/perfil.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { TelaConfiguracoes } from './TelaConfiguracoes.tsx'

class MemoriaFalsa implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

describe('Configurações', () => {
  beforeEach(() => localStorage.clear())

  it('a linha de responsabilidade muda entre estudante e nutricionista', () => {
    expect(linhaDeResponsabilidade({ ...PERFIL_VAZIO, nome: 'Ana', tipo: 'profissional', crn: 'CRN-6 12345' })).toBe('Ana · CRN CRN-6 12345')
    expect(linhaDeResponsabilidade({ ...PERFIL_VAZIO, nome: 'Bia', responsavel: 'Dra. Carla' })).toBe('Bia · responsável técnico: Dra. Carla')
    expect(linhaDeResponsabilidade({ ...PERFIL_VAZIO, nome: 'Bia' })).toContain('sem responsável técnico informado')
  })

  it('backup leva só as chaves do MetaNutri e volta inteiro', () => {
    const memoria = new MemoriaFalsa()
    memoria.setItem('metanutri:casos', '["a"]')
    memoria.setItem('metanutri:pacientes', '[{"id":"p1"}]')
    memoria.setItem('outro-app', 'nao deve viajar')

    const backup = montarBackup(memoria, [...CHAVES_DE_DADOS], '2026-09-16T00:00:00.000Z')
    expect(Object.keys(backup.dados)).toEqual(['metanutri:casos', 'metanutri:pacientes'])

    const destino = new MemoriaFalsa()
    const r = restaurarBackup(destino, JSON.stringify(backup))
    expect(r.erro).toBeNull()
    expect(r.restaurados).toBe(2)
    expect(destino.getItem('metanutri:pacientes')).toBe('[{"id":"p1"}]')
  })

  it('arquivo estranho é recusado com explicação', () => {
    expect(restaurarBackup(new MemoriaFalsa(), 'nada disso').erro).toContain('Não consegui ler o arquivo')
    expect(restaurarBackup(new MemoriaFalsa(), '{"formato":9}').erro).toContain('não é um backup do MetaNutri')
  })

  it('guarda o perfil ao digitar e mostra como sai no documento', async () => {
    render(<TelaConfiguracoes />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('Seu nome'), 'Ana Souza')
    await usuario.click(screen.getByRole('radio', { name: 'Nutricionista' }))
    await usuario.type(screen.getByLabelText('CRN'), 'CRN-6 12345')

    expect(screen.getByText('Ana Souza · CRN CRN-6 12345')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('metanutri:perfil') ?? '{}').nome).toBe('Ana Souza')
  })

  it('apagar tudo pede confirmação antes', async () => {
    localStorage.setItem('metanutri:casos', '["a"]')
    render(<TelaConfiguracoes />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Apagar todos os dados deste aparelho' }))
    expect(localStorage.getItem('metanutri:casos')).toBe('["a"]')
    await usuario.click(screen.getByRole('button', { name: 'Apagar tudo mesmo' }))
    expect(localStorage.getItem('metanutri:casos')).toBeNull()
  })
})
