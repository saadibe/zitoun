package com.restaurant.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name="orders")
public class Order {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;

    @Column(name="table_number", nullable=false)
    private Integer tableNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false, length=20)
    private OrderStatus status;

    @Column(name="server_name", length=100)
    private String serverName;

    @Column(name="payment_method", length=20)
    private String paymentMethod;

    @Column(name="paid_at")
    private LocalDateTime paidAt;

    @OneToMany(mappedBy="order", cascade=CascadeType.ALL, orphanRemoval=true, fetch=FetchType.EAGER)
    private List<OrderItem> items = new ArrayList<>();

    @Column(name="created_at", nullable=false, updatable=false)
    private LocalDateTime createdAt;

    @Column(name="updated_at")
    private LocalDateTime updatedAt;

    @Column(name="total_amount")
    private Double totalAmount;

    @Column(name="daily_ticket_number")
    private Integer dailyTicketNumber;   // #001, #002... réinitialisé chaque jour

    @Column(name="global_note", length=500)
    private String globalNote;           // note globale sur la commande

    @Column(name="cancelled_reason", length=200)
    private String cancelledReason;      // motif d'annulation

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = OrderStatus.PENDING;
        computeTotal();
    }
    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
        computeTotal();
    }
    private void computeTotal() {
        if (items != null)
            totalAmount = items.stream()
                .mapToDouble(i -> i.getEffectivePrice() * (i.getQuantity() != null ? i.getQuantity() : 0))
                .sum();
    }

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getTableNumber() { return tableNumber; }
    public void setTableNumber(Integer v) { this.tableNumber = v; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus v) { this.status = v; }
    public String getServerName() { return serverName; }
    public void setServerName(String v) { this.serverName = v; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String v) { this.paymentMethod = v; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime v) { this.paidAt = v; }
    public List<OrderItem> getItems() { return items; }
    public void setItems(List<OrderItem> v) { this.items = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime v) { this.createdAt = v; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime v) { this.updatedAt = v; }
    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double v) { this.totalAmount = v; }
    public Integer getDailyTicketNumber() { return dailyTicketNumber; }
    public void setDailyTicketNumber(Integer v) { this.dailyTicketNumber = v; }
    public String getGlobalNote() { return globalNote; }
    public void setGlobalNote(String v) { this.globalNote = v; }
    public String getCancelledReason() { return cancelledReason; }
    public void setCancelledReason(String v) { this.cancelledReason = v; }

    // Builder pattern manual
    public static Order builder() { return new Order(); }
    public Order tableNumber(Integer v) { this.tableNumber = v; return this; }
    public Order status(OrderStatus v) { this.status = v; return this; }
    public Order serverName(String v) { this.serverName = v; return this; }
    public Order build() { return this; }

    public enum OrderStatus { PENDING, SENT, PREPARING, READY, SERVED, CANCELLED }
}
