package com.selfforge.discipline.goal;
import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import org.springframework.data.domain.Pageable;import java.util.List;
public interface GoalProgressCorrectionRepository extends JpaRepository<GoalProgressCorrection,Long>{
 @Query("select c from GoalProgressCorrection c where c.goal.user.id=:userId and c.goal.id=:goalId and (:beforeId is null or c.id<:beforeId) and (:kind is null or c.kind=:kind) order by c.id desc")
 List<GoalProgressCorrection> history(@Param("userId")Long userId,@Param("goalId")Long goalId,@Param("beforeId")Long beforeId,@Param("kind")String kind,Pageable pageable);
 @Query("select c from GoalProgressCorrection c where c.goal.user.id=:userId and c.goal.id=:goalId and c.createdAt>=:start and c.createdAt<:end order by c.createdAt,c.id")
 List<GoalProgressCorrection> dailyRange(@Param("userId")Long userId,@Param("goalId")Long goalId,@Param("start")java.time.Instant start,@Param("end")java.time.Instant end);
 @Query("select c from GoalProgressCorrection c where c.goal.user.id=:userId and c.goal.id=:goalId and c.createdAt>=:start and c.createdAt<:end and c.id<:beforeId order by c.id desc")
 List<GoalProgressCorrection> dayHistory(@Param("userId")Long userId,@Param("goalId")Long goalId,@Param("start")java.time.Instant start,@Param("end")java.time.Instant end,@Param("beforeId")Long beforeId,Pageable pageable);
 @Modifying @Query("delete from GoalProgressCorrection c where c.goal.id=:goalId") void deleteForGoal(@Param("goalId")Long goalId);
}
