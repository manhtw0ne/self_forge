package com.selfforge.discipline.companion;
import jakarta.persistence.*;
@Entity @Table(name="companion_preference")
public class CompanionPreference {
 @Id @Column(name="user_id") Long userId;
 @Column(nullable=false,length=16) String species;
 @Column(nullable=false,length=40) String name;
 @Column(nullable=false) boolean visible;
 @Column(nullable=false) long revision;
 public boolean isVisible(){return visible;}
 protected CompanionPreference(){}
 CompanionPreference(Long userId){this.userId=userId;species="CHON";name="";}
}
