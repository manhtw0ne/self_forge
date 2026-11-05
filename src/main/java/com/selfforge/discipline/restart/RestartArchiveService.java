package com.selfforge.discipline.restart;
import org.springframework.stereotype.Service;import java.util.List;import java.time.Clock;
@Service public class RestartArchiveService {
 private final RestartArchiveRepository archives;private final RestartDaysRepository days;private final RestartReviewRepository reviews;private final com.fasterxml.jackson.databind.ObjectMapper json;private final Clock clock;
 public RestartArchiveService(RestartArchiveRepository archives,RestartDaysRepository days,RestartReviewRepository reviews,com.fasterxml.jackson.databind.ObjectMapper json,Clock clock){this.archives=archives;this.days=days;this.reviews=reviews;this.json=json;this.clock=clock;}
 public record DaySnapshot(long version,List<Boolean> tried){}
 public record ReviewSnapshot(long version,int daysTried,String decision,String note){}
 public record Snapshot(RestartPlanController.Response plan,DaySnapshot days,ReviewSnapshot review){}
 public void archive(RestartPlan plan){if(plan.revision<1)return;
  var day=days.findById(plan.userId).filter(row->row.planVersion==plan.revision).map(row->new DaySnapshot(row.revision,List.of(row.dayOne,row.dayTwo,row.dayThree))).orElse(null);
  var review=reviews.findById(plan.userId).filter(row->row.planVersion==plan.revision).map(row->new ReviewSnapshot(row.revision,row.daysTried,row.decision,row.note)).orElse(null);
  var snapshot=new Snapshot(new RestartPlanController.Response(plan.name,plan.reason,plan.startDate,List.of(plan.stepOne,plan.stepTwo,plan.stepThree),plan.revision),day,review);
  try{archives.save(new RestartArchive(plan.userId,plan.revision,json.writeValueAsString(snapshot),clock.instant()));}catch(com.fasterxml.jackson.core.JsonProcessingException failure){throw new IllegalStateException("Chưa lưu được lịch sử kế hoạch. Kế hoạch hiện tại được giữ nguyên.",failure);}
 }
 public Snapshot read(RestartArchive row){try{return json.readValue(row.snapshot,Snapshot.class);}catch(com.fasterxml.jackson.core.JsonProcessingException failure){throw new IllegalStateException("Chưa đọc được lịch sử kế hoạch.",failure);}}
}
