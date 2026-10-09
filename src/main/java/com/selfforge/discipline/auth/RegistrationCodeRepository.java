package com.selfforge.discipline.auth;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
public interface RegistrationCodeRepository extends JpaRepository<RegistrationCode, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from RegistrationCode c where c.email = :email")
    Optional<RegistrationCode> lockByEmail(@Param("email") String email);
}