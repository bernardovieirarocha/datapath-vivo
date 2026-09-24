import { expect, test, type Page } from '@playwright/test';

async function responder(page: Page, r: Record<string, string>) {
  for (const [s, v] of Object.entries(r)) {
    await page.getByRole('button', { name: `${s} = ${v}`, exact: true }).click();
  }
}

const ADD_CERTO = {
  RegDst: '1',
  Branch: '0',
  MemRead: '0',
  MemtoReg: '0',
  ALUOp: '10',
  MemWrite: '0',
  ALUSrc: '0',
  RegWrite: '1',
  Jump: '0',
};

test('quiz do slide: add certo (1 0 0 0 10 0 0 1) soma um acerto', async ({ page }) => {
  await page.goto('/#/m3?i=add%20%248%2C%20%2417%2C%20%2418');
  await expect(
    page.getByRole('heading', { name: 'Qual é o caminho de dados da instrução?' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Conferir' })).toBeDisabled();
  await responder(page, ADD_CERTO);
  await page.getByRole('button', { name: 'Conferir' }).click();
  await expect(page.locator('.quiz-ok')).toContainText('Tudo certo');
  await expect(page.locator('.placar')).toContainText('Acertos: 1 de 1');
});

test('quiz: sinal errado mostra a consequência e o datapath com os seus sinais', async ({
  page,
}) => {
  await page.goto('/#/m3?i=add%20%248%2C%20%2417%2C%20%2418');
  await responder(page, { ...ADD_CERTO, RegDst: '0' });
  await page.getByRole('button', { name: 'Conferir' }).click();
  await expect(page.locator('.quiz-erros')).toContainText(
    'Com RegDst = 0: escreveria em $18 em vez de $8',
  );
  await expect(page.locator('[data-sinal="RegDst"]')).toHaveClass(/quiz-errado/);
  await expect(page.locator('[data-wire="write_reg"] .value-tag')).toHaveText('18');
  await page.getByRole('button', { name: 'Com os sinais certos' }).click();
  await expect(page.locator('[data-wire="write_reg"] .value-tag')).toHaveText('8');
  await expect(page.locator('.placar')).toContainText('Acertos: 0 de 1');
});

test("quiz: X nos don't cares do sw é aceito e explicado", async ({ page }) => {
  await page.goto('/#/m3?i=sw%20%248%2C%208(%2417)');
  await responder(page, {
    RegDst: 'X',
    Branch: '0',
    MemRead: '0',
    MemtoReg: 'X',
    ALUOp: '00',
    MemWrite: '1',
    ALUSrc: '1',
    RegWrite: '0',
    Jump: '0',
  });
  await page.getByRole('button', { name: 'Conferir' }).click();
  await expect(page.locator('.quiz-ok')).toBeVisible();
  await expect(page.locator('.quiz-xs')).toContainText('RegWrite = 0');
});

test('quiz: mostrar resposta e próxima instrução', async ({ page }) => {
  await page.goto('/#/m3?i=beq%20%241%2C%20%242%2C%203');
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await expect(page.getByRole('button', { name: 'ALUOp = 01', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'RegDst = X', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: /Próxima instrução/ }).click();
  await expect(page.getByRole('button', { name: 'Conferir' })).toBeDisabled();
});

test('tabelas: a linha da instrução acende', async ({ page }) => {
  await page.goto('/#/m3/tabelas');
  await page
    .getByRole('textbox', { name: 'Instrução para acender nas tabelas' })
    .fill('lw $8, 4($9)');
  const linha = page.locator('.tabela-controle tr.linha-acesa').first();
  await expect(linha).toContainText('lw');
  await expect(linha).toContainText('100011');
  await expect(page.locator('.tabela-controle tr.linha-acesa').nth(1)).toContainText(
    'soma (lw, sw, addi)',
  );
});

test('e se? MemtoReg preso em 1 quebra quem escreve resultado da ULA', async ({ page }) => {
  await page.goto('/#/m3/falhas');
  await expect(
    page.getByRole('heading', { name: 'O que acontece se o sinal MemtoReg ficar preso em 1?' }),
  ).toBeVisible();
  await expect(page.getByTestId('resumo-falha')).toContainText(
    'Passam a falhar: add, sub, and, or, slt, addi',
  );
  await expect(page.locator('[data-caso="lw"]')).toContainText('✓ igual');
  await page.getByRole('combobox', { name: 'Sinal com falha' }).selectOption('zero');
  await page.getByRole('button', { name: 'invertido' }).click();
  await expect(page.getByTestId('resumo-falha')).toContainText(
    'Passam a falhar: beq (tomado), beq (não tomado)',
  );
  await page.getByRole('button', { name: 'beq $17, $18, 3' }).first().click();
  await expect(page.locator('[data-wire="zero"]')).toHaveClass(/wire-destaque/);
});
