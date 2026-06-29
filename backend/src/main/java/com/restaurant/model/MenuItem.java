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

    // Options configurables par produit
    @Column(name="has_piment")  private boolean hasPiment = false;  // option piment fort/sans
    @Column(name="has_menu")    private boolean hasMenu   = false;  // option menu (+prix)
    @Column(name="has_options") private boolean hasOptions = false; // a des options (active le modal)

    public MenuItem() {}
    public Long getId()              { return id; }
    public void setId(Long v)        { this.id = v; }
    public String getName()          { return name; }
    public void setName(String v)    { this.name = v; }
    public Double getPrice()         { return price; }
    public void setPrice(Double v)   { this.price = v; }
    public String getCategory()      { return category; }
    public void setCategory(String v){ this.category = v; }
    public String getImageUrl()      { return imageUrl; }
    public void setImageUrl(String v){ this.imageUrl = v; }
    public String getEmoji()         { return emoji; }
    public void setEmoji(String v)   { this.emoji = v; }
    public boolean isAvailable()     { return available; }
    public void setAvailable(boolean v){ this.available = v; }
    public boolean isHasPiment()     { return hasPiment; }
    public void setHasPiment(boolean v){ this.hasPiment = v; }
    public boolean isHasMenu()       { return hasMenu; }
    public void setHasMenu(boolean v){ this.hasMenu = v; }
    public boolean isHasOptions()    { return hasOptions; }
    public void setHasOptions(boolean v){ this.hasOptions = v; }
}
