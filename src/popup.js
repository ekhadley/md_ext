const LAYOUT_DEFAULTS = { contentWidth: 52, centered: false, sidebarWidth: 260 };

const themeSelect = document.getElementById('theme');
const widthSlider = document.getElementById('width');
const widthValue = document.getElementById('width-value');
const sidebarSlider = document.getElementById('sidebar-width');
const sidebarValue = document.getElementById('sidebar-width-value');
const centeredCheck = document.getElementById('centered');
const pdfBtn = document.getElementById('pdf-btn');
const htmlBtn = document.getElementById('html-btn');
const rawBtn = document.getElementById('raw-btn');
const embedCheck = document.getElementById('embed-images');
const hint = document.getElementById('hint');

function saveTheme(id) {
  chrome.storage.local.set({ mdTheme: id });
}

function saveLayout(layout) {
  chrome.storage.local.set({ mdLayout: layout });
}

function getActiveTab() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs[0]));
  });
}

async function sendToActiveTab(msg) {
  const tab = await getActiveTab();
  if (!tab) return { ok: false, error: 'No active tab' };
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tab.id, msg, response => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve({ ok: true, response });
      }
    });
  });
}

function showError(text) {
  hint.textContent = text;
  hint.classList.add('error');
  setTimeout(() => {
    hint.textContent = 'Changes apply to open markdown tabs.';
    hint.classList.remove('error');
  }, 3000);
}

async function guardedSend(msg) {
  const r = await sendToActiveTab(msg);
  if (!r.ok) showError('Open a markdown file to use this.');
  return r;
}

(async () => {
  const themesResp = await fetch(chrome.runtime.getURL('themes.json'));
  const themes = await themesResp.json();

  const stored = await new Promise(resolve => {
    chrome.storage.local.get(['mdTheme', 'mdLayout', 'mdEmbedImages'], resolve);
  });

  const themeId = themes[stored.mdTheme] ? stored.mdTheme : 'gruvbox-dark';
  const layout = { ...LAYOUT_DEFAULTS, ...stored.mdLayout };

  for (const [id, theme] of Object.entries(themes)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = theme.name;
    if (id === themeId) opt.selected = true;
    themeSelect.appendChild(opt);
  }

  widthSlider.value = layout.contentWidth;
  widthValue.textContent = layout.contentWidth + 'rem';
  sidebarSlider.value = layout.sidebarWidth;
  sidebarValue.textContent = layout.sidebarWidth + 'px';
  centeredCheck.checked = layout.centered;
  embedCheck.checked = !!stored.mdEmbedImages;

  themeSelect.addEventListener('change', () => saveTheme(themeSelect.value));

  widthSlider.addEventListener('input', () => {
    layout.contentWidth = parseInt(widthSlider.value);
    widthValue.textContent = layout.contentWidth + 'rem';
    saveLayout(layout);
  });

  sidebarSlider.addEventListener('input', () => {
    layout.sidebarWidth = parseInt(sidebarSlider.value);
    sidebarValue.textContent = layout.sidebarWidth + 'px';
    saveLayout(layout);
  });

  centeredCheck.addEventListener('change', () => {
    layout.centered = centeredCheck.checked;
    saveLayout(layout);
  });

  embedCheck.addEventListener('change', () => {
    chrome.storage.local.set({ mdEmbedImages: embedCheck.checked });
  });

  pdfBtn.addEventListener('click', async () => {
    pdfBtn.disabled = true;
    await guardedSend({ action: 'exportPDF' });
    pdfBtn.disabled = false;
    window.close();
  });

  htmlBtn.addEventListener('click', async () => {
    htmlBtn.disabled = true;
    await guardedSend({ action: 'exportHTML', embedImages: embedCheck.checked });
    htmlBtn.disabled = false;
    window.close();
  });

  rawBtn.addEventListener('click', async () => {
    await guardedSend({ action: 'toggleRaw' });
    window.close();
  });
})();
