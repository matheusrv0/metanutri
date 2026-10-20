import { render, screen } from '@testing-library/react'
import { criarRepositorioPacientes } from '@/domain/pacientes.ts'
import { criarRepositorio } from '@/domain/persistencia.ts'
import { ContextoMigracao } from '../estado/contextoArmazenamento.ts'
import { ProvedorCasos } from '../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../estado/ProvedorPacientes.tsx'
import { ProvedorTema } from '../tema/ProvedorTema.tsx'
import { Estrutura } from './Estrutura.tsx'

describe('Ctrl+P da tela sem os avisos do topo (spec revisao-geral-trabalho, D-240 e CA-770)', () => {
  beforeEach(() => {
    localStorage.setItem('metanutri:aviso-inicial-visto', '1')
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('o aviso de dados de antes que não couberam fica só na tela', () => {
    render(
      <ProvedorTema>
        <ProvedorCasos repositorio={criarRepositorio(null)}>
          <ProvedorPacientes repositorio={criarRepositorioPacientes(null)}>
            <ContextoMigracao.Provider value="incompleto">
              <Estrutura rota={{ tela: 'painel' }} navegar={vi.fn()} casoAtual={null} aoNovoCaso={vi.fn()} titulo="Painel">
                <p>Conteúdo</p>
              </Estrutura>
            </ContextoMigracao.Provider>
          </ProvedorPacientes>
        </ProvedorCasos>
      </ProvedorTema>,
    )
    const aviso = screen.getByText(/Parte dos dados guardados antes neste aparelho/).closest('[role="status"]')
    expect(aviso?.className).toMatch(/\bprint:hidden\b/)
    expect(screen.getByText('Conteúdo').closest('.print\\:hidden')).toBeNull()
  })
})
