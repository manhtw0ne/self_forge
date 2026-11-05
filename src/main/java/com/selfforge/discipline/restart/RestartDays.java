package com.selfforge.discipline.restart;
import jakarta.persistence.*;
@Entity @Table(name="restart_days")
public class RestartDays {
 @Id @Column(name="user_id") Long userId;
 @Column(nullable=false) long planVersion;
 @Column(nullable=false) long revision;
 @Column(nullable=false) boolean dayOne;
 @Column(nullable=false) boolean dayTwo;
 @Column(nullable=false) boolean dayThree;
 protected RestartDays(){}
 RestartDays(Long id,long version){userId=id;planVersion=version;}
 boolean tried(int day){return day==1?dayOne:day==2?dayTwo:dayThree;}
 void setTried(int day,boolean value){if(day==1)dayOne=value;else if(day==2)dayTwo=value;else dayThree=value;}
}
