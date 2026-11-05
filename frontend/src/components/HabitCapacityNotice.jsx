import {useLanguage} from '../context/useLanguage';
export default function HabitCapacityNotice({state}){
 const {t}=useLanguage(),capacity=state.capacity;
 return <section style={{padding:'0.75rem',margin:'1rem 0',border:'1px solid var(--border-color)',borderRadius:'0.75rem'}} aria-label={t('Số thói quen có thể thêm')}>
  {state.loading?<p role="status">{t('Đang kiểm tra giới hạn thói quen...')}</p>:state.error?<p role="status">{t('Chưa tải được giới hạn. Bạn vẫn có thể gửi; máy chủ sẽ kiểm tra trước khi tạo.')}</p>:capacity&&<><p>{t('Hiện có {count} thói quen đang bật.',{count:capacity.current})}</p><p>{t(capacity.unlimited?'Tài khoản hiện không giới hạn số thói quen đang bật.':'Có thể thêm {remaining} thói quen trước khi chạm giới hạn {max}.',capacity)}</p>{capacity.remaining===0&&<p>{t('Bạn có thể tắt một thói quen đang bật để dành chỗ. Không cần xóa lịch sử của thói quen đó.')}</p>}</>}
  <button className="btn btn-ghost btn-sm" type="button" disabled={state.loading} onClick={state.reload}>{t('Kiểm tra lại giới hạn')}</button>
 </section>;
}
