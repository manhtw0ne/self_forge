package com.selfforge.discipline.goal;
import jakarta.persistence.*;
import java.time.Instant;
@Entity public class GoalProgressCorrection {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) private Goal goal;
 @Column(nullable=false,length=16) private String kind;
 @Column(nullable=false) private int fromValue;
 @Column(nullable=false) private int toValue;
 @Column(nullable=false) private int targetValue;
 @Column(nullable=false,length=255) private String unit;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private GoalStatus fromStatus;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private GoalStatus toStatus;
 @Column(nullable=false) private Instant createdAt;
 protected GoalProgressCorrection(){}
 public GoalProgressCorrection(Goal goal,int fromValue,GoalStatus fromStatus){this(goal,fromValue,fromStatus,"CORRECTION");}
 public GoalProgressCorrection(Goal goal,int fromValue,GoalStatus fromStatus,String kind){this.kind=kind;this.goal=goal;this.fromValue=fromValue;this.fromStatus=fromStatus;toValue=goal.getCurrentValue();toStatus=goal.getStatus();targetValue=goal.getTargetValue();unit=goal.getUnit()==null?"":goal.getUnit();createdAt=Instant.now();}
 public String getKind(){return kind;}
 public Long getId(){return id;}public int getFromValue(){return fromValue;}public int getToValue(){return toValue;}public int getTargetValue(){return targetValue;}public String getUnit(){return unit;}public GoalStatus getFromStatus(){return fromStatus;}public GoalStatus getToStatus(){return toStatus;}public Instant getCreatedAt(){return createdAt;}
}
