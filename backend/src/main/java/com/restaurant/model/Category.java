package com.restaurant.model;
import jakarta.persistence.*;

@Entity
@Table(name="category")
public class Category {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false, unique=true, length=50)
    private String code;

    @Column(nullable=false, length=100)
    private String label;

    @Column(length=10)
    private String emoji;

    @Column(nullable=false)
    private Integer sortOrder = 0;

    @Column(nullable=false)
    private boolean active = true;

    public Category() {}

    public Long getId() { return id; }
    public void setId(Long v) { this.id = v; }
    public String getCode() { return code; }
    public void setCode(String v) { this.code = v; }
    public String getLabel() { return label; }
    public void setLabel(String v) { this.label = v; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String v) { this.emoji = v; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer v) { this.sortOrder = v; }
    public boolean isActive() { return active; }
    public void setActive(boolean v) { this.active = v; }
}
