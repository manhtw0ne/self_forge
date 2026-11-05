package com.selfforge.discipline.restart;
import org.springframework.data.jpa.repository.*;import org.springframework.data.repository.query.Param;import org.springframework.data.domain.Pageable;import java.util.List;
public interface RestartArchiveRepository extends JpaRepository<RestartArchive,Long>{
 @Query("select a from RestartArchive a where a.userId=:owner and a.id<:before order by a.id desc") List<RestartArchive> history(@Param("owner")Long owner,@Param("before")Long before,Pageable page);
}
