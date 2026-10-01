import { expect, test, type Page } from '@playwright/test';

const campo = (page: Page) => page.getByRole('textbox', { name: 'Instrução', exact: true });
const aba = (page: Page, nome: 'Instrução' | 'Controle' | 'Execução') =>
  page.getByRole('tab', { name: nome }).click();

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(campo(page)).toBeVisible();
});

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
  await aba(page, 'Execução');
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
  await aba(page, 'Execução');
  await expect(page.locator('.narracao')).toContainText('12 + 30 = 42');
  await expect(page.getByTestId('resultado')).toContainText('$8 ← 42');
  // hex digitado num campo decimal não é interrompido
  await page.getByRole('textbox', { name: 'Valor de $17 (rs)' }).fill('0x10');
  await expect(page.getByTestId('resultado')).toContainText('$8 ← 46');
  await expect(page.getByRole('textbox', { name: 'Valor de $17 (rs)' })).toHaveValue('0x10');
});

test('instruções suportadas: as 10 cabem na tela; beq é tomado ou não conforme os valores', async ({
  page,
}) => {
  await expect(page.getByText('Instruções suportadas:')).toBeVisible();
  const exemplos = page.getByRole('group', { name: 'Instruções suportadas' }).getByRole('button');
  await expect(exemplos).toHaveCount(10);
  for (const b of await exemplos.all()) await expect(b).toBeInViewport();

  await page.getByRole('button', { name: 'Carregar beq $17, $18, 3' }).click();
  await expect(campo(page)).toHaveValue('beq $17, $18, 3');
  await aba(page, 'Execução');
  await expect(page.getByTestId('resultado')).toContainText('PC ← 4');
  await page.getByRole('textbox', { name: 'Valor de $18 (rt)' }).fill('68');
  await expect(page.getByTestId('resultado')).toContainText('PC ← 16');
  await expect(page.locator('.narracao')).toContainText('o desvio é tomado');
  await expect(page.locator('[data-wire="branch_target"]')).toHaveAttribute('data-status', 'ativo');
});

test('etapas: clique, ◀ ▶ e teclado mostram o datapath só até ali', async ({ page }) => {
  const nav = page.getByRole('group', { name: 'Etapas do ciclo' });
  await aba(page, 'Execução');
  await nav.getByRole('button', { name: '2. Decodificação' }).click();
  await expect(page.locator('[data-wire="rd1"]')).toHaveAttribute('data-status', 'ativo');
  await expect(page.locator('[data-wire="alu_result"]')).toHaveAttribute('data-status', 'futuro');
  await expect(page.locator('.etapa-atual')).toContainText('Decodificação');
  await expect(page.getByTestId('etapa-atual')).toContainText(
    '2. Decodificação: A Unidade de Controle recebe o opcode',
  );

  await nav.getByRole('button', { name: 'Próxima etapa' }).click();
  await expect(page.locator('[data-wire="alu_result"]')).toHaveAttribute('data-status', 'ativo');
  await nav.getByRole('button', { name: 'Etapa anterior' }).click();
  await expect(page.locator('[data-wire="alu_result"]')).toHaveAttribute('data-status', 'futuro');

  await page.locator('.instr-asm').click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-wire="alu_result"]')).toHaveAttribute('data-status', 'ativo');
  await page.keyboard.press('Escape');
  await expect(page.locator('.etapa-atual')).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Ciclo completo' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('Animar percorre as etapas sozinho e para na escrita', async ({ page }) => {
  await page.clock.install();
  const animar = page.getByRole('button', { name: /Animar|Parar/ });
  await animar.click();
  await expect(animar).toHaveText('■ Parar');
  await expect(page.getByTestId('etapa-atual')).toContainText(
    '1. Busca: A Memória de Instruções recebe na entrada o endereço armazenado no PC (0)',
  );
  await page.clock.runFor(1600);
  await expect(page.getByTestId('etapa-atual')).toContainText('2. Decodificação');
  await page.clock.runFor(1600 * 3);
  await expect(page.getByTestId('etapa-atual')).toContainText('5. Escrita do resultado');
  await page.clock.runFor(1600);
  await expect(animar).toHaveText('▶ Animar');
  // escolher uma etapa à mão interrompe a animação
  await animar.click();
  await page
    .getByRole('group', { name: 'Etapas do ciclo' })
    .getByRole('button', { name: '4. Acesso à memória' })
    .click();
  await expect(animar).toHaveText('▶ Animar');
});

