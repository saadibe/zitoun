package com.restaurant.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="restaurant_table",uniqueConstraints=@UniqueConstraint(columnNames="number"))
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RestaurantTable {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(unique=true,nullable=false) private Integer number;
    private Integer seats;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) @Builder.Default private TableStatus status=TableStatus.FREE;
    @Column(name="current_order_id") private Long currentOrderId;
    @Column(name="reserved_name",length=100) private String reservedName;
    @Column(name="occupied_since") private LocalDateTime occupiedSince;
    public enum TableStatus { FREE,OCCUPIED,RESERVED }
}
