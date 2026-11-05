import CompanionCard from '../components/CompanionCard';
import {useAuth} from '../context/useAuth';
import {useLanguage} from '../context/useLanguage';

export default function CompanionPage(){
 const {user}=useAuth(),{language}=useLanguage(),en=language==='en';
 return <div className="fade-in"><header className="page-header"><h1>{en?'Your companion':'Bạn đồng hành'}</h1><p>{en?'A visual reflection of recorded habit progress. There are no care tasks, streak requirements, or penalties for time away.':'Đây là hình ảnh phản ánh tiến độ thói quen đã ghi nhận. Không có nhiệm vụ chăm thú, yêu cầu streak hay phạt khi bạn nghỉ.'}</p></header>
  <CompanionCard owner={user.id} timezone={user.timezone} standalone/>
  <p role="note">{en?'Changing appearance or hiding the Dashboard card never deletes recorded companion progress.':'Đổi ngoại hình hoặc ẩn thẻ trên Dashboard không xóa tiến độ đồng hành đã ghi nhận.'}</p>
 </div>;
}
