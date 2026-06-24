package com.restaurant.model;
import jakarta.persistence.*;

@Entity
@Table(name="restaurant_settings")
public class RestaurantSettings {
    @Id
    private Long id = 1L;

    @Column(nullable=false, length=100)
    private String name = "La Perla";

    @Column(length=150)
    private String subtitle = "Saveurs Authentiques de Tunisie";

    @Column(length=100)
    private String city = "Tunisie";

    @Column(length=10)
    private String icon = "🌶️";

    @Column(name="tax_number", length=50)
    private String taxNumber = "";

    @Column(name="currency", length=10)
    private String currency = "DT";

    @Column(name="tva_rate")
    private Double tvaRate = 10.0;

    @Column(name="theme", length=20)
    private String theme = "vert";

    @Column(name="menu_price")
    private Double menuPrice = 2.0;

    public RestaurantSettings() {}

    public Long getId() { return id; }
    public void setId(Long v) { this.id = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String v) { this.subtitle = v; }
    public String getCity() { return city; }
    public void setCity(String v) { this.city = v; }
    public String getIcon() { return icon; }
    public void setIcon(String v) { this.icon = v; }
    public String getTaxNumber() { return taxNumber; }
    public void setTaxNumber(String v) { this.taxNumber = v; }
    public String getCurrency() { return currency; }
    public void setCurrency(String v) { this.currency = v; }
    public Double getTvaRate() { return tvaRate; }
    public void setTvaRate(Double v) { this.tvaRate = v; }
    public String getTheme() { return theme; }
    public void setTheme(String v) { this.theme = v; }
    public Double getMenuPrice() { return menuPrice; }
    public void setMenuPrice(Double v) { this.menuPrice = v; }
}
