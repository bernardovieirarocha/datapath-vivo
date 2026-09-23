import { expect, test, type Page } from '@playwright/test';
import golden from '../reference/golden_trace_pratica10.json' with { type: 'json' };

const reg = (page: Page, n: number) => page.locator(`[data-reg="${n}"] .reg-atual`);

async function abrir(page: Page, hash = '#/m1') {
  await page.goto(`/${hash}`);
  await expect(page.getByTestId('ciclo')).toHaveText('Ciclo 1');
}

test('programa de exemplo: 5 passos batem com o golden trace na tela', async ({ page }) => {
  await abrir(page);
  const passo = page.getByRole('button', { name: 'Passo →' });
  for (let i = 0; i < 5; i++) {
    const g = golden.trace[i]!;
    await expect(page.locator('.instr-asm')).toHaveText(g.asm);
    await expect(page.locator('[data-wire="alu_result"]')).toHaveAttribute(
      'data-status',
      /ativo|inativo/,
    );
    await passo.click();
    await expect(page.getByTestId('ciclo')).toHaveText(`Ciclo ${i + 2}`);
    await expect(reg(page, 8)).toHaveText(String(g.after.reg8));
    await expect(reg(page, 16)).toHaveText(String(g.after.reg16));
  }
  // de volta ao início do laço, com $8 = 4
  await expect(page.locator('.instr-asm')).toHaveText('beq $8, $9, 1');
});

test('valores nos fios, mux e escrita pendente (ciclo do lw)', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.instr-asm')).toHaveText('lw $16, 0($12)');
  await expect(page.locator('[data-wire="mem_read_data"]')).toHaveAttribute('data-status', 'ativo');
  await expect(page.locator('[data-wire="mem_read_data"] .value-tag')).toHaveText('5');
  await expect(page.locator('[data-wire="rd2"]')).toHaveAttribute('data-status', 'inativo');
  await expect(page.locator('[data-reg="16"]')).toHaveClass(/reg-escrito/);
  await expect(page.locator('[data-reg="16"] .reg-novo')).toHaveText('→ 5');
  await expect(page.locator('[data-reg="12"]')).toHaveClass(/reg-lido/);
});

test('atalhos: → ← R H F', async ({ page }) => {
  await abrir(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('ciclo')).toHaveText('Ciclo 3');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('ciclo')).toHaveText('Ciclo 2');
  await page.keyboard.press('h');
  await expect(page.locator('[data-wire="pc_plus_4"] .value-tag')).toHaveText('0x0000000C');
  await page.keyboard.press('h');
  await expect(page.locator('[data-wire="pc_plus_4"] .value-tag')).toHaveText('12');
  await page.keyboard.press('r');
  await expect(page.getByTestId('ciclo')).toHaveText('Ciclo 1');
  await page.keyboard.press('f');
  await expect(page.getByRole('button', { name: 'Próxima fase →' })).toBeVisible();
  await expect(page.locator('.fase-atual')).toHaveText('1. Busca');
  await expect(page.locator('[data-wire="rd1"]')).toHaveAttribute('data-status', 'futuro');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.fase-atual')).toHaveText('2. Decodificação');
  await expect(page.locator('[data-wire="rd1"]')).toHaveAttribute('data-status', 'ativo');
});

test('rodar e pausar com Espaço; breakpoint para o Rodar', async ({ page }) => {
  await abrir(page);
  await page.getByRole('tab', { name: 'Instruções' }).click();
  await page.getByRole('button', { name: 'Marcar breakpoint no endereço 16' }).click();
  await page.getByRole('slider', { name: 'Passos por segundo' }).fill('10');
  await page.getByTestId('ciclo').click(); // tira o foco do slider
  await page.keyboard.press('Space');
  await expect(page.locator('.instr-asm')).toHaveText('sub $8, $16, $10');
  await expect(page.getByRole('button', { name: '▶ Rodar' })).toBeVisible();
  await expect(page.getByTestId('ciclo')).toHaveText('Ciclo 4');
});

test('clicar num bloco abre a explicação com a referência do slide', async ({ page }) => {
  await abrir(page);
  await page.locator('[data-block="regfile"]').click();
  const painel = page.locator('.info-bloco');
  await expect(painel.getByRole('heading', { name: 'Banco de Registradores' })).toBeVisible();
  await expect(painel).toContainText('Aula 06');
  await expect(painel).toContainText('rd1');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Banco de Registradores' })).toHaveCount(0);
});

test('editor: erro em português com a linha; programa novo; link compartilhável', async ({
  page,
}) => {
  await abrir(page);
  await page.getByRole('tab', { name: 'Programa' }).click();
  const prog = page.getByRole('textbox', { name: 'Programa em Assembly' });
  await prog.fill('add $8, $17\n');
  await page.getByRole('button', { name: /Montar e carregar/ }).click();
  await expect(page.getByRole('alert')).toContainText('Linha 1: add espera 3 operandos');

  await prog.fill('add $8, $17, $18\n');
  await page.getByRole('textbox', { name: 'Estado inicial' }).fill('$17 = 12\n$18 = 30\n');
  await page.getByRole('button', { name: /Montar e carregar/ }).click();
  await expect(page.locator('.instr-asm')).toHaveText('add $8, $17, $18');
  await page.getByRole('tab', { name: 'Registradores' }).click();
  await expect(page.locator('[data-reg="8"] .reg-novo')).toHaveText('→ 42');

  // o link da barra de endereço reabre o mesmo programa numa aba nova
  const url = page.url();
  expect(url).toMatch(/#\/m1\?p=/);
  const outra = await page.context().newPage();
  await outra.goto(url);
  await expect(outra.locator('.instr-asm')).toHaveText('add $8, $17, $18');
  await expect(outra.locator('[data-reg="17"] .reg-atual')).toHaveText('12');
});

test('tema claro/escuro alterna e funciona no escuro', async ({ page }) => {
  await abrir(page);
  const botao = page.getByRole('button', { name: /Tema:/ });
  await botao.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await botao.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(19, 20, 22)');
});
