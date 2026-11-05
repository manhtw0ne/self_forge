package com.selfforge.discipline.goal;
import java.util.*;
public interface GoalHabitPlanRepository extends org.springframework.data.jpa.repository.JpaRepository<GoalHabitPlan,Long>{
 boolean existsByUserIdAndGoalIdAndHabitId(Long userId,Long goalId,Long habitId);
 Optional<GoalHabitPlan> findByUserIdAndRequestId(Long userId,String requestId);
 List<GoalHabitPlan> findByUserIdAndGoalIdOrderByIdAsc(Long userId,Long goalId);
 @org.springframework.data.jpa.repository.Query("select distinct new com.selfforge.discipline.goal.HabitGoalLink(p.habitId,g.id,g.name,g.status,g.currentValue,g.targetValue,g.unit,g.deadline) from GoalHabitPlan p join Goal g on g.id=p.goalId join Habit h on h.id=p.habitId where p.userId=:userId and g.user.id=:userId and h.user.id=:userId order by g.id,p.habitId")
 List<HabitGoalLink> linksForOwner(@org.springframework.data.repository.query.Param("userId") Long userId);
}
