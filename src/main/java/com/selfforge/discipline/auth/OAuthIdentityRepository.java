package com.selfforge.discipline.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface OAuthIdentityRepository extends JpaRepository<OAuthIdentity, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select i from OAuthIdentity i join fetch i.user where i.provider = :provider and i.providerSubject = :subject")
    Optional<OAuthIdentity> lockByProviderAndSubject(
            @org.springframework.data.repository.query.Param("provider") OAuthProvider provider,
            @org.springframework.data.repository.query.Param("subject") String subject);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select i from OAuthIdentity i where i.provider = :provider and i.user.id = :userId")
    Optional<OAuthIdentity> lockByProviderAndUserId(
            @org.springframework.data.repository.query.Param("provider") OAuthProvider provider,
            @org.springframework.data.repository.query.Param("userId") Long userId);
}
