package com.restaurant.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "restaurant_settings")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RestaurantSettings {

    @Id
    private Long id = 1L;

    @Column(nullable = false, length = 100)
    private String name = "La Perla";

    @Column(length = 150)
    private String subtitle = "Saveurs Authentiques de Tunisie";

    @Column(length = 100)
    private String city = "Tunisie";

    @Column(length = 10)
    private String icon = "🌶️";

    @Column(length = 50)
    private String taxNumber = "MF: 123456/A/M/000";

    @Column(length = 10)
    private String currency = "DT";

    @Column(nullable = false)
    private Double tvaRate = 10.0;

    @Column(length = 20)
    private String theme = "vert";
}
