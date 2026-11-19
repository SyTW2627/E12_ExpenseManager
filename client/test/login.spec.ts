import { test, expect, type Page } from '@playwright/test'

// Usuario creado por el seed del backend 
const ANA = { email: 'ana@gmail.com', password: 'demo1234', firstName: 'Ana' }

// Función auxiliar para loguearse en la app
async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar a mi cuenta' }).click()
}


test.describe('Login', () => {
  test('entra con credenciales correctas y llega al dashboard', async ({ page }) => {
    await login(page, ANA.email, ANA.password)

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: `Hola, ${ANA.firstName}` })).toBeVisible()
  })

  test('muestra un error si la contraseña es incorrecta', async ({ page }) => {
    await login(page, ANA.email, 'incorrecta')

    await expect(page.getByRole('alert')).toHaveText('Credenciales incorrectas')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('muestra un error si el usuario no existe', async ({ page }) => {
    await login(page, 'no-existe@gmail.com', ANA.password)

    await expect(page.getByRole('alert')).toHaveText('Credenciales incorrectas')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('el email no distingue mayúsculas ni espacios', async ({ page }) => {
    await login(page, `  ${ANA.email.toUpperCase()}  `, ANA.password)

    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test('mantiene la sesión al recargar la página', async ({ page }) => {
    await login(page, ANA.email, ANA.password)
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.reload()

    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { name: `Hola, ${ANA.firstName}` })).toBeVisible()
  })

  test('cerrar sesión vuelve al login y bloquea las rutas privadas', async ({ page }) => {
    await login(page, ANA.email, ANA.password)
    await expect(page).toHaveURL(/\/dashboard$/)

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/grupos')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('una ruta privada sin sesión redirige al login', async ({ page }) => {
    await page.goto('/gastos')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Entrar a mi cuenta' })).toBeVisible()
  })
})
