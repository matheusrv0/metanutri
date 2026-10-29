import '@testing-library/jest-dom/vitest'
import { prepararBaseAmpliadaParaTeste } from './src/ui/estado/baseAmpliada.ts'
import { prepararCatalogoParaTeste } from './src/ui/estado/catalogoOff.ts'

// Spec base-ampliada: nos testes, a base ampliada não é pedida sozinha; o teste que precisa dela a registra.
prepararBaseAmpliadaParaTeste({ automatico: false })
// Spec base-ampliada, fase 2: o catálogo de rótulos também não é pedido nos testes de tela; quem precisa o prepara.
prepararCatalogoParaTeste({ automatico: false })
