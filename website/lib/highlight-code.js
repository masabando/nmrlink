import { bundledLanguages, codeToTokens } from 'shiki';

const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

// Shikiのトークンを、既存のpre/codeの中に収まるHTMLにします。
// 未指定・未対応言語はプレーンテキスト。コード中のHTMLは必ずエスケープします。
export async function highlightCode(code, language = 'text') {
  const lang = Object.hasOwn(bundledLanguages, language) ? language : 'text';
  const { tokens } = await codeToTokens(code, { lang, theme: 'github-light' });
  return tokens.map(line => line.map(token => {
    const content = escapeHtml(token.content);
    return token.color ? `<span style="color:${token.color}">${content}</span>` : content;
  }).join('')).join('\n');
}
