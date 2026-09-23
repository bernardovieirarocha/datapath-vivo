import { expect, test } from '@playwright/test';

test('página inicial lista os módulos M1–M9 desabilitados', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Datapath Vivo' })).toBeVisible();
  const modulos = page.getByRole('navigation', { name: 'Módulos' }).getByRole('button');
  await expect(modulos).toHaveCount(9);
  for (const botao of await modulos.all()) {
    await expect(botao).toBeDisabled();
  }
});
