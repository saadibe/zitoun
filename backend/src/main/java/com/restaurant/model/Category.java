package com.restaurant.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "category")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;       // ex: ENTREE, SANDWICH, PLAT, BOISSON

    @Column(nullable = false, length = 100)
    private String label;      // ex: Entrées, Sandwichs

    @Column(length = 10)
    private String emoji;      // ex: 🥗

    @Column(nullable = false)
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private boolean active = true;
}
