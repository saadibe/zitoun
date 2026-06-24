package com.restaurant.model;
import jakarta.persistence.*;

@Entity
@Table(name="app_user", uniqueConstraints=@UniqueConstraint(columnNames="username"))
public class AppUser {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, unique=true, length=100) private String username;
    @Column(nullable=false) private String password;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private Role role;
    @Column(nullable=false) private boolean active = true;

    public AppUser() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id = v; }
    public String getUsername() { return username; }
    public void setUsername(String v) { this.username = v; }
    public String getPassword() { return password; }
    public void setPassword(String v) { this.password = v; }
    public Role getRole() { return role; }
    public void setRole(Role v) { this.role = v; }
    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active = v; }

    // Builder
    public static AppUser builder() { return new AppUser(); }
    public AppUser username(String v) { this.username = v; return this; }
    public AppUser password(String v) { this.password = v; return this; }
    public AppUser role(Role v) { this.role = v; return this; }
    public AppUser active(boolean v) { this.active = v; return this; }
    public AppUser build() { return this; }

    public enum Role { ADMIN, SERVEUR, CUISINE, CAISSE }
}
