(function () {
  const supportedLanguages = ['zh-CN', 'zh-TW', 'en', 'ru', 'ja', 'ko'];

  function getBrowserLocale() {
    const browserLang = navigator.language || '';

    if (browserLang.startsWith('zh')) {
      return browserLang === 'zh-TW' || browserLang === 'zh-HK' ? 'zh-TW' : 'zh-CN';
    }

    const lang = browserLang.split('-')[0];
    return supportedLanguages.includes(lang) ? lang : 'ja';
  }

  try {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    document.documentElement.lang = settings.language || getBrowserLocale();
  } catch {
    document.documentElement.lang = getBrowserLocale();
  }
})();

