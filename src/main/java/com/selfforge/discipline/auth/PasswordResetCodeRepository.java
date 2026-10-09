package com.selfforge.discipline.auth;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PasswordResetCodeRepository extends JpaRepository<PasswordResetCode, Long> {}