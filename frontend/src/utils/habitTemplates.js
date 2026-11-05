const originalTemplates = [
  {
    icon: '🌅', name: 'Thói quen buổi sáng', desc: 'Bắt đầu ngày mới với năng lượng',
    habits: [
      { name: 'Dậy sớm 6h', difficulty: 'MEDIUM', targetPerWeek: 7, tags: 'buổi sáng' },
      { name: 'Thiền 10 phút', difficulty: 'EASY', targetPerWeek: 7, tags: 'thiền, buổi sáng' },
      { name: 'Tập thể dục 30 phút', difficulty: 'HARD', targetPerWeek: 5, tags: 'sức khỏe' },
      { name: 'Uống 1 ly nước ấm', difficulty: 'EASY', targetPerWeek: 7, tags: 'sức khỏe' },
    ],
  },
  {
    icon: '📚', name: 'Đọc sách mỗi ngày', desc: 'Nâng cao kiến thức liên tục',
    habits: [
      { name: 'Đọc sách 20 phút', difficulty: 'MEDIUM', targetPerWeek: 7, tags: 'đọc sách' },
      { name: 'Ghi chú sách', difficulty: 'EASY', targetPerWeek: 5, tags: 'đọc sách, học tập' },
    ],
  },
  {
    icon: '💪', name: 'Gym & Sức khỏe', desc: 'Tập luyện khoa học',
    habits: [
      { name: 'Tập gym', difficulty: 'HARD', targetPerWeek: 4, tags: 'gym, sức khỏe' },
      { name: 'Ăn đủ protein', difficulty: 'MEDIUM', targetPerWeek: 7, tags: 'dinh dưỡng' },
      { name: 'Ngủ đủ 7 tiếng', difficulty: 'MEDIUM', targetPerWeek: 7, tags: 'sức khỏe' },
      { name: 'Uống 2L nước', difficulty: 'EASY', targetPerWeek: 7, tags: 'sức khỏe' },
    ],
  },
  {
    icon: '🇬🇧', name: 'Học tiếng Anh', desc: 'Cải thiện ngoại ngữ hàng ngày',
    habits: [
      { name: 'Học từ vựng mới', difficulty: 'MEDIUM', targetPerWeek: 6, tags: 'tiếng Anh' },
      { name: 'Nghe podcast tiếng Anh', difficulty: 'EASY', targetPerWeek: 5, tags: 'tiếng Anh, listening' },
      { name: 'Viết nhật ký bằng tiếng Anh', difficulty: 'HARD', targetPerWeek: 3, tags: 'tiếng Anh, writing' },
    ],
  },
  {
    icon: '💻', name: 'Lập trình viên', desc: 'Xây dựng kỹ năng coding',
    habits: [
      { name: 'Code ít nhất 1 tiếng', difficulty: 'MEDIUM', targetPerWeek: 6, tags: 'lập trình' },
      { name: 'Đọc docs/blog tech', difficulty: 'EASY', targetPerWeek: 5, tags: 'lập trình, học tập' },
      { name: 'Giải 1 bài LeetCode', difficulty: 'HARD', targetPerWeek: 4, tags: 'lập trình, thuật toán' },
    ],
  },
  {
    icon: '🧘', name: 'Cân bằng tâm trí', desc: 'Chăm sóc sức khỏe tinh thần',
    habits: [
      { name: 'Thiền 15 phút', difficulty: 'MEDIUM', targetPerWeek: 7, tags: 'thiền' },
      { name: 'Viết nhật ký biết ơn', difficulty: 'EASY', targetPerWeek: 7, tags: 'tinh thần' },
      { name: 'Không mạng xã hội 1 tiếng trước ngủ', difficulty: 'HARD', targetPerWeek: 7, tags: 'digital detox' },
    ],
  },
];
const groups=['BALANCE','LEARNING','HEALTH','LEARNING','FOCUS','BALANCE'];
export const habitTemplateGroups={ALL:'Tất cả bộ mẫu',STARTER:'Bắt đầu nhẹ nhàng',LEARNING:'Học tập',HEALTH:'Vận động',FOCUS:'Tập trung',BALANCE:'Cân bằng'};
export const habitTemplates=[
 {id:'starter-reading',group:'STARTER',icon:'',name:'Bắt đầu đọc sách',desc:'Hai bước nhỏ, ba lần mỗi tuần',habits:[{name:'Đọc một trang sách',difficulty:'EASY',targetPerWeek:3,tags:'đọc sách'},{name:'Ghi lại một ý đáng nhớ',difficulty:'EASY',targetPerWeek:3,tags:'học tập'}]},
 {id:'starter-focus',group:'STARTER',icon:'',name:'Bắt đầu làm việc tập trung',desc:'Chọn một việc và dành thời gian ngắn để bắt đầu',habits:[{name:'Chọn một việc ưu tiên',difficulty:'EASY',targetPerWeek:3,tags:'tập trung'},{name:'Dọn góc làm việc trong 2 phút',difficulty:'EASY',targetPerWeek:3,tags:'tập trung'}]},
 {id:'starter-reflection',group:'STARTER',icon:'',name:'Bắt đầu nhìn lại ngày',desc:'Ghi nhận một bước tiến nhỏ của bạn',habits:[{name:'Ghi lại một việc đã làm được',difficulty:'EASY',targetPerWeek:3,tags:'nhật ký'},{name:'Chọn một bước nhỏ cho ngày mai',difficulty:'EASY',targetPerWeek:3,tags:'kế hoạch'}]},
 ...originalTemplates.map((row,index)=>({...row,id:['morning','reading','fitness','english','coding','balance'][index],group:groups[index]}))
];
const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
export function selectHabitTemplates(rows,{query='',group='ALL',easyOnly=false}={},t=value=>value){
 const words=normalize(query).trim().split(/\s+/).filter(Boolean);
 return rows.filter(row=>(group==='ALL'||row.group===group)&&(!easyOnly||row.habits.every(h=>h.difficulty==='EASY'))&&words.every(word=>normalize([row.name,row.desc,...row.habits.flatMap(h=>[h.name,h.tags??''])].flatMap(value=>[value,t(value)]).join(' ')).includes(word)));
}
