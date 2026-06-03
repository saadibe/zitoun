package com.restaurant.model;
import jakarta.persistence.*;
import lombok.*;
@Entity @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class OrderItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="order_id") private Order order;
    @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="menu_item_id") private MenuItem menuItem;
    @Column(nullable=false) private Integer quantity;
    private String note;
}
