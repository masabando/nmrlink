import test from 'node:test';
import assert from 'node:assert/strict';
import { highlightCode } from '../lib/highlight-code.js';

const text = html => html.replace(/<span[^>]*>|<\/span>/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&');
test('highlighted languages preserve exact source including HTML and blank lines', async () => {
  for (const language of ['js', 'html', 'json', 'bash', 'sh', 'dotenv']) {
    const code = 'const value = "<script>&</script>";\n\n';
    const html = await highlightCode(code, language);
    assert.equal(text(html), code);
    assert.ok(!html.includes('<script>'));
  }
  assert.match(await highlightCode('const value = 42;', 'js'), /<span style="color:/);
});
test('missing and unknown languages safely display plain text', async () => {
  for (const language of [undefined, 'not-a-language', 'text']) {
    assert.equal(await highlightCode('<img src=x onerror=alert(1)>', language), '&lt;img src=x onerror=alert(1)&gt;');
  }
});
