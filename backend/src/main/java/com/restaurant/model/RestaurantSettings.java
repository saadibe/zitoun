package com.restaurant.model;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "restaurant_settings")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RestaurantSettings {
    @Id private Long id = 1L;
    @Column(nullable = false, length = 100) private String name = "La Perla";
    @Column(length = 150) private String subtitle = "Saveurs Authentiques de Tunisie";
    @Column(length = 100) private String city = "Tunisie";
    @Column(length = 10)  private String icon = "\uD83C\uDF36";
    @Column(name = "tax_number", length = 50) private String taxNumber = "";
    @Column(name = "currency", length = 10)   private String currency = "DT";
    @Column(name = "tva_rate")   private Double tvaRate   = 10.0;
    @Column(name = "theme", length = 20)      private String theme = "vert";
    @Column(name = "menu_price") private Double menuPrice = 2.0;  // supplement menu
}
