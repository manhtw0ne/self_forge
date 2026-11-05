import { validCalendarDate, shiftDate } from './dates.js';

const dayMs = 86400000;
const weekday = date => new Date(`${date}T00:00:00Z`).getUTCDay();

export function goalPlan(goal, today, weekdays = [0, 1, 2, 3, 4, 5, 6]) {
  if (!validCalendarDate(today) || !Number.isSafeInteger(goal.targetValue) || goal.targetValue < 1 || goal.targetValue > 2147483647 ||
      !Number.isSafeInteger(goal.currentValue) || goal.currentValue < 0) return { state: 'invalid' };
  const remaining = Math.max(0, goal.targetValue - goal.currentValue);
  if (goal.status !== 'ACTIVE' || remaining === 0) return { state: 'ended', remaining };
  if (!goal.deadline) return { state: 'undated', remaining };
  if (!validCalendarDate(goal.deadline)) return { state: 'invalid' };
  if (goal.deadline < today) return { state: 'overdue', remaining };
  const selected = [...new Set(weekdays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6))];
  const days = Math.round((Date.parse(`${goal.deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / dayMs) + 1;
  const start = weekday(today);
  let sessions = Math.floor(days / 7) * selected.length;
  for (let offset = 0; offset < days % 7; offset++) if (selected.includes((start + offset) % 7)) sessions++;
  if (!sessions) return { state: 'no-days', remaining, days };
  let index = 0;
  const preview = [];
  for (let offset = 0; offset < Math.min(7, days); offset++) {
    const date = shiftDate(today, offset);
    if (!selected.includes(weekday(date))) continue;
    index++;
    // Spread integer units across every selected day, preserving the total exactly.
    const amount = Math.ceil(remaining * index / sessions) - Math.ceil(remaining * (index - 1) / sessions);
    preview.push({ date, amount });
  }
  return { state: 'ready', remaining, days, sessions, perSession: Math.ceil(remaining / sessions), weekdays: selected, preview };
}

export function goalPlanExport(goal, plan, today, t = value => value) {
  if (plan.state !== 'ready') throw new Error('Plan is not ready');
  return {
    filename: `selfforge-goal-plan-${today}.txt`,
    content: [t('Kế hoạch thực hiện mục tiêu'), goal.name, `${t('Ngày lập')}: ${today}`,
      `${t('Hạn chót')}: ${goal.deadline}`, `${t('Còn lại')}: ${plan.remaining} ${goal.unit || ''}`,
      `${t('Số ngày thực hiện còn lại')}: ${plan.sessions}`,
      `${t('Ngày có thể thực hiện')}: ${plan.weekdays.map(day => t(['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][day])).join(', ')}`, '', t('Lịch 7 ngày tới'),
      ...plan.preview.map(row => `${row.date}: ${row.amount} ${goal.unit || ''}`), '',
      t('Kế hoạch chia đều số lượng, chưa ước tính thời gian hay độ khó. Không tự ghi tiến độ hoặc đổi mục tiêu.')].join('\n'),
  };
}

export function goalCapacity(goal,today,weekdays,capacity){
 const amount=Number(capacity);if(capacity==null||String(capacity).trim()===''||!Number.isSafeInteger(amount)||amount<1||amount>2147483647)throw Error('Invalid session capacity');
 const plan=goalPlan(goal,today,weekdays);if(plan.state!=='ready'&&plan.state!=='no-days')return {state:plan.state};
 const selected=[...new Set(weekdays.filter(day=>Number.isInteger(day)&&day>=0&&day<=6))];
 if(!selected.length)return {state:'no-days'};
 const needed=Math.ceil(plan.remaining/amount);const available=plan.sessions||0;
 let recommendedDeadline=null,seen=0;
 // Bound suggestions to ten years; never loop in proportion to a large goal value.
 for(let offset=0;offset<3660;offset++){
  const date=shiftDate(today,offset);if(!validCalendarDate(date))break;
  if(selected.includes(weekday(date))&&++seen===needed){recommendedDeadline=date;break;}
 }
 return {state:'ready',capacity:amount,needed,available,fits:needed<=available,shortfall:Math.max(0,needed-available),recommendedDeadline};
}
export function goalHabitSuggestion(goal,plan,capacity,t=value=>value){
 if(plan.state!=='ready'||capacity.state!=='ready')return null;
 const amount=Math.min(plan.perSession,capacity.capacity);
 const description=t('Mỗi buổi thực hiện tối đa {amount} {unit}; kiểm tra lại tiến độ mục tiêu sau khi làm.',{amount,unit:goal.unit||''});
 // Long goal units must remain editable; do not silently truncate the suggested instruction.
 return {name:goal.name,description:description.length<=255?description:'',difficulty:'EASY',targetPerWeek:plan.weekdays.length};
}
