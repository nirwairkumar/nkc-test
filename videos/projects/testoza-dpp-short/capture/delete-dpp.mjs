// Deletes every "DPP 07" test on the demo student's My Tests (cleanup between takes).
import { start } from './rec.mjs';
const R = await start(process.env.TZ_OUT + '/del/');
const { page, wait } = R;
await page.goto('https://app.testoza.com/my-tests', { waitUntil: 'load' });
await page.getByText(/^DPP 07/).first().waitFor({ timeout: 30000 }).catch(() => {});
await wait(2000);
for (let i = 0; i < (+process.env.MAX || 5); i++) {
  const n = await page.getByText(/^DPP 07/).count();
  console.log('DPP cards', n);
  if (!n) break;
  const card = page.locator('div', { has: page.getByText(/^DPP 07/) }).filter({ has: page.getByLabel('More options') }).last();
  await card.getByLabel('More options').first().tap();
  await page.getByRole('menuitem', { name: /Delete test/ }).tap();
  await wait(800);
  await R.dump('del-' + i);
  const confirm = page.getByRole('alertdialog').getByRole('button', { name: /Delete/ });
  if (await confirm.count()) await confirm.last().tap();
  await wait(3500);
}
await R.finish();
