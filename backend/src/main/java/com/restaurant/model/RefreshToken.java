package com.restaurant.model;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="refresh_token")
public class RefreshToken {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, unique=true, length=512) private String token;
    @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="user_id", nullable=false) private AppUser user;
    @Column(nullable=false) private Instant expiresAt;
    @Column(nullable=false) private boolean revoked = false;

    public RefreshToken() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id = v; }
    public String getToken() { return token; }
    public void setToken(String v) { this.token = v; }
    public AppUser getUser() { return user; }
    public void setUser(AppUser v) { this.user = v; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant v) { this.expiresAt = v; }
    public boolean isRevoked() { return revoked; }
    public void setRevoked(boolean v) { this.revoked = v; }
    public boolean isExpired() { return Instant.now().isAfter(expiresAt); }

    // Builder
    public static RefreshToken builder() { return new RefreshToken(); }
    public RefreshToken token(String v) { this.token = v; return this; }
    public RefreshToken user(AppUser v) { this.user = v; return this; }
    public RefreshToken expiresAt(Instant v) { this.expiresAt = v; return this; }
    public RefreshToken revoked(boolean v) { this.revoked = v; return this; }
    public RefreshToken build() { return this; }
}
