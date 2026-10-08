import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CHAVES_DE_DADOS, linhaDeResponsabilidade, montarBackup, PERFIL_VAZIO, restaurarBackup } from '@/domain/perfil.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { armazenamentoDaConta } from '@/domain/armazenamentoDaConta.ts'
import { ContextoArmazenamento } from '../estado/contextoArmazenamento.ts'
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

  it('CA-482: sem os botões de apagar dados do aparelho nem os de enviar e trazer a cópia na nuvem; o backup em arquivo continua', () => {
    for (const armazenamento of [undefined, armazenamentoDaConta(localStorage, 'conta-a')]) {
      const { unmount } = render(
        <ContextoArmazenamento.Provider value={armazenamento}>
          <TelaConfiguracoes />
        </ContextoArmazenamento.Provider>,
      )
      for (const nome of [/Apagar todos/, /Apagar tudo/, /Enviar deste aparelho/, /Trazer para este aparelho/]) {
        expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument()
      }
      expect(screen.queryByText('Cópia na nuvem')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Baixar backup' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Restaurar backup' })).toBeInTheDocument()
      unmount()
    }
  })

  it('D-128: Configurações não diz mais que os dados ficam só neste aparelho', () => {
    render(<TelaConfiguracoes />)
    expect(document.body.textContent).not.toMatch(/Fica só neste aparelho|Tudo fica neste navegador/)
  })
})
