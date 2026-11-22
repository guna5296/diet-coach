(() => {
  'use strict';

  const VIEW_TITLES = {
    home: 'ホーム',
    record: '記録',
    analytics: '分析',
    coach: 'AIコーチ',
    settings: '設定'
  };

  // 一問一答カウンセリングの質問定義（1問ずつ対話形式で実施）
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

  // デフォルト下書きデータ
  function createEmptyDraft() {
    return {
      stepIndex: 0,
      profile: {
        birthDate: '',
        gender: 'female',
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
        personaText: '',
        coachingPolicy: '',
        editedByUser: false
      }
    };
  }

  // 総ステップ構成：
  // 0: ようこそ / 1: プロフィール / 2: 健康状態 / 3: 活動量・ペース
  // 4〜15: カウンセリング12問 / 16: 計画確認・承認
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

  // 状態
  let currentProfile = null; // 確定済みデータ
  let draft = createEmptyDraft();
  let isEditMode = false; // 設定画面から開いた場合はtrue
  let toastTimer = null;

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
     確定済みプロフィールのホーム・設定画面への反映
     ========================================================= */
  function renderMainAppFromProfile() {
    if (!currentProfile) return;

    const { profile, plan } = currentProfile;
    const intakeKcal = 0; // フェーズ3で当日食事集計を反映
    const remainKcal = Math.max(0, plan.targetCalories - intakeKcal);

    document.getElementById('home-target-kcal').textContent = `目標 ${plan.targetCalories} kcal`;
    document.getElementById('home-remain-kcal').innerHTML = `${remainKcal} <small>kcal</small>`;
    document.getElementById('home-intake-kcal').textContent = `摂取済み：${intakeKcal} kcal`;
    document.getElementById('home-kcal-bar').style.width = '0%';

    document.getElementById('home-p-text').textContent = `0 / ${plan.pfc.p} g`;
    document.getElementById('home-f-text').textContent = `0 / ${plan.pfc.f} g`;
    document.getElementById('home-c-text').textContent = `0 / ${plan.pfc.c} g`;

    const latestW = Number(profile.currentWeight);
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

    // 設定画面サマリー
    const summaryEl = document.getElementById('settings-profile-summary');
    summaryEl.innerHTML = `
      <div class="info-row"><span>身長 / 現在体重 / 目標体重</span><strong>${profile.heightCm}cm / ${latestW.toFixed(1)}kg / ${targetW.toFixed(1)}kg</strong></div>
      <div class="info-row"><span>推定基礎代謝 / 消費カロリー</span><strong>${plan.bmr} / ${plan.tdee} kcal</strong></div>
      <div class="info-row"><span>1日の目標カロリー</span><strong>${plan.targetCalories} kcal</strong></div>
      <div class="info-row"><span>目標PFCバランス</span><strong>P:${plan.pfc.p}g / F:${plan.pfc.f}g / C:${plan.pfc.c}g</strong></div>
      <div class="info-row"><span>最終承認日</span><strong>${new Date(currentProfile.approvedAt).toLocaleDateString('ja-JP')}</strong></div>
    `;
  }

  /* =========================================================
     初期登録・カウンセリング フロー制御（途中保存・再開対応）
     ========================================================= */
  async function saveDraftQuietly() {
    if (isEditMode) return; // 既存確定データの編集時は途中下書きを別管理しない
    try {
      await DietDB.setState('onboarding_draft', draft);
    } catch (err) {
      console.error('途中保存に失敗:', err);
    }
  }

  function openOnboarding(editExisting = false, startStep = 0) {
    isEditMode = editExisting;
    if (editExisting && currentProfile) {
      draft = JSON.parse(JSON.stringify(currentProfile));
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
      obBtnNext.textContent = qIdx === COUNSELING_QUESTIONS.length - 1 ? '計画を作成する' : '次の質問へ';
      renderCounselingQuestion(qIdx);
    } else {
      obStepLabel.textContent = 'ステップ 4/4：計画の確認・承認';
      obBtnNext.textContent = isEditMode ? 'この内容で更新する' : 'この計画ではじめる';
      renderReviewStep();
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Step 0: ようこそ
  function renderWelcomeStep() {
    const hasResume = !isEditMode && draft.stepIndex === 0 && (draft.profile.heightCm || draft.profile.birthDate);
    obContent.innerHTML = `
      <div class="ob-hero">
        <div class="ob-icon-badge" aria-hidden="true">🌿</div>
        <h1 class="ob-title">My Diet Coach へようこそ</h1>
        <p class="ob-lead">
          極端な制限ではなく、あなたの生活リズムに合わせて無理なく続けるための専用アプリです。
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
            <strong>2. 一問ずつの初回カウンセリング</strong>
            好みや生活リズムを少しずつお聞きし、今後のAI相談に活かします（スキップ可能）。
          </li>
          <li>
            <strong>3. データはこのiPhone内だけに保存</strong>
            入力した情報はすべて端末内に保存され、途中で閉じても自動保存されます。
          </li>
        </ul>
      </article>
    `;
  }

  // Step 1: 基本プロフィール
  function renderProfileStep() {
    const p = draft.profile;
    obContent.innerHTML = `
      <h2 class="ob-title">基本プロフィール</h2>
      <p class="ob-lead">基礎代謝と安全な目標を計算するために使用します。あとから設定画面でいつでも変更できます。</p>

      <article class="card">
        <div class="form-group">
          <label class="form-label" for="inp-birthdate">生年月日 <span class="badge-req">必須</span></label>
          <input type="date" id="inp-birthdate" class="form-input" value="${escapeHtml(p.birthDate)}" max="${new Date().toISOString().split('T')[0]}">
        </div>

        <div class="form-group">
          <label class="form-label" for="inp-gender">性別 <span class="badge-req">必須</span></label>
          <select id="inp-gender" class="form-select">
            <option value="female" ${p.gender === 'female' ? 'selected' : ''}>女性</option>
            <option value="male" ${p.gender === 'male' ? 'selected' : ''}>男性</option>
          </select>
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

  // Step 2: 健康状態の確認
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
        const key = btn.dataset.healthKey;
        draft.health[key] = btn.dataset.healthVal;
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

  // Step 3: 活動量・減量ペース
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

  // Step 4〜15: 一問一答カウンセリング
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
        saveDraftQuietly();
      });
    });

    const textarea = document.getElementById('inp-counseling-text');
    textarea.addEventListener('input', () => {
      if (!draft.counseling[q.key]) draft.counseling[q.key] = { selected: [], text: '' };
      draft.counseling[q.key].text = textarea.value;
      saveDraftQuietly();
    });

    document.getElementById('btn-skip-question').addEventListener('click', () => {
      draft.counseling[q.key] = { selected: [], text: '（スキップ）' };
      draft.stepIndex += 1;
      saveDraftQuietly();
      renderOnboardingStep();
    });
  }

  // カウンセリング回答を文字列に整形したコピーを作成
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

  // Step 16: ダイエット計画と人物像の確認・承認
  function renderReviewStep() {
    const plan = NutritionEngine.buildPlan(draft);
    const flatCounseling = flattenCounselingForSummary();
    const generated = NutritionEngine.buildPersonaSummary({ ...draft, counseling: flatCounseling }, plan);

    if (!draft.customReview.editedByUser) {
      draft.customReview.personaText = generated.personaText;
      draft.customReview.coachingPolicy = generated.coachingPolicy;
    }

    const warningsHtml = plan.warnings.map((w) => `<div class="alert-box warning">${escapeHtml(w)}</div>`).join('');

    const periodText = plan.estimatedWeeks
      ? `約 ${plan.estimatedWeeks} 週間（約 ${Math.max(1, Math.round(plan.estimatedWeeks / 4.3))} ヶ月）目安`
      : plan.planMode === 'safety_hold'
        ? '安全優先のため減量期間は自動設定しません'
        : '維持・生活リズム改善ペース';

    obContent.innerHTML = `
      <h2 class="ob-title">あなたの初期ダイエット計画</h2>
      <p class="ob-lead">まずはこの推定値で2〜4週間記録し、体重の推移と体調を見ながら柔軟に調整していきましょう。</p>

      ${warningsHtml}

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

      <article class="card">
        <div class="card-header">
          <h3 class="card-title">人物像・コーチング方針</h3>
          <span class="card-sub">修正できます</span>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-persona">カウンセリングのまとめ</label>
          <textarea id="inp-persona" class="form-textarea" rows="6">${escapeHtml(draft.customReview.personaText)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-policy">AIコーチングの方針</label>
          <textarea id="inp-policy" class="form-textarea" rows="3">${escapeHtml(draft.customReview.coachingPolicy)}</textarea>
          <p class="form-hint">この内容は今後のChatGPT相談時に自動で引き継がれます。</p>
        </div>
      </article>
    `;

    const personaInput = document.getElementById('inp-persona');
    const policyInput = document.getElementById('inp-policy');
    const markEdited = () => {
      draft.customReview.personaText = personaInput.value;
      draft.customReview.coachingPolicy = policyInput.value;
      draft.customReview.editedByUser = true;
      saveDraftQuietly();
    };
    personaInput.addEventListener('input', markEdited);
    policyInput.addEventListener('input', markEdited);
  }

  // ステップ検証と「次へ」処理
  function validateAndCollectCurrentStep() {
    if (draft.stepIndex === 1) {
      const birthDate = document.getElementById('inp-birthdate').value;
      const gender = document.getElementById('inp-gender').value;
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
        heightCm,
        currentWeight,
        targetWeight,
        bodyFat,
        targetPeriod
      };
      // プロフィール変更時は確認画面の自動文章を再生成可能にする
      if (!isEditMode) draft.customReview.editedByUser = false;
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

    // 最終承認・IndexedDBへ保存
    const plan = NutritionEngine.buildPlan(draft);
    const finalRecord = {
      profile: draft.profile,
      health: draft.health,
      goal: draft.goal,
      counseling: draft.counseling,
      counselingSummary: flattenCounselingForSummary(),
      customReview: {
        personaText: draft.customReview.personaText,
        coachingPolicy: draft.customReview.coachingPolicy,
        editedByUser: true
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
      showToast('ダイエット計画を保存しました');
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

  /* =========================================================
     Service Worker・イベント初期化・アプリ起動
     ========================================================= */
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

    document.getElementById('btn-open-onboarding').addEventListener('click', () => openOnboarding(true, 1));
    document.getElementById('btn-edit-plan').addEventListener('click', () => openOnboarding(true, REVIEW_STEP_INDEX));

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
    initEvents();
    registerServiceWorker();

    try {
      const savedProfile = await DietDB.getState('user_profile');
      if (savedProfile) {
        currentProfile = savedProfile;
        closeOnboardingToApp();
      } else {
        const savedDraft = await DietDB.getState('onboarding_draft');
        if (savedDraft) {
          draft = { ...createEmptyDraft(), ...savedDraft };
        }
        openOnboarding(false, draft.stepIndex || 0);
      }
    } catch (err) {
      console.error('起動時DB読み込みエラー:', err);
      openOnboarding(false, 0);
    }
  }

  boot();
})();
