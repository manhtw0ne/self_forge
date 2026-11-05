package com.selfforge.discipline.weekplan;
import java.time.LocalDate;import java.util.Optional;
public interface WeekActionPlanRepository extends org.springframework.data.jpa.repository.JpaRepository<WeekActionPlan,Long>{
 Optional<WeekActionPlan> findByUserIdAndWeekStart(Long userId,LocalDate weekStart);
}
