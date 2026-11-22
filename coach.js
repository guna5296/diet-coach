/**
 * My Diet Coach - フェーズ5：AIコーチング・食事写真解析モジュール
 * - 方式A（ChatGPT手動連携・維持費0円）
 * - 将来の方式B（API直結）へ差し替えやすいよう、データ抽出・プロンプト生成・パースを分離設計
 */
const CoachModule = (() => {
  'use strict';

  const MEAL_TYPES = [
    { key: 'breakfast', label: '朝食' },
    { key: 'lunch', label: '昼食' },
    { key: 'dinner', label: '夕食' },
    { key: 'snack', label: '間食' }
  ];

  const MEAL_LABEL_MAP = {
    breakfast: '朝食',
    lunch: '昼食',
    dinner: '夕食',
    snack: '間食'
  };

  // ワンタップ相談メニュー定義（改善案B）
  const CONSULT_TOPICS = {
    today_meal: {
      id: 'today_meal',
      title: '今日の食事評価',
      subtitle: '今日の食事・PFC・体調を分析',
      days: 1,
      defaultQuestion: '今日の食事内容とPFCバランスを評価してください。良かった点と、今日これから・明日に活かせる改善点を1〜2点教えてください。'
    },
    plateau: {
      id: 'plateau',
      title: '停滞の原因分析',
      subtitle: '直近2〜4週間の体重・食事・睡眠から分析',
      days: 28,
      defaultQuestion: '最近体重が減りにくい（または停滞している）原因を、直近2〜4週間の7日平均体重・摂取カロリー・PFC・睡眠・周期・体調のデータから分析してください。今すぐカロリーを下げるべきかも含めて判断してください。'
    },
    overeat: {
      id: 'overeat',
      title: '食べ過ぎリカバリー',
      subtitle: '責めずに無理なく整える調整案',
      days: 7,
      defaultQuestion: '今日は少し食べ過ぎてしまいました。責めずに現状を整理したうえで、明日〜3日間で無理なくリセットするための現実的な整え方を教えてください（極端な絶食や過度な制限は避けたいです）。'
    },
    eating_out_menu: {
      id: 'eating_out_menu',
      title: '外食・明日の献立',
      subtitle: '残り枠や好みに合わせて具体提案',
      days: 3,
      defaultQuestion: '私の好みや目標カロリー・PFCを踏まえて、明日の食事（または外食するときの選び方）を無理なく続けられる内容で提案してください。'
    },
    plan_review: {
      id: 'plan_review',
      title: '目標・計画の見直し',
      subtitle: '2〜4週間の実績から妥当性を確認',
      days: 28,
      defaultQuestion: '直近2〜4週間の食事記録と朝の体重推移をもとに、今の目標カロリー・PFCバランス・減量ペースがこのままで問題ないか、見直すべきかアドバイスしてください。'
    },
    free: {
      id: 'free',
      title: '自由相談',
      subtitle: '気になることを自由に質問',
      days: 14,
      defaultQuestion: ''
    }
  };

  let callbacks = {
    showToast: () => {},
    onMealSaved: async () => {}
  };

  let currentProfile = null;
  let activeObjectUrl = null;

  function getLocalDateStr(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function shiftDate(dateStr, diffDays) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d + diffDays);
    return getLocalDateStr(dt);
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

  function revokeTempPhotoUrl() {
    if (activeObjectUrl) {
      try {
        URL.revokeObjectURL(activeObjectUrl);
      } catch (_) {}
      activeObjectUrl = null;
    }
  }

  /* =========================================================
     1. 必要データ抽出エンジン（質問に関係する期間だけ抽出）
     ========================================================= */
  async function extractContextForTopic(profileData, daysWindow) {
    const [weightLogs, mealLogs, dailyLogs, aiHistory] = await Promise.all([
      DietDB.getAll('weight_logs'),
      DietDB.getAll('meal_logs'),
      DietDB.getAll('daily_logs'),
      DietDB.getAll('ai_history')
    ]);

    const todayStr = getLocalDateStr(new Date());
    const startStr = shiftDate(todayStr, -(Math.max(1, daysWindow) - 1));

    // 対象期間の体重・体脂肪
    const recentWeights = weightLogs
      .filter((w) => w.date >= startStr && w.date <= todayStr)
      .sort((a, b) => String(a.measuredAt).localeCompare(String(b.measuredAt)));

    // 朝体重の直近7日平均と期間変化
    const allMorningWeights = weightLogs
      .filter((w) => w.type === 'weight' && w.timing === 'morning')
      .sort((a, b) => String(a.measuredAt).localeCompare(String(b.measuredAt)));
    const morningByDate = {};
    allMorningWeights.forEach((w) => { morningByDate[w.date] = Number(w.value); });

    const calcAvg7At = (refDate) => {
      const vals = [];
      for (let i = 0; i < 7; i += 1) {
        const d = shiftDate(refDate, -i);
        if (morningByDate[d] !== undefined) vals.push(morningByDate[d]);
      }
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
    };

    const avg7Now = calcAvg7At(todayStr);
    const avg7TwoWeeksAgo = calcAvg7At(shiftDate(todayStr, -14));

    // 対象期間の食事
    const recentMeals = mealLogs
      .filter((m) => m.date >= startStr && m.date <= todayStr)
      .sort((a, b) => `${a.date}_${a.registeredAt}`.localeCompare(`${b.date}_${b.registeredAt}`));

    const mealsByDate = {};
    recentMeals.forEach((m) => {
      if (!mealsByDate[m.date]) {
        mealsByDate[m.date] = { kcal: 0, p: 0, f: 0, c: 0, items: [] };
      }
      mealsByDate[m.date].kcal += Number(m.confirmed?.kcal) || 0;
      mealsByDate[m.date].p += Number(m.confirmed?.p) || 0;
      mealsByDate[m.date].f += Number(m.confirmed?.f) || 0;
      mealsByDate[m.date].c += Number(m.confirmed?.c) || 0;
      mealsByDate[m.date].items.push(`${MEAL_LABEL_MAP[m.mealType] || ''}:${m.name}(${Math.round(m.confirmed?.kcal || 0)}kcal)`);
    });

    const mealDates = Object.keys(mealsByDate).sort();
    const avgKcal = mealDates.length
      ? Math.round(mealDates.reduce((s, d) => s + mealsByDate[d].kcal, 0) / mealDates.length)
      : null;
    const avgP = mealDates.length
      ? (mealDates.reduce((s, d) => s + mealsByDate[d].p, 0) / mealDates.length).toFixed(1)
      : null;
    const avgF = mealDates.length
      ? (mealDates.reduce((s, d) => s + mealsByDate[d].f, 0) / mealDates.length).toFixed(1)
      : null;
    const avgC = mealDates.length
      ? (mealDates.reduce((s, d) => s + mealsByDate[d].c, 0) / mealDates.length).toFixed(1)
      : null;

    // 対象期間の行動・体調ログ
    const recentDaily = dailyLogs
      .filter((d) => d.date >= startStr && d.date <= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    // 過去の相談で決めた改善策（未完了・直近最大5件）
    const activeActions = [...aiHistory]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .filter((h) => h.actionPlan && h.actionPlan.trim())
      .slice(0, 5);

    return {
      todayStr,
      startStr,
      daysWindow,
      profileData,
      avg7Now,
      avg7TwoWeeksAgo,
      recentWeights,
      mealsByDate,
      mealDates,
      avgKcal,
      avgP,
      avgF,
      avgC,
      recentDaily,
      activeActions
    };
  }

  /**
   * 仕様書セクション3②・9のルールを完全準拠したChatGPT相談プロンプトを生成
   */
  function buildConsultationPrompt(topic, userQuestion, ctx) {
    const p = ctx.profileData.profile || {};
    const plan = ctx.profileData.plan || {};
    const review = ctx.profileData.customReview || {};
    const health = ctx.profileData.health || {};

    const healthFlags = [];
    if (health.pregnancy === 'pregnant') healthFlags.push('妊娠中');
    if (health.pregnancy === 'breastfeeding') healthFlags.push('授乳中');
    if (health.chronicDisease === 'yes') healthFlags.push(`治療中の病気あり(${health.chronicDiseaseNote || '詳細任意'})`);
    if (health.medication === 'yes') healthFlags.push(`服薬あり(${health.medicationNote || '詳細任意'})`);
    if (health.medicalRestriction === 'yes') healthFlags.push(`医師の食事・運動制限あり(${health.medicalRestrictionNote || '詳細任意'})`);
    if (health.eatingDisorder === 'yes') healthFlags.push('摂食障害の経験あり（強い制限NG）');

    // 食事サマリー文字列（直近3日は料理名まで詳細、それより長い期間は日別合計中心でコンパクト化）
    const mealLines = [];
    if (!ctx.mealDates.length) {
      mealLines.push('（対象期間の食事記録なし）');
    } else if (ctx.daysWindow <= 3) {
      ctx.mealDates.forEach((d) => {
        const day = ctx.mealsByDate[d];
        mealLines.push(`- ${d}: 計${Math.round(day.kcal)}kcal (P${day.p.toFixed(1)}/F${day.f.toFixed(1)}/C${day.c.toFixed(1)})｜${day.items.join('、')}`);
      });
    } else {
      mealLines.push(`- 記録日数:${ctx.mealDates.length}/${ctx.daysWindow}日｜平均 ${ctx.avgKcal}kcal (P${ctx.avgP}g / F${ctx.avgF}g / C${ctx.avgC}g)`);
      // 直近5日分の詳細も添える
      ctx.mealDates.slice(-5).forEach((d) => {
        const day = ctx.mealsByDate[d];
        mealLines.push(`  ・${d}: ${Math.round(day.kcal)}kcal (P${day.p.toFixed(0)}/F${day.f.toFixed(0)}/C${day.c.toFixed(0)}) ${day.items.slice(0, 4).join('、')}`);
      });
    }

    // 体重サマリー文字列
    const weightLines = [];
    if (ctx.avg7Now) {
      weightLines.push(`- 朝の体重 7日平均: ${ctx.avg7Now}kg${ctx.avg7TwoWeeksAgo ? `（2週間前: ${ctx.avg7TwoWeeksAgo}kg）` : ''}`);
    }
    const recentWeightOnly = ctx.recentWeights.filter((w) => w.type === 'weight').slice(-10);
    if (recentWeightOnly.length) {
      weightLines.push(
        '- 直近の体重実測: ' +
        recentWeightOnly.map((w) => `${w.date.slice(5)}(${w.timing === 'morning' ? '朝' : '夜'})${Number(w.value).toFixed(1)}kg`).join(', ')
      );
    }
    const recentBf = ctx.recentWeights.filter((w) => w.type === 'bodyFat').slice(-5);
    if (recentBf.length) {
      weightLines.push(
        '- 直近の体脂肪率: ' +
        recentBf.map((w) => `${w.date.slice(5)}:${Number(w.value).toFixed(1)}%`).join(', ')
      );
    }
    if (!weightLines.length) weightLines.push('（対象期間の測定記録なし）');

    // 行動・体調サマリー
    const dailyLines = ctx.recentDaily.slice(-7).map((d) => {
      const parts = [];
      if (d.exerciseType && d.exerciseType !== 'なし') parts.push(`運動:${d.exerciseType}${d.exerciseMinutes ? d.exerciseMinutes + '分' : ''}`);
      if (d.sleepHours) parts.push(`睡眠:${d.sleepHours}h${d.sleepQuality ? `(${d.sleepQuality})` : ''}`);
      if (d.condition) parts.push(`体調:${d.condition}`);
      if (d.hunger) parts.push(`空腹:${d.hunger}`);
      if (d.stress) parts.push(`ストレス:${d.stress}`);
      if (d.cycle && d.cycle !== '未選択') parts.push(`周期:${d.cycle}`);
      if (d.memo) parts.push(`メモ:${d.memo}`);
      return parts.length ? `- ${d.date.slice(5)}: ${parts.join(' / ')}` : null;
    }).filter(Boolean);

    // 過去に決めた改善策
    const actionLines = ctx.activeActions.map((a) =>
      `- [${a.done ? '済' : '実践中'}] ${a.actionPlan}（${a.createdAt.slice(0, 10)}）`
    );

    return [
      'あなたは私専用のAIダイエットコーチです。以下の指導方針と記録データを踏まえて相談に答えてください。',
      '',
      '【指導スタイルと絶対ルール】',
      '・普段は親しみやすく優しく、必要なときは曖昧にせず率直に指摘する。',
      '・根拠のない褒め言葉を使わず、良い行動を具体的に評価する。',
      '・食べ過ぎを責めない。翌日の極端な制限や絶食を提案しない。',
      '・改善策は優先順位をつけて1〜2点に絞り、生活環境で実行できる提案を優先する。',
      '・体重の短期変動だけで判断せず、食事・睡眠・体調・周期・行動を総合的に見る。',
      '・医学的判断が必要な場合は無理に結論を出さず専門家への相談を促す。',
      '・分かりやすく、長すぎない文章にする（必要があれば追加質問する）。',
      '',
      '【回答の構成】',
      '1. 質問への直接回答',
      '2. 記録データから分かること',
      '3. 原因や背景の分析',
      '4. 改善すべき点（優先順位つき）',
      '5. 具体的な行動提案（1〜2点）',
      '',
      '【相談内容】',
      `テーマ：${topic.title}`,
      userQuestion.trim() || topic.defaultQuestion,
      '',
      '--- 以下、アプリから抽出した記録データ ---',
      `【基本情報・目標】身長${p.heightCm}cm / 初期体重${p.currentWeight}kg → 目標${p.targetWeight}kg / モード:${plan.planMode}`,
      `1日目標：${plan.targetCalories}kcal（P:${plan.pfc?.p}g / F:${plan.pfc?.f}g / C:${plan.pfc?.c}g）｜基礎代謝:${plan.bmr}kcal`,
      healthFlags.length ? `【健康上の配慮事項】${healthFlags.join('、')}` : '【健康上の配慮事項】特記なし',
      '',
      '【本人の傾向・コーチング方針】',
      review.personaText || '（未設定）',
      review.coachingPolicy ? `方針：${review.coachingPolicy}` : '',
      '',
      `【体重・体脂肪（対象：${ctx.startStr}〜${ctx.todayStr}）】`,
      ...weightLines,
      '',
      `【食事データ（対象：${ctx.startStr}〜${ctx.todayStr}）】`,
      ...mealLines,
      '',
      '【行動・体調・睡眠（直近）】',
      ...(dailyLines.length ? dailyLines : ['（記録なし）']),
      '',
      '【過去に決めた改善策】',
      ...(actionLines.length ? actionLines : ['（まだなし）'])
    ].filter((line) => line !== undefined).join('\n');
  }

  /* =========================================================
     2. AIコーチ画面の描画＆相談モーダル
     ========================================================= */
  async function render(profileData) {
    if (profileData) currentProfile = profileData;
    const viewEl = document.getElementById('coach-dynamic-area');
    if (!viewEl) return;

    const isOnline = navigator.onLine;
    const offlineNotice = document.getElementById('coach-offline-banner');
    if (offlineNotice) {
      offlineNotice.classList.toggle('hidden', isOnline);
    }

    const history = (await DietDB.getAll('ai_history')).sort((a, b) =>
      String(b.createdAt).localeCompare(String(a.createdAt))
    );

    const activeActions = history.filter((h) => h.actionPlan && h.actionPlan.trim() && !h.done);

    viewEl.innerHTML = `
      <!-- 実践中の改善策（ピン留め表示） -->
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">今取り組んでいる改善策</h2>
          <span class="card-sub">${activeActions.length}件</span>
        </div>
        ${activeActions.length ? `
          <div class="action-plan-list">
            ${activeActions.map((item) => `
              <label class="action-plan-item">
                <input type="checkbox" data-toggle-done="${item.id}">
                <div>
                  <strong>${escapeHtml(item.actionPlan)}</strong>
                  <span>${item.createdAt.slice(0, 10)}（${escapeHtml(item.topicTitle || '相談')}）</span>
                </div>
              </label>
            `).join('')}
          </div>
        ` : `<p class="empty-note small">ChatGPTに相談して決めた改善策を保存すると、ここに表示され次回の相談にも自動で引き継がれます。</p>`}
      </article>

      <!-- 過去の相談履歴 -->
      <article class="card">
        <div class="card-header">
          <h2 class="card-title">AI相談・回答履歴</h2>
          <span class="card-sub">全 ${history.length}件</span>
        </div>
        ${history.length ? `
          <div class="history-list">
            ${history.map((h) => `
              <div class="history-card">
                <div class="history-card-head">
                  <span class="mini-tag">${escapeHtml(h.topicTitle || '相談')}</span>
                  <span class="log-sub">${h.createdAt.slice(0, 10)}</span>
                </div>
                <p class="history-q"><strong>Q.</strong> ${escapeHtml(h.question)}</p>
                ${h.actionPlan ? `
                  <div class="history-action-badge ${h.done ? 'done' : ''}">
                    ${h.done ? '✓ 達成：' : '★ 改善策：'}${escapeHtml(h.actionPlan)}
                  </div>
                ` : ''}
                <div class="history-card-actions">
                  <button type="button" class="icon-text-btn" data-view-hist="${h.id}">回答を見る</button>
                  <button type="button" class="icon-text-btn" data-toggle-done-btn="${h.id}">${h.done ? '未完了に戻す' : '達成にする'}</button>
                  <button type="button" class="icon-text-btn danger" data-del-hist="${h.id}">削除</button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `<p class="empty-note small">まだ相談履歴はありません。上のメニューからいつでも相談できます。</p>`}
      </article>
    `;

    viewEl.querySelectorAll('[data-toggle-done]').forEach((cb) => {
      cb.addEventListener('change', async () => {
        const target = history.find((x) => x.id === cb.dataset.toggleDone);
        if (!target) return;
        await DietDB.putItem('ai_history', { ...target, done: true, updatedAt: new Date().toISOString() });
        callbacks.showToast('改善策を達成にしました！');
        render();
      });
    });

    viewEl.querySelectorAll('[data-toggle-done-btn]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const target = history.find((x) => x.id === btn.dataset.toggleDoneBtn);
        if (!target) return;
        await DietDB.putItem('ai_history', { ...target, done: !target.done, updatedAt: new Date().toISOString() });
        callbacks.showToast(target.done ? '実践中に戻しました' : '改善策を達成にしました');
        render();
      });
    });

    viewEl.querySelectorAll('[data-view-hist]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = history.find((x) => x.id === btn.dataset.viewHist);
        if (target) openHistoryDetailModal(target);
      });
    });

    viewEl.querySelectorAll('[data-del-hist]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('この相談履歴を削除しますか？')) return;
        await DietDB.deleteItem('ai_history', btn.dataset.delHist);
        callbacks.showToast('相談履歴を削除しました');
        render();
      });
    });
  }

  function openHistoryDetailModal(item) {
    RecordModule.openSheet(`${item.topicTitle || '相談履歴'}（${item.createdAt.slice(0, 10)}）`, `
      <div class="form-group">
        <label class="form-label">相談内容</label>
        <div class="readonly-box">${formatMultilineHtml(item.question)}</div>
      </div>
      <div class="form-group">
        <label class="form-label">ChatGPTからの回答</label>
        <div class="readonly-box">${formatMultilineHtml(item.answer || '（回答メモなし）')}</div>
      </div>
      <div class="form-group">
        <label class="form-label" for="hd-action">決めた改善策（編集可）</label>
        <input type="text" id="hd-action" class="form-input" value="${escapeHtml(item.actionPlan || '')}" placeholder="例：夕方にヨーグルトを先に入れる">
      </div>
      <div class="sheet-actions">
        <button type="button" id="btn-hd-save" class="btn-primary">改善策を更新する</button>
      </div>
    `);

    document.getElementById('btn-hd-save').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await DietDB.putItem('ai_history', {
        ...item,
        actionPlan: document.getElementById('hd-action').value.trim(),
        updatedAt: new Date().toISOString()
      });
      RecordModule.closeSheet();
      callbacks.showToast('改善策を更新しました');
      render();
    });
  }

  async function openConsultModal(topicId) {
    if (!navigator.onLine) {
      callbacks.showToast('AI相談はオンライン時のみ利用できます');
      return;
    }
    if (!currentProfile) {
      callbacks.showToast('先に初期登録を完了してください');
      return;
    }

    const topic = CONSULT_TOPICS[topicId] || CONSULT_TOPICS.free;
    let selectedDays = topic.days;

    RecordModule.openSheet(`AI相談：${topic.title}`, `
      <div class="alert-box info">
        <strong>データ送信のご案内：</strong>コピーしたテキストを外部サービス（ChatGPT）へ貼り付けて送信します。写真本体や不要な全履歴は含まれず、必要な期間の記録だけを自動抽出します。
      </div>

      <div class="form-group">
        <label class="form-label" for="cs-question">相談したいこと（書き換え可）</label>
        <textarea id="cs-question" class="form-textarea" rows="3" placeholder="例：今週外食が2回あるのですが、どう調整すればいいですか？">${escapeHtml(topic.defaultQuestion)}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label" for="cs-days">データ抽出期間</label>
        <select id="cs-days" class="form-select">
          <option value="1" ${selectedDays === 1 ? 'selected' : ''}>今日のみ</option>
          <option value="3" ${selectedDays === 3 ? 'selected' : ''}>直近3日間</option>
          <option value="7" ${selectedDays === 7 ? 'selected' : ''}>直近7日間</option>
          <option value="14" ${selectedDays === 14 ? 'selected' : ''}>直近14日間</option>
          <option value="28" ${selectedDays === 28 ? 'selected' : ''}>直近28日間（約4週間）</option>
        </select>
      </div>

      <button type="button" id="btn-cs-copy" class="btn-primary">
        1. 記録つき相談プロンプトをコピー
      </button>

      <details class="prompt-preview-details">
        <summary>コピーされる内容を確認する</summary>
        <pre id="cs-prompt-preview" class="prompt-preview-pre">生成中...</pre>
      </details>

      <div class="divider-line"></div>

      <div class="form-group">
        <label class="form-label" for="cs-answer">2. ChatGPTの回答を保存（任意）</label>
        <textarea id="cs-answer" class="form-textarea" rows="4" placeholder="ChatGPTの回答をここに貼り付けて保存しておけます"></textarea>
      </div>

      <div class="form-group">
        <label class="form-label" for="cs-action">3. 今回決めた改善策（1〜2行・任意）</label>
        <input type="text" id="cs-action" class="form-input" placeholder="例：夕食の揚げ物を控え、朝に卵を1個足す">
        <p class="form-hint">ここに入力すると、次回のChatGPT相談にも自動で引き継がれます。</p>
      </div>

      <div class="sheet-actions">
        <button type="button" id="btn-cs-save-hist" class="btn-secondary full-width">相談履歴・改善策として保存する</button>
      </div>
    `);

    const qEl = document.getElementById('cs-question');
    const daysEl = document.getElementById('cs-days');
    const previewEl = document.getElementById('cs-prompt-preview');

    let latestPrompt = '';

    async function refreshPrompt() {
      const days = Number(daysEl.value) || 7;
      const ctx = await extractContextForTopic(currentProfile, days);
      latestPrompt = buildConsultationPrompt(topic, qEl.value, ctx);
      previewEl.textContent = latestPrompt;
    }

    qEl.addEventListener('input', refreshPrompt);
    daysEl.addEventListener('change', refreshPrompt);
    await refreshPrompt();

    document.getElementById('btn-cs-copy').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await refreshPrompt();
      const ok = await copyToClipboard(latestPrompt);
      callbacks.showToast(ok ? 'コピーしました！ChatGPTにそのまま貼り付けてください' : 'コピーに失敗しました');
    });

    document.getElementById('btn-cs-save-hist').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const answer = document.getElementById('cs-answer').value.trim();
      const actionPlan = document.getElementById('cs-action').value.trim();
      const question = qEl.value.trim() || topic.title;

      if (!answer && !actionPlan) {
        callbacks.showToast('ChatGPTの回答、または決めた改善策を入力してください');
        return;
      }

      await DietDB.putItem('ai_history', {
        id: DietDB.generateId('ai'),
        topicId: topic.id,
        topicTitle: topic.title,
        question,
        answer,
        actionPlan,
        done: false,
        createdAt: new Date().toISOString()
      });

      RecordModule.closeSheet();
      callbacks.showToast('相談履歴と改善策を保存しました');
      render();
    });
  }

  /* =========================================================
     3. 食事写真解析（改善案A：コピペ自動取り込み＋確認・修正＋一時画像削除）
     ========================================================= */
  function buildPhotoAnalysisPrompt(extraNote) {
    return [
      '添付した食事の写真から、料理・食材・分量・栄養価を推定してください。',
      '写真だけでは判断しにくい「調理油・ドレッシング・調味料・ごはんの量」なども考慮し、推測に不確実性がある点は明記してください。',
      extraNote ? `【補足情報】${extraNote}` : '',
      '',
      'アプリに自動取り込みするため、必ず以下のフォーマットをそのまま使って出力してください（項目名を変えないこと）：',
      '',
      '【料理名】',
      '【調理方法】',
      '【油・調味料】',
      '【食材】',
      '- 食材名: 推定グラムg (推定kcal / P g / F g / C g)',
      '【合計カロリー】数値kcal',
      '【たんぱく質】数値g',
      '【脂質】数値g',
      '【炭水化物】数値g',
      '【信頼度】高・中・低のいずれか（理由をひと言）',
      '【確認質問】油・ドレッシング・調味料や分量で本人に確認すべき点（なければ「特になし」）'
    ].filter((l) => l !== '').join('\n');
  }

  /**
   * ChatGPTからの写真解析テキストを柔軟にパースするハイブリッド解析関数
   */
  function parsePhotoAnalysisResult(rawText) {
    const text = String(rawText || '').trim();
    if (!text) return null;

    // 1. 万一JSON形式で返ってきた場合の対応
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const obj = JSON.parse(jsonMatch[0]);
        if (obj && (obj.kcal !== undefined || obj.calories !== undefined || obj.name)) {
          return {
            name: String(obj.name || obj.dishName || '写真からの食事').trim(),
            cookingMethod: String(obj.cookingMethod || '').trim(),
            oilSeasoning: String(obj.oilSeasoning || '').trim(),
            items: Array.isArray(obj.items) ? obj.items : [],
            kcal: Math.round(Number(obj.kcal ?? obj.calories) || 0),
            p: Number(Number(obj.p ?? obj.protein ?? 0).toFixed(1)),
            f: Number(Number(obj.f ?? obj.fat ?? 0).toFixed(1)),
            c: Number(Number(obj.c ?? obj.carbs ?? 0).toFixed(1)),
            confidence: String(obj.confidence || '中').trim(),
            question: String(obj.question || '').trim()
          };
        }
      } catch (_) {}
    }

    // 2. 標準フォーマット（【項目名】形式）の抽出
    const getField = (labels) => {
      for (const lb of labels) {
        const re = new RegExp(`(?:【${lb}】|${lb}\\s*[：:])\\s*([^\\n]+)`, 'i');
        const m = text.match(re);
        if (m && m[1]) return m[1].trim();
      }
      return '';
    };

    const extractNum = (str) => {
      if (!str) return null;
      // 範囲表記（例: 450〜550kcal）の場合は中央値を取る
      const range = str.match(/(\d+(?:\.\d+)?)\s*[〜~～\-]\s*(\d+(?:\.\d+)?)/);
      if (range) {
        return (Number(range[1]) + Number(range[2])) / 2;
      }
      const single = str.match(/(\d+(?:\.\d+)?)/);
      return single ? Number(single[1]) : null;
    };

    const name = getField(['料理名', 'メニュー名', '食事名']) || '写真からの食事';
    const cookingMethod = getField(['調理方法', '調理法']);
    const oilSeasoning = getField(['油・調味料', '調味料', '油']);
    const confidence = getField(['信頼度', '不確実性・信頼度', '推定精度']) || '中';
    const question = getField(['確認質問', '確認事項', '質問']);

    const kcalNum = extractNum(getField(['合計カロリー', '推定カロリー', 'カロリー', 'エネルギー']));
    const pNum = extractNum(getField(['たんぱく質', 'タンパク質', 'P']));
    const fNum = extractNum(getField(['脂質', 'F']));
    const cNum = extractNum(getField(['炭水化物', '糖質', 'C']));

    // 【食材】ブロックの箇条書き行を抽出
    const items = [];
    const blockMatch = text.match(/【食材】([\s\S]*?)(?=【|$)/);
    if (blockMatch && blockMatch[1]) {
      const lines = blockMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
      lines.forEach((line) => {
        const cleaned = line.replace(/^[-・*•\d.\s]+/, '').trim();
        if (!cleaned) return;
        const gMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*g/i);
        const namePart = cleaned.split(/[:：(\（]/)[0].trim();
        if (namePart) {
          items.push({
            name: namePart,
            grams: gMatch ? Math.round(Number(gMatch[1])) : 0,
            raw: cleaned
          });
        }
      });
    }

    if (kcalNum === null && pNum === null && fNum === null && cNum === null) {
      return null;
    }

    return {
      name,
      cookingMethod,
      oilSeasoning,
      items,
      kcal: Math.round(kcalNum || 0),
      p: Number((pNum || 0).toFixed(1)),
      f: Number((fNum || 0).toFixed(1)),
      c: Number((cNum || 0).toFixed(1)),
      confidence,
      question
    };
  }

  function openPhotoAnalysisModal(targetDate, defaultMealType) {
    if (!navigator.onLine) {
      callbacks.showToast('AI写真解析はオンライン時のみ利用できます');
      return;
    }

    revokeTempPhotoUrl();
    let parsedEstimate = null;
    let rawAiText = '';
    let hasTempPhoto = false;

    RecordModule.openSheet(
      'A. 写真から登録（AI解析）',
      `
        <div class="alert-box info">
          <strong>写真の扱いについて：</strong>元写真はアプリ内に保存せず、登録または画面を閉じた瞬間にアプリ内の一時データを削除します。<br>
          <span style="font-size:11.5px;">※iPhoneの「写真（カメラロール）」内の画像はiOS仕様上アプリから自動削除できないため、残したくない場合はChatGPTアプリのカメラ直接撮影もご活用ください。</span>
        </div>

        <div class="input-row">
          <div class="form-group">
            <label class="form-label" for="ph-meal-type">食事区分</label>
            <select id="ph-meal-type" class="form-select">
              ${MEAL_TYPES.map((t) => `<option value="${t.key}" ${t.key === defaultMealType ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ph-date">日付</label>
            <input type="date" id="ph-date" class="form-input" value="${escapeHtml(targetDate)}">
          </div>
        </div>

        <!-- ステップ1：写真一時プレビュー（任意）＆プロンプトコピー -->
        <div class="photo-step-box">
          <div class="photo-step-title">手順1：解析プロンプトをコピーしてChatGPTへ送る</div>
          <div class="form-group">
            <label class="form-label" for="ph-note">ChatGPTへの補足（任意）</label>
            <input type="text" id="ph-note" class="form-input" placeholder="例：ごはんは少なめ120g、ごまドレッシング大さじ1">
          </div>

          <div class="photo-capture-row">
            <label class="btn-outline photo-file-label">
              📷 写真を一時確認（任意）
              <input type="file" id="ph-file-input" accept="image/*" capture="environment" class="hidden">
            </label>
            <button type="button" id="btn-ph-copy" class="btn-secondary">解析プロンプトをコピー</button>
          </div>

          <div id="ph-preview-wrap" class="photo-preview-wrap hidden">
            <img id="ph-preview-img" class="photo-preview-img" alt="一時確認用の食事写真">
            <div class="photo-preview-meta">
              <span>一時表示中（登録時に自動削除されます）</span>
              <button type="button" id="btn-ph-clear-img" class="icon-text-btn danger">今すぐ破棄</button>
            </div>
          </div>
        </div>

        <!-- ステップ2：ChatGPTの解析結果を貼り付けて自動読み込み -->
        <div class="photo-step-box">
          <div class="photo-step-title">手順2：ChatGPTの解析結果を貼り付け</div>
          <div class="form-group">
            <textarea id="ph-paste-input" class="form-textarea" rows="4" placeholder="ChatGPTから返ってきた【料理名】〜【確認質問】の文章をそのまま貼り付けてください"></textarea>
          </div>
          <button type="button" id="btn-ph-parse" class="btn-secondary full-width">解析結果を読み込んで確認画面へ</button>
        </div>

        <!-- ステップ3：本人確認・修正画面（解析読み込み後に表示・自動確定はしない） -->
        <div id="ph-confirm-box" class="photo-confirm-box hidden">
          <div class="photo-step-title">手順3：解析結果の確認・修正（必ずご確認ください）</div>

          <div id="ph-ai-meta" class="ai-meta-box"></div>
          <div id="ph-ai-question" class="alert-box warning hidden"></div>

          <div class="form-group">
            <label class="form-label" for="ph-cfm-name">料理名（修正可）</label>
            <input type="text" id="ph-cfm-name" class="form-input">
          </div>

          <div class="input-row">
            <div class="form-group">
              <label class="form-label" for="ph-cfm-kcal">確定カロリー（kcal）</label>
              <input type="number" id="ph-cfm-kcal" class="form-input" inputmode="decimal" step="1">
            </div>
            <div class="form-group">
              <label class="form-label" for="ph-cfm-p">たんぱく質（g）</label>
              <input type="number" id="ph-cfm-p" class="form-input" inputmode="decimal" step="0.1">
            </div>
          </div>

          <div class="input-row">
            <div class="form-group">
              <label class="form-label" for="ph-cfm-f">脂質（g）</label>
              <input type="number" id="ph-cfm-f" class="form-input" inputmode="decimal" step="0.1">
            </div>
            <div class="form-group">
              <label class="form-label" for="ph-cfm-c">炭水化物（g）</label>
              <input type="number" id="ph-cfm-c" class="form-input" inputmode="decimal" step="0.1">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="ph-cfm-oil">油・調味料・調理メモ（任意修正）</label>
            <input type="text" id="ph-cfm-oil" class="form-input">
          </div>

          <label class="checkbox-row">
            <input type="checkbox" id="ph-save-tpl">
            <span>この食事を定番テンプレートにも保存する</span>
          </label>

          <div class="sheet-actions">
            <button type="button" id="btn-ph-register" class="btn-primary">内容を確定して登録（一時写真を削除）</button>
          </div>
        </div>
      `,
      () => {
        // シートを閉じたときに必ず一時画像データを破棄
        revokeTempPhotoUrl();
      }
    );

    const fileInput = document.getElementById('ph-file-input');
    const previewWrap = document.getElementById('ph-preview-wrap');
    const previewImg = document.getElementById('ph-preview-img');

    function clearTempPhoto() {
      revokeTempPhotoUrl();
      hasTempPhoto = false;
      if (fileInput) fileInput.value = '';
      if (previewImg) previewImg.removeAttribute('src');
      if (previewWrap) previewWrap.classList.add('hidden');
    }

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      revokeTempPhotoUrl();
      activeObjectUrl = URL.createObjectURL(file);
      previewImg.src = activeObjectUrl;
      previewWrap.classList.remove('hidden');
      hasTempPhoto = true;
    });

    document.getElementById('btn-ph-clear-img').addEventListener('click', () => {
      clearTempPhoto();
      callbacks.showToast('一時画像データを削除しました');
    });

    document.getElementById('btn-ph-copy').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const note = document.getElementById('ph-note').value.trim();
      const prompt = buildPhotoAnalysisPrompt(note);
      const ok = await copyToClipboard(prompt);
      callbacks.showToast(ok ? 'コピーしました！ChatGPTに写真と一緒に送ってください' : 'コピーに失敗しました');
    });

    document.getElementById('btn-ph-parse').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pasted = document.getElementById('ph-paste-input').value.trim();
      if (!pasted) {
        callbacks.showToast('ChatGPTの解析結果を貼り付けてください');
        return;
      }

      const parsed = parsePhotoAnalysisResult(pasted);
      if (!parsed) {
        callbacks.showToast('数値を読み取れませんでした。プロンプトの形式で貼り付けてください');
        return;
      }

      parsedEstimate = parsed;
      rawAiText = pasted;

      // 確認・修正フォームへ流し込み
      document.getElementById('ph-cfm-name').value = parsed.name;
      document.getElementById('ph-cfm-kcal').value = parsed.kcal;
      document.getElementById('ph-cfm-p').value = parsed.p;
      document.getElementById('ph-cfm-f').value = parsed.f;
      document.getElementById('ph-cfm-c').value = parsed.c;
      document.getElementById('ph-cfm-oil').value = [parsed.cookingMethod, parsed.oilSeasoning].filter(Boolean).join('／');

      const metaEl = document.getElementById('ph-ai-meta');
      metaEl.innerHTML = `
        <div><strong>AI初期推定：</strong>${parsed.kcal}kcal（P:${parsed.p}g / F:${parsed.f}g / C:${parsed.c}g）</div>
        <div><strong>信頼度：</strong>${escapeHtml(parsed.confidence)}</div>
        ${parsed.items.length ? `<div><strong>推定食材：</strong>${parsed.items.map((i) => escapeHtml(i.raw || `${i.name} ${i.grams}g`)).join(' / ')}</div>` : ''}
      `;

      const qBox = document.getElementById('ph-ai-question');
      if (parsed.question && parsed.question !== '特になし' && parsed.question !== 'なし') {
        qBox.innerHTML = `<strong>AIからの確認ポイント：</strong>${escapeHtml(parsed.question)}<br>必要に応じて下の数値を調整してください。`;
        qBox.classList.remove('hidden');
      } else {
        qBox.classList.add('hidden');
      }

      const confirmBox = document.getElementById('ph-confirm-box');
      confirmBox.classList.remove('hidden');
      confirmBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      callbacks.showToast('解析結果を読み込みました。内容を確認・修正して登録してください');
    });

    document.getElementById('btn-ph-register').addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!parsedEstimate) {
        callbacks.showToast('先に解析結果を読み込んでください');
        return;
      }

      const mealType = document.getElementById('ph-meal-type').value;
      const dateStr = document.getElementById('ph-date').value || targetDate;
      const confirmedName = document.getElementById('ph-cfm-name').value.trim() || parsedEstimate.name;
      const confirmedKcal = Math.max(0, Math.round(Number(document.getElementById('ph-cfm-kcal').value) || 0));
      const confirmedP = Math.max(0, Number(Number(document.getElementById('ph-cfm-p').value || 0).toFixed(1)));
      const confirmedF = Math.max(0, Number(Number(document.getElementById('ph-cfm-f').value || 0).toFixed(1)));
      const confirmedC = Math.max(0, Number(Number(document.getElementById('ph-cfm-c').value || 0).toFixed(1)));
      const oilNote = document.getElementById('ph-cfm-oil').value.trim();

      const record = {
        id: DietDB.generateId('meal'),
        date: dateStr,
        registeredAt: new Date().toISOString(),
        mealType,
        name: confirmedName,
        source: 'ai_photo',
        items: parsedEstimate.items || [],
        oilSeasoningNote: oilNote,
        // 仕様書セクション3③・5：AI初期推定値と本人確定値を区別して保存（写真は保存しない）
        aiEstimate: {
          name: parsedEstimate.name,
          cookingMethod: parsedEstimate.cookingMethod,
          oilSeasoning: parsedEstimate.oilSeasoning,
          confidence: parsedEstimate.confidence,
          question: parsedEstimate.question,
          kcal: parsedEstimate.kcal,
          p: parsedEstimate.p,
          f: parsedEstimate.f,
          c: parsedEstimate.c,
          rawText: rawAiText
        },
        confirmed: {
          kcal: confirmedKcal,
          p: confirmedP,
          f: confirmedF,
          c: confirmedC
        }
      };

      await DietDB.putItem('meal_logs', record);

      if (document.getElementById('ph-save-tpl').checked) {
        await DietDB.putItem('meal_templates', {
          id: DietDB.generateId('tpl'),
          name: record.name,
          defaultMealType: record.mealType,
          items: record.items,
          nutrition: { ...record.confirmed },
          createdAt: new Date().toISOString()
        });
      }

      const deletedPhotoMsg = hasTempPhoto ? '（一時画像データを削除しました）' : '';
      clearTempPhoto();
      RecordModule.closeSheet();
      RecordModule.setSelectedDate(dateStr);
      RecordModule.setActiveMealCategory(mealType);
      callbacks.showToast(`食事を確定・保存しました${deletedPhotoMsg}`);
      await callbacks.onMealSaved();
    });
  }

  function init(opts) {
    callbacks = { ...callbacks, ...opts };

    document.querySelectorAll('[data-consult-topic]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openConsultModal(btn.dataset.consultTopic);
      });
    });
  }

  return {
    init,
    render,
    openConsultModal,
    openPhotoAnalysisModal
  };
})();
