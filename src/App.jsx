import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  NotebookPen,
  Pencil,
  Plus,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'routine-manager-v3';

const defaultRoutines = [
  { id: crypto.randomUUID(), title: '기상', category: '아침', time: '06:30', trackingType: 'check', repeat: 'daily', weeklyTarget: 7, monthlyTarget: 30, completedDates: [] },
  { id: crypto.randomUUID(), title: '운동 1시간', category: '건강', time: '07:00', trackingType: 'check', repeat: 'weeklyTarget', weeklyTarget: 5, monthlyTarget: 0, completedDates: [] },
  { id: crypto.randomUUID(), title: '출근 준비', category: '일상', time: '08:15', trackingType: 'check', repeat: 'daily', weeklyTarget: 7, monthlyTarget: 30, completedDates: [] },
  { id: crypto.randomUUID(), title: '독서', category: '성장', time: '', trackingType: 'cumulative', repeat: 'monthlyTarget', weeklyTarget: 0, monthlyTarget: 300, unit: '페이지', dailyTarget: 10, valuesByDate: {} },
];

const categories = ['일상', '아침', '건강', '성장', '업무'];

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

function yyyyMmDd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekDates(base = new Date()) {
  const date = new Date(base);
  const day = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const next = new Date(sunday);
    next.setDate(sunday.getDate() + i);
    return next;
  });
}

function getDaysInMonth(baseDateString) {
  const base = new Date(baseDateString);
  const year = base.getFullYear();
  const month = base.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: lastDay }, (_, i) => new Date(year, month, i + 1));
}

function getWeekStartKey(baseDateString) {
  const base = new Date(baseDateString);
  const day = base.getDay();
  const sunday = new Date(base);
  sunday.setDate(base.getDate() - day);
  return yyyyMmDd(sunday);
}

function getMonthKey(baseDateString) {
  return baseDateString.slice(0, 7);
}

function isSunday(baseDateString) {
  return new Date(baseDateString).getDay() === 0;
}

function isLastSundayOfMonth(baseDateString) {
  const date = new Date(baseDateString);
  if (date.getDay() !== 0) return false;
  const nextWeek = new Date(date);
  nextWeek.setDate(date.getDate() + 7);
  return nextWeek.getMonth() !== date.getMonth();
}

function Card({ children, className = '' }) {
  return <div className={`rounded-3xl bg-white shadow-sm ring-1 ring-black/5 ${className}`}>{children}</div>;
}

