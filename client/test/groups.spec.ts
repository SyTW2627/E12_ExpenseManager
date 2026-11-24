import { test, expect } from '@playwright/test'
import { createGroup, openAs, registerUser } from './helpers.ts'

test.describe('Grupos', () => {
  test('un usuario nuevo ve que aún no tiene grupos', async ({ page, request }) => {
    const user = await registerUser(request, 'Lucas Díaz')
    await openAs(page, user, '/grupos')

    await expect(page.getByRole('heading', { name: 'Aún no hay grupos para mostrar' })).toBeVisible()
  })

  test('crea un grupo desde el formulario', async ({ page, request }) => {
    const user = await registerUser(request, 'Lucas Díaz')
    await openAs(page, user, '/grupos')

    await page.getByLabel('Nombre').fill('Viaje a Granada')
    await page.getByLabel('Descripción').fill('Fin de semana en la Alhambra')
    await page.getByRole('button', { name: 'Crear grupo' }).click()

    await expect(page.getByRole('status')).toHaveText('Grupo "Viaje a Granada" creado correctamente.')
    const card = page.getByRole('article').filter({ hasText: 'Viaje a Granada' })
    await expect(card).toContainText('Fin de semana en la Alhambra')
    await expect(card).toContainText('1 miembro')
    await expect(page.getByLabel('Nombre')).toHaveValue('')
  })

  test('no deja crear un grupo sin nombre', async ({ page, request }) => {
    const user = await registerUser(request, 'Lucas Díaz')
    await openAs(page, user, '/grupos')

    await page.getByRole('button', { name: 'Crear grupo' }).click()

    await expect(page.getByRole('alert')).toHaveText('Escribe un nombre para el grupo.')
  })

  test('se une a un grupo con el código de invitación', async ({ page, request }) => {
    const owner = await registerUser(request, 'Sara Gómez')
    const group = await createGroup(request, owner, { name: 'Piso de Sara' })
    const guest = await registerUser(request, 'Iván Torres')
    await openAs(page, guest, '/grupos')

    await page.getByPlaceholder('Código de invitación').fill(group.inviteCode.toLowerCase())
    await page.getByRole('button', { name: 'Unirse' }).click()

    await expect(page.getByRole('status')).toHaveText('Te has unido al grupo correctamente')
    const card = page.getByRole('article').filter({ hasText: 'Piso de Sara' })
    await expect(card).toContainText('2 miembros')
  })

  test('muestra un error con un código que no existe', async ({ page, request }) => {
    const user = await registerUser(request, 'Iván Torres')
    await openAs(page, user, '/grupos')

    await page.getByPlaceholder('Código de invitación').fill('ZZZZZZ')
    await page.getByRole('button', { name: 'Unirse' }).click()

    await expect(page.getByRole('alert')).toHaveText('Código de invitación inválido o grupo no encontrado')
  })

  test('avisa si ya es miembro del grupo', async ({ page, request }) => {
    const owner = await registerUser(request, 'Sara Gómez')
    const group = await createGroup(request, owner, { name: 'Piso de Sara' })
    await openAs(page, owner, '/grupos')

    await page.getByPlaceholder('Código de invitación').fill(group.inviteCode)
    await page.getByRole('button', { name: 'Unirse' }).click()

    await expect(page.getByRole('alert')).toHaveText('Ya eres miembro de este grupo')
  })

  test('abre un grupo sin gastos', async ({ page, request }) => {
    const user = await registerUser(request, 'Lucas Díaz')
    const group = await createGroup(request, user, { name: 'Gimnasio' })
    await openAs(page, user, '/grupos')

    await page.getByRole('button', { name: 'Ver gastos de Gimnasio' }).click()

    await expect(page).toHaveURL(new RegExp(`/grupos/${group._id}$`))
    await expect(page.getByRole('heading', { name: 'Gimnasio', level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Todavía no hay gastos' })).toBeVisible()
  })
})
