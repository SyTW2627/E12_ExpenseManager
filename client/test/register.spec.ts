import { test, expect, type Page } from '@playwright/test'
import { PASSWORD, registerUser, uniqueEmail } from './helpers.ts'

async function fillRegister(page: Page, data: { name: string; email: string; password: string; confirmation: string }) {
  await page.goto('/register')
  await page.getByLabel('Nombre').fill(data.name)
  await page.getByLabel('Correo electrónico').fill(data.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(data.password)
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(data.confirmation)
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
}

test.describe('Registro', () => {
  test('crea la cuenta y entra en el dashboard', async ({ page }) => {
    await fillRegister(page, {
      name: 'Marta Ruiz',
      email: uniqueEmail('marta'),
      password: PASSWORD,
      confirmation: PASSWORD,
    })

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: 'Hola, Marta' })).toBeVisible()
  })

  test('avisa si las contraseñas no coinciden', async ({ page }) => {
    await fillRegister(page, {
      name: 'Marta Ruiz',
      email: uniqueEmail('marta'),
      password: PASSWORD,
      confirmation: 'otra-contraseña',
    })

    await expect(page.getByRole('alert')).toHaveText('Las contraseñas no coinciden. Revísalas e inténtalo de nuevo.')
    await expect(page).toHaveURL(/\/register$/)
  })

  test('avisa si el correo ya está registrado', async ({ page, request }) => {
    const existing = await registerUser(request, 'Pablo Gil')

    await fillRegister(page, {
      name: 'Otro Pablo',
      email: existing.user.email,
      password: PASSWORD,
      confirmation: PASSWORD,
    })

    await expect(page.getByRole('alert')).toHaveText('El correo electrónico ya está registrado')
    await expect(page).toHaveURL(/\/register$/)
  })
})
