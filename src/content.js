import { render } from './render.js';
import { loadThemes, applyTheme, getSavedLayout, applyLayout, assignHeadingIds, buildSidebar, initScrollSpy } from './ui.js';
import { exportPDF, exportHTML } from './export.js';
import baseCSS from './base.css';
import katexCSS from 'katex/dist/katex.min.css';

(async () => {
  // Only run on file:// .md/.markdown files
  const path = location.pathname.toLowerCase();
  if (!path.endsWith('.md') && !path.endsWith('.markdown')) return;

  // Grab raw markdown text from Chrome's plain-text <pre>
  const pre = document.querySelector('pre');
  if (!pre) return;
  const rawText = pre.textContent;

  // Inject CSS — rewrite KaTeX font URLs to extension paths
  const fixedKatexCSS = katexCSS.replace(/url\(fonts\//g, `url(${chrome.runtime.getURL('fonts/')}`);
  const style = document.createElement('style');
  style.id = 'md-injected-styles';
  style.textContent = fixedKatexCSS + '\n' + baseCSS;
  document.head.appendChild(style);

  // Set page title to filename
  const filename = decodeURIComponent(location.pathname.split('/').pop());
  document.title = filename;

  // Render markdown
  const html = render(rawText);

  // Build content div
  const contentDiv = document.createElement('div');
  contentDiv.id = 'md-content';
  contentDiv.innerHTML = html;
  assignHeadingIds(contentDiv);

  // Replace page body
  document.body.innerHTML = '';
  document.body.id = 'md-renderer';

  // Load themes and apply saved theme
  const themes = await loadThemes();
  const stored = await new Promise(resolve => {
    chrome.storage.local.get('mdTheme', r => resolve(r));
  });
  const savedThemeId = stored.mdTheme;
  const themeId = themes[savedThemeId] ? savedThemeId : 'gruvbox-dark';
  applyTheme(themes[themeId]);

  // Load and apply layout settings
  const layout = await getSavedLayout();
  applyLayout(layout);

  // Build sidebar
  const sidebarResult = buildSidebar(contentDiv, layout);

  // Raw view element
  const rawPre = document.createElement('pre');
  rawPre.id = 'md-raw';
  rawPre.textContent = rawText;
  rawPre.style.display = 'none';
  let isRaw = false;

  // Assemble page
  if (sidebarResult) {
    document.body.appendChild(sidebarResult.sidebar);
    document.body.appendChild(sidebarResult.resizer);
    document.body.appendChild(sidebarResult.toggleBtn);
  } else {
    document.body.classList.add('sidebar-collapsed');
  }
  document.body.appendChild(contentDiv);
  document.body.appendChild(rawPre);

  // Init scroll spy
  if (sidebarResult) {
    initScrollSpy(contentDiv, sidebarResult.sidebar);
  }

  // Live-apply changes from the popup
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.mdTheme) {
      const id = changes.mdTheme.newValue;
      if (themes[id]) applyTheme(themes[id]);
    }
    if (changes.mdLayout) {
      Object.assign(layout, changes.mdLayout.newValue);
      applyLayout(layout);
    }
  });

  // Handle actions dispatched from the extension popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.action) return;
    if (msg.action === 'exportPDF') {
      exportPDF(contentDiv).then(() => sendResponse({ ok: true }));
      return true;
    }
    if (msg.action === 'exportHTML') {
      exportHTML(contentDiv, !!msg.embedImages).then(() => sendResponse({ ok: true }));
      return true;
    }
    if (msg.action === 'toggleRaw') {
      isRaw = !isRaw;
      contentDiv.style.display = isRaw ? 'none' : '';
      rawPre.style.display = isRaw ? '' : 'none';
      sendResponse({ ok: true, raw: isRaw });
      return;
    }
  });
})();
