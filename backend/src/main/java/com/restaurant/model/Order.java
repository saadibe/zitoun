package com.restaurant.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="orders") @Data @Builder @NoArgsConstructor @AllArgsConstructor
public class Order {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="table_number",nullable=false) private Integer tableNumber;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private OrderStatus status;
    @Column(name="server_name",length=100) private String serverName;
    @OneToMany(mappedBy="order",cascade=CascadeType.ALL,orphanRemoval=true,fetch=FetchType.EAGER)
    @Builder.Default private List<OrderItem> items = new ArrayList<>();
    @Column(name="created_at",nullable=false,updatable=false) private LocalDateTime createdAt;
    @Column(name="updated_at") private LocalDateTime updatedAt;
    @Column(name="total_amount") private Double totalAmount;
    @PrePersist void prePersist(){ createdAt=LocalDateTime.now();updatedAt=LocalDateTime.now();if(status==null)status=OrderStatus.PENDING;computeTotal(); }
    @PreUpdate void preUpdate(){ updatedAt=LocalDateTime.now();computeTotal(); }
    private void computeTotal(){ if(items!=null) totalAmount=items.stream().mapToDouble(i->i.getMenuItem()!=null?i.getMenuItem().getPrice()*i.getQuantity():0).sum(); }
    public enum OrderStatus { PENDING,SENT,PREPARING,READY,SERVED,CANCELLED }
}
