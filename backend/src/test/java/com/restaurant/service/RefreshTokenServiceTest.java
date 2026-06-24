package com.restaurant.service;

import com.restaurant.model.AppUser;
import com.restaurant.model.RefreshToken;
import com.restaurant.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService — Tests Unitaires")
class RefreshTokenServiceTest {

    @Mock RefreshTokenRepository repo;
    @InjectMocks RefreshTokenService svc;

    private AppUser user;

    @BeforeEach
    void setUp() {
        user = new AppUser();
        user.setId(1L); user.setUsername("serveur");
        user.setRole(AppUser.Role.SERVEUR); user.setActive(true);
    }

    @Test @DisplayName("createRefreshToken › token non-null, expiration future")
    void create_generatesToken() {
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        RefreshToken t = svc.createRefreshToken(user);

        assertThat(t.getToken()).isNotBlank();
        assertThat(t.getUser()).isEqualTo(user);
        assertThat(t.getExpiresAt()).isAfter(Instant.now());
    }

    @Test @DisplayName("createRefreshToken › révoque les anciens tokens")
    void create_revokesOldTokens() {
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        svc.createRefreshToken(user);

        verify(repo).revokeAllByUser(user);
    }

    @Test @DisplayName("createRefreshToken › deux appels génèrent des tokens différents")
    void create_uniqueTokens() {
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        String t1 = svc.createRefreshToken(user).getToken();
        String t2 = svc.createRefreshToken(user).getToken();

        assertThat(t1).isNotEqualTo(t2);
    }

    @Test @DisplayName("findValid › token valide non révoqué → présent")
    void findValid_valid_returned() {
        RefreshToken t = new RefreshToken();
        t.setToken("valid");
        t.setExpiresAt(Instant.now().plusSeconds(3600));
        t.setRevoked(false);
        t.setUser(user);

        when(repo.findByTokenAndRevokedFalse("valid")).thenReturn(Optional.of(t));

        assertThat(svc.findValid("valid")).isPresent();
    }

    @Test @DisplayName("findValid › token expiré → vide")
    void findValid_expired_empty() {
        RefreshToken t = new RefreshToken();
        t.setToken("expired");
        t.setExpiresAt(Instant.now().minusSeconds(3600));
        t.setRevoked(false);
        t.setUser(user);

        when(repo.findByTokenAndRevokedFalse("expired")).thenReturn(Optional.of(t));

        assertThat(svc.findValid("expired")).isEmpty();
    }

    @Test @DisplayName("findValid › token inexistant → vide")
    void findValid_unknown_empty() {
        when(repo.findByTokenAndRevokedFalse("unknown")).thenReturn(Optional.empty());
        assertThat(svc.findValid("unknown")).isEmpty();
    }

    @Test @DisplayName("revoke › marque le token comme révoqué")
    void revoke_setsRevoked() {
        RefreshToken t = new RefreshToken();
        t.setToken("tok");
        t.setExpiresAt(Instant.now().plusSeconds(3600));
        t.setRevoked(false);
        t.setUser(user);

        when(repo.findByTokenAndRevokedFalse("tok")).thenReturn(Optional.of(t));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

        svc.revoke("tok");

        verify(repo).save(argThat(rt -> rt.isRevoked()));
    }

    @Test @DisplayName("revoke › token inexistant → pas d'exception")
    void revoke_notFound_noException() {
        when(repo.findByTokenAndRevokedFalse("unknown")).thenReturn(Optional.empty());
        assertThatCode(() -> svc.revoke("unknown")).doesNotThrowAnyException();
    }

    @Test @DisplayName("revokeAll › révoque tous les tokens de l'utilisateur")
    void revokeAll_callsRepo() {
        svc.revokeAll(user);
        verify(repo).revokeAllByUser(user);
    }
}
