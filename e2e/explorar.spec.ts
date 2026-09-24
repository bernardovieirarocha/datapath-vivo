import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/m1');
  await expect(page.getByRole('textbox', { name: 'Digite uma instrução' })).toBeVisible();
});

const campo = (page: import('@playwright/test').Page) =>
  page.getByRole('textbox', { name: 'Digite uma instrução' });

test('digitar uma instrução mostra o caminho dela na hora', async ({ page }) => {
  await campo(page).fill('add $8, $17, $18');
  await expect(page.locator('.instr-asm')).toHaveText('add $8, $17, $18');
  await expect(page.locator('[data-wire="rd2"]')).toHaveAttribute('data-status', 'ativo');
  await expect(page.locator('[data-wire="imm_ext"]')).toHaveAttribute('data-status', 'inativo');
  await expect(page.locator('[data-wire="mem_read_data"]')).toHaveAttribute(
    'data-status',
    'inativo',
  );
  // valores padrão: $17 = 68, $18 = 72
  await expect(page.getByTestId('resultado')).toContainText('$8 ← 140');

  await campo(page).fill('lw $8, 8($17)');
  await expect(page.locator('[data-wire="mem_read_data"]')).toHaveAttribute('data-status', 'ativo');
  await expect(page.locator('[data-wire="rd2"]')).toHaveAttribute('data-status', 'inativo');
  await expect(page.getByRole('textbox', { name: 'Valor de M[76]' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Valor de \$18/ })).toHaveCount(0);
});

test('mudar os valores muda os fios, a explicação e o resultado', async ({ page }) => {
  await campo(page).fill('add $8, $17, $18');
  await page.getByRole('textbox', { name: 'Valor de $17 (rs)' }).fill('12');
  await page.getByRole('textbox', { name: 'Valor de $18 (rt)' }).fill('30');
  await expect(page.locator('[data-wire="alu_result"] .value-tag')).toHaveText('42');
  await expect(page.locator('.narracao')).toContainText('12 + 30 = 42');
  await expect(page.getByTestId('resultado')).toContainText('$8 ← 42');
  // hex digitado num campo decimal não é interrompido
  await page.getByRole('textbox', { name: 'Valor de $17 (rs)' }).fill('0x10');
  await expect(page.getByTestId('resultado')).toContainText('$8 ← 46');
  await expect(page.getByRole('textbox', { name: 'Valor de $17 (rs)' })).toHaveValue('0x10');
});

test('beq: desvio tomado ou não conforme os valores', async ({ page }) => {
  await page.getByRole('button', { name: 'beq $17, $18, 3' }).click();
  await expect(page.getByTestId('resultado')).toContainText('PC ← 4');
  await page.getByRole('textbox', { name: 'Valor de $18 (rt)' }).fill('68');
  await expect(page.getByTestId('resultado')).toContainText('PC ← 16');
  await expect(page.locator('.narracao')).toContainText('o desvio é tomado');
  await expect(page.locator('[data-wire="branch_target"]')).toHaveAttribute('data-status', 'ativo');
});

test('etapas: clicar ou usar ← → mostra o datapath só até ali', async ({ page }) => {
  await page.getByRole('button', { name: '2. Decodificação e leitura' }).first().click();
  await expect(page.locator('[data-wire="rd1"]')).toHaveAttribute('data-status', 'ativo');
  await expect(page.locator('[data-wire="alu_result"]')).toHaveAttribute('data-status', 'futuro');
  await expect(page.locator('.etapa-atual')).toContainText('Decodificação');
  await page.locator('.instr-asm').click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-wire="alu_result"]')).toHaveAttribute('data-status', 'ativo');
  await page.keyboard.press('Escape');
  await expect(page.locator('.etapa-atual')).toHaveCount(0);
});

test('erro em português mantém a última instrução válida; hex também funciona', async ({
  page,
}) => {
  await campo(page).fill('add $8, $17');
  await expect(page.getByRole('alert')).toContainText('Add espera 3 operandos');
  await expect(page.getByRole('alert')).toContainText('Mostrando a última instrução válida');
  await expect(page.locator('.instr-asm')).toHaveText('lw $8, 8($17)');
  await campo(page).fill('bne $1, $2, 3');
  await expect(page.getByRole('alert')).toContainText('não faz parte do datapath da aula');
  await campo(page).fill('0x02324020');
  await expect(page.locator('.instr-asm')).toHaveText('add $8, $17, $18');
});

test('link da instrução reabre a mesma instrução', async ({ page, context }) => {
  await campo(page).fill('sw $8, 8($17)');
  await expect(page).toHaveURL(/#\/m1\?i=sw/);
  const outra = await context.newPage();
  await outra.goto(page.url());
  await expect(outra.getByRole('textbox', { name: 'Digite uma instrução' })).toHaveValue(
    'sw $8, 8($17)',
  );
  await expect(outra.getByTestId('resultado')).toContainText('M[76] ←');
});
