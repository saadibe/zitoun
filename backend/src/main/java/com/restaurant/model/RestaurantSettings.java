package com.restaurant.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "restaurant_settings")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RestaurantSettings {

    @Id
    private Long id = 1L;   // singleton — une seule ligne

    @Column(nullable = false, length = 100)
    private String name = "Café Sidi Bou";

    @Column(length = 150)
    private String subtitle = "Restaurant & Terrasse";

    @Column(length = 100)
    private String city = "Sidi Bou Saïd, Tunisie";

    @Column(length = 10)
    private String icon = "☕";

    @Column(length = 50)
    private String taxNumber = "MF: 123456/A/M/000";
}
