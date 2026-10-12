// BJS Counselling framework, transcribed from the provided slides (C01–C15).
export const counsellingClusters = [
  { code: 'C01', group: 'Family & Marriage', title: 'Family Conflict & In-Law Friction', subConcerns: ['Household friction', 'Arguments & interference', 'Silent treatment'] },
  { code: 'C02', group: 'Family & Marriage', title: 'Marital Disharmony & Communication Breakdown', subConcerns: ['Communication distance', 'Criticism & defensiveness', 'Emotional coldness'] },
  { code: 'C03', group: 'Family & Marriage', title: 'Pre-Marriage & Relationship Readiness', subConcerns: ['Wedding disagreements', 'Relationship doubts', 'Future-related fears'] },
  { code: 'C04', group: 'Family & Marriage', title: 'Parenting & Child-Rearing Challenges', subConcerns: ['Parenting differences', 'Child behaviour concerns', 'Parental guilt / friction'] },
  { code: 'C05', group: 'Mental Wellness', title: 'Anxiety, Overthinking & Emotional Distress', subConcerns: ['Excessive worry', 'Catastrophizing', 'Physical tension / panic'] },
  { code: 'C06', group: 'Mental Wellness', title: 'Grief, Loss & Major Life Transitions', subConcerns: ['Adjustment to change', 'Persistent sadness', 'Loss of focus / direction'] },
  { code: 'C07', group: 'Mental Wellness', title: 'Identity Crisis & Self-Esteem Issues', subConcerns: ['Self-doubt', 'Identity concerns', 'Low confidence / impostor feelings'] },
  { code: 'C08', group: 'Mental Wellness', title: 'Health Anxiety & Somatic Concerns', subConcerns: ['Health-related worry', 'Symptom checking', 'Health panic'] },
  { code: 'C09', group: 'Financial & Career', title: 'Financial Stress & Debt Pressure', subConcerns: ['Budget strain', 'Debt-related worry', 'Stress over bills'] },
  { code: 'C10', group: 'Financial & Career', title: 'Professional Burnout & Career Stress', subConcerns: ['Work fatigue', 'Chronic exhaustion', 'Irritability / work dread'] },
  { code: 'C11', group: 'Financial & Career', title: 'Academic Stress & Student Pressure', subConcerns: ['Procrastination', 'Exam pressure', 'High expectations / burnout'] },
  { code: 'C12', group: 'Lifestyle & Habits', title: 'Lifestyle Disruption & Insomnia', subConcerns: ['Irregular sleep / routine', 'Racing thoughts', 'Fatigue & restlessness'] },
  { code: 'C13', group: 'Lifestyle & Habits', title: 'Technology & Digital Overload', subConcerns: ['Excessive phone use', 'Digital distraction in relationships', 'Mental fatigue'] },
  { code: 'C14', group: 'Lifestyle & Habits', title: 'Chronic Fatigue & Low Energy', subConcerns: ['Low morning energy', 'Afternoon slumps', 'Difficulty with daily tasks'] },
  { code: 'C15', group: 'Social & Community', title: 'Social Isolation & Loneliness', subConcerns: ['Reduced social contact', 'Feeling disconnected', 'Spending excessive time alone'] },
];

export const clusterByCode = code => counsellingClusters.find(cluster => cluster.code === code);
export const todayIST = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

export function validateDiscoveryPlan(plan, previous = null, now = new Date()) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('Add the proposed session date, time, and concerns.');
  const { preferredDate, preferredTime, concerns } = plan;
  if (typeof preferredDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) throw new Error('Choose a valid preferred session date.');
  const parsed = new Date(`${preferredDate}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== preferredDate) throw new Error('Choose a valid preferred session date.');
  if (typeof preferredTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferredTime)) throw new Error('Choose a valid preferred session time.');
  // Retain an existing historical preference when editing notes or classification.
  const sameSchedule = previous?.preferredDate === preferredDate && previous?.preferredTime === preferredTime;
  if (!sameSchedule && new Date(`${preferredDate}T${preferredTime}:00+05:30`) <= now) throw new Error('Choose a future preferred session date and time (IST).');
  if (!Array.isArray(concerns) || !concerns.length || concerns.length > 15) throw new Error('Select at least one counselling cluster and its sub-concerns.');
  const seen = new Set();
  const normalized = concerns.map(concern => {
    const cluster = clusterByCode(concern?.clusterCode);
    if (!cluster) throw new Error('Choose a valid counselling cluster.');
    if (seen.has(cluster.code)) throw new Error('Each counselling cluster can only be selected once.');
    seen.add(cluster.code);
    if (!Array.isArray(concern.subConcerns) || !concern.subConcerns.length || concern.subConcerns.length > cluster.subConcerns.length || concern.subConcerns.some(value => !cluster.subConcerns.includes(value))) throw new Error(`Choose the sub-concerns that belong to ${cluster.code}.`);
    return { clusterCode: cluster.code, subConcerns: [...new Set(concern.subConcerns)] };
  });
  // Preserve the session choice when an older client sends a notes/plan edit.
  const sessionType = plan.sessionType === undefined ? previous?.sessionType : plan.sessionType;
  let sessionCount;
  if (sessionType !== undefined) {
    if (!['single', 'package'].includes(sessionType)) throw new Error('Choose a single session or a session package.');
    if (sessionType === 'single') sessionCount = 1;
    else {
      sessionCount = plan.sessionCount === undefined && previous?.sessionType === 'package' ? previous.sessionCount : plan.sessionCount;
      if (!Number.isSafeInteger(sessionCount) || sessionCount < 2) throw new Error('Enter a whole number of at least 2 sessions for the package.');
    }
  } else if (plan.sessionCount !== undefined) throw new Error('Choose a single session or a session package.');
  return { preferredDate, preferredTime, concerns: normalized, ...(sessionType === undefined ? {} : { sessionType, sessionCount }) };
}
