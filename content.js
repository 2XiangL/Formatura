const LOAD_TIMEOUT_MS = 10000;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return;
  if (message.action === 'convert') {
    handleConversion(message.imageData, message.format, message.srcUrl)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message || 'errorGeneric' }));
    return true;
  }
});

async function handleConversion(imageData, format, srcUrl) {
  const img = await loadImage(imageData);
  const blob = await canvasConvert(img, format);
  const filename = await buildFilename(srcUrl, format);
  triggerDownload(blob, filename);

  return { success: true };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('errorTimeout'));
    }, LOAD_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('errorGeneric'));
    };

    img.src = src;
  });
}

async function canvasConvert(img, format) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');

  try {
    ctx.drawImage(img, 0, 0);
  } catch (e) {
    if (e.name === 'SecurityError') {
      throw new Error('errorTaintedCanvas');
    }
    throw e;
  }

  const quality = format === 'jpeg' ? await getJpgQuality() : undefined;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('errorGeneric'));
          return;
        }
        resolve(blob);
      },
      `image/${format}`,
      quality
    );
  });
}

function getJpgQuality() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ jpgQuality: 92 }, (items) => {
      resolve(items.jpgQuality / 100);
    });
  });
}

async function buildFilename(srcUrl, format) {
  const settings = await getNamingSettings();
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  let baseName = '';

  switch (settings.fileNaming) {
    case 'timestamp':
      baseName = formatTimestamp(new Date());
      break;
    case 'custom':
      baseName = buildCustomName(settings.customPrefix);
      break;
    default:
      baseName = extractNameFromUrl(srcUrl) || document.title || 'image';
      break;
  }

  baseName = sanitizeFilename(baseName) || 'image';
  return `${baseName}.${ext}`;
}

function getNamingSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { fileNaming: 'original', customPrefix: '' },
      resolve
    );
  });
}

function extractNameFromUrl(srcUrl) {
  try {
    const url = new URL(srcUrl);
    if (url.protocol === 'data:') return null;

    const parts = url.pathname.split('/');
    const lastPart = parts[parts.length - 1];
    if (!lastPart) return null;

    const dotIdx = lastPart.lastIndexOf('.');
    const name = dotIdx > 0 ? lastPart.substring(0, dotIdx) : lastPart;
    return decodeURIComponent(name);
  } catch (_) {
    return null;
  }
}

function formatTimestamp(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `image_${y}${m}${d}_${h}${min}${s}`;
}

function buildCustomName(prefix) {
  const p = (prefix || '').trim();
  if (!p) return formatTimestamp(new Date());
  const ts = formatTimestamp(new Date());
  return `${p}_${ts}`;
}

function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 200)
    .trim();
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    anchor.remove();
    URL.revokeObjectURL(url);
  };
  requestAnimationFrame(cleanup);
  setTimeout(cleanup, 1000);
}
