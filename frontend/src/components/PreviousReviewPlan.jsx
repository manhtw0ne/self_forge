import {useState} from 'react';
import {useLanguage} from '../context/useLanguage';
import {formatCalendarDate} from '../utils/dates';
import {previousReviewPlan,previousReviewQuestion} from '../utils/previousReview';
export default function PreviousReviewPlan({week,reviews,loading,error,onRetry,disabled,onInsert}){
 const {t,language}=useLanguage();const [open,setOpen]=useState(false);let source=null,invalid=false;
 try{source=previousReviewPlan(reviews,week);}catch{invalid=true;}
 return <section className="card" style={{margin:'1rem 0'}}>
  <h2 className="card-title">{t('Nhìn lại kế hoạch đã đặt cho tuần này')}</h2>
  <button type="button" className="btn btn-secondary btn-sm" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{t(open?'Ẩn kế hoạch từ tuần trước':'Xem kế hoạch từ tuần trước')}</button>
  {open&&<>{loading?<p role="status">{t('Đang tải...')}</p>:error||invalid?<div role="alert"><p>{t('Chưa đọc được kế hoạch từ tuần trước. Bài đang viết được giữ nguyên.')}</p><button type="button" className="btn btn-secondary btn-sm" disabled={loading} onClick={onRetry}>{t('Thử lại')}</button></div>:source?.plan.trim()?<>
    <p>{t('Kế hoạch tuần sau trong tổng kết bắt đầu ngày {week}, dành cho tuần đang xem.',{week:formatCalendarDate(source.weekStart,language)})}</p>
    <blockquote style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:'1rem 0'}}>{source.plan}</blockquote>
    <p>{t('Đây là dự định đã viết, chưa phải kết quả hoàn thành. Bạn tự đánh giá phần đã làm và điều còn phù hợp trước khi chuyển tiếp.')}</p>
    <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}>
     <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onInsert('improvements',previousReviewQuestion(source,week,t))}>{t('Thêm câu hỏi vào phần cải thiện')}</button>
     <button type="button" className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onInsert('nextWeekPlan',source.plan)}>{t('Thêm kế hoạch cũ vào kế hoạch tuần sau')}</button>
    </div>
    <p>{t('Chỉ thêm vào biểu mẫu khi bạn chọn, giữ nguyên nội dung hiện có. Xem lại rồi bấm lưu tổng kết để lưu lên tài khoản.')}</p>
   </>:<p>{t('Tuần liền trước chưa có kế hoạch được lưu. Không dùng kế hoạch từ tuần xa hơn để thay thế.')}</p>}
  </>}
 </section>;
}
