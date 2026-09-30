import { expect, test } from '@playwright/test';

test('codificação: campos, hex e decodificação passo a passo', async ({ page }) => {
  await page.goto('/#/m4');
  const campo = page.getByRole('textbox', { name: 'Instrução (Assembly, hex ou binário)' });
  await campo.fill('add $8, $17, $18');
  await expect(page.getByTestId('hex')).toHaveText('0x02324020');
  await expect(page.locator('[data-campo="funct"]')).toContainText('100000');
  await expect(page.locator('.cod-passos')).toContainText('tipo R: quem diz a operação é o funct');
  await campo.fill('0x8E280008');
  await expect(page.locator('.cod-passos')).toContainText('Resultado: lw $8, 8($17)');
  await campo.fill('000100 01000 01001 1111111111111101');
  await expect(page.locator('.cod-passos')).toContainText('= -3 (bit 15 = 1: negativo');
});

test('passar o mouse num campo destaca os fios que ele alimenta', async ({ page }) => {
  await page.goto('/#/m4?i=add%20%248%2C%20%2417%2C%20%2418');
  await page.hover('[data-campo="rs"]');
  await expect(page.locator('[data-wire="rs"]')).toHaveClass(/wire-destaque/);
  await expect(page.locator('[data-wire="rt"]')).not.toHaveClass(/wire-destaque/);
});

test('calculadora do jump com o exemplo do slide (PC+4 = 0x00400010, campo 1 → 0x4)', async ({
  page,
}) => {
  await page.goto('/#/m4');
  await page.getByRole('button', { name: 'Exemplo do slide' }).click();
  const salto = page.getByTestId('calc-salto');
  await expect(salto).toContainText('PC + 4 = 4194320');
  await expect(salto).toContainText('Destino = 4 (0x00000004)');
  const desvio = page.getByTestId('calc-desvio');
  await page.getByRole('textbox', { name: 'Imediato' }).fill('5');
  await expect(desvio).toContainText('Destino = PC + 4 + deslocamento = 32 (0x00000020)');
});