function ProgressBar({ value }) {
  const safe = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
      <div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${safe}%` }} />
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function App() {
  const [routines, setRoutines] = useState(defaultRoutines);
  const [activeTab, setActiveTab] = useState('today');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('일상');
  const [time, setTime] = useState('');
  const [trackingType, setTrackingType] = useState('check');
  const [repeat, setRepeat] = useState('daily');
  const [weeklyTarget, setWeeklyTarget] = useState('5');
  const [monthlyTarget, setMonthlyTarget] = useState('20');
  const [unit, setUnit] = useState('페이지');
  const [dailyTarget, setDailyTarget] = useState('10');
  const [open, setOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(yyyyMmDd());
  const [weeklyReviews, setWeeklyReviews] = useState({});
  const [monthlyReviews, setMonthlyReviews] = useState({});
  const [dailyValueInputs, setDailyValueInputs] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setRoutines(parsed);
      } else {
        setRoutines(parsed.routines || defaultRoutines);
        setWeeklyReviews(parsed.weeklyReviews || {});
        setMonthlyReviews(parsed.monthlyReviews || {});
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ routines, weeklyReviews, monthlyReviews }));
  }, [routines, weeklyReviews, monthlyReviews]);

  const todayRoutines = useMemo(
    () => [...routines].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
    [routines]
  );

  const checkedCount = todayRoutines.filter((item) => item.trackingType === 'check' && item.completedDates?.includes(selectedDate)).length;
  const cumulativeRecordedCount = todayRoutines.filter((item) => item.trackingType === 'cumulative' && Number(item.valuesByDate?.[selectedDate] || 0) > 0).length;
  const progress = todayRoutines.length ? Math.round(((checkedCount + cumulativeRecordedCount) / todayRoutines.length) * 100) : 0;

  const weeklyStats = useMemo(() => {
    const week = getWeekDates(new Date(selectedDate));
    return week.map((date) => {
      const key = yyyyMmDd(date);
      const done = routines.filter((r) => {
        if (r.trackingType === 'cumulative') return Number(r.valuesByDate?.[key] || 0) > 0;
        return r.completedDates?.includes(key);
      }).length;
      return { label: `${date.getMonth() + 1}/${date.getDate()}`, done };
    });
  }, [routines, selectedDate]);

  const monthlyStats = useMemo(() => {
    const monthDays = getDaysInMonth(selectedDate);
    return monthDays.map((date) => {
      const key = yyyyMmDd(date);
      const done = routines.filter((r) => {
        if (r.trackingType === 'cumulative') return Number(r.valuesByDate?.[key] || 0) > 0;
        return r.completedDates?.includes(key);
      }).length;
      return { key, day: date.getDate(), done };
    });
  }, [routines, selectedDate]);

  const routineStats = useMemo(() => {
    const monthDays = getDaysInMonth(selectedDate);
    const totalDays = monthDays.length;
    const weekKeys = getWeekDates(new Date(selectedDate)).map((date) => yyyyMmDd(date));

    return [...routines]
      .map((routine) => {
        if (routine.trackingType === 'cumulative') {
          const dailyAmount = Number(routine.valuesByDate?.[selectedDate] || 0);
          const weeklyAmount = weekKeys.reduce((sum, key) => sum + Number(routine.valuesByDate?.[key] || 0), 0);
          const monthlyAmount = Object.entries(routine.valuesByDate || {})
            .filter(([date]) => date.startsWith(selectedDate.slice(0, 7)))
            .reduce((sum, [, value]) => sum + Number(value || 0), 0);
          const dailyGoalRate = routine.dailyTarget ? Math.min(Math.round((dailyAmount / routine.dailyTarget) * 100), 100) : 0;
          const weeklyGoalRate = routine.weeklyTarget ? Math.min(Math.round((weeklyAmount / routine.weeklyTarget) * 100), 100) : 0;
          const monthlyGoalRate = routine.monthlyTarget ? Math.min(Math.round((monthlyAmount / routine.monthlyTarget) * 100), 100) : 0;
          const primaryRate = routine.repeat === 'daily' ? dailyGoalRate : routine.repeat === 'weeklyTarget' ? weeklyGoalRate : monthlyGoalRate;
          const lastCompleted = Object.keys(routine.valuesByDate || {})
            .filter((key) => Number(routine.valuesByDate?.[key] || 0) > 0)
            .sort()
            .slice(-1)[0] || null;
          return { ...routine, dailyAmount, weeklyAmount, monthlyAmount, dailyGoalRate, weeklyGoalRate, monthlyGoalRate, primaryRate, lastCompleted };
        }

        const monthlyDone = (routine.completedDates || []).filter((date) => date.startsWith(selectedDate.slice(0, 7))).length;
        const weeklyDone = (routine.completedDates || []).filter((date) => weekKeys.includes(date)).length;
        const dailyRate = totalDays ? Math.round((monthlyDone / totalDays) * 100) : 0;
        const weeklyGoalRate = routine.weeklyTarget ? Math.min(Math.round((weeklyDone / routine.weeklyTarget) * 100), 100) : 0;
        const monthlyGoalRate = routine.monthlyTarget ? Math.min(Math.round((monthlyDone / routine.monthlyTarget) * 100), 100) : 0;
        const primaryRate = routine.repeat === 'daily' ? dailyRate : routine.repeat === 'weeklyTarget' ? weeklyGoalRate : monthlyGoalRate;
        const lastCompleted = (routine.completedDates || []).slice().sort().slice(-1)[0] || null;
        return { ...routine, weeklyDone, monthlyDone, dailyRate, weeklyGoalRate, monthlyGoalRate, primaryRate, lastCompleted };
      })
      .sort((a, b) => b.primaryRate - a.primaryRate);
  }, [routines, selectedDate]);

  const weeklyReviewKey = getWeekStartKey(selectedDate);
  const monthlyReviewKey = getMonthKey(selectedDate);
  const canWriteWeeklyReview = isSunday(selectedDate);
  const canWriteMonthlyReview = isLastSundayOfMonth(selectedDate);
  const weeklyReview = weeklyReviews[weeklyReviewKey] || { good: '', bad: '', next: '' };
  const monthlyReview = monthlyReviews[monthlyReviewKey] || { good: '', bad: '', next: '' };
  const monthlyTotalDone = monthlyStats.reduce((sum, day) => sum + day.done, 0);
  const bestDay = monthlyStats.reduce((best, current) => (current.done > (best?.done ?? -1) ? current : best), null);
  const weeklyReviewEntries = Object.entries(weeklyReviews).sort((a, b) => b[0].localeCompare(a[0]));
  const monthlyReviewEntries = Object.entries(monthlyReviews).sort((a, b) => b[0].localeCompare(a[0]));

  function resetRoutineForm() {
    setTitle('');
    setCategory('일상');
    setTime('');
    setTrackingType('check');
    setRepeat('daily');
    setWeeklyTarget('5');
    setMonthlyTarget('20');
    setUnit('페이지');
    setDailyTarget('10');
    setEditingRoutineId(null);
  }

  function saveRoutine() {
    if (!title.trim()) return;

    const resolvedWeeklyTarget = repeat === 'daily'
      ? trackingType === 'cumulative' ? (Number(dailyTarget) || 0) * 7 : 7
      : repeat === 'weeklyTarget' ? Number(weeklyTarget) || 0 : 0;
    const resolvedMonthlyTarget = repeat === 'daily'
      ? trackingType === 'cumulative' ? (Number(dailyTarget) || 0) * 30 : 30
      : repeat === 'monthlyTarget' ? Number(monthlyTarget) || 0 : 0;

    const payload = {
      title: title.trim(),
      category,
      time,
      trackingType,
      repeat,
      weeklyTarget: resolvedWeeklyTarget,
      monthlyTarget: resolvedMonthlyTarget,
      unit: trackingType === 'cumulative' ? unit : undefined,
      dailyTarget: trackingType === 'cumulative' ? Number(dailyTarget) || 0 : undefined,
    };

    if (editingRoutineId) {
      setRoutines((prev) => prev.map((item) => {
        if (item.id !== editingRoutineId) return item;
        const base = { ...item, ...payload };
        return trackingType === 'check'
          ? { ...base, completedDates: item.completedDates || [], valuesByDate: undefined }
          : { ...base, completedDates: undefined, valuesByDate: item.valuesByDate || {} };
      }));
    } else {
      setRoutines((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          ...payload,
          completedDates: trackingType === 'check' ? [] : undefined,
          valuesByDate: trackingType === 'cumulative' ? {} : undefined,
        },
      ]);
    }

    resetRoutineForm();
    setOpen(false);
  }

  function toggleComplete(id) {
    setRoutines((prev) => prev.map((item) => {
      if (item.id !== id || item.trackingType !== 'check') return item;
      const exists = item.completedDates?.includes(selectedDate);
      return {
        ...item,
        completedDates: exists
          ? item.completedDates.filter((d) => d !== selectedDate)
          : [...(item.completedDates || []), selectedDate],
      };
    }));
  }

  function updateCumulativeValue(id, rawValue) {
    setDailyValueInputs((prev) => ({ ...prev, [id]: rawValue }));
    const numericValue = Math.max(0, Number(rawValue) || 0);
    setRoutines((prev) => prev.map((item) => {
      if (item.id !== id || item.trackingType !== 'cumulative') return item;
      const nextValues = { ...(item.valuesByDate || {}) };
      if (numericValue === 0) delete nextValues[selectedDate];
      else nextValues[selectedDate] = numericValue;
      return { ...item, valuesByDate: nextValues };
    }));
  }

  function removeRoutine(id) {
    setRoutines((prev) => prev.filter((item) => item.id !== id));
  }

  function startEditRoutine(routine) {
    setEditingRoutineId(routine.id);
    setTitle(routine.title);
    setCategory(routine.category);
    setTime(routine.time || '');
    setTrackingType(routine.trackingType || 'check');
    setRepeat(routine.repeat);
    setWeeklyTarget(String(routine.weeklyTarget ?? 0));
    setMonthlyTarget(String(routine.monthlyTarget ?? 0));
    setUnit(routine.unit || '페이지');
    setDailyTarget(String(routine.dailyTarget ?? 10));
    setOpen(true);
  }

  function updateWeeklyReview(field, value) {
    setWeeklyReviews((prev) => ({
      ...prev,
      [weeklyReviewKey]: { ...(prev[weeklyReviewKey] || { good: '', bad: '', next: '' }), [field]: value },
    }));
  }

  function updateMonthlyReview(field, value) {
    setMonthlyReviews((prev) => ({
      ...prev,
      [monthlyReviewKey]: { ...(prev[monthlyReviewKey] || { good: '', bad: '', next: '' }), [field]: value },
    }));
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 pb-24 pt-4 md:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">루틴 매니저</h1>
            <p className="mt-1 text-sm text-neutral-500">반복형 루틴과 누적형 루틴을 함께 관리하세요.</p>
          </div>
          <button className="rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-medium text-white" onClick={() => setOpen(true)}>
            <span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" /> 루틴 추가</span>
          </button>
        </motion.div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-3 text-neutral-500"><CalendarDays className="h-4 w-4" /><span className="text-sm">선택한 날짜</span></div>
              <p className="mt-3 text-lg font-semibold">{formatDate(new Date(selectedDate))}</p>
              <input className="mt-4 w-full rounded-2xl border border-neutral-200 px-4 py-3" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-3 text-neutral-500"><CheckCircle2 className="h-4 w-4" /><span className="text-sm">오늘 진행률</span></div>
              <p className="mt-3 text-3xl font-bold">{progress}%</p>
              <div className="mt-4"><ProgressBar value={progress} /></div>
              <p className="mt-2 text-sm text-neutral-500">{checkedCount + cumulativeRecordedCount} / {todayRoutines.length} 기록</p>
            </div>
          </Card>
          <Card>
            <div className="p-5">
              <div className="flex items-center gap-3 text-neutral-500"><Clock3 className="h-4 w-4" /><span className="text-sm">연속 관리 팁</span></div>
              <p className="mt-3 text-sm leading-6 text-neutral-600">체크형은 완료 여부를, 누적형은 페이지·분·거리처럼 쌓이는 양을 관리할 때 좋습니다.</p>
            </div>
          </Card>
        </div>

        <div className="mb-4 grid grid-cols-5 gap-2 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5">
          {[
            ['today', '오늘 루틴'],
            ['weekly', '주간 기록'],
            ['monthly', '월간 기록'],
            ['routine', '루틴별 기록'],
            ['review', '점검란'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-2xl px-2 py-3 text-xs font-medium md:text-sm ${activeTab === key ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'today' && (
          <Card>
            <div className="p-5">
              <h2 className="mb-4 text-lg font-semibold">루틴 목록</h2>
              <div className="space-y-3">
                {todayRoutines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-neutral-500">아직 등록된 루틴이 없습니다. 새 루틴을 추가해 보세요.</div>
                ) : todayRoutines.map((item, idx) => {
                  const checked = item.trackingType === 'check' ? item.completedDates?.includes(selectedDate) : false;
                  const currentValue = item.trackingType === 'cumulative' ? (dailyValueInputs[item.id] ?? String(item.valuesByDate?.[selectedDate] ?? '')) : '';
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        {item.trackingType === 'check' ? (
                          <input type="checkbox" className="h-5 w-5 rounded" checked={!!checked} onChange={() => toggleComplete(item.id)} />
                        ) : (
                          <input type="number" min="0" value={currentValue} onChange={(e) => updateCumulativeValue(item.id, e.target.value)} placeholder="0" className="w-20 rounded-xl border border-neutral-200 px-3 py-2" />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`font-medium ${checked ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>{item.title}</p>
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{item.category}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                            {item.time && <span>{item.time}</span>}
                            <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />{item.trackingType === 'check' ? '체크형' : '누적형'}</span>
                            {item.repeat === 'daily' && <span>{item.trackingType === 'cumulative' ? `하루 ${item.dailyTarget ?? 0}${item.unit || ''}` : '매일 반복'}</span>}
                            {item.repeat === 'weeklyTarget' && <span>주 {item.weeklyTarget ?? 0}{item.trackingType === 'cumulative' ? item.unit || '' : '회'}</span>}
                            {item.repeat === 'monthlyTarget' && <span>월 {item.monthlyTarget ?? 0}{item.trackingType === 'cumulative' ? item.unit || '' : '회'}</span>}
                            {item.trackingType === 'cumulative' && <span>오늘 {Number(item.valuesByDate?.[selectedDate] || 0)}{item.unit || ''}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="ml-3 flex items-center gap-1">
                        <button onClick={() => startEditRoutine(item)} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => removeRoutine(item.id)} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'weekly' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card><div className="p-5"><h2 className="mb-4 text-lg font-semibold">이번 주 기록 수</h2><div className="space-y-3">{weeklyStats.map((day) => <div key={day.label}><div className="mb-2 flex items-center justify-between text-sm"><span>{day.label}</span><span className="text-neutral-500">{day.done}개</span></div><ProgressBar value={Math.min(day.done * 20, 100)} /></div>)}</div></div></Card>
            <Card><div className="p-5"><h2 className="mb-4 text-lg font-semibold">루틴 유지 요약</h2><div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">총 루틴 수 <span className="font-semibold text-neutral-900">{routines.length}개</span><br />오늘 체크형 완료 <span className="font-semibold text-neutral-900">{checkedCount}개</span><br />오늘 누적형 기록 <span className="font-semibold text-neutral-900">{cumulativeRecordedCount}개</span></div></div></Card>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="md:col-span-2"><div className="p-5"><h2 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold"><CalendarRange className="h-5 w-5" />월간 기록 흐름</h2><div className="grid grid-cols-7 gap-2 md:grid-cols-10">{monthlyStats.map((day) => <div key={day.key} className="rounded-2xl border border-neutral-200 p-3 text-center"><p className="text-xs text-neutral-500">{day.day}일</p><p className="mt-2 text-lg font-semibold">{day.done}</p><p className="text-xs text-neutral-400">기록</p></div>)}</div></div></Card>
            <Card><div className="p-5"><h2 className="mb-4 text-lg font-semibold">이번 달 요약</h2><div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">이번 달 총 기록 수 <span className="font-semibold text-neutral-900">{monthlyTotalDone}회</span><br />가장 많이 기록한 날 <span className="font-semibold text-neutral-900">{bestDay ? `${bestDay.day}일 (${bestDay.done}개)` : '기록 없음'}</span><br />체크형과 누적형 모두 기록한 날이 많을수록 흐름이 더 잘 보입니다.</div></div></Card>
            <Card><div className="p-5"><h2 className="mb-4 text-lg font-semibold">월간 평균</h2><div className="space-y-4"><div><div className="mb-2 flex items-center justify-between text-sm"><span>하루 평균 기록</span><span className="text-neutral-500">{monthlyStats.length ? (monthlyTotalDone / monthlyStats.length).toFixed(1) : 0}개</span></div><ProgressBar value={monthlyStats.length ? Math.min((monthlyTotalDone / monthlyStats.length) * 20, 100) : 0} /></div><div><div className="mb-2 flex items-center justify-between text-sm"><span>루틴 수 대비 평균</span><span className="text-neutral-500">{routines.length ? Math.round((monthlyTotalDone / (monthlyStats.length * routines.length || 1)) * 100) : 0}%</span></div><ProgressBar value={routines.length ? Math.round((monthlyTotalDone / (monthlyStats.length * routines.length || 1)) * 100) : 0} /></div></div></div></Card>
          </div>
        )}

        {activeTab === 'routine' && (
          <div className="grid gap-4 md:grid-cols-2">
            {routineStats.map((routine) => (
              <Card key={routine.id}><div className="p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{routine.title}</h2><span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600">{routine.category}</span></div><div className="space-y-4">
                {routine.trackingType === 'check' && routine.repeat === 'daily' && <><div><div className="mb-2 flex items-center justify-between text-sm"><span>매일 달성률</span><span className="font-medium text-neutral-600">{routine.dailyRate}%</span></div><ProgressBar value={routine.dailyRate} /></div><div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">기록 방식 <span className="font-semibold text-neutral-900">체크형</span><br />반복 방식 <span className="font-semibold text-neutral-900">매일</span><br />이번 달 완료 수 <span className="font-semibold text-neutral-900">{routine.monthlyDone}회</span><br />이번 달 기준 달성률 <span className="font-semibold text-neutral-900">{routine.dailyRate}%</span><br />{routine.time && <>설정 시간 <span className="font-semibold text-neutral-900">{routine.time}</span><br /></>}최근 완료일 <span className="font-semibold text-neutral-900">{routine.lastCompleted || '아직 없음'}</span></div></>}
                {routine.trackingType === 'check' && routine.repeat === 'weeklyTarget' && <><div><div className="mb-2 flex items-center justify-between text-sm"><span>주간 목표 달성률</span><span className="font-medium text-neutral-600">{routine.weeklyGoalRate}%</span></div><ProgressBar value={routine.weeklyGoalRate} /></div><div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">기록 방식 <span className="font-semibold text-neutral-900">체크형</span><br />반복 방식 <span className="font-semibold text-neutral-900">주간 목표 횟수</span><br />이번 주 완료 수 <span className="font-semibold text-neutral-900">{routine.weeklyDone}회</span> / 목표 {routine.weeklyTarget ?? 0}회<br />{routine.time && <>설정 시간 <span className="font-semibold text-neutral-900">{routine.time}</span><br /></>}최근 완료일 <span className="font-semibold text-neutral-900">{routine.lastCompleted || '아직 없음'}</span></div></>}
                {routine.trackingType === 'check' && routine.repeat === 'monthlyTarget' && <><div><div className="mb-2 flex items-center justify-between text-sm"><span>월간 목표 달성률</span><span className="font-medium text-neutral-600">{routine.monthlyGoalRate}%</span></div><ProgressBar value={routine.monthlyGoalRate} /></div><div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">기록 방식 <span className="font-semibold text-neutral-900">체크형</span><br />반복 방식 <span className="font-semibold text-neutral-900">월간 목표 횟수</span><br />이번 달 완료 수 <span className="font-semibold text-neutral-900">{routine.monthlyDone}회</span> / 목표 {routine.monthlyTarget ?? 0}회<br />{routine.time && <>설정 시간 <span className="font-semibold text-neutral-900">{routine.time}</span><br /></>}최근 완료일 <span className="font-semibold text-neutral-900">{routine.lastCompleted || '아직 없음'}</span></div></>}
                {routine.trackingType === 'cumulative' && routine.repeat === 'daily' && <><div><div className="mb-2 flex items-center justify-between text-sm"><span>일간 권장량 달성률</span><span className="font-medium text-neutral-600">{routine.dailyGoalRate}%</span></div><ProgressBar value={routine.dailyGoalRate} /></div><div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">기록 방식 <span className="font-semibold text-neutral-900">누적형</span><br />반복 방식 <span className="font-semibold text-neutral-900">매일</span><br />오늘 기록 <span className="font-semibold text-neutral-900">{routine.dailyAmount}{routine.unit || ''}</span> / 권장 {routine.dailyTarget ?? 0}{routine.unit || ''}<br />이번 주 누적 <span className="font-semibold text-neutral-900">{routine.weeklyAmount}{routine.unit || ''}</span><br />이번 달 누적 <span className="font-semibold text-neutral-900">{routine.monthlyAmount}{routine.unit || ''}</span><br />{routine.time && <>설정 시간 <span className="font-semibold text-neutral-900">{routine.time}</span><br /></>}최근 기록일 <span className="font-semibold text-neutral-900">{routine.lastCompleted || '아직 없음'}</span></div></>}
                {routine.trackingType === 'cumulative' && routine.repeat === 'weeklyTarget' && <><div><div className="mb-2 flex items-center justify-between text-sm"><span>주간 누적 목표 달성률</span><span className="font-medium text-neutral-600">{routine.weeklyGoalRate}%</span></div><ProgressBar value={routine.weeklyGoalRate} /></div><div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">기록 방식 <span className="font-semibold text-neutral-900">누적형</span><br />반복 방식 <span className="font-semibold text-neutral-900">주간 목표량</span><br />이번 주 누적 <span className="font-semibold text-neutral-900">{routine.weeklyAmount}{routine.unit || ''}</span> / 목표 {routine.weeklyTarget ?? 0}{routine.unit || ''}<br />오늘 기록 <span className="font-semibold text-neutral-900">{routine.dailyAmount}{routine.unit || ''}</span><br />{routine.time && <>설정 시간 <span className="font-semibold text-neutral-900">{routine.time}</span><br /></>}최근 기록일 <span className="font-semibold text-neutral-900">{routine.lastCompleted || '아직 없음'}</span></div></>}
                {routine.trackingType === 'cumulative' && routine.repeat === 'monthlyTarget' && <><div><div className="mb-2 flex items-center justify-between text-sm"><span>월간 누적 목표 달성률</span><span className="font-medium text-neutral-600">{routine.monthlyGoalRate}%</span></div><ProgressBar value={routine.monthlyGoalRate} /></div><div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">기록 방식 <span className="font-semibold text-neutral-900">누적형</span><br />반복 방식 <span className="font-semibold text-neutral-900">월간 목표량</span><br />이번 달 누적 <span className="font-semibold text-neutral-900">{routine.monthlyAmount}{routine.unit || ''}</span> / 목표 {routine.monthlyTarget ?? 0}{routine.unit || ''}<br />오늘 기록 <span className="font-semibold text-neutral-900">{routine.dailyAmount}{routine.unit || ''}</span><br />{routine.time && <>설정 시간 <span className="font-semibold text-neutral-900">{routine.time}</span><br /></>}최근 기록일 <span className="font-semibold text-neutral-900">{routine.lastCompleted || '아직 없음'}</span></div></>}
              </div></div></Card>
            ))}
            {routineStats.length > 0 && <Card className="md:col-span-2"><div className="p-5"><h2 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold"><BarChart3 className="h-5 w-5" />루틴별 비교</h2><div className="space-y-3">{routineStats.map((routine) => <div key={`${routine.id}-compare`} className="space-y-2"><div className="flex items-center justify-between text-sm"><span>{routine.title}</span><span className="text-neutral-500">{routine.trackingType === 'check' && routine.repeat === 'daily' && `매일 ${routine.dailyRate}%`}{routine.trackingType === 'check' && routine.repeat === 'weeklyTarget' && `주 ${routine.weeklyDone}/${routine.weeklyTarget ?? 0}`}{routine.trackingType === 'check' && routine.repeat === 'monthlyTarget' && `월 ${routine.monthlyDone}/${routine.monthlyTarget ?? 0}`}{routine.trackingType === 'cumulative' && routine.repeat === 'daily' && `일 ${routine.dailyAmount}/${routine.dailyTarget ?? 0}${routine.unit || ''}`}{routine.trackingType === 'cumulative' && routine.repeat === 'weeklyTarget' && `주 ${routine.weeklyAmount}/${routine.weeklyTarget ?? 0}${routine.unit || ''}`}{routine.trackingType === 'cumulative' && routine.repeat === 'monthlyTarget' && `월 ${routine.monthlyAmount}/${routine.monthlyTarget ?? 0}${routine.unit || ''}`}</span></div><ProgressBar value={routine.primaryRate} /></div>)}</div></div></Card>}
          </div>
        )}

        {activeTab === 'review' && (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card><div className="p-5"><h2 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold"><NotebookPen className="h-5 w-5" />주간 점검</h2><div className="space-y-4"><div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">기준 주차 시작일 <span className="font-semibold text-neutral-900">{weeklyReviewKey}</span><br />작성 가능일 <span className="font-semibold text-neutral-900">매주 일요일</span><br />현재 선택일 상태 <span className="font-semibold text-neutral-900">{canWriteWeeklyReview ? '작성 가능' : '일요일에 작성'}</span></div><textarea className="min-h-[100px] w-full rounded-2xl border border-neutral-200 p-3 text-sm" placeholder="이번 주에 잘 지킨 루틴이나 만족스러운 점" value={weeklyReview.good} onChange={(e) => updateWeeklyReview('good', e.target.value)} disabled={!canWriteWeeklyReview} /><textarea className="min-h-[100px] w-full rounded-2xl border border-neutral-200 p-3 text-sm" placeholder="놓친 루틴이나 원인 정리" value={weeklyReview.bad} onChange={(e) => updateWeeklyReview('bad', e.target.value)} disabled={!canWriteWeeklyReview} /><textarea className="min-h-[100px] w-full rounded-2xl border border-neutral-200 p-3 text-sm" placeholder="다음 주에 어떻게 수정할지" value={weeklyReview.next} onChange={(e) => updateWeeklyReview('next', e.target.value)} disabled={!canWriteWeeklyReview} />{!canWriteWeeklyReview && <p className="text-sm text-neutral-500">선택한 날짜가 일요일일 때만 주간 점검을 입력할 수 있습니다.</p>}</div></div></Card>
              <Card><div className="p-5"><h2 className="mb-4 inline-flex items-center gap-2 text-lg font-semibold"><NotebookPen className="h-5 w-5" />월간 점검</h2><div className="space-y-4"><div className="rounded-2xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-600">기준 월 <span className="font-semibold text-neutral-900">{monthlyReviewKey}</span><br />작성 가능일 <span className="font-semibold text-neutral-900">마지막 주 일요일</span><br />현재 선택일 상태 <span className="font-semibold text-neutral-900">{canWriteMonthlyReview ? '작성 가능' : '마지막 주 일요일에 작성'}</span></div><textarea className="min-h-[100px] w-full rounded-2xl border border-neutral-200 p-3 text-sm" placeholder="이번 달 가장 잘 유지된 루틴과 이유" value={monthlyReview.good} onChange={(e) => updateMonthlyReview('good', e.target.value)} disabled={!canWriteMonthlyReview} /><textarea className="min-h-[100px] w-full rounded-2xl border border-neutral-200 p-3 text-sm" placeholder="무너진 흐름과 패턴 정리" value={monthlyReview.bad} onChange={(e) => updateMonthlyReview('bad', e.target.value)} disabled={!canWriteMonthlyReview} /><textarea className="min-h-[100px] w-full rounded-2xl border border-neutral-200 p-3 text-sm" placeholder="다음 달 루틴 운영 방식 수정안" value={monthlyReview.next} onChange={(e) => updateMonthlyReview('next', e.target.value)} disabled={!canWriteMonthlyReview} />{!canWriteMonthlyReview && <p className="text-sm text-neutral-500">선택한 날짜가 그 달의 마지막 일요일일 때만 월간 점검을 입력할 수 있습니다.</p>}</div></div></Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card><div className="p-5"><h2 className="mb-4 text-lg font-semibold">지난 주간 점검 기록</h2><div className="space-y-3">{weeklyReviewEntries.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-neutral-500">아직 저장된 주간 점검 기록이 없습니다.</div> : weeklyReviewEntries.map(([key, review]) => <div key={key} className="rounded-2xl border border-neutral-200 p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="font-semibold text-neutral-900">주차 시작일 {key}</p>{key === weeklyReviewKey && <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600">현재 주차</span>}</div><div className="space-y-2 text-sm leading-6 text-neutral-600"><p><span className="font-medium text-neutral-900">잘한 점:</span> {review.good || '-'}</p><p><span className="font-medium text-neutral-900">아쉬운 점:</span> {review.bad || '-'}</p><p><span className="font-medium text-neutral-900">다음 주 계획:</span> {review.next || '-'}</p></div></div>)}</div></div></Card>
              <Card><div className="p-5"><h2 className="mb-4 text-lg font-semibold">지난 월간 점검 기록</h2><div className="space-y-3">{monthlyReviewEntries.length === 0 ? <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-neutral-500">아직 저장된 월간 점검 기록이 없습니다.</div> : monthlyReviewEntries.map(([key, review]) => <div key={key} className="rounded-2xl border border-neutral-200 p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="font-semibold text-neutral-900">기준 월 {key}</p>{key === monthlyReviewKey && <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600">현재 월</span>}</div><div className="space-y-2 text-sm leading-6 text-neutral-600"><p><span className="font-medium text-neutral-900">잘한 점:</span> {review.good || '-'}</p><p><span className="font-medium text-neutral-900">아쉬운 점:</span> {review.bad || '-'}</p><p><span className="font-medium text-neutral-900">다음 달 계획:</span> {review.next || '-'}</p></div></div>)}</div></div></Card>
            </div>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); resetRoutineForm(); }} title={editingRoutineId ? '루틴 수정하기' : '새 루틴 만들기'}>
        <div className="grid gap-4">
          <div className="grid gap-2"><label className="text-sm font-medium">루틴 이름</label><input className="w-full rounded-2xl border border-neutral-200 px-4 py-3" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 영어 공부 30분 / 독서" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><label className="text-sm font-medium">카테고리</label><select className="w-full rounded-2xl border border-neutral-200 px-4 py-3" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="grid gap-2"><label className="text-sm font-medium">시간 <span className="text-neutral-400">(선택)</span></label><input className="w-full rounded-2xl border border-neutral-200 px-4 py-3" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          </div>
          <div className="grid gap-2"><label className="text-sm font-medium">기록 방식</label><select className="w-full rounded-2xl border border-neutral-200 px-4 py-3" value={trackingType} onChange={(e) => setTrackingType(e.target.value)}><option value="check">체크형</option><option value="cumulative">누적형</option></select></div>
          {trackingType === 'cumulative' && <div className="grid grid-cols-2 gap-3"><div className="grid gap-2"><label className="text-sm font-medium">단위</label><input className="w-full rounded-2xl border border-neutral-200 px-4 py-3" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="예: 페이지, 분, km" /></div><div className="grid gap-2"><label className="text-sm font-medium">일간 권장량</label><input className="w-full rounded-2xl border border-neutral-200 px-4 py-3" type="number" min="0" value={dailyTarget} onChange={(e) => setDailyTarget(e.target.value)} /></div></div>}
          <div className="grid gap-2"><label className="text-sm font-medium">반복 설정</label><select className="w-full rounded-2xl border border-neutral-200 px-4 py-3" value={repeat} onChange={(e) => setRepeat(e.target.value)}><option value="daily">매일</option><option value="weeklyTarget">주간 목표 {trackingType === 'cumulative' ? '량' : '횟수'}</option><option value="monthlyTarget">월간 목표 {trackingType === 'cumulative' ? '량' : '횟수'}</option></select></div>
          {repeat === 'weeklyTarget' && <div className="grid gap-2"><label className="text-sm font-medium">주간 목표 {trackingType === 'cumulative' ? unit : '횟수'}</label><input className="w-full rounded-2xl border border-neutral-200 px-4 py-3" type="number" min="0" value={weeklyTarget} onChange={(e) => setWeeklyTarget(e.target.value)} /></div>}
          {repeat === 'monthlyTarget' && <div className="grid gap-2"><label className="text-sm font-medium">월간 목표 {trackingType === 'cumulative' ? unit : '횟수'}</label><input className="w-full rounded-2xl border border-neutral-200 px-4 py-3" type="number" min="0" value={monthlyTarget} onChange={(e) => setMonthlyTarget(e.target.value)} /></div>}
          {repeat === 'daily' && <div className="rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-600">{trackingType === 'cumulative' ? '매일 선택 시 일간 권장량을 기준으로 주간·월간 목표가 자동 계산됩니다.' : '매일 선택 시 자동으로 주 7회, 월 30회 기준으로 계산됩니다.'}</div>}
          <button onClick={saveRoutine} className="rounded-2xl bg-neutral-900 px-4 py-3 font-medium text-white">{editingRoutineId ? '수정 저장' : '저장하기'}</button>
        </div>
      </Modal>
    </div>
  );
}

export default App;
