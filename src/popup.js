const LAYOUT_DEFAULTS = { contentWidth: 52, centered: false, sidebarWidth: 260 };

const themeSelect = document.getElementById('theme');
const widthSlider = document.getElementById('width');
const widthValue = document.getElementById('width-value');
const sidebarSlider = document.getElementById('sidebar-width');
const sidebarValue = document.getElementById('sidebar-width-value');
const centeredCheck = document.getElementById('centered');

function saveTheme(id) {
  chrome.storage.local.set({ mdTheme: id });
}

function saveLayout(layout) {
  chrome.storage.local.set({ mdLayout: layout });
}

(async () => {
  const themesResp = await fetch(chrome.runtime.getURL('themes.json'));
  const themes = await themesResp.json();

  const stored = await new Promise(resolve => {
    chrome.storage.local.get(['mdTheme', 'mdLayout'], resolve);
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
})();
