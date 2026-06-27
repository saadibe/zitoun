package com.restaurant.model;
import jakarta.persistence.*;

@Entity
public class OrderItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="order_id")
    private Order order;

    @ManyToOne(fetch=FetchType.EAGER)
    @JoinColumn(name="menu_item_id")
    private MenuItem menuItem;

    @Column(nullable=false)
    private Integer quantity;

    private String note;

    // Prix unitaire réel (inclut options comme +menu) — sauvegardé au moment de la commande
    @Column(name="unit_price")
    private Double unitPrice;

    public Long getId()              { return id; }
    public void setId(Long v)        { this.id = v; }
    public Order getOrder()          { return order; }
    public void setOrder(Order v)    { this.order = v; }
    public MenuItem getMenuItem()    { return menuItem; }
    public void setMenuItem(MenuItem v) { this.menuItem = v; }
    public Integer getQuantity()     { return quantity; }
    public void setQuantity(Integer v){ this.quantity = v; }
    public String getNote()          { return note; }
    public void setNote(String v)    { this.note = v; }
    public Double getUnitPrice()     { return unitPrice; }
    public void setUnitPrice(Double v){ this.unitPrice = v; }

    // Prix effectif : unitPrice si défini, sinon prix du menu
    public double getEffectivePrice() {
        if (unitPrice != null) return unitPrice;
        return menuItem != null ? menuItem.getPrice() : 0.0;
    }

    public static OrderItem builder()   { return new OrderItem(); }
    public OrderItem order(Order v)     { this.order = v; return this; }
    public OrderItem menuItem(MenuItem v){ this.menuItem = v; return this; }
    public OrderItem quantity(Integer v) { this.quantity = v; return this; }
    public OrderItem note(String v)      { this.note = v; return this; }
    public OrderItem unitPrice(Double v) { this.unitPrice = v; return this; }
    public OrderItem build()             { return this; }
}
