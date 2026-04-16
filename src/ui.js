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

// --- Layout settings ---

const LAYOUT_DEFAULTS = { contentWidth: 52, centered: false, sidebarWidth: 260 };

export async function getSavedLayout() {
  return new Promise(resolve => {
    chrome.storage.local.get('mdLayout', r => resolve({ ...LAYOUT_DEFAULTS, ...r.mdLayout }));
  });
}

export function applyLayout(layout) {
  document.documentElement.style.setProperty('--content-width', layout.contentWidth + 'rem');
  document.documentElement.style.setProperty('--sidebar-width', layout.sidebarWidth + 'px');
  document.body.classList.toggle('content-centered', layout.centered);
}

export function saveLayout(layout) {
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

export function buildSidebar(contentEl, layout) {
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

  const resizer = document.createElement('div');
  resizer.id = 'md-sidebar-resizer';
  attachResizer(resizer, sidebar, layout);

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'md-sidebar-toggle';
  toggleBtn.innerHTML = '&#9776;';
  toggleBtn.title = 'Toggle outline';
  toggleBtn.addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));

  return { sidebar, resizer, toggleBtn };
}

function attachResizer(handle, sidebar, layout) {
  const MIN = 160;
  const MAX = 600;
  let startX = 0;
  let startWidth = 0;
  let dragging = false;

  const onMove = (e) => {
    if (!dragging) return;
    const delta = e.clientX - startX;
    const newWidth = Math.max(MIN, Math.min(MAX, startWidth + delta));
    layout.sidebarWidth = newWidth;
    applyLayout(layout);
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('md-resizing');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    saveLayout(layout);
  };

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startWidth = sidebar.getBoundingClientRect().width;
    document.body.classList.add('md-resizing');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
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

export function buildToolbar(callbacks) {
  const toolbar = document.createElement('div');
  toolbar.id = 'md-toolbar';

  const pdfBtn = makeBtn('PDF', callbacks.onPDF);
  const htmlBtn = makeBtn('HTML', callbacks.onHTML);

  const embedLabel = document.createElement('label');
  embedLabel.id = 'md-embed-label';
  const embedCheck = document.createElement('input');
  embedCheck.type = 'checkbox';
  embedCheck.id = 'md-embed-images';
  embedLabel.appendChild(embedCheck);
  embedLabel.appendChild(document.createTextNode(' Embed imgs'));

  const rawBtn = makeBtn('Raw', callbacks.onRawToggle);
  rawBtn.id = 'md-raw-btn';

  toolbar.append(pdfBtn, htmlBtn, embedLabel, rawBtn);
  return toolbar;
}

function makeBtn(text, onclick) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.addEventListener('click', onclick);
  return btn;
}