test('abas na ordem Instrução, Controle, Execução; a primeira abre por padrão', async ({
  page,
}) => {
  await expect(page.getByRole('tab')).toHaveText(['Instrução', 'Controle', 'Execução']);
  await expect(page.getByRole('tab', { name: 'Instrução' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tabpanel')).toContainText('Decodificação passo a passo');
});

test('auxiliares: Controle com a explicação do slide e Instrução que acende os fios', async ({
  page,
}) => {
  await campo(page).fill('sw $8, 8($17)');
  await aba(page, 'Controle');
  const sinais = page.getByRole('tabpanel');
  await expect(sinais).toContainText('MemWrite');
  await expect(sinais).toContainText('Ativo: o dado de Write data é gravado');
  await expect(sinais.getByText('X no slide')).toHaveCount(2); // RegDst e MemtoReg no sw

  await aba(page, 'Instrução');
  await expect(page.getByTestId('hex')).toHaveText('0xAE280008');
  await expect(page.getByRole('tabpanel')).toContainText(
    'O opcode 43 corresponde à instrução sw (formato I)',
  );
  await page.hover('[data-campo="rs"]');
  await expect(page.locator('[data-wire="rs"]')).toHaveClass(/wire-destaque/);
  await expect(page.locator('[data-wire="rt"]')).not.toHaveClass(/wire-destaque/);
  // imediato de uma instrução tipo I acende só Instruction[15–0]; o endereço do j, só [25–0]
  await page.hover('[data-campo="imm"]');
  await expect(page.locator('[data-wire="imm16"]')).toHaveClass(/wire-destaque/);
  await expect(page.locator('[data-wire="addr26"]')).not.toHaveClass(/wire-destaque/);
  await campo(page).fill('j 96');
  await page.hover('[data-campo="imm"]');
  await expect(page.locator('[data-wire="addr26"]')).toHaveClass(/wire-destaque/);
  await expect(page.locator('[data-wire="imm16"]')).not.toHaveClass(/wire-destaque/);
});

test('clicar num bloco abre a explicação com a página do slide', async ({ page }) => {
  await page.locator('[data-block="regfile"]').click();
  const painel = page.locator('.info-bloco');
  await expect(painel.getByRole('heading', { name: 'Banco de Registradores' })).toBeVisible();
  await expect(painel).toContainText('Aula 06');
  await page.keyboard.press('Escape');
  await expect(painel).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Execução' })).toBeVisible();
});

test('erro em português mantém a última instrução válida; hex e binário funcionam', async ({
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
  await campo(page).fill('100011 10001 01000 0000000000001000');
  await expect(page.locator('.instr-asm')).toHaveText('lw $8, 8($17)');
});

test('link da instrução reabre a mesma instrução; links e hashes antigos caem na tela', async ({
  page,
  context,
}) => {
  await campo(page).fill('sw $8, 8($17)');
  await expect(page).toHaveURL(/#\/\?i=sw/);
  const outra = await context.newPage();
  await outra.goto(page.url());
  await expect(campo(outra)).toHaveValue('sw $8, 8($17)');
  await aba(outra, 'Execução');
  await expect(outra.getByTestId('resultado')).toContainText('M[76] ←');

  await outra.goto('/#/m1?i=j%2096');
  await expect(campo(outra)).toHaveValue('j 96');
  for (const antigo of ['/#/m3', '/#/m1/programa', '/#/m4', '/#/qualquer-coisa']) {
    await outra.goto(antigo);
    await expect(campo(outra)).toBeVisible();
  }
  await expect(outra.getByRole('navigation', { name: 'Módulos' })).toHaveCount(0);
});

test('ajuda de primeira visita aparece uma vez e reabre no "?"', async ({ page }) => {
  const ajuda = page.getByRole('region', { name: 'Como usar' });
  await expect(ajuda).toContainText('Informe uma instrução');
  await expect(ajuda).toContainText('assembly, hexadecimal ou binário');
  await expect(ajuda).toContainText('Registradores e memória');
  await ajuda.getByRole('button', { name: 'Fechar' }).click();
  await expect(ajuda).toHaveCount(0);
  await page.reload();
  await expect(campo(page)).toBeVisible();
  await expect(ajuda).toHaveCount(0);
  await page.getByRole('button', { name: 'Como usar' }).click();
  await expect(ajuda).toBeVisible();
});

test('rodapé com os créditos e a versão; tema escuro funciona', async ({ page }) => {
  await expect(page.getByRole('contentinfo')).toContainText('Monitoria de AOC1 — CEFET-MG');
  await expect(page.getByRole('contentinfo')).toContainText('v0.2');
  const tema = page.getByRole('button', { name: /Tema:/ });
  await tema.click();
  await tema.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('cores: campos da instrução em laranja e endereços em verde-bandeira (não se confundem com o cinza)', async ({
  page,
}) => {
  await page
    .getByRole('group', { name: 'Etapas do ciclo' })
    .getByRole('button', { name: '2. Decodificação' })
    .click();
  const cor = (id: string) =>
    page
      .locator(`[data-wire="${id}"] .wire-line`)
      .first()
      .evaluate((el) => getComputedStyle(el).stroke);
  expect(await cor('rs')).toBe('rgb(211, 84, 0)');
  expect(await cor('pc')).toBe('rgb(0, 156, 59)');
  expect(await cor('rd1')).toBe('rgb(31, 95, 191)');
  await expect(page.getByRole('group', { name: 'Registradores e memória' })).toContainText(
    'Registradores e memória:',
  );
});
