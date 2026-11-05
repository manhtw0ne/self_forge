package com.selfforge.discipline.goal;
import jakarta.persistence.*;
@Entity
@Table(name="goal_habit_plan",uniqueConstraints=@UniqueConstraint(columnNames={"user_id","request_id"}))
public class GoalHabitPlan {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private Long userId;
 @Column(nullable=false) private Long goalId;
 @Column(nullable=false) private Long habitId;
 @Column(nullable=false,length=36) private String requestId;
 protected GoalHabitPlan(){}
 public GoalHabitPlan(Long userId,Long goalId,Long habitId,String requestId){this.userId=userId;this.goalId=goalId;this.habitId=habitId;this.requestId=requestId;}
 public Long getGoalId(){return goalId;}
 public Long getHabitId(){return habitId;}
}
