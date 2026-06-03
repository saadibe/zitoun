package com.restaurant.model;
import jakarta.persistence.*;
import lombok.*;
@Entity @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MenuItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String name;
    @Column(nullable=false) private Double price;
    @Enumerated(EnumType.STRING) private Category category;
    private String emoji;
    private boolean available = true;
    public enum Category { ENTREE, PLAT, DESSERT, BOISSON }
}
