// --- Theme management ---

export async function loadThemes() {
  const resp = await fetch(chrome.runtime.getURL('themes.json'));
  return resp.json();
}

export function applyTheme(theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--${key}`, value);
  }
  root.style.setProperty('--font', theme.font || "'JetBrains Mono', monospace");
}

export async function getSavedTheme() {
  return new Promise(resolve => {
    chrome.storage.local.get('mdTheme', r => resolve(r.mdTheme || 'gruvbox-dark'));
  });
}

export function saveTheme(id) {
  chrome.storage.local.set({ mdTheme: id });
}

// --- Layout settings ---

const LAYOUT_DEFAULTS = { contentWidth: 52, centered: false };

export async function getSavedLayout() {
  return new Promise(resolve => {
    chrome.storage.local.get('mdLayout', r => resolve({ ...LAYOUT_DEFAULTS, ...r.mdLayout }));
  });
}

export function applyLayout(layout) {
  document.documentElement.style.setProperty('--content-width', layout.contentWidth + 'rem');
  document.body.classList.toggle('content-centered', layout.centered);
}

function saveLayout(layout) {
  chrome.storage.local.set({ mdLayout: layout });
}

// --- Sidebar / TOC ---

function slugify(text) {
  return text.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
}

export function assignHeadingIds(container) {
  const counts = {};
  container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
    let slug = slugify(h.textContent);
    if (!slug) slug = 'heading';
    counts[slug] = (counts[slug] || 0) + 1;
    h.id = counts[slug] > 1 ? `${slug}-${counts[slug]}` : slug;
  });
}

export function buildSidebar(contentEl) {
  const headings = [...contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  if (!headings.length) return null;

  const sidebar = document.createElement('nav');
  sidebar.id = 'md-sidebar';

  const title = document.createElement('div');
  title.id = 'md-toc-title';
  title.textContent = 'Contents';
  sidebar.appendChild(title);

  const toc = document.createElement('div');
  toc.id = 'md-toc';
  toc.appendChild(buildNestedList(headings));
  sidebar.appendChild(toc);

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'md-sidebar-toggle';
  toggleBtn.innerHTML = '&#9776;';
  toggleBtn.title = 'Toggle outline';
  toggleBtn.addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));

  return { sidebar, toggleBtn };
}

function buildNestedList(headings) {
  const root = document.createElement('ul');
  const stack = [{ el: root, level: 0 }];

  for (const h of headings) {
    const level = parseInt(h.tagName[1]);
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    a.dataset.target = h.id;

    // Go up the stack until we find a parent at a lower level
    while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();

    const parent = stack[stack.length - 1];

    // If we need to nest deeper, create a child <ul> on the last <li> of the parent
    if (level > parent.level) {
      let ul;
      const lastLi = parent.el.querySelector(':scope > li:last-child');
      if (lastLi && level > parent.level + 1) {
        // Need to nest further — reuse or create ul on lastLi
        ul = lastLi.querySelector(':scope > ul') || document.createElement('ul');
        if (!ul.parentElement) lastLi.appendChild(ul);
      } else {
        ul = document.createElement('ul');
        // If parent el already has li children, attach to last li; otherwise attach to parent
        const attachTo = parent.el.querySelector(':scope > li:last-child') || parent.el;
        if (attachTo.tagName === 'LI') {
          attachTo.appendChild(ul);
          addCollapseToggle(attachTo);
        } else {
          attachTo.appendChild(ul);
        }
      }
      ul.appendChild(li);
      stack.push({ el: ul, level });
    } else {
      parent.el.appendChild(li);
    }

    li.appendChild(a);
  }

  return root;
}

function addCollapseToggle(li) {
  if (li.querySelector(':scope > .toc-toggle')) return;
  const toggle = document.createElement('span');
  toggle.className = 'toc-toggle';
  toggle.textContent = '\u25BE'; // down triangle
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const ul = li.querySelector(':scope > ul');
    if (!ul) return;
    const collapsed = ul.style.display === 'none';
    ul.style.display = collapsed ? '' : 'none';
    toggle.textContent = collapsed ? '\u25BE' : '\u25B8'; // down / right triangle
  });
  li.insertBefore(toggle, li.firstChild);
}

// --- Scroll spy ---

export function initScrollSpy(contentEl, tocEl) {
  const headings = [...contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  if (!headings.length) return;

  function update() {
    let current = null;
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= 20) current = h;
    }
    tocEl.querySelectorAll('a.active').forEach(a => a.classList.remove('active'));
    if (current) {
      const link = tocEl.querySelector(`a[data-target="${current.id}"]`);
      if (link) {
        link.classList.add('active');
        // Scroll the sidebar to keep active link visible
        link.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

// --- Toolbar ---

export function buildToolbar(themes, currentThemeId, callbacks) {
  const toolbar = document.createElement('div');
  toolbar.id = 'md-toolbar';

  // Theme dropdown
  const select = document.createElement('select');
  select.id = 'md-theme-select';
  for (const [id, theme] of Object.entries(themes)) {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = theme.name;
    if (id === currentThemeId) opt.selected = true;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => callbacks.onThemeChange(select.value));

  // PDF button
  const pdfBtn = makeBtn('PDF', callbacks.onPDF);

  // HTML button
  const htmlBtn = makeBtn('HTML', callbacks.onHTML);

  // Embed images checkbox
  const embedLabel = document.createElement('label');
  embedLabel.id = 'md-embed-label';
  const embedCheck = document.createElement('input');
  embedCheck.type = 'checkbox';
  embedCheck.id = 'md-embed-images';
  embedLabel.appendChild(embedCheck);
  embedLabel.appendChild(document.createTextNode(' Embed imgs'));

  // Raw/rendered toggle
  const rawBtn = makeBtn('Raw', callbacks.onRawToggle);
  rawBtn.id = 'md-raw-btn';

  // Settings button -> opens layout panel
  const settingsBtn = makeBtn('Settings', () => {
    document.getElementById('md-settings-panel').classList.toggle('hidden');
  });
  settingsBtn.id = 'md-settings-btn';

  toolbar.append(select, pdfBtn, htmlBtn, embedLabel, rawBtn, settingsBtn);
  return toolbar;
}

export function buildSettingsPanel(layout) {
  const panel = document.createElement('div');
  panel.id = 'md-settings-panel';
  panel.className = 'hidden';

  // Width slider
  const widthRow = document.createElement('div');
  widthRow.className = 'settings-row';
  const widthLabel = document.createElement('label');
  widthLabel.textContent = 'Width';
  const widthValue = document.createElement('span');
  widthValue.className = 'settings-value';
  widthValue.textContent = layout.contentWidth + 'rem';
  const widthSlider = document.createElement('input');
  widthSlider.type = 'range';
  widthSlider.min = '30';
  widthSlider.max = '120';
  widthSlider.value = layout.contentWidth;
  widthSlider.addEventListener('input', () => {
    layout.contentWidth = parseInt(widthSlider.value);
    widthValue.textContent = layout.contentWidth + 'rem';
    applyLayout(layout);
    saveLayout(layout);
  });
  widthRow.append(widthLabel, widthSlider, widthValue);

  // Center toggle
  const centerRow = document.createElement('div');
  centerRow.className = 'settings-row';
  const centerLabel = document.createElement('label');
  centerLabel.textContent = 'Centered';
  const centerToggle = document.createElement('input');
  centerToggle.type = 'checkbox';
  centerToggle.checked = layout.centered;
  centerToggle.addEventListener('change', () => {
    layout.centered = centerToggle.checked;
    applyLayout(layout);
    saveLayout(layout);
  });
  centerRow.append(centerLabel, centerToggle);

  panel.append(widthRow, centerRow);

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target.id !== 'md-settings-btn') {
      panel.classList.add('hidden');
    }
  });

  return panel;
}

function makeBtn(text, onclick) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.addEventListener('click', onclick);
  return btn;
}
