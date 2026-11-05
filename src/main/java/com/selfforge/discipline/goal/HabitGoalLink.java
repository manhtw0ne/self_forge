package com.selfforge.discipline.goal;
import java.time.LocalDate;
public record HabitGoalLink(Long habitId,Long goalId,String name,GoalStatus status,int currentValue,int targetValue,String unit,LocalDate deadline){}
