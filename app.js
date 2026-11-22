(() => {
  'use strict';

  function showBootError(detail) {
    const box = document.getElementById('boot-error-box');
    const msg = document.getElementById('boot-error-msg');
    if (box && msg) {
      msg.textContent = String(detail || '不明なエラー');
      box.classList.remove('hidden');
    }
  }

  window.addEventListener('error', (event) => {
    const appVisible = !document.getElementById('app-shell')?.classList.contains('hidden');
    const obVisible = !document.getElementById('onboarding-screen')?.classList.contains('hidden');
    if (!appVisible && !obVisible) {
      showBootError(`${event.message || 'スクリプトエラー'} (${event.filename || ''}:${event.lineno || ''})`);
    }
  });

  const VIEW_TITLES = {
    home: 'ホーム',
    record: '記録',
    analytics: '分析',
    coach: 'AIコーチ',
    settings: '設定'
  };

  const COUNSELING_QUESTIONS = [
    {
      key: 'purpose',
      category: 'ダイエットの目的',
      question: '今回、減量に取り組もうと思った一番の理由や「こうなりたい」という理想を教えてください。',
      chips: ['健康診断の数値を良くしたい', '好きな服をきれいに着たい', '体を軽くして疲れにくくしたい', '写真に写る自分に自信を持ちたい', '産前・昔の体型に近づけたい'],
      placeholder: '例：無理せず5kg落として、すっきり動ける体になりたい'
    },
    {
      key: 'afterGoal',
      category: 'ダイエットの目的',
      question: '目標を達成できたら、やってみたいことや楽しみにしていることはありますか？',
      chips: ['おしゃれ・買い物を楽しむ', '家族と写真をもっと撮る', '旅行や外出を思い切り楽しむ', '体調よく毎日を過ごす'],
      placeholder: '自由に書いてください（未記入でも大丈夫です）'
    },
    {
      key: 'pastExperience',
      category: '過去の経験',
      question: 'これまでのダイエットで「うまくいった方法」や「続かなかった理由」はありますか？',
      chips: ['極端な食事制限でリバウンドした', '記録が面倒でやめてしまった', '忙しくて運動が続かなかった', '糖質オフは辛かった', 'ダイエットはほぼ初めて'],
      placeholder: '例：夜の炭水化物抜きはストレスで続かなかった'
    },
    {
      key: 'favFood',
      category: '食事習慣',
      question: '好きな食べ物や、我慢しすぎるとストレスになる食べ物を教えてください。',
      chips: ['甘いもの・スイーツ', 'パン・麺類', '白いごはん', '揚げ物', 'カフェラテ・甘い飲み物', 'お酒・おつまみ'],
      placeholder: '例：チョコレート、パスタ、パンが好き'
    },
    {
      key: 'dislikeFood',
      category: '食事習慣',
      question: '苦手な食べ物や、アレルギー・避けたい食材はありますか？',
      chips: ['特になし', '魚介類が苦手', '乳製品が苦手', '大豆製品が苦手', '生野菜が苦手'],
      placeholder: 'あれば具体的に書いてください'
    },
    {
      key: 'eatingHabit',
      category: '食事習慣',
      question: 'ふだんの朝・昼・晩の食事や、間食・外食のパターンに近いものはどれですか？',
      chips: ['朝食は軽め・または抜きがち', '昼は残り物や麺類が多い', '夕方〜夜に間食しがち', '家族と同じメニューを食べる', '外食・テイクアウトが週2回以上'],
      placeholder: '例：昼は簡単に済ませて、15時にお菓子を食べることが多い'
    },
    {
      key: 'overeatTrigger',
      category: '食事習慣',
      question: 'どんなときに「つい食べ過ぎてしまう」ことが多いですか？',
      chips: ['家事・育児や仕事の疲れ', 'イライラ・ストレス', '夜みんなが寝たあとの一人時間', 'お腹が空きすぎたとき', '外食やイベントのとき'],
      placeholder: '当てはまる場面があれば教えてください'
    },
    {
      key: 'lifestyle',
      category: '生活習慣',
      question: 'ふだんの生活リズムや睡眠の状況を教えてください。',
      chips: ['家事・育児が中心', '仕事と家事の両立で忙しい', '睡眠は6時間未満になりがち', '睡眠は6〜7時間ほど確保', '夜更かししやすい'],
      placeholder: '例：朝6時半起き、夜は23時半ごろ就寝'
    },
    {
      key: 'exerciseHabit',
      category: '生活習慣',
      question: '現在の運動習慣や、日常の活動量はどのくらいですか？',
      chips: ['運動はほとんどしていない', '買い物や送迎でよく歩く', '家でストレッチ・筋トレを少し', '週1〜2回運動している', '運動より食事改善を優先したい'],
      placeholder: '例：週に数回ウォーキングならできそう'
    },
    {
      key: 'personality',
      category: '性格・行動傾向',
      question: 'ご自身の性格で「続けやすいやり方」や「苦手なこと」に近いものはどれですか？',
      chips: ['完璧を目指すと疲れやすい', '細かいグラム計算は苦手', '数字やグラフで見えると嬉しい', '少しずつ習慣化する方が合っている', 'マイペースに続けたい'],
      placeholder: 'ご自身の傾向があれば教えてください'
    },
    {
      key: 'stressImpact',
      category: '性格・行動傾向',
      question: 'ストレスを感じたとき、食事やモチベーションにどんな変化が出やすいですか？',
      chips: ['甘いものや間食が増える', '記録をつける気力がなくなる', '体重が少し増えると落ち込みやすい', '逆に食欲が落ちる', 'あまり影響しない'],
      placeholder: '例：体重が増えた日にやる気が下がりやすい'
    },
    {
      key: 'aiPreference',
      category: 'AIコーチへの希望',
      question: '最後に、AIコーチにはどんな雰囲気でサポートしてほしいですか？',
      chips: ['基本はやさしく、改善点は率直に', '背中を押してくれる前向きな声かけ', '理由や根拠をわかりやすく説明してほしい', '責めずに次の一歩を提案してほしい'],
      placeholder: '例：食べ過ぎた日は責めず、翌日の整え方を教えてほしい'
    }
  ];

  function createEmptyDraft() {
    return {
      stepIndex: 0,
      profile: {
        birthDate: '',
        gender: 'female',
        bloodType: '',
        heightCm: '',
        currentWeight: '',
        targetWeight: '',
        bodyFat: '',
        targetPeriod: ''
      },
      health: {
        pregnancy: 'none',
        chronicDisease: 'none',
        chronicDiseaseNote: '',
        medication: 'none',
        medicationNote: '',
        medicalRestriction: 'none',
        medicalRestrictionNote: '',
        eatingDisorder: 'none'
      },
      goal: {
        activityLevel: 'normal',
        pace: 'slow'
      },
      counseling: {},
      customReview: {
        source: 'app',
        typeTitle: '',
        personaText: '',
        coachingPolicy: '',
        editedByUser: false
      }
    };
  }

  function mergeWithDefaultDraft(saved) {
    const base = createEmptyDraft();
    if (!saved) return base;
    return {
      ...base,
      ...saved,
      profile: { ...base.profile, ...(saved.profile || {}) },
      health: { ...base.health, ...(saved.health || {}) },
      goal: { ...base.goal, ...(saved.goal || {}) },
      counseling: { ...(saved.counseling || {}) },
      customReview: { ...base.customReview, ...(saved.customReview || {}) }
    };
  }

  const BASE_STEPS_BEFORE_COUNSELING = 4;
  const REVIEW_STEP_INDEX = BASE_STEPS_BEFORE_COUNSELING + COUNSELING_QUESTIONS.length;
  const TOTAL_STEPS = REVIEW_STEP_INDEX + 1;

  const onboardingScreen = document.getElementById('onboarding-screen');
  const obStepLabel = document.getElementById('ob-step-label');
  const obProgressBar = document.getElementById('ob-progress-bar');
  const obContent = document.getElementById('ob-content');
  const obBtnBack = document.getElementById('ob-btn-back');
  const obBtnNext = document.getElementById('ob-btn-next');
  const obBtnCancel = document.getElementById('ob-btn-cancel');

  const appShell = document.getElementById('app-shell');
  const headerTitle = document.getElementById('header-title');
  const networkBadge = document.getElementById('network-badge');
  const todayDateEl = document.getElementById('today-date');
  const pwaStatusEl = document.getElementById('pwa-status');
  const persistStatusEl = document.getElementById('settings-persist-status');
  const toastEl = document.getElementById('toast');
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');

  let currentProfile = null;
  let currentViewKey = 'home';
  let draft = createEmptyDraft();
  let isEditMode = false;
  let toastTimer = null;

  function bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMultilineHtml(str) {
    return escapeHtml(str).replace(/\n/g, '<br>');
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) {
      return false;
    }
  }

  function showToast(message) {
    if (!toastEl || !message) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2600);
  }

  function navigateTo(targetKey) {
    if (!VIEW_TITLES[targetKey]) return;
    currentViewKey = targetKey;
    views.forEach((view) => view.classList.toggle('active', view.id === `view-${targetKey}`));
    navItems.forEach((btn) => {
      const active = btn.dataset.target === targetKey;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    if (headerTitle) headerTitle.textContent = VIEW_TITLES[targetKey];

    if (targetKey === 'record' && typeof RecordModule !== 'undefined') {
      RecordModule.renderRecordView();
    } else if (targetKey === 'home') {
      renderMainAppFromProfile();
    } else if (targetKey === 'analytics' && typeof AnalyticsModule !== 'undefined') {
      AnalyticsModule.render(currentProfile);
    } else if (targetKey === 'coach' && typeof CoachModule !== 'undefined') {
      CoachModule.render(currentProfile);
    } else if (targetKey === 'settings') {
      renderMainAppFromProfile();
      if (typeof BackupModule !== 'undefined') BackupModule.updateBackupIndicators();
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function renderTodayDate() {
    if (!todayDateEl) return;
    const now = new Date();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    todayDateEl.textContent = `${now.getMonth() + 1}月${now.getDate()}日（${weekdays[now.getDay()]}）`;
  }

  function updateNetworkStatus() {
    if (!networkBadge) return;
    const isOnline = navigator.onLine;
    networkBadge.textContent = isOnline ? 'オンライン' : 'オフライン';
    networkBadge.classList.toggle('online', isOnline);
    networkBadge.classList.toggle('offline', !isOnline);

    const coachOffline = document.getElementById('coach-offline-banner');
    if (coachOffline) coachOffline.classList.toggle('hidden', isOnline);
  }

  function updatePwaStatus() {
    if (!pwaStatusEl) return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    pwaStatusEl.textContent = isStandalone
      ? 'ホーム画面アプリ（PWA）として起動中'
      : 'ブラウザ（Safari等）で表示中';
  }

  async function updatePersistenceStatus() {
    if (!persistStatusEl || typeof BackupModule === 'undefined') return;
    try {
      const res = await BackupModule.requestPersistence();
      if (!res.supported) {
        persistStatusEl.textContent = '
