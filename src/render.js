import MarkdownIt from 'markdown-it';
import { katex as katexPlugin } from '@mdit/plugin-katex';
import { imgSize } from '@mdit/plugin-img-size';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
import hljs from 'highlight.js/lib/core';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import java from 'highlight.js/lib/languages/java';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import markdown from 'highlight.js/lib/languages/markdown';
import diff from 'highlight.js/lib/languages/diff';

const langs = { c, cpp, javascript, typescript, python, bash, json, css, xml, java, rust, go, sql, yaml, markdown, diff };
for (const [name, lang] of Object.entries(langs)) hljs.registerLanguage(name, lang);
// Aliases
for (const [alias, target] of Object.entries({ js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', html: 'xml', yml: 'yaml', md: 'markdown' })) {
  hljs.registerAliases(alias, { languageName: target });
}

const md = MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(str, { language: lang }).value;
    }
    return '';
  },
});

md.use(katexPlugin);
md.use(imgSize);
md.use(taskLists, { enabled: true });
md.use(footnote);

export function render(text) {
  return md.render(text);
}
