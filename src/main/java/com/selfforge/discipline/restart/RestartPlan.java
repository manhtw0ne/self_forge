package com.selfforge.discipline.restart;
import jakarta.persistence.*;
import java.time.LocalDate;
@Entity
@Table(name="restart_plan")
public class RestartPlan {
 @Id @Column(name="user_id") Long userId;
 @Column(nullable=false) long revision;
 @Column(nullable=false,length=255) String name;
 @Column(nullable=false,length=16) String reason;
 @Column(nullable=false) LocalDate startDate;
 @Column(nullable=false,length=500) String stepOne;
 @Column(nullable=false,length=500) String stepTwo;
 @Column(nullable=false,length=500) String stepThree;
 protected RestartPlan(){}
 RestartPlan(Long userId){this.userId=userId;}
}
