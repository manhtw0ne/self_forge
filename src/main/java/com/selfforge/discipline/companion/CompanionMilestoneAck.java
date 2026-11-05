package com.selfforge.discipline.companion;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="companion_milestone_ack", uniqueConstraints=@UniqueConstraint(name="ux_companion_milestone_ack_user_stage",columnNames={"user_id","stage"}))
public class CompanionMilestoneAck {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
 @Column(name="user_id",nullable=false) Long userId;
 @Column(nullable=false) int stage;
 @Column(name="acknowledged_at",nullable=false) Instant acknowledgedAt;
 protected CompanionMilestoneAck(){}
 CompanionMilestoneAck(Long userId,int stage,Instant acknowledgedAt){this.userId=userId;this.stage=stage;this.acknowledgedAt=acknowledgedAt;}
}
