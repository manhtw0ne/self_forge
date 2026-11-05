package com.selfforge.discipline.weekplan;
import jakarta.persistence.*;
import java.time.LocalDate;
@Entity @Table(name="week_action_plan",uniqueConstraints=@UniqueConstraint(columnNames={"user_id","week_start"}))
public class WeekActionPlan {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
 @Column(name="user_id",nullable=false) Long userId;
 @Column(nullable=false) LocalDate weekStart;
 @Column(nullable=false,length=1000) String action;
 @Column(nullable=false) LocalDate actionDate;
 @Column(nullable=false,length=5) String actionTime;
 @Column(nullable=false) boolean completed;
 @Column(nullable=false) long revision;
 protected WeekActionPlan(){}
 WeekActionPlan(Long userId,LocalDate week){this.userId=userId;weekStart=week;}
}
