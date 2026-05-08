const MENU_PARENT = 'save-image-as';
const MENU_JPG = 'save-as-jpg';
const MENU_PNG = 'save-as-png';

const IMG_LOAD_TIMEOUT_MS = 10000;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_PARENT,
    title: chrome.i18n.getMessage('menuParent'),
    contexts: ['image']
  });

  chrome.contextMenus.create({
    id: MENU_JPG,
    parentId: MENU_PARENT,
    title: chrome.i18n.getMessage('menuSaveAsJpg'),
    contexts: ['image']
  });

  chrome.contextMenus.create({
    id: MENU_PNG,
    parentId: MENU_PARENT,
    title: chrome.i18n.getMessage('menuSaveAsPng'),
    contexts: ['image']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  const format = info.menuItemId === MENU_JPG ? 'jpeg' : 'png';
  const srcUrl = info.srcUrl;

  if (!srcUrl) return;

  handleConversion(tab.id, srcUrl, format);
});

async function handleConversion(tabId, srcUrl, format) {
  let imageData = null;

  if (srcUrl.startsWith('data:')) {
    imageData = srcUrl;
  } else {
    try {
      imageData = await fetchImageAsDataUrl(srcUrl);
    } catch (err) {
      if (err.message === 'crossOrigin') {
        showError('errorCrossOrigin');
      } else if (err.message === 'timeout') {
        showError('errorTimeout');
      } else if (err.message === 'unsupportedFormat') {
        showError('errorUnsupportedFormat');
      } else {
        showError('errorGeneric');
      }
      return;
    }
  }

  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: 'convert',
      imageData: imageData,
      format: format,
      srcUrl: srcUrl
    });

    if (!response || !response.success) {
      showError((response && response.error) || 'errorGeneric');
    }
  } catch (err) {
    showError('errorGeneric');
  }
}

async function fetchImageAsDataUrl(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMG_LOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      if (response.status === 403 || response.status === 0) {
        throw new Error('crossOrigin');
      }
      throw new Error('httpError');
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/svg+xml')) {
      throw new Error('unsupportedFormat');
    }
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      throw new Error('Not an image');
    }

    const blob = await response.blob();
    return blobToDataUrl(blob);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('timeout');
    }
    if (err.message === 'crossOrigin' || err.message === 'timeout' || err.message === 'httpError' || err.message === 'unsupportedFormat') {
      throw err;
    }
    throw new Error('networkError');
  } finally {
    clearTimeout(timeoutId);
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

async function showError(msgKey) {
  const msg = chrome.i18n.getMessage(msgKey) || msgKey;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: chrome.i18n.getMessage('extName'),
    message: msg,
    priority: 2
  }).catch(() => {});
}
