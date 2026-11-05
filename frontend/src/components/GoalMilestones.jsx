import {useLanguage} from '../context/useLanguage';
import {goalMilestones} from '../utils/goalMilestones';
export default function GoalMilestones({goal,disabled,onRecord}){
 const {t}=useLanguage();let result;try{result=goalMilestones(goal);}catch{return null;}
 return <details style={{margin:'1rem 0',borderTop:'1px solid var(--border-color)',paddingTop:'0.75rem'}}><summary>{t('Các mốc nhỏ của mục tiêu')}</summary>
  <p>{t('Các mốc được chia từ chỉ tiêu hiện tại và cập nhật theo số lượng đã ghi. Đây không phải lịch sử ngày đạt mốc.')}</p>
  <ol style={{paddingLeft:'1.25rem'}}>{result.milestones.map(row=><li key={row.value} style={{margin:'0.5rem 0'}}>{row.percent}% · {row.value} {goal.unit||''} · {t(row.reached?'Đã đạt theo số lượng hiện tại':'Còn {amount} {unit} đến mốc này',{amount:row.remaining,unit:goal.unit||''})}</li>)}</ol>
  {result.next&&<><p>{t('Mốc tiếp theo: {target} {unit}. Còn {amount} {unit}.',{target:result.next.value,unit:goal.unit||'',amount:result.next.remaining})}</p><button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onRecord(result.next.remaining)}>{t('Điền lượng còn thiếu vào hộp ghi tiến độ')}</button><p>{t('Chỉ xác nhận phần đã thực sự làm. Bạn có thể sửa lượng gợi ý trong hộp ghi tiến độ; chưa có dữ liệu nào được ghi khi bấm nút này.')}</p></>}
 </details>;
}
