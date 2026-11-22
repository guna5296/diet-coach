(() => {
  'use strict';

  const VIEW_TITLES = {
    home: 'ホーム',
    record: '記録',
    analytics: '分析',
    coach: 'AIコーチ',
    settings: '設定'
  };

  const headerTitle = document.getElementById('header-title');
  const networkBadge = document.getElementById('network-badge');
  const todayDateEl = document.getElementById('today-date');
  const pwaStatusEl = document.getElementById('pwa-status');
  const toastEl = document.getElementById('toast');

  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');

  let toastTimer = null;

  /**
   * 画面切り替え
   */
  function navigateTo(targetKey) {
    if (!VIEW_TITLES[targetKey]) return;

    views.forEach((view) => {
      const isTarget = view.id === `view-${targetKey}`;
      view.classList.toggle('active', isTarget);
    });

    navItems.forEach((btn) => {
      const isTarget = btn.dataset.target === targetKey;
      btn.classList.toggle('active', isTarget);
      if (isTarget) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    headerTitle.textContent = VIEW_TITLES[targetKey];
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /**
   * トースト通知表示
   */
  function showToast(message) {
    if (!toastEl || !message) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2400);
  }

  /**
   * 今日の日付を表示
   */
  function renderTodayDate() {
    if (!todayDateEl) return;
    const now = new Date();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const weekday = weekdays[now.getDay()];
    todayDateEl.textContent = `${month}月${day}日（${weekday}）`;
  }

  /**
   * オンライン・オフライン表示の更新
   */
  function updateNetworkStatus() {
    if (!networkBadge) return;
    const isOnline = navigator.onLine;
    networkBadge.textContent = isOnline ? 'オンライン' : 'オフライン';
    networkBadge.classList.toggle('online', isOnline);
    networkBadge.classList.toggle('offline', !isOnline);
  }

  /**
   * PWA（ホーム画面起動）状態の判定
   */
  function updatePwaStatus() {
    if (!pwaStatusEl) return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    pwaStatusEl.textContent = isStandalone
      ? 'ホーム画面アプリ（PWA）として起動中'
      : 'ブラウザ（Safari等）で表示中';
  }

  /**
   * Service Worker登録
   */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.info('Service WorkerはHTTPS環境（GitHub Pages等）で有効になります。');
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.info('Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    });
  }

  /**
   * イベント初期化
   */
  function initEvents() {
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        navigateTo(btn.dataset.target);
      });
    });

    document.querySelectorAll('[data-nav]').forEach((el) => {
      el.addEventListener('click', () => {
        navigateTo(el.dataset.nav);
      });
    });

    document.querySelectorAll('[data-toast]').forEach((el) => {
      el.addEventListener('click', () => {
        showToast(el.dataset.toast);
      });
    });

    window.addEventListener('online', () => {
      updateNetworkStatus();
      showToast('オンラインに復帰しました');
    });

    window.addEventListener('offline', () => {
      updateNetworkStatus();
      showToast('オフラインになりました（記録・閲覧は可能です）');
    });
  }

  // 起動処理
  renderTodayDate();
  updateNetworkStatus();
  updatePwaStatus();
  initEvents();
  registerServiceWorker();
})();
