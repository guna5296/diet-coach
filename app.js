(() => {
  'use strict';

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

  // DOM参照
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
  const toastEl = document.getElementById('toast');
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');

  let currentProfile = null;
  let draft = createEmptyDraft();
  let isEditMode = false;
  let toastTimer = null;

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
    views.forEach((view) => view.classList.toggle('active', view.id === `view-${targetKey}`));
    navItems.forEach((btn) => {
      const active = btn.dataset.target === targetKey;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    headerTitle.textContent = VIEW_TITLES[targetKey];
    if (targetKey === 'record') {
      RecordModule.renderRecordView();
    } else if (targetKey === 'home') {
      renderMainAppFromProfile();
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

  /* =========================================================
     ホーム画面・設定画面への実データ反映（フェーズ3連動）
     ========================================================= */
  async function renderMainAppFromProfile() {
    if (!currentProfile) return;

    const { profile, plan, customReview } = currentProfile;
    const todayStr = RecordModule.getLocalDateStr(new Date());

    const [todayMeals, allWeightLogs] = await Promise.all([
      DietDB.getByDate('meal_logs', todayStr),
      DietDB.getAll('weight_logs')
    ]);

    // 今日の食事集計
    const mealSums = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    const mealCounts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    let intakeKcal = 0, intakeP = 0, intakeF = 0, intakeC = 0;

    todayMeals.forEach((m) => {
      const k = Number(m.confirmed?.kcal) || 0;
      intakeKcal += k;
      intakeP += Number(m.confirmed?.p) || 0;
      intakeF += Number(m.confirmed?.f) || 0;
      intakeC += Number(m.confirmed?.c) || 0;
      if (mealSums[m.mealType] !== undefined) {
        mealSums[m.mealType] += k;
        mealCounts[m.mealType] += 1;
      }
    });

    intakeKcal = Math.round(intakeKcal);
    const diffKcal = plan.targetCalories - intakeKcal;
    const isOver = diffKcal < 0;

    document.getElementById('home-target-kcal').textContent = `目標 ${plan.targetCalories} kcal`;
    document.getElementById('home-remain-label').textContent = isOver ? '目標を超過' : '残りの目安';
    const remainEl = document.getElementById('home-remain-kcal');
    remainEl.classList.toggle('over', isOver);
    remainEl.innerHTML = isOver
      ? `+${Math.abs(diffKcal)} <small>kcal</small>`
      : `${diffKcal} <small>kcal</small>`;

    document.getElementById('home-intake-kcal').textContent = `摂取済み：${intakeKcal} kcal`;

    const kcalBar = document.getElementById('home-kcal-bar');
    kcalBar.style.width = `${Math.min(100, Math.round((intakeKcal / Math.max(1, plan.targetCalories)) * 100))}%`;
    kcalBar.classList.toggle('over', isOver);

    // PFCバー更新
    document.getElementById('home-p-text').textContent = `${intakeP.toFixed(1)} / ${plan.pfc.p} g`;
    document.getElementById('home-f-text').textContent = `${intakeF.toFixed(1)} / ${plan.pfc.f} g`;
    document.getElementById('home-c-text').textContent = `${intakeC.toFixed(1)} / ${plan.pfc.c} g`;

    document.getElementById('home-p-bar').style.width = `${Math.min(100, Math.round((intakeP / Math.max(1, plan.pfc.p)) * 100))}%`;
    document.getElementById('home-f-bar').style.width = `${Math.min(100, Math.round((intakeF / Math.max(1, plan.pfc.f)) * 100))}%`;
    document.getElementById('home-c-bar').style.width = `${Math.min(100, Math.round((intakeC / Math.max(1, plan.pfc.c)) * 100))}%`;

    // 朝・昼・夕・間食チップ更新
    ['breakfast', 'lunch', 'dinner', 'snack'].forEach((type) => {
      const span = document.getElementById(`home-meal-${type}`);
      const chip = span ? span.closest('.meal-chip') : null;
      if (!span || !chip) return;
      if (mealCounts[type] > 0) {
        span.textContent = `${Math.round(mealSums[type])} kcal`;
        chip.classList.add('recorded');
      } else {
        span.textContent = '未記録';
        chip.classList.remove('recorded');
      }
    });

    // 最新の体重記録を取得（未記録ならプロフィール初期体重を使用）
    const weightOnly = allWeightLogs
      .filter((l) => l.type === 'weight')
      .sort((a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)));

    const latestW = weightOnly.length ? Number(weightOnly[0].value) : Number(profile.currentWeight);
    const weightDateLabel = document.getElementById('home-weight-date');
    if (weightDateLabel) {
      weightDateLabel.textContent = weightOnly.length
        ? `最終測定 ${weightOnly[0].date.slice(5).replace('-', '/')}`
        : '初期登録時の体重';
    }

    const targetW = Number(profile.targetWeight);
    const diffW = Number((latestW - targetW).toFixed(1));

    document.getElementById('home-latest-weight').innerHTML = `${latestW.toFixed(1)} <small>kg</small>`;
    const diffEl = document.getElementById('home-diff-weight');
    if (diffW > 0) {
      diffEl.innerHTML = `あと ${diffW.toFixed(1)} <small>kg</small>`;
    } else if (diffW === 0) {
      diffEl.innerHTML = `達成中 <small>±0kg</small>`;
    } else {
      diffEl.innerHTML = `${Math.abs(diffW).toFixed(1)} <small>kg 余裕</small>`;
    }

    const phaseTag = document.getElementById('home-phase-tag');
    phaseTag.textContent = plan.planMode === 'safety_hold' ? '安全優先（維持目安）' : '初期目標（2〜4週で見直し）';

    const banner = document.getElementById('home-safety-banner');
    if (plan.planMode === 'safety_hold') {
      banner.textContent = '健康・安全面に配慮し、無理な減量目標ではなく維持カロリー目安を表示しています。体調を最優先に進めましょう。';
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }

    const typeLabel = customReview?.typeTitle
      ? escapeHtml(customReview.typeTitle)
      : 'パーソナライズ設定済み';

    const summaryEl = document.getElementById('settings-profile-summary');
    summaryEl.innerHTML = `
      <div class="info-row"><span>診断タイプ</span><strong>${typeLabel}</strong></div>
      <div class="info-row"><span>身長 / 最新体重 / 目標体重</span><strong>${profile.heightCm}cm / ${latestW.toFixed(1)}kg / ${targetW.toFixed(1)}kg</strong></div>
      <div class="info-row"><span>推定基礎代謝 / 消費カロリー</span><strong>${plan.bmr} / ${plan.tdee} kcal</strong></div>
      <div class="info-row"><span>1日の目標カロリー</span><strong>${plan.targetCalories} kcal</strong></div>
      <div class="info-row"><span>目標PFCバランス</span><strong>P:${plan.pfc.p}g / F:${plan.pfc.f}g / C:${plan.pfc.c}g</strong></div>
      <div class="info-row"><span>最終承認日</span><strong>${new Date(currentProfile.approvedAt).toLocaleDateString('ja-JP')}</strong></div>
    `;
  }

  /* =========================================================
     初期登録・カウンセリング フロー制御
     ========================================================= */
  async function saveDraftQuietly() {
    if (isEditMode) return;
    try {
      await DietDB.setState('onboarding_draft', draft);
    } catch (err) {
      console.error('途中保存に失敗:', err);
    }
  }

  function openOnboarding(editExisting = false, startStep = 0) {
    isEditMode = editExisting;
    if (editExisting && currentProfile) {
      draft = mergeWithDefaultDraft(JSON.parse(JSON.stringify(currentProfile)));
      draft.stepIndex = startStep;
      obBtnCancel.classList.remove('hidden');
    } else {
      obBtnCancel.classList.add('hidden');
    }

    appShell.classList.add('hidden');
    onboardingScreen.classList.remove('hidden');
    renderOnboardingStep();
  }

  function closeOnboardingToApp() {
    onboardingScreen.classList.add('hidden');
    appShell.classList.remove('hidden');
    renderMainAppFromProfile();
  }

  function renderOnboardingStep() {
    const idx = draft.stepIndex;
    const progressPct = Math.round(((idx + 1) / TOTAL_STEPS) * 100);
    obProgressBar.style.width = `${progressPct}%`;
    obBtnBack.classList.toggle('hidden', idx === 0);

    if (idx === 0) {
      obStepLabel.textContent = 'ようこそ';
      obBtnNext.textContent = draft.profile.heightCm ? '前回の続きから進む' : '初期設定をはじめる';
      renderWelcomeStep();
    } else if (idx === 1) {
      obStepLabel.textContent = 'ステップ 1/4：基本プロフィール';
      obBtnNext.textContent = '保存して次へ';
      renderProfileStep();
    } else if (idx === 2) {
      obStepLabel.textContent = 'ステップ 2/4：健康状態の確認';
      obBtnNext.textContent = '保存して次へ';
      renderHealthStep();
    } else if (idx === 3) {
      obStepLabel.textContent = 'ステップ 3/4：活動量と減量ペース';
      obBtnNext.textContent = '初回カウンセリングへ';
      renderGoalStep();
    } else if (idx < REVIEW_STEP_INDEX) {
      const qIdx = idx - BASE_STEPS_BEFORE_COUNSELING;
      obStepLabel.textContent = `カウンセリング（${qIdx + 1} / ${COUNSELING_QUESTIONS.length}）`;
      obBtnNext.textContent = qIdx === COUNSELING_QUESTIONS.length - 1 ? '分析と計画を作成する' : '次の質問へ';
      renderCounselingQuestion(qIdx);
    } else {
      obStepLabel.textContent = 'ステップ 4/4：分析結果と計画の確認';
      obBtnNext.textContent = isEditMode ? 'この内容で更新する' : 'この計画ではじめる';
      renderReviewStep();
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function renderWelcomeStep() {
    const hasResume = !isEditMode && draft.stepIndex === 0 && (draft.profile.heightCm || draft.profile.birthDate);
    obContent.innerHTML = `
      <div class="ob-hero">
        <div class="ob-icon-badge" aria-hidden="true">🌿</div>
        <h1 class="ob-title">My Diet Coach へようこそ</h1>
        <p class="ob-lead">
          極端な制限ではなく、あなたの生活リズムや性格に合わせて無理なく続けるための専用アプリです。
        </p>
      </div>

      ${hasResume ? `<div class="alert-box info">前回の入力内容が途中保存されています。続きから再開できます。</div>` : ''}

      <article class="card">
        <ul class="feature-list">
          <li>
            <strong>1. あなた専用の目安を安全に計算</strong>
            基本情報と健康状態から、無理のないカロリー・PFCバランスを自動算出します。
          </li>
          <li>
            <strong>2. 一問ずつの初回カウンセリング＆タイプ分析</strong>
            生活習慣や好みから「つまずきやすい点」と「あなた専用の攻略アプローチ」を自動で組み立てます。
          </li>
          <li>
            <strong>3. データはこのiPhone内だけに保存</strong>
            入力した情報はすべて端末内に保存され、途中で閉じても自動保存されます。
          </li>
        </ul>
      </article>
    `;
  }

  function renderProfileStep() {
    const p = draft.profile;
    obContent.innerHTML = `
      <h2 class="ob-title">基本プロフィール</h2>
      <p class="ob-lead">基礎代謝と安全な目標、あなたに合うアプローチを分析するために使用します。</p>

      <article class="card">
        <div class="form-group">
          <label class="form-label" for="inp-birthdate">生年月日 <span class="badge-req">必須</span></label>
          <input type="date" id="inp-birthdate" class="form-input" value="${escapeHtml(p.birthDate)}" max="${RecordModule.getLocalDateStr(new Date())}">
        </div>

        <div class="input-row">
          <div class="form-group">
            <label class="form-label" for="inp-gender">性別 <span class="badge-req">必須</span></label>
            <select id="inp-gender" class="form-select">
              <option value="female" ${p.gender === 'female' ? 'selected' : ''}>女性</option>
              <option value="male" ${p.gender === 'male' ? 'selected' : ''}>男性</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="inp-bloodtype">血液型 <span class="badge-opt">任意</span></label>
            <select id="inp-bloodtype" class="form-select">
              <option value="" ${!p.bloodType ? 'selected' : ''}>未選択</option>
              <option value="A" ${p.bloodType === 'A' ? 'selected' : ''}>A型</option>
              <option value="B" ${p.bloodType === 'B' ? 'selected' : ''}>B型</option>
              <option value="O" ${p.bloodType === 'O' ? 'selected' : ''}>O型</option>
              <option value="AB" ${p.bloodType === 'AB' ? 'selected' : ''}>AB型</option>
              <option value="skip" ${p.bloodType === 'skip' ? 'selected' : ''}>回答しない</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="inp-height">身長（cm） <span class="badge-req">必須</span></label>
          <input type="number" id="inp-height" class="form-input" inputmode="decimal" step="0.1" min="100" max="220" placeholder="例：158.0" value="${escapeHtml(p.heightCm)}">
        </div>

        <div class="input-row">
          <div class="form-group">
            <label class="form-label" for="inp-weight">現在体重（kg） <span class="badge-req">必須</span></label>
            <input type="number" id="inp-weight" class="form-input" inputmode="decimal" step="0.1" min="30" max="200" placeholder="例：58.0" value="${escapeHtml(p.currentWeight)}">
          </div>
          <div class="form-group">
            <label class="form-label" for="inp-target-weight">目標体重（kg） <span class="badge-req">必須</span></label>
            <input type="number" id="inp-target-weight" class="form-input" inputmode="decimal" step="0.1" min="30" max="200" placeholder="例：53.0" value="${escapeHtml(p.targetWeight)}">
          </div>
        </div>
      </article>

      <article class="card">
        <div class="input-row">
          <div class="form-group">
            <label class="form-label" for="inp-bodyfat">体脂肪率（%） <span class="badge-opt">任意</span></label>
            <input type="number" id="inp-bodyfat" class="form-input" inputmode="decimal" step="0.1" min="5" max="60" placeholder="例：30.0" value="${escapeHtml(p.bodyFat)}">
          </div>
          <div class="form-group">
            <label class="form-label" for="inp-period">希望時期 <span class="badge-opt">任意</span></label>
            <select id="inp-period" class="form-select">
              <option value="" ${p.targetPeriod === '' ? 'selected' : ''}>期限なし・マイペース</option>
              <option value="3m" ${p.targetPeriod === '3m' ? 'selected' : ''}>3ヶ月くらい</option>
              <option value="6m" ${p.targetPeriod === '6m' ? 'selected' : ''}>半年くらい</option>
              <option value="1y" ${p.targetPeriod === '1y' ? 'selected' : ''}>1年くらい</option>
            </select>
          </div>
        </div>
      </article>
    `;
  }

  function renderHealthStep() {
    const h = draft.health;
    const renderRadioGroup = (name, label, options, currentVal, noteKey, notePlaceholder) => {
      const buttons = options.map((opt) => `
        <button type="button" class="choice-chip ${currentVal === opt.value ? 'selected' : ''}"
          data-health-key="${name}" data-health-val="${opt.value}">
          ${opt.label}
        </button>
      `).join('');

      const noteHtml = noteKey && currentVal === 'yes' ? `
        <input type="text" class="form-input" data-health-note="${noteKey}"
          placeholder="${escapeHtml(notePlaceholder)}" value="${escapeHtml(h[noteKey] || '')}">
      ` : '';

      return `
        <div class="form-group">
          <label class="form-label">${label}</label>
          <div class="chip-grid">${buttons}</div>
          ${noteHtml}
        </div>
      `;
    };

    obContent.innerHTML = `
      <h2 class="ob-title">健康状態の確認</h2>
      <p class="ob-lead">無理のない安全な計画にするための確認です。回答したくない項目は「回答しない」を選べます。</p>

      <article class="card">
        ${renderRadioGroup('pregnancy', '妊娠・授乳の有無', [
          { value: 'none', label: '該当しない' },
          { value: 'pregnant', label: '妊娠中' },
          { value: 'breastfeeding', label: '授乳中' },
          { value: 'skip', label: '回答しない' }
        ], h.pregnancy)}

        ${renderRadioGroup('chronicDisease', '治療中の病気はありますか？', [
          { value: 'none', label: 'なし' },
          { value: 'yes', label: 'あり' },
          { value: 'skip', label: '回答しない' }
        ], h.chronicDisease, 'chronicDiseaseNote', '差し支えない範囲で記入（任意）')}

        ${renderRadioGroup('medication', '定期的に飲んでいるお薬はありますか？', [
          { value: 'none', label: 'なし' },
          { value: 'yes', label: 'あり' },
          { value: 'skip', label: '回答しない' }
        ], h.medication, 'medicationNote', '差し支えない範囲で記入（任意）')}

        ${renderRadioGroup('medicalRestriction', '医師からの食事・運動制限はありますか？', [
          { value: 'none', label: 'なし' },
          { value: 'yes', label: 'あり' },
          { value: 'skip', label: '回答しない' }
        ], h.medicalRestriction, 'medicalRestrictionNote', '制限の内容（任意）')}

        ${renderRadioGroup('eatingDisorder', '摂食障害のご経験など、減量にあたり配慮が必要なことはありますか？', [
          { value: 'none', label: 'なし' },
          { value: 'yes', label: 'あり' },
          { value: 'skip', label: '回答しない' }
        ], h.eatingDisorder)}
      </article>
    `;

    obContent.querySelectorAll('[data-health-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.health[btn.dataset.healthKey] = btn.dataset.healthVal;
        saveDraftQuietly();
        renderHealthStep();
      });
    });

    obContent.querySelectorAll('[data-health-note]').forEach((input) => {
      input.addEventListener('input', () => {
        draft.health[input.dataset.healthNote] = input.value;
        saveDraftQuietly();
      });
    });
  }

  function renderGoalStep() {
    const g = draft.goal;
    const actCards = Object.entries(NutritionEngine.ACTIVITY_LEVELS).map(([key, info]) => `
      <button type="button" class="option-card ${g.activityLevel === key ? 'selected' : ''}" data-goal-key="activityLevel" data-goal-val="${key}">
        <strong>${info.label}</strong>
      </button>
    `).join('');

    const paceCards = Object.entries(NutritionEngine.PACE_OPTIONS).map(([key, info]) => `
      <button type="button" class="option-card ${g.pace === key ? 'selected' : ''}" data-goal-key="pace" data-goal-val="${key}">
        <strong>${info.label}</strong>
        <span>${key === 'slow' ? 'リバウンドしにくく、続けやすいおすすめペース' : key === 'standard' ? '食事管理と軽い運動を組み合わせて進めるペース' : 'まずは今の体重を維持しながら食習慣を整える'}</span>
      </button>
    `).join('');

    obContent.innerHTML = `
      <h2 class="ob-title">普段の活動量と減量ペース</h2>
      <p class="ob-lead">1日の消費カロリーと無理のない減量ペースを決めます。最初の2〜4週間の記録を見て、いつでも調整できます。</p>

      <article class="card">
        <div class="form-group">
          <label class="form-label">ふだんの活動量</label>
          <div class="option-list">${actCards}</div>
        </div>
      </article>

      <article class="card">
        <div class="form-group">
          <label class="form-label">希望するペース</label>
          <div class="option-list">${paceCards}</div>
        </div>
      </article>
    `;

    obContent.querySelectorAll('[data-goal-key]').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.goal[btn.dataset.goalKey] = btn.dataset.goalVal;
        saveDraftQuietly();
        renderGoalStep();
      });
    });
  }

  function renderCounselingQuestion(qIdx) {
    const q = COUNSELING_QUESTIONS[qIdx];
    const saved = draft.counseling[q.key] || { selected: [], text: '' };
    if (typeof saved === 'string') {
      draft.counseling[q.key] = { selected: [], text: saved };
    }
    const entry = draft.counseling[q.key] || { selected: [], text: '' };

    const chipsHtml = q.chips.map((chipText) => {
      const isSelected = entry.selected.includes(chipText);
      return `<button type="button" class="choice-chip ${isSelected ? 'selected' : ''}" data-chip="${escapeHtml(chipText)}">${escapeHtml(chipText)}</button>`;
    }).join('');

    obContent.innerHTML = `
      <div class="coach-bubble">
        <span class="coach-category">${escapeHtml(q.category)}</span>
        <div>${escapeHtml(q.question)}</div>
      </div>

      <article class="card">
        <label class="form-label">当てはまるものを選択（複数可）</label>
        <div class="chip-grid">${chipsHtml}</div>

        <div class="form-group">
          <label class="form-label" for="inp-counseling-text">補足・自由に記入 <span class="badge-opt">任意</span></label>
          <textarea id="inp-counseling-text" class="form-textarea" placeholder="${escapeHtml(q.placeholder)}">${escapeHtml(entry.text || '')}</textarea>
        </div>
      </article>

      <div class="skip-link-row">
        <button type="button" id="btn-skip-question" class="skip-link">わからない・この質問はスキップする</button>
      </div>
    `;

    obContent.querySelectorAll('[data-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.chip;
        if (!draft.counseling[q.key]) draft.counseling[q.key] = { selected: [], text: '' };
        const arr = draft.counseling[q.key].selected;
        const pos = arr.indexOf(val);
        if (pos >= 0) arr.splice(pos, 1);
        else arr.push(val);
        btn.classList.toggle('selected', pos < 0);
        if (draft.customReview.source === 'app') draft.customReview.editedByUser = false;
        saveDraftQuietly();
      });
    });

    const textarea = document.getElementById('inp-counseling-text');
    textarea.addEventListener('input', () => {
      if (!draft.counseling[q.key]) draft.counseling[q.key] = { selected: [], text: '' };
      draft.counseling[q.key].text = textarea.value;
      if (draft.customReview.source === 'app') draft.customReview.editedByUser = false;
      saveDraftQuietly();
    });

    document.getElementById('btn-skip-question').addEventListener('click', () => {
      draft.counseling[q.key] = { selected: [], text: '（スキップ）' };
      draft.stepIndex += 1;
      saveDraftQuietly();
      renderOnboardingStep();
    });
  }

  function flattenCounselingForSummary() {
    const out = {};
    COUNSELING_QUESTIONS.forEach((q) => {
      const item = draft.counseling[q.key];
      if (!item) {
        out[q.key] = '';
      } else if (typeof item === 'string') {
        out[q.key] = item;
      } else {
        const parts = [];
        if (item.selected && item.selected.length) parts.push(item.selected.join('・'));
        if (item.text && item.text.trim() && item.text !== '（スキップ）') parts.push(item.text.trim());
        out[q.key] = parts.join('／') || (item.text === '（スキップ）' ? '回答スキップ' : '');
      }
    });
    return out;
  }

  function extractTypeTitle(text, fallback) {
    const m = String(text || '').match(/【診断タイプ】\s*([^\n]+)/);
    return m && m[1] ? m[1].trim() : fallback;
  }

  function renderReviewStep() {
    const plan = NutritionEngine.buildPlan(draft);
    const flatCounseling = flattenCounselingForSummary();
    const autoAnalysis = NutritionEngine.buildPersonalizedAnalysis(draft, plan, flatCounseling);

    if (!draft.customReview.editedByUser || !draft.customReview.personaText) {
      draft.customReview = {
        source: 'app',
        typeTitle: autoAnalysis.typeTitle,
        personaText: autoAnalysis.personaText,
        coachingPolicy: autoAnalysis.coachingPolicy,
        editedByUser: false
      };
    } else if (!draft.customReview.typeTitle) {
      draft.customReview.typeTitle = extractTypeTitle(draft.customReview.personaText, autoAnalysis.typeTitle);
    }

    const isCustomOrGpt = draft.customReview.source === 'chatgpt' || draft.customReview.source === 'manual';
    const warningsHtml = plan.warnings.map((w) => `<div class="alert-box warning">${escapeHtml(w)}</div>`).join('');

    const periodText = plan.estimatedWeeks
      ? `約 ${plan.estimatedWeeks} 週間（約 ${Math.max(1, Math.round(plan.estimatedWeeks / 4.3))} ヶ月）目安`
      : plan.planMode === 'safety_hold'
        ? '安全優先のため減量期間は自動設定しません'
        : '維持・生活リズム改善ペース';

    const analysisBodyHtml = !isCustomOrGpt
      ? `
        <div class="analysis-type-wrap">
          <span class="analysis-badge">あなた専用のダイエット傾向</span>
          <h3 class="analysis-type-title">${escapeHtml(autoAnalysis.typeTitle)}</h3>
        </div>
        <p class="analysis-paragraph">${formatMultilineHtml(autoAnalysis.profileAnalysis)}</p>

        <div class="analysis-section-label">最初の2週間の攻略アプローチ</div>
        <ol class="approach-list">
          ${autoAnalysis.approaches.map((ap, i) => `
            <li class="approach-item">
              <span class="approach-num">${i + 1}</span>
              <div>
                <strong>${escapeHtml(ap.title)}</strong>
                <p>${escapeHtml(ap.detail)}</p>
              </div>
            </li>
          `).join('')}
        </ol>

        <div class="coach-promise-box">
          <span class="promise-label">コーチからの約束</span>
          <p>${escapeHtml(draft.customReview.coachingPolicy)}</p>
        </div>
      `
      : `
        <div class="analysis-type-wrap">
          <span class="analysis-badge ${draft.customReview.source === 'chatgpt' ? 'gpt' : ''}">
            ${draft.customReview.source === 'chatgpt' ? 'ChatGPT 精密分析を反映中' : 'カスタム編集済み'}
          </span>
          <h3 class="analysis-type-title">${escapeHtml(draft.customReview.typeTitle)}</h3>
        </div>
        <div class="analysis-custom-text">${formatMultilineHtml(draft.customReview.personaText)}</div>
        <div class="coach-promise-box">
          <span class="promise-label">コーチからの約束</span>
          <p>${formatMultilineHtml(draft.customReview.coachingPolicy)}</p>
        </div>
      `;

    obContent.innerHTML = `
      <h2 class="ob-title">あなたの分析結果と初期計画</h2>
      <p class="ob-lead">まずはこの作戦と推定目安で2〜4週間記録し、体重の推移と体調を見ながら柔軟に調整していきましょう。</p>

      ${warningsHtml}

      <article class="card analysis-card">
        ${analysisBodyHtml}

        <div class="analysis-footer-actions">
          <button type="button" id="btn-toggle-manual-edit" class="text-btn">文章を自分で微調整する</button>
          ${isCustomOrGpt ? `<button type="button" id="btn-reset-auto-analysis" class="text-btn muted">アプリ自動分析に戻す</button>` : ''}
        </div>

        <div id="manual-edit-panel" class="manual-edit-panel hidden">
          <div class="form-group">
            <label class="form-label" for="inp-persona">分析・攻略アプローチ（編集可）</label>
            <textarea id="inp-persona" class="form-textarea" rows="7">${escapeHtml(draft.customReview.personaText)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="inp-policy">コーチからの約束（編集可）</label>
            <textarea id="inp-policy" class="form-textarea" rows="3">${escapeHtml(draft.customReview.coachingPolicy)}</textarea>
          </div>
          <button type="button" id="btn-apply-manual-edit" class="btn-secondary full-width">微調整を反映する</button>
        </div>
      </article>

      <article class="card">
        <div class="card-header">
          <h3 class="card-title">1日の栄養目標（初期推定値）</h3>
          <span class="card-sub">基礎代謝 ${plan.bmr} kcal</span>
        </div>
        <div class="calorie-hero">
          <div class="calorie-main">
            <span class="calorie-label">目標摂取カロリー</span>
            <strong class="calorie-value">${plan.targetCalories} <small>kcal</small></strong>
          </div>
          <div class="calorie-sub">
            <span>推定消費：${plan.tdee} kcal</span>
          </div>
        </div>
        <div class="metric-row three-col">
          <div class="metric-box">
            <span class="metric-label">たんぱく質(P)</span>
            <strong class="metric-value small">${plan.pfc.p}<small>g</small></strong>
          </div>
          <div class="metric-box">
            <span class="metric-label">脂質(F)</span>
            <strong class="metric-value small">${plan.pfc.f}<small>g</small></strong>
          </div>
          <div class="metric-box">
            <span class="metric-label">炭水化物(C)</span>
            <strong class="metric-value small">${plan.pfc.c}<small>g</small></strong>
          </div>
        </div>
        <p class="form-hint">達成ペースの目安：${escapeHtml(periodText)}</p>
      </article>

      <article class="card deep-ai-card">
        <div class="card-header">
          <h3 class="card-title">ChatGPTでさらに詳しく分析する</h3>
          <span class="badge-opt">任意</span>
        </div>
        <p class="deep-ai-desc">
          そのまま始めても大丈夫です。より踏み込んだオーダーメイド分析にしたい場合は、下のボタンで指示文をコピーしてChatGPTに貼り付け、返ってきた文章をここに取り込めます。
        </p>

        <button type="button" id="btn-copy-deep-prompt" class="btn-secondary full-width">
          1. ChatGPT用の精密分析プロンプトをコピー
        </button>

        <div class="deep-ai-paste-area">
          <label class="form-label" for="inp-gpt-paste">2. ChatGPTの分析結果を貼り付け</label>
          <textarea id="inp-gpt-paste" class="form-textarea" rows="4" placeholder="ChatGPTから返ってきた分析文をここに貼り付けて、下のボタンを押してください"></textarea>
          <button type="button" id="btn-apply-gpt-analysis" class="btn-outline full-width" style="margin-top: 8px;">
            この分析結果をアプリに反映する
          </button>
        </div>
      </article>
    `;

    const manualPanel = document.getElementById('manual-edit-panel');
    document.getElementById('btn-toggle-manual-edit').addEventListener('click', () => {
      manualPanel.classList.toggle('hidden');
    });

    document.getElementById('btn-apply-manual-edit').addEventListener('click', () => {
      const pText = document.getElementById('inp-persona').value.trim();
      const cPolicy = document.getElementById('inp-policy').value.trim();
      if (!pText) {
        showToast('分析内容を入力してください');
        return;
      }
      draft.customReview = {
        source: 'manual',
        typeTitle: extractTypeTitle(pText, draft.customReview.typeTitle || autoAnalysis.typeTitle),
        personaText: pText,
        coachingPolicy: cPolicy || autoAnalysis.coachingPolicy,
        editedByUser: true
      };
      saveDraftQuietly();
      showToast('内容を更新しました');
      renderReviewStep();
    });

    const resetBtn = document.getElementById('btn-reset-auto-analysis');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        draft.customReview = {
          source: 'app',
          typeTitle: autoAnalysis.typeTitle,
          personaText: autoAnalysis.personaText,
          coachingPolicy: autoAnalysis.coachingPolicy,
          editedByUser: false
        };
        saveDraftQuietly();
        showToast('アプリの自動分析に戻しました');
        renderReviewStep();
      });
    }

    document.getElementById('btn-copy-deep-prompt').addEventListener('click', async () => {
      const promptText = NutritionEngine.buildDeepAnalysisPrompt(draft, plan, flatCounseling);
      const ok = await copyToClipboard(promptText);
      showToast(ok ? 'コピーしました！ChatGPTにそのまま貼り付けてください' : 'コピーに失敗しました');
    });

    document.getElementById('btn-apply-gpt-analysis').addEventListener('click', () => {
      const pasted = document.getElementById('inp-gpt-paste').value.trim();
      if (!pasted) {
        showToast('ChatGPTの回答を貼り付けてから押してください');
        return;
      }
      draft.customReview = {
        source: 'chatgpt',
        typeTitle: extractTypeTitle(pasted, autoAnalysis.typeTitle),
        personaText: pasted,
        coachingPolicy: draft.customReview.coachingPolicy || autoAnalysis.coachingPolicy,
        editedByUser: true
      };
      saveDraftQuietly();
      showToast('ChatGPTの精密分析を反映しました');
      renderReviewStep();
    });
  }

  function validateAndCollectCurrentStep() {
    if (draft.stepIndex === 1) {
      const birthDate = document.getElementById('inp-birthdate').value;
      const gender = document.getElementById('inp-gender').value;
      const bloodType = document.getElementById('inp-bloodtype').value;
      const heightCm = Number(document.getElementById('inp-height').value);
      const currentWeight = Number(document.getElementById('inp-weight').value);
      const targetWeight = Number(document.getElementById('inp-target-weight').value);
      const bodyFat = document.getElementById('inp-bodyfat').value;
      const targetPeriod = document.getElementById('inp-period').value;

      if (!birthDate) {
        showToast('生年月日を入力してください');
        return false;
      }
      const age = NutritionEngine.calculateAge(birthDate);
      if (age === null || age < 15 || age > 100) {
        showToast('生年月日を正しく入力してください');
        return false;
      }
      if (!heightCm || heightCm < 100 || heightCm > 220) {
        showToast('身長を正しく入力してください（100〜220cm）');
        return false;
      }
      if (!currentWeight || currentWeight < 30 || currentWeight > 200) {
        showToast('現在体重を正しく入力してください');
        return false;
      }
      if (!targetWeight || targetWeight < 30 || targetWeight > 200) {
        showToast('目標体重を正しく入力してください');
        return false;
      }

      draft.profile = {
        birthDate,
        gender,
        bloodType,
        heightCm,
        currentWeight,
        targetWeight,
        bodyFat,
        targetPeriod
      };

      if (draft.customReview.source === 'app') {
        draft.customReview.editedByUser = false;
      }
    }
    return true;
  }

  async function handleNextStep() {
    if (!validateAndCollectCurrentStep()) return;

    if (draft.stepIndex < REVIEW_STEP_INDEX) {
      draft.stepIndex += 1;
      await saveDraftQuietly();
      renderOnboardingStep();
      return;
    }

    const plan = NutritionEngine.buildPlan(draft);
    const flatCounseling = flattenCounselingForSummary();
    const autoAnalysis = NutritionEngine.buildPersonalizedAnalysis(draft, plan, flatCounseling);

    const finalRecord = {
      profile: draft.profile,
      health: draft.health,
      goal: draft.goal,
      counseling: draft.counseling,
      counselingSummary: flatCounseling,
      customReview: {
        source: draft.customReview.source || 'app',
        typeTitle: draft.customReview.typeTitle || autoAnalysis.typeTitle,
        personaText: draft.customReview.personaText || autoAnalysis.personaText,
        coachingPolicy: draft.customReview.coachingPolicy || autoAnalysis.coachingPolicy,
        editedByUser: draft.customReview.source !== 'app'
      },
      plan,
      approvedAt: new Date().toISOString()
    };

    try {
      await DietDB.setState('user_profile', finalRecord);
      await DietDB.deleteState('onboarding_draft');
      currentProfile = finalRecord;
      isEditMode = false;
      closeOnboardingToApp();
      navigateTo('home');
      showToast('分析結果とダイエット計画を保存しました');
    } catch (err) {
      console.error('保存エラー:', err);
      showToast('保存に失敗しました。もう一度お試しください');
    }
  }

  async function handleBackStep() {
    if (draft.stepIndex <= 0) return;
    draft.stepIndex -= 1;
    await saveDraftQuietly();
    renderOnboardingStep();
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.error('Service Worker登録失敗:', err);
      });
    });
  }

  function initEvents() {
    obBtnNext.addEventListener('click', handleNextStep);
    obBtnBack.addEventListener('click', handleBackStep);
    obBtnCancel.addEventListener('click', () => {
      if (currentProfile) closeOnboardingToApp();
    });

    navItems.forEach((btn) => btn.addEventListener('click', () => navigateTo(btn.dataset.target)));
    document.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', () => navigateTo(el.dataset.nav)));
    document.querySelectorAll('[data-toast]').forEach((el) => el.addEventListener('click', () => showToast(el.dataset.toast)));

    // ホーム画面の朝・昼・夕・間食チップから記録画面へショートカット
    document.querySelectorAll('[data-quick-meal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        RecordModule.setSelectedDate(RecordModule.getLocalDateStr(new Date()));
        RecordModule.setActiveMealCategory(btn.dataset.quickMeal);
        navigateTo('record');
      });
    });

    document.getElementById('btn-open-onboarding').addEventListener('click', () => openOnboarding(true, 1));
    document.getElementById('btn-edit-plan').addEventListener('click', () => openOnboarding(true, REVIEW_STEP_INDEX));
    document.getElementById('btn-open-master-manager').addEventListener('click', () => RecordModule.openMasterManagerModal());

    window.addEventListener('online', () => {
      updateNetworkStatus();
      showToast('オンラインに復帰しました');
    });
    window.addEventListener('offline', () => {
      updateNetworkStatus();
      showToast('オフラインになりました（記録・閲覧は可能です）');
    });
  }

  async function boot() {
    renderTodayDate();
    updateNetworkStatus();
    updatePwaStatus();

    RecordModule.init({
      showToast,
      onDataChanged: async () => {
        await renderMainAppFromProfile();
      }
    });

    initEvents();
    registerServiceWorker();

    try {
      const savedProfile = await DietDB.getState('user_profile');
      if (savedProfile) {
        currentProfile = mergeWithDefaultDraft(savedProfile);
        currentProfile.plan = savedProfile.plan;
        currentProfile.approvedAt = savedProfile.approvedAt;
        closeOnboardingToApp();
      } else {
        const savedDraft = await DietDB.getState('onboarding_draft');
        draft = mergeWithDefaultDraft(savedDraft);
        openOnboarding(false, draft.stepIndex || 0);
      }
    } catch (err) {
      console.error('起動時DB読み込みエラー:', err);
      openOnboarding(false, 0);
    }
  }

  boot();
})();
