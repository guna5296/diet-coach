/**
 * My Diet Coach - 栄養計算・安全判定・パーソナライズ分析エンジン
 */
const NutritionEngine = (() => {
  'use strict';

  const ACTIVITY_LEVELS = {
    low: { label: '低め（座り仕事・外出少なめ）', factor: 1.35 },
    normal: { label: 'ふつう（家事・育児・通勤・立ち仕事）', factor: 1.50 },
    moderate: { label: 'やや高め（よく歩く・週2〜3回運動）', factor: 1.65 },
    high: { label: '高め（体を動かす仕事・ほぼ毎日運動）', factor: 1.80 }
  };

  const PACE_OPTIONS = {
    slow: { label: 'ゆっくり（月 約0.8〜1.0kg目安）', deficit: 240, kgPerMonth: 1.0 },
    standard: { label: '標準（月 約1.2〜1.5kg目安）', deficit: 360, kgPerMonth: 1.5 },
    maintain: { label: '体重維持・生活リズム重視', deficit: 0, kgPerMonth: 0 }
  };

  function calculateAge(birthDateStr) {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age;
  }

  /**
   * 国立健康・栄養研究所の式（Ganpule et al., 2007）
   */
  function calculateBMR({ gender, weightKg, heightCm, age }) {
    const sexCoef = gender === 'male' ? 0.4235 : 0.9708;
    const mj = 0.0481 * weightKg + 0.0234 * heightCm - 0.0138 * age - sexCoef;
    const kcal = Math.round((mj * 1000) / 4.186);
    return Math.max(kcal, 900);
  }

  function calculateBMI(weightKg, heightCm) {
    const hM = heightCm / 100;
    if (hM <= 0) return 0;
    return Number((weightKg / (hM * hM)).toFixed(1));
  }

  /**
   * 安全性チェックと栄養計画の作成
   */
  function buildPlan(draft) {
    const profile = draft.profile;
    const health = draft.health;
    const goal = draft.goal;

    const age = profile.birthDate ? calculateAge(profile.birthDate) : Number(profile.age);
    const heightCm = Number(profile.heightCm);
    const currentWeight = Number(profile.currentWeight);
    const targetWeight = Number(profile.targetWeight);

    const currentBMI = calculateBMI(currentWeight, heightCm);
    const targetBMI = calculateBMI(targetWeight, heightCm);
    const bmr = calculateBMR({
      gender: profile.gender || 'female',
      weightKg: currentWeight,
      heightCm,
      age
    });

    const activity = ACTIVITY_LEVELS[goal.activityLevel] || ACTIVITY_LEVELS.normal;
    const tdee = Math.round(bmr * activity.factor);

    const warnings = [];
    let restrictAutoDeficit = false;
    let cautiousDeficitOnly = false;

    if (health.pregnancy === 'pregnant' || health.pregnancy === 'breastfeeding') {
      restrictAutoDeficit = true;
      warnings.push('妊娠中・授乳中は赤ちゃんや母体の栄養が最優先のため、通常の減量カロリー設定は行いません。主治医・助産師と相談しながら維持目安を参考にしてください。');
    }
    if (health.medicalRestriction === 'yes') {
      restrictAutoDeficit = true;
      warnings.push('医師からの食事・運動制限があるため、過度な減量目標は自動設定せず維持目安を表示しています。必ず主治医の指示を優先してください。');
    }
    if (health.eatingDisorder === 'yes') {
      restrictAutoDeficit = true;
      warnings.push('摂食障害のご経験に配慮し、強い制限につながる減量目標の自動設定は控えています。専門家と連携しつつ、無理のない記録を優先してください。');
    }
    if (currentBMI < 18.5) {
      restrictAutoDeficit = true;
      warnings.push(`現在のBMIは ${currentBMI}（低体重の目安：18.5未満）です。健康維持のため減量目標は自動設定せず、維持カロリー目安を表示しています。`);
    }

    if (health.chronicDisease === 'yes' || health.medication === 'yes') {
      warnings.push('治療中のご病気や服薬がある場合、食事変更が体調に影響することがあります。必要に応じてかかりつけ医へご相談ください。');
    }

    const hasDeclinedHealth = [
      health.pregnancy,
      health.chronicDisease,
      health.medication,
      health.medicalRestriction,
      health.eatingDisorder
    ].includes('skip');

    if (hasDeclinedHealth) {
      cautiousDeficitOnly = true;
      warnings.push('健康状態に未回答の項目があるため、安全を優先し控えめな減量ペース（最大 -200 kcal/日）に調整しています。');
    }

    if (targetBMI < 18.5 && currentBMI >= 18.5) {
      const safeMinWeight = Number((18.5 * Math.pow(heightCm / 100, 2)).toFixed(1));
      warnings.push(`目標体重（${targetWeight}kg）はBMI ${targetBMI} となり痩せすぎの目安（18.5未満）を下回ります。健康的な目安として ${safeMinWeight}kg 以上を推奨します。`);
    }

    const diffKg = Number((currentWeight - targetWeight).toFixed(1));
    const paceInfo = PACE_OPTIONS[goal.pace] || PACE_OPTIONS.slow;

    let appliedDeficit = 0;
    let planMode = 'loss';

    if (restrictAutoDeficit) {
      appliedDeficit = 0;
      planMode = 'safety_hold';
    } else if (diffKg <= 0 || goal.pace === 'maintain') {
      appliedDeficit = 0;
      planMode = 'maintain';
    } else {
      let desiredDeficit = paceInfo.deficit;
      if (cautiousDeficitOnly) {
        desiredDeficit = Math.min(desiredDeficit, 200);
      }
      const maxSafeDeficit = Math.round(tdee * 0.2);
      appliedDeficit = Math.min(desiredDeficit, maxSafeDeficit);
    }

    let targetCalories = tdee - appliedDeficit;

    if (targetCalories < bmr) {
      targetCalories = bmr;
      appliedDeficit = Math.max(0, tdee - targetCalories);
      if (planMode === 'loss') {
        warnings.push(`筋肉量と体調を守るため、推定基礎代謝（${bmr} kcal）を下回らないよう目標カロリーを自動調整しました。`);
      }
    }

    targetCalories = Math.round(targetCalories / 10) * 10;

    const refWeight = Math.min(currentWeight, Math.max(targetWeight, 45));
    const proteinG = Math.max(60, Math.round(refWeight * 1.3));
    const fatG = Math.max(35, Math.round((targetCalories * 0.25) / 9));
    const remainingKcal = Math.max(0, targetCalories - proteinG * 4 - fatG * 9);
    const carbsG = Math.round(remainingKcal / 4);

    let estimatedWeeks = null;
    if (planMode === 'loss' && diffKg > 0 && appliedDeficit > 0) {
      const kcalPerWeek = appliedDeficit * 7;
      const totalKcalNeeded = diffKg * 7200;
      estimatedWeeks = Math.ceil(totalKcalNeeded / kcalPerWeek);
    }

    return {
      age,
      currentBMI,
      targetBMI,
      bmr,
      tdee,
      appliedDeficit,
      targetCalories,
      pfc: { p: proteinG, f: fatG, c: carbsG },
      planMode,
      estimatedWeeks,
      warnings
    };
  }

  /* =========================================================
     内部専用：裏プロファイル（画面には用語を一切出さない）
     ========================================================= */
  function getHiddenElementFromBirth(birthDateStr) {
    if (!birthDateStr) return 'earth';
    const d = new Date(birthDateStr);
    if (Number.isNaN(d.getTime())) return 'earth';
    const md = (d.getMonth() + 1) * 100 + d.getDate();

    // 火：勢い・直感・短期の手応え重視
    if ((md >= 321 && md <= 419) || (md >= 723 && md <= 822) || (md >= 1122 && md <= 1221)) {
      return 'fire';
    }
    // 地：堅実・ルーティン・目に見える安心感重視
    if ((md >= 420 && md <= 520) || (md >= 823 && md <= 922) || (md >= 1222 || md <= 119)) {
      return 'earth';
    }
    // 風：納得感・自由度・押し付け嫌い・情報整理重視
    if ((md >= 521 && md <= 621) || (md >= 923 && md <= 1023) || (md >= 120 && md <= 218)) {
      return 'air';
    }
    // 水：共感・安心感・気分とコンディション連動
    return 'water';
  }

  function getHiddenBloodTrait(bloodType) {
    const map = {
      A: {
        strength: '決めた流れを丁寧に守れる誠実さ',
        pitfall: '一度予定が崩れると「もうダメだ」と全部やめたくなりやすい傾向',
        tip: '毎日100点を目指さず「70点なら合格」と最初から決めておくと驚くほど続きます。'
      },
      B: {
        strength: '興味が乗ったときの集中力と行動の軽やかさ',
        pitfall: '義務感や単調なルールが増えると急に飽きて手が止まりやすい傾向',
        tip: 'ガチガチに縛るより「今日の気分で選べる2〜3パターンの定番」を持つと長続きします。'
      },
      O: {
        strength: 'ゴールが見えたときの粘り強さと大らかに構えられる強み',
        pitfall: '細かいグラム計算やちまちました作業が続くと一気に面倒になりやすい傾向',
        tip: '細かすぎる入力は割り切って、定番メニューのワンタップ登録と大枠のカロリー管理に絞るのが近道です。'
      },
      AB: {
        strength: '状況を客観的に見て合理的に工夫できるバランス感覚',
        pitfall: '納得できないルールや感情的な根性論には冷めやすく、頭で考えすぎて疲れやすい傾向',
        tip: '「なぜこの調整が必要か」を数字と理由で押さえつつ、マイペースに試せる余白を残すのが最適です。'
      }
    };
    return map[bloodType] || {
      strength: '自分のペースを大切にしながら整えていける力',
      pitfall: '忙しい日が続いたときに一気にペースを崩しやすい傾向',
      tip: '完璧な管理より「毎日アプリを開いて1つだけ記録する」くらいのハードルが最も確実です。'
    };
  }

  const ELEMENT_TRAITS = {
    fire: {
      styleTag: '直感チャレンジ',
      coreDesc: '「やってみよう」と決めた瞬間のエネルギーが高く、変化や手応えを感じると一気に波に乗れるタイプです。',
      coachTone: '長い説教より「今日これだけやればOK」という明確な次の一手をテンポよく提案します。'
    },
    earth: {
      styleTag: 'コツコツ習慣化',
      coreDesc: '生活の中に無理なく馴染む定番パターンが決まると、着実に結果を積み上げられる堅実なタイプです。',
      coachTone: '急激な変化ではなく、今の食生活をベースに少しずつ整える現実的な提案を重視します。'
    },
    air: {
      styleTag: '納得マイペース',
      coreDesc: '「なぜそうするのか」が腹落ちすると自然に行動でき、押し付けられず自分の裁量で調整できるほど力を発揮するタイプです。',
      coachTone: '根拠と選択肢をわかりやすく示し、その日の予定に合わせて自分で選べる形を大切にします。'
    },
    water: {
      styleTag: '気持ち寄り添い',
      coreDesc: '日々の疲れや気分、まわりの環境の影響を受けやすく、安心感がある状態ほど落ち着いて整えられるタイプです。',
      coachTone: '体調や気持ちの波を前提に、自分を責めずに立て直せる穏やかな進め方を優先します。'
    }
  };

  /**
   * カウンセリング回答（最優先）＋裏気質を統合して
   * 「アプリ内で完結するパーソナライズ分析結果」を生成する
   */
  function buildPersonalizedAnalysis(draft, plan, flatCounseling) {
    const raw = draft.counseling || {};
    const hasChip = (key, keyword) => {
      const item = raw[key];
      if (!item) return false;
      const joined = [
        ...(Array.isArray(item.selected) ? item.selected : []),
        item.text || ''
      ].join(' ');
      return joined.includes(keyword);
    };

    const element = getHiddenElementFromBirth(draft.profile?.birthDate);
    const elInfo = ELEMENT_TRAITS[element];
    const btInfo = getHiddenBloodTrait(draft.profile?.bloodType);

    // 1. 実回答から「最も大きい行動タイプ」を判定
    let behaviorLabel = 'マイペース継続型';
    let mainTrap = '';

    if (hasChip('personality', '完璧') || hasChip('pastExperience', '極端')) {
      behaviorLabel = 'きちんとやりすぎストップ型';
      mainTrap = '真面目に取り組もうとするほどハードルを上げすぎてしまい、少し崩れた日に気持ちが切れやすいのが一番の注意点です。';
    } else if (hasChip('stressImpact', '甘い') || hasChip('overeatTrigger', 'ストレス') || hasChip('overeatTrigger', '疲れ')) {
      behaviorLabel = '疲労・ストレスご褒美型';
      mainTrap = '意志が弱いのではなく、家事・育児や仕事の疲れが溜まった夕方〜夜に「脳が手軽なエネルギーを欲しがる状態」が食べ過ぎの引き金になりやすい傾向です。';
    } else if (hasChip('personality', '細かい') || hasChip('pastExperience', '面倒')) {
      behaviorLabel = 'シンプル仕組み化型';
      mainTrap = '記録や計算が複雑になると途端に負担になるため、「いかに手間を減らすか」がダイエットの成否を分けます。';
    } else if (hasChip('stressImpact', '体重が少し増えると落ち込み')) {
      behaviorLabel = '数字敏感・一喜一憂型';
      mainTrap = '水分や塩分・体調による一時的な体重増加に心が揺れやすく、焦って食事を削りすぎると逆効果になりやすい傾向です。';
    } else {
      mainTrap = btInfo.pitfall + 'があるため、最初の2週間は「続けられる仕組みづくり」に集中するのがカギになります。';
    }

    const typeTitle = `${elInfo.styleTag} × ${behaviorLabel}`;

    // 2. 人物像・行動傾向の分析文章（復唱ではなく解釈として語る）
    const profileAnalysis = [
      `${elInfo.coreDesc} また、${btInfo.strength}を持っている一方で、${btInfo.pitfall}もあわせ持っています。`,
      mainTrap
    ].join('\n');

    // 3. 最初の2週間の専用攻略アプローチ（実回答に合わせて3つ選定）
    const approaches = [];

    // アプローチ1：食の好み・我慢対策
    if (hasChip('favFood', '甘い') || hasChip('favFood', 'パン') || hasChip('favFood', '麺') || hasChip('favFood', 'ごはん')) {
      approaches.push({
        title: '「完全禁止」にせず、枠内で楽しむルールにする',
        detail: '好きなものを我慢し続けると反動が来ます。食べる時間帯を昼寄りにしたり量を半分に調整して、1日のカロリー枠に収める方が結果的に早く痩せます。'
      });
    } else if (hasChip('eatingHabit', '家族と同じ')) {
      approaches.push({
        title: '家族と別メニューにせず「配分と順番」だけ変える',
        detail: '自分だけ別料理を作るのは続きません。主菜と野菜を先に食べ、主食や揚げ物の量だけを少し調整するやり方で負担を最小限にします。'
      });
    } else {
      approaches.push({
        title: 'まず「たんぱく質」を先に確保して空腹を防ぐ',
        detail: `1日 ${plan.pfc.p}g を目安に肉・魚・卵・大豆製品を毎食少しずつ入れると、満腹感が続き間食への欲求が自然と落ち着きます。`
      });
    }

    // アプローチ2：食べ過ぎ・生活リズム対策
    if (hasChip('overeatTrigger', '疲れ') || hasChip('overeatTrigger', '夜') || hasChip('eatingHabit', '間食')) {
      approaches.push({
        title: '夕方〜夜の「先回りおやつ」でドカ食いを防ぐ',
        detail: 'お腹が空きすぎた状態で夜を迎えると制御が難しくなります。夕方にヨーグルト・チーズ・ゆで卵・プロテインなど100〜150kcalの軽食を先に入れる作戦が有効です。'
      });
    } else if (hasChip('eatingHabit', '朝食は軽め') || hasChip('eatingHabit', '昼は残り物')) {
      approaches.push({
        title: '朝・昼の「定番テンプレート」を2つだけ決める',
        detail: '毎食考えるのが一番疲れます。朝や昼の定番メニューをアプリのテンプレートに登録しておけば、ワンタップ記録と栄養の安定が同時に叶います。'
      });
    } else if (hasChip('lifestyle', '睡眠は6時間未満') || hasChip('lifestyle', '夜更かし')) {
      approaches.push({
        title: '食事を削る前に「睡眠と疲労ケア」を優先する',
        detail: '睡眠不足の日は食欲を増やすホルモンが出やすくなります。寝不足の日は「体重維持できれば花丸」と割り切るだけでも暴食を防げます。'
      });
    } else {
      approaches.push({
        title: '「朝の体重の7日平均」だけを見て一喜一憂しない',
        detail: '女性の体重は水分や周期で1〜2kg平気で動きます。1日の増減で判断せず、1週間単位のゆるやかな傾きで結果を見ます。'
      });
    }

    // アプローチ3：継続のコツ（裏気質＋性格回答）
    approaches.push({
      title: '完璧主義を手放し「70点合格」で記録を続ける',
      detail: btInfo.tip
    });

    // 4. コーチング方針（コーチからの約束）
    let coachingPolicy = `普段は温かく伴走し、良い行動は具体的に評価します。一方で、見直しが必要な点は曖昧にせず理由を添えて率直にお伝えします。${elInfo.coachTone}`;
    if (plan.planMode === 'safety_hold') {
      coachingPolicy += ' 現在は健康・安全面を最優先するフェーズのため、無理な食事制限は提案せず、体調管理と安心できる習慣づくりをサポートします。';
    } else {
      coachingPolicy += ' 食べ過ぎた日を責めたり、翌日に極端な絶食を勧めたりはしません。最初の2〜4週間の記録を見ながら、あなたに合うペースへ微調整していきましょう。';
    }

    // テキスト形式（編集用・将来のChatGPT相談引き継ぎ用）
    const personaText = [
      `【診断タイプ】${typeTitle}`,
      '',
      '【あなたの傾向と落とし穴】',
      profileAnalysis,
      '',
      '【最初の2週間の専用アプローチ】',
      ...approaches.map((a, i) => `${i + 1}. ${a.title}：${a.detail}`)
    ].join('\n');

    return {
      source: 'app',
      typeTitle,
      profileAnalysis,
      approaches,
      personaText,
      coachingPolicy,
      rawSummary: flatCounseling
    };
  }

  /**
   * 案2：ChatGPTでさらに精密な初回分析を行うためのプロンプトを生成
   */
  function buildDeepAnalysisPrompt(draft, plan, flatCounseling) {
    const p = draft.profile || {};
    const bloodLabel = p.bloodType && p.bloodType !== 'skip' ? `${p.bloodType}型` : '未回答';
    const genderLabel = p.gender === 'male' ? '男性' : '女性';

    const counselingLines = Object.entries(flatCounseling || {})
      .map(([k, v]) => `- ${k}: ${v || '未回答'}`)
      .join('\n');

    return [
      'あなたは経験豊富な専属AIダイエットコーチです。',
      '以下の初回プロフィールとカウンセリング回答をもとに、本人が「まさに自分のことだ」「これなら続けられそう」と前向きになれる【パーソナライズ分析と最初の2週間の攻略アプローチ】を作成してください。',
      '',
      '【重要なルール（必ず守ること）】',
      '1. 入力の単純な復唱（「〇〇が好きなんですね」等）にせず、行動の背景や心理パターンまで踏み込んで言語化すること。',
      '2. 以下の「生年月日」「血液型」から連想される気質傾向は、言葉選び・寄り添い方・つまずき対策の「裏の隠し味」としてのみ内部的に参考にすること。',
      '3. 回答本文には「占い」「占星術」「星座」「血液型」「〇型」「エレメント」などの言葉や根拠を【絶対に一切書かない】こと。あくまでカウンセリングから導いた分析として自然に表現すること。',
      '4. 根拠のないお世辞や、極端な食事制限は提案しないこと。基本は温かく、必要な改善点は率直に伝えるトーンにすること。',
      '5. アプリにそのまま貼り付けて保存するため、見出しと箇条書きで400〜600文字程度にすっきりまとめること。',
      '',
      '【出力フォーマット】',
      '【診断タイプ】（キャッチーで納得感のあるタイプ名）',
      '',
      '【あなたの傾向と落とし穴】',
      '（2〜3文で、強みとつまずきやすいポイントをズバリ言語化）',
      '',
      '【最初の2週間の専用アプローチ】',
      '1. （見出し）：（生活の中で実行できる具体策）',
      '2. （見出し）：（生活の中で実行できる具体策）',
      '3. （見出し）：（生活の中で実行できる具体策）',
      '',
      '--- 以下、利用者データ ---',
      `性別：${genderLabel} / 年齢：${plan.age}歳 / 生年月日（裏参考）：${p.birthDate || '不明'} / 血液型（裏参考）：${bloodLabel}`,
      `身長：${p.heightCm}cm / 現在体重：${p.currentWeight}kg / 目標体重：${p.targetWeight}kg / BMI：${plan.currentBMI}`,
      `初期目標：${plan.targetCalories} kcal（P:${plan.pfc.p}g / F:${plan.pfc.f}g / C:${plan.pfc.c}g） / モード：${plan.planMode}`,
      '',
      '【カウンセリング回答】',
      counselingLines
    ].join('\n');
  }

  return {
    ACTIVITY_LEVELS,
    PACE_OPTIONS,
    calculateAge,
    calculateBMR,
    calculateBMI,
    buildPlan,
    buildPersonalizedAnalysis,
    buildDeepAnalysisPrompt
  };
})();
