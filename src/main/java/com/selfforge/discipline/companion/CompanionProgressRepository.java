package com.selfforge.discipline.companion;
import com.selfforge.discipline.checkin.DailyCheckIn;
import org.springframework.data.jpa.repository.Query;import org.springframework.data.repository.Repository;import org.springframework.data.repository.query.Param;
public interface CompanionProgressRepository extends Repository<DailyCheckIn,Long>{
 interface Totals{Long getXp();Long getCounted();Long getLegacy();}
 // Read the recorded base points of each valid source once, independently of the account's spendable XP.
 @Query(value="select coalesce(sum(case when c.points_snapshot>0 and c.applied_xp is not null then c.points_snapshot else 0 end),0) as xp, coalesce(sum(case when c.points_snapshot>0 and c.applied_xp is not null then 1 else 0 end),0) as counted, coalesce(sum(case when c.points_snapshot is null or c.applied_xp is null then 1 else 0 end),0) as legacy from daily_check_in c join habit h on h.id=c.habit_id where h.user_id=:owner and c.status='COMPLETED'",nativeQuery=true)
 Totals totals(@Param("owner") Long owner);
}
