import {Link} from 'react-router-dom';
import {useLanguage} from '../context/useLanguage';
import {challengeNextStep} from '../utils/challengeNextStep';
import {habitPath} from '../utils/habitNavigation';
import {challengeLink} from '../utils/challengeProposal';
export default function ChallengeNextStep({challenge,progress,today,habitActive,onRepeat,disabled=false}){
 const {t}=useLanguage();const step=challengeNextStep(challenge,progress,today);
 if(!step)return null;
 const messages={
  STOPPED:'Thử thách đã dừng. Lịch sử vẫn được giữ để bạn xem lại.',
  REACHED:'Đã đủ số ngày hoàn thành. Hãy giữ nhịp phù hợp với bạn.',
  UPCOMING:'Thử thách chưa bắt đầu. Chỉ check-in trong khoảng ngày của thử thách mới được tính.',
  ENDED:'Đã hết khoảng thời gian; còn thiếu {remaining} ngày hoàn thành. Bạn có thể xem lại lịch sử hoặc bắt đầu một thử thách nhẹ hơn.',
  SHORT_WINDOW:'Còn thiếu {remaining} ngày hoàn thành nhưng chỉ còn {calendarDays} ngày lịch, kể cả hôm nay. Hãy xem lại lịch sử hoặc cân nhắc bắt đầu lại với mục tiêu nhẹ hơn.',
  IN_PROGRESS:'Còn thiếu {remaining} ngày hoàn thành trong {calendarDays} ngày lịch còn lại, kể cả hôm nay.'
 };
 const canCheckIn=habitActive&&['IN_PROGRESS','SHORT_WINDOW'].includes(step.kind);
 return <section style={{marginTop:'1rem',borderTop:'1px solid var(--border-color)',paddingTop:'0.75rem'}} aria-label={t('Bước tiếp theo của thử thách')}>
  <p>{t(messages[step.kind],step)}</p>
  {step.kind==='IN_PROGRESS'&&<p>{t('Nếu đã check-in hoàn thành hôm nay thì không cần làm lại; mỗi ngày chỉ được tính một lần.')}</p>}
  <div style={{display:'flex',flexWrap:'wrap',gap:'0.75rem',marginTop:'0.75rem'}}>
   {canCheckIn&&<Link className="btn btn-primary btn-sm" to={habitPath('/',challenge.habitId)+'#today-habits'}>{t('Mở đúng thói quen hôm nay')}</Link>}
   <Link className="btn btn-secondary btn-sm" to={habitPath('/stats',challenge.habitId)}>{t('Xem tiến độ thói quen')}</Link>
   {habitActive&&(!onRepeat||step.kind==='SHORT_WINDOW')&&['ENDED','SHORT_WINDOW','STOPPED','REACHED'].includes(step.kind)&&<Link className="btn btn-secondary btn-sm" to={challengeLink(challenge.habitId)}>{t('Chuẩn bị thử thách mới')}</Link>}
   {habitActive&&onRepeat&&['ENDED','STOPPED','REACHED'].includes(step.kind)&&<>
    <button className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onRepeat('SAME')}>{t('Dùng lại mục tiêu thử thách')}</button>
    {challenge.targetDays>1&&<button className="btn btn-secondary btn-sm" disabled={disabled} onClick={()=>onRepeat('LIGHT')}>{t('Chuẩn bị phiên bản nhẹ hơn')}</button>}
   </>}
   {!habitActive&&<Link className="btn btn-secondary btn-sm" to={habitPath('/habits',challenge.habitId)}>{t('Xem thói quen đã tạm dừng')}</Link>}
  </div>
 </section>;
}
