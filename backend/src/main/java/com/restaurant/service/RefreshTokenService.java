package com.restaurant.service;

import com.restaurant.model.AppUser;
import com.restaurant.model.RefreshToken;
import com.restaurant.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshRepo;

    @Value("${jwt.refresh-expiration-ms:604800000}") // 7 jours
    private long refreshExpirationMs;

    // ── Créer un refresh token ────────────────────
    @Transactional
    public RefreshToken createRefreshToken(AppUser user) {
        // Révoquer les anciens tokens de cet utilisateur
        refreshRepo.revokeAllByUser(user);

        RefreshToken rt = RefreshToken.builder()
            .token(UUID.randomUUID().toString())
            .user(user)
            .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
            .revoked(false)
            .build();

        return refreshRepo.save(rt);
    }

    // ── Valider un refresh token ──────────────────
    public Optional<RefreshToken> findValid(String token) {
        return refreshRepo.findByTokenAndRevokedFalse(token)
            .filter(rt -> !rt.isExpired());
    }

    // ── Révoquer ──────────────────────────────────
    @Transactional
    public void revoke(String token) {
        refreshRepo.findByTokenAndRevokedFalse(token)
            .ifPresent(rt -> {
                rt.setRevoked(true);
                refreshRepo.save(rt);
            });
    }

    @Transactional
    public void revokeAll(AppUser user) {
        refreshRepo.revokeAllByUser(user);
    }
}
