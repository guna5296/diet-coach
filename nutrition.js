/**
 * My Diet Coach - 栄養計算・安全判定・コーチング方針生成モジュール
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

  /**
   * 生年月日から満年齢を算出
   */
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
   * 国立健康・栄養研究所の式（Ganpule et al., 2007）で基礎代謝を推定
   */
  function calculateBMR({ gender, weightKg, heightCm, age }) {
    const sexCoef = gender === 'male' ? 0.4235 : 0.9708;
    const mj = 0.0481 * weightKg + 0.0234 * heightCm - 0.0138 * age - sexCoef;
    const kcal = Math.round((mj * 1000) / 4.186);
    return Math.max(kcal, 900);
  }

  /**
   * BMI算出
   */
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

    // 1. 減量計画を自動適用してはいけない条件のチェック
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

    // 2. 注意喚起・控えめ設定の条件チェック
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

    // 3. 目標カロリー決定
    const diffKg = Number((currentWeight - targetWeight).toFixed(1));
    const paceInfo = PACE_OPTIONS[goal.pace] || PACE_OPTIONS.slow;

    let appliedDeficit = 0;
    let planMode = 'loss'; // 'loss' | 'maintain' | 'safety_hold'

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
      // TDEEの20%を超えない上限
      const maxSafeDeficit = Math.round(tdee * 0.2);
      appliedDeficit = Math.min(desiredDeficit, maxSafeDeficit);
    }

    let targetCalories = tdee - appliedDeficit;

    // 基礎代謝を下回らない絶対下限ガード
    if (targetCalories < bmr) {
      targetCalories = bmr;
      appliedDeficit = Math.max(0, tdee - targetCalories);
      if (planMode === 'loss') {
        warnings.push(`筋肉量と体調を守るため、推定基礎代謝（${bmr} kcal）を下回らないよう目標カロリーを自動調整しました。`);
      }
    }

    // 10kcal単位に丸める
    targetCalories = Math.round(targetCalories / 10) * 10;

    // 4. PFCバランス算出（筋肉維持重視）
    const refWeight = Math.min(currentWeight, Math.max(targetWeight, 45));
    const proteinG = Math.max(60, Math.round(refWeight * 1.3));
    const fatG = Math.max(35, Math.round((targetCalories * 0.25) / 9));
    const remainingKcal = Math.max(0, targetCalories - proteinG * 4 - fatG * 9);
    const carbsG = Math.round(remainingKcal / 4);

    // 5. 達成目安の期間（週）
    let estimatedWeeks = null;
    if (planMode === 'loss' && diffKg > 0 && appliedDeficit > 0) {
      const kcalPerWeek = appliedDeficit * 7;
      const totalKcalNeeded = diffKg * 7200; // 体脂肪1kg ≒ 7200kcal
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

  /**
   * カウンセリング回答から人物像・コーチング方針サマリーを自動生成
   */
  function buildPersonaSummary(draft, plan) {
    const c = draft.counseling || {};
    const lines = [];

    const fmt = (val) => {
      if (!val) return '未回答';
      if (Array.isArray(val)) return val.length ? val.join('、') : '未回答';
      return String(val).trim() || '未回答';
    };

    lines.push(`【目的・理想】${fmt(c.purpose)}（達成後にしたいこと：${fmt(c.afterGoal)}）`);
    lines.push(`【過去の経験】${fmt(c.pastExperience)}`);
    lines.push(`【食の好み】好き：${fmt(c.favFood)} ／ 苦手：${fmt(c.dislikeFood)}`);
    lines.push(`【食事・間食の傾向】${fmt(c.eatingHabit)} ／ 食べ過ぎやすい場面：${fmt(c.overeatTrigger)}`);
    lines.push(`【生活・運動】生活リズム：${fmt(c.lifestyle)} ／ 運動習慣：${fmt(c.exerciseHabit)}`);
    lines.push(`【性格・継続のコツ】${fmt(c.personality)} ／ ストレス傾向：${fmt(c.stressImpact)}`);
    lines.push(`【AIコーチへの希望】${fmt(c.aiPreference)}`);

    let policy = '基本は温かく寄り添い、良い行動を具体的に評価します。改善が必要な点は曖昧にせず、生活リズムの中で実行できる1〜2点に絞って率直に提案します。';
    if (plan.planMode === 'safety_hold') {
      policy += '健康・安全面の配慮が必要なため、急な減量や食事制限は促さず、体調管理と無理のない記録継続を最優先します。';
    } else {
      policy += '最初の2〜4週間は推定目標で様子を見て、体重の7日平均と体調をもとに柔軟に見直します。';
    }

    return {
      personaText: lines.join('\n'),
      coachingPolicy: policy
    };
  }

  return {
    ACTIVITY_LEVELS,
    PACE_OPTIONS,
    calculateAge,
    calculateBMR,
    calculateBMI,
    buildPlan,
    buildPersonaSummary
  };
})();
