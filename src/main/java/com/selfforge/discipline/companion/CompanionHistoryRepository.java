package com.selfforge.discipline.companion;
import com.selfforge.discipline.checkin.*;import org.springframework.data.repository.Repository;import org.springframework.data.jpa.repository.Query;import org.springframework.data.repository.query.Param;import org.springframework.data.domain.Pageable;import java.util.List;
public interface CompanionHistoryRepository extends Repository<CheckInXpAdjustment,Long>{
 @Query("select new com.selfforge.discipline.companion.CompanionHistoryEvent(a.id,c.id,h.name,c.date,a.createdAt,a.fromStatus,a.toStatus,c.pointsSnapshot) from CheckInXpAdjustment a join a.checkIn c join c.habit h where h.user.id=:owner and c.pointsSnapshot>0 and c.appliedXp is not null and (:before is null or a.id<:before) and ((a.toStatus=:completed and (a.fromStatus is null or a.fromStatus<>:completed)) or (a.fromStatus=:completed and a.toStatus<>:completed)) order by a.id desc")
 List<CompanionHistoryEvent> history(@Param("owner") Long owner,@Param("before") Long before,@Param("completed") CheckInStatus completed,Pageable pageable);
}
