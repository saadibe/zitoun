package com.restaurant.repository;
import com.restaurant.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
public interface OrderRepository extends JpaRepository<Order,Long> {
    List<Order> findByStatusOrderByCreatedAtAsc(Order.OrderStatus status);
    List<Order> findByTableNumberOrderByCreatedAtDesc(Integer tableNumber);
    @Query("SELECT o FROM Order o WHERE o.status NOT IN ('SERVED','CANCELLED') ORDER BY o.createdAt ASC")
    List<Order> findActiveOrders();
    @Query("SELECT COALESCE(SUM(o.totalAmount),0) FROM Order o WHERE o.createdAt>=:start AND o.status='SERVED'")
    Double sumRevenueToday(@Param("start") LocalDateTime start);
}
