package com.selfforge.discipline.restart;
import jakarta.persistence.*;import java.time.Instant;
@Entity @Table(name="restart_archive",uniqueConstraints=@UniqueConstraint(columnNames={"user_id","plan_version"}))
public class RestartArchive {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
 @Column(nullable=false,name="user_id") Long userId;
 @Column(nullable=false) long planVersion;
 @Column(nullable=false,length=20000) String snapshot;
 @Column(nullable=false) Instant archivedAt;
 protected RestartArchive(){}
 RestartArchive(Long userId,long planVersion,String snapshot,Instant archivedAt){this.userId=userId;this.planVersion=planVersion;this.snapshot=snapshot;this.archivedAt=archivedAt;}
}
