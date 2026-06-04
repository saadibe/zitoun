package com.restaurant.repository;

import com.restaurant.model.RefreshToken;
import com.restaurant.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenAndRevokedFalse(String token);
    @Modifying @Transactional
    @Query("UPDATE RefreshToken r SET r.revoked=true WHERE r.user=:user")
    void revokeAllByUser(AppUser user);
}
