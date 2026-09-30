import { expect, test } from '@playwright/test';

test('página inicial: M1, M3 e M4 abrem; os outros ainda estão desabilitados', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Datapath Vivo' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await expect(nav.getByRole('button')).toHaveCount(5);
  await expect(nav.getByRole('link')).toHaveCount(3);
  for (const botao of await nav.getByRole('button').all()) await expect(botao).toBeDisabled();
  await nav.getByRole('link', { name: /M1/ }).click();
  await expect(page.getByRole('textbox', { name: 'Digite uma instrução' })).toBeVisible();
  await page.getByRole('link', { name: 'Programa passo a passo' }).click();
  await expect(page.getByTestId('ciclo')).toHaveText('Ciclo 1');
});
