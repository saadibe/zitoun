package com.restaurant.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name="restaurant_table", uniqueConstraints=@UniqueConstraint(columnNames="number"))
public class RestaurantTable {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(nullable=false)
    private Integer number;

    @Column(nullable=false)
    private Integer seats = 4;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false, length=20)
    private TableStatus status = TableStatus.FREE;

    @Column(name="current_order_id")
    private Long currentOrderId;

    @Column(name="reserved_name", length=100)
    private String reservedName;

    @Column(name="occupied_since")
    private LocalDateTime occupiedSince;

    public RestaurantTable() {}

    public Long getId() { return id; }
    public void setId(Long v) { this.id = v; }
    public Integer getNumber() { return number; }
    public void setNumber(Integer v) { this.number = v; }
    public Integer getSeats() { return seats; }
    public void setSeats(Integer v) { this.seats = v; }
    public TableStatus getStatus() { return status; }
    public void setStatus(TableStatus v) { this.status = v; }
    public Long getCurrentOrderId() { return currentOrderId; }
    public void setCurrentOrderId(Long v) { this.currentOrderId = v; }
    public String getReservedName() { return reservedName; }
    public void setReservedName(String v) { this.reservedName = v; }
    public LocalDateTime getOccupiedSince() { return occupiedSince; }
    public void setOccupiedSince(LocalDateTime v) { this.occupiedSince = v; }

    public enum TableStatus { FREE, OCCUPIED, RESERVED }
}
