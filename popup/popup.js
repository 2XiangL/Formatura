const I18N = {
  'zh-CN': {
    popupTitle: '图片格式转换保存',
    jpgQuality: 'JPG 质量',
    pngCompression: 'PNG 压缩',
    low: '低',
    medium: '中',
    high: '高',
    fileNaming: '文件命名',
    originalName: '原始文件名',
    timestampName: '时间戳命名',
    customPrefix: '自定义前缀',
    language: '显示语言',
    saveSettings: '保存设置',
    saved: '已保存',
    customPrefixPlaceholder: '输入前缀...'
  },
  'en': {
    popupTitle: 'Image Format Saver',
    jpgQuality: 'JPG Quality',
    pngCompression: 'PNG Compression',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    fileNaming: 'File Naming',
    originalName: 'Original Filename',
    timestampName: 'Timestamp',
    customPrefix: 'Custom Prefix',
    language: 'Language',
    saveSettings: 'Save Settings',
    saved: 'Saved',
    customPrefixPlaceholder: 'Enter prefix...'
  }
};

const DEFAULTS = {
  jpgQuality: 92,
  pngCompression: 'medium',
  fileNaming: 'original',
  customPrefix: '',
  language: 'zh-CN'
};

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  bindEvents();
});

async function loadSettings() {
  const items = await chrome.storage.sync.get(DEFAULTS);

  document.getElementById('jpgQuality').value = items.jpgQuality;
  document.getElementById('jpgQualityValue').textContent = `${items.jpgQuality}%`;

  document.querySelector(`input[name="pngCompression"][value="${items.pngCompression}"]`).checked = true;
  document.querySelector(`input[name="fileNaming"][value="${items.fileNaming}"]`).checked = true;
  document.querySelector(`input[name="language"][value="${items.language}"]`).checked = true;

  document.getElementById('customPrefix').value = items.customPrefix || '';
  document.getElementById('customPrefixRow').style.display =
    items.fileNaming === 'custom' ? 'block' : 'none';

  applyLanguage(items.language);
}

function bindEvents() {
  const qualitySlider = document.getElementById('jpgQuality');
  const qualityValue = document.getElementById('jpgQualityValue');

  qualitySlider.addEventListener('input', () => {
    qualityValue.textContent = `${qualitySlider.value}%`;
  });

  document.querySelectorAll('input[name="fileNaming"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('customPrefixRow').style.display =
        radio.value === 'custom' ? 'block' : 'none';
    });
  });

  document.querySelectorAll('input[name="language"]').forEach(radio => {
    radio.addEventListener('change', () => {
      applyLanguage(radio.value);
    });
  });

  document.getElementById('saveBtn').addEventListener('click', saveSettings);
}

async function saveSettings() {
  const settings = {
    jpgQuality: parseInt(document.getElementById('jpgQuality').value, 10),
    pngCompression: document.querySelector('input[name="pngCompression"]:checked').value,
    fileNaming: document.querySelector('input[name="fileNaming"]:checked').value,
    customPrefix: document.getElementById('customPrefix').value.trim(),
    language: document.querySelector('input[name="language"]:checked').value
  };

  await chrome.storage.sync.set(settings);
  showToast(settings.language);
}

function applyLanguage(lang) {
  const dict = I18N[lang] || I18N['zh-CN'];

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  const prefixInput = document.getElementById('customPrefix');
  if (prefixInput) {
    prefixInput.placeholder = dict.customPrefixPlaceholder || '';
  }
}

function showToast(lang) {
  const toast = document.getElementById('toast');
  const dict = I18N[lang] || I18N['zh-CN'];
  toast.textContent = dict.saved || 'Saved';
  toast.classList.add('visible');

  setTimeout(() => {
    toast.classList.remove('visible');
  }, 2000);
}
