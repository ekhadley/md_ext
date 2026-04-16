import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportPDF(contentEl) {
  const filename = decodeURIComponent(location.pathname.split('/').pop()).replace(/\.(md|markdown)$/i, '');
  const bg = getComputedStyle(document.body).backgroundColor || '#ffffff';

  const canvas = await html2canvas(contentEl, {
    scale: 2,
    backgroundColor: bg,
    useCORS: true,
    logging: false,
    windowWidth: contentEl.scrollWidth,
  });

  const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  let remaining = imgHeight;
  let position = 0;
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  remaining -= pageHeight;
  while (remaining > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    remaining -= pageHeight;
  }

  pdf.save(filename + '.pdf');
}

export async function exportHTML(contentEl, embedImages) {
  let html = contentEl.innerHTML;

  if (embedImages) {
    const imgs = contentEl.querySelectorAll('img');
    for (const img of imgs) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        html = html.replaceAll(img.getAttribute('src'), dataURL);
      } catch (e) {
        // CORS or tainted canvas — skip this image
        console.warn('Could not embed image:', img.src, e);
      }
    }
  }

  // Collect current theme CSS variables from inline styles
  const rootStyle = document.documentElement.getAttribute('style') || '';
  // Get our injected stylesheet content
  const styleEl = document.getElementById('md-injected-styles');
  const cssText = styleEl ? styleEl.textContent : '';

  const filename = decodeURIComponent(location.pathname.split('/').pop()).replace(/\.(md|markdown)$/i, '');

  const doc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${filename}</title>
<style>
:root { ${rootStyle} }
${cssText}
#md-sidebar, #md-toolbar, #md-sidebar-toggle, #md-raw { display: none !important; }
#md-content { margin-left: 0; max-width: 100%; }
</style>
</head>
<body id="md-renderer">
<div id="md-content">${html}</div>
</body>
</html>`;

  download(doc, filename + '.html', 'text/html');
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
