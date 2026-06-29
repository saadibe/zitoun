package com.restaurant.model;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name="loyalty_customer")
public class LoyaltyCustomer {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private String name;
    private String phone;
    @Column(nullable=false) private Integer visits = 0;
    @Column(name="total_spent") private Double totalSpent = 0.0;
    @Column(name="last_visit")  private LocalDateTime lastVisit;
    @Column(name="created_at")  private LocalDateTime createdAt;
    @Column(name="free_tickets_used") private Integer freeTicketsUsed = 0;

    @PrePersist void pre() { createdAt = LocalDateTime.now(); }

    // Getters/Setters
    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String v) { this.name = v; }
    public String getPhone() { return phone; }
    public void setPhone(String v) { this.phone = v; }
    public Integer getVisits() { return visits; }
    public void setVisits(Integer v) { this.visits = v; }
    public Double getTotalSpent() { return totalSpent; }
    public void setTotalSpent(Double v) { this.totalSpent = v; }
    public LocalDateTime getLastVisit() { return lastVisit; }
    public void setLastVisit(LocalDateTime v) { this.lastVisit = v; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Integer getFreeTicketsUsed() { return freeTicketsUsed; }
    public void setFreeTicketsUsed(Integer v) { this.freeTicketsUsed = v; }
    // Visites restantes avant ticket offert
    public int getVisitsToNextFree() { return 10 - (visits % 10); }
    public boolean hasFreeTicket() { return visits > 0 && visits % 10 == 0; }
}
