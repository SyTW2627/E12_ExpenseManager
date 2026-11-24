import { test, expect, type APIRequestContext } from '@playwright/test'
import { createGroup, openAs, registerUser } from './helpers.ts'

// el usuario que usa la app y un compañero
async function groupOfTwo(request: APIRequestContext) {
  const me = await registerUser(request, 'Nora Vidal')
  const mate = await registerUser(request, 'Hugo Sanz')
  const group = await createGroup(request, me, { name: 'Compartido', members: [mate.user.id] })
  return { me, mate, group }
}

test.describe('Gastos', () => {
  test('no deja guardar un gasto sin concepto', async ({ page, request }) => {
    const { me } = await groupOfTwo(request)
    await openAs(page, me, '/gastos')

    await page.getByLabel('Importe').fill('20')
    await page.getByRole('button', { name: 'Añadir gasto' }).click()

    await expect(page.getByRole('alert')).toHaveText('Escribe un concepto para el gasto.')
  })

  test('avisa si los porcentajes no suman 100%', async ({ page, request }) => {
    const { me, mate } = await groupOfTwo(request)
    await openAs(page, me, '/gastos')

    await page.getByLabel('Concepto').fill('Internet')
    await page.getByLabel('Importe').fill('40')
    await page.getByText('Por porcentaje').click()
    await page.getByLabel(`Porcentaje de ${me.user.name}`).fill('50')
    await page.getByLabel(`Porcentaje de ${mate.user.name}`).fill('20')
    await page.getByRole('button', { name: 'Añadir gasto' }).click()

    await expect(page.getByRole('alert')).toHaveText('Los porcentajes deben sumar 100% (ahora suman 70%).')
  })

  test('crea un gasto a partes iguales y aparece en el grupo con los saldos', async ({ page, request }) => {
    const { me, group } = await groupOfTwo(request)
    await openAs(page, me, '/gastos')

    await page.getByLabel('Concepto').fill('Cena')
    await page.getByLabel('Importe').fill('30')
    await page.getByRole('button', { name: 'Añadir gasto' }).click()
    await expect(page.getByRole('status')).toHaveText('Gasto "Cena" añadido correctamente.')
    await expect(page.getByLabel('Concepto')).toHaveValue('')

    await page.goto(`/grupos/${group._id}`)
    await expect(page.getByRole('listitem').filter({ hasText: 'Cena' })).toContainText(/30,00\s€/)
    const balances = page.getByRole('region', { name: 'Lo que debe cada uno' })
    await expect(balances).toContainText('Te deben')
    await expect(balances).toContainText(/15,00\s€/)
  })

  test('crea un gasto por porcentaje y calcula lo que debe el compañero', async ({ page, request }) => {
    const { me, mate, group } = await groupOfTwo(request)
    await openAs(page, me, '/gastos')

    await page.getByLabel('Concepto').fill('Compra')
    await page.getByLabel('Importe').fill('100')
    await page.getByText('Por porcentaje').click()
    await page.getByLabel(`Porcentaje de ${me.user.name}`).fill('70')
    await page.getByLabel(`Porcentaje de ${mate.user.name}`).fill('30')
    await page.getByRole('button', { name: 'Añadir gasto' }).click()
    await expect(page.getByRole('status')).toHaveText('Gasto "Compra" añadido correctamente.')

    await page.goto(`/grupos/${group._id}`)
    const balances = page.getByRole('region', { name: 'Lo que debe cada uno' })
    await expect(balances).toContainText('Te deben')
    await expect(balances).toContainText(/30,00\s€/)
    await expect(balances).toContainText(`${mate.user.name} te debe pagar`)
  })
})
