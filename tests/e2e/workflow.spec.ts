import { expect, test } from '@playwright/test'

test('core workflow screens are reachable', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 2, name: 'Workspace', exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Customers/ }).first().click()
  await expect(page.getByRole('heading', { level: 2, name: 'Customers', exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Inspection/ }).first().click()
  await expect(page.getByRole('heading', { level: 2, name: 'Inspection', exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Projects/ }).first().click()
  await expect(page.getByRole('heading', { level: 2, name: 'Projects', exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Estimates/ }).first().click()
  await expect(page.getByRole('heading', { level: 2, name: 'Estimates', exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Invoices/ }).first().click()
  await expect(page.getByRole('heading', { level: 2, name: 'Invoices', exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Tasks/ }).first().click()
  await expect(page.getByRole('heading', { level: 2, name: 'Tasks', exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Settings/ }).first().click()
  await expect(page.getByRole('heading', { level: 2, name: 'Settings', exact: true })).toBeVisible()
})
