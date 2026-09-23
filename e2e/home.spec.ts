import { expect, test } from '@playwright/test';

test('página inicial: M1 abre, os outros módulos ainda estão desabilitados', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Datapath Vivo' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await expect(nav.getByRole('button')).toHaveCount(7);
  for (const botao of await nav.getByRole('button').all()) await expect(botao).toBeDisabled();
  await nav.getByRole('link', { name: /M1/ }).click();
  await expect(page.getByTestId('ciclo')).toHaveText('Ciclo 1');
});
