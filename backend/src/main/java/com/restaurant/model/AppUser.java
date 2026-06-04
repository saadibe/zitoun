package com.restaurant.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "app_user",
       uniqueConstraints = @UniqueConstraint(columnNames = "username"))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false)
    private String password;   // BCrypt hash

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Column(nullable = false)
    private boolean active = true;

    public enum Role {
        ADMIN, SERVEUR, CUISINE, CAISSE
    }
}
