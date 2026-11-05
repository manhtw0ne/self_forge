package com.selfforge.discipline.restart;
import jakarta.persistence.*;
@Entity @Table(name="restart_review")
public class RestartReview {
 @Id @Column(name="user_id") Long userId;
 @Column(nullable=false) long planVersion;
 @Column(nullable=false) long revision;
 @Column(nullable=false) int daysTried;
 @Column(nullable=false,length=16) String decision;
 @Column(nullable=false,length=500) String note;
 protected RestartReview(){}
 RestartReview(Long id){userId=id;}
}
