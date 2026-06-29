package com.restaurant.model;
import jakarta.persistence.*;

@Entity
public class MenuItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String name;
    @Column(nullable=false) private Double price;
    private String category;
    @Column(name="image_url", length=500) private String imageUrl;
    private String emoji;
    private boolean available = true;

    public MenuItem() {}
    public Long getId() { return id; }
    public void setId(Long v) { this.id = v; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public Double getPrice() { return price; }
    public void setPrice(Double v) { this.price = v; }
    public String getCategory() { return category; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String v) { this.imageUrl = v; }
    public void setCategory(String v) { this.category = v; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String v) { this.emoji = v; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean v) { this.available = v; }

}
