package com.restaurant.repository;
import com.restaurant.model.Order;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order,Long> {

    List<Order> findByStatusOrderByCreatedAtAsc(Order.OrderStatus status);
    List<Order> findByTableNumberOrderByCreatedAtDesc(Integer tableNumber);

    @Query("SELECT o FROM Order o WHERE o.status NOT IN " +
           "(com.restaurant.model.Order.OrderStatus.SERVED, " +
           "com.restaurant.model.Order.OrderStatus.CANCELLED) " +
           "ORDER BY o.createdAt ASC")
    List<Order> findActiveOrders();

    @Query("SELECT o FROM Order o WHERE o.tableNumber = :tableNumber AND o.status NOT IN " +
           "(com.restaurant.model.Order.OrderStatus.SERVED, " +
           "com.restaurant.model.Order.OrderStatus.CANCELLED)")
    List<Order> findActiveByTable(@Param("tableNumber") Integer tableNumber);

    @Query("SELECT o FROM Order o WHERE o.status = com.restaurant.model.Order.OrderStatus.SERVED " +
           "ORDER BY o.updatedAt DESC")
    List<Order> findHistory();

    @Query("SELECT o FROM Order o WHERE o.status != com.restaurant.model.Order.OrderStatus.CANCELLED " +
           "ORDER BY o.createdAt DESC")
    List<Order> findAllRecent();

    @Query("SELECT COALESCE(MAX(o.dailyTicketNumber), 0) FROM Order o WHERE o.createdAt >= :start")
    Integer findMaxDailyTicketNumber(@Param("start") LocalDateTime start);

    @Query("SELECT o FROM Order o WHERE o.status = com.restaurant.model.Order.OrderStatus.CANCELLED " +
           "ORDER BY o.updatedAt DESC")
    List<Order> findCancelled();

    @Query("SELECT o FROM Order o WHERE o.status = com.restaurant.model.Order.OrderStatus.READY " +
           "OR o.status = com.restaurant.model.Order.OrderStatus.SENT " +
           "OR o.status = com.restaurant.model.Order.OrderStatus.PREPARING " +
           "ORDER BY o.createdAt ASC")
    List<Order> findPendingPayment();

    @Query("SELECT o FROM Order o WHERE o.status = com.restaurant.model.Order.OrderStatus.SERVED " +
           "AND o.paidAt >= :start ORDER BY o.paidAt DESC")
    List<Order> findServedToday(@Param("start") LocalDateTime start);

    @Query("SELECT o FROM Order o WHERE o.status = com.restaurant.model.Order.OrderStatus.SERVED " +
           "AND o.paidAt >= :start AND o.paidAt < :end ORDER BY o.paidAt DESC")
    List<Order> findServedBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT o FROM Order o WHERE o.status != com.restaurant.model.Order.OrderStatus.CANCELLED " +
           "AND o.createdAt >= :start AND o.createdAt < :end ORDER BY o.createdAt DESC")
    List<Order> findByDayRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(o.totalAmount),0) FROM Order o " +
           "WHERE o.createdAt >= :start AND o.status = com.restaurant.model.Order.OrderStatus.SERVED")
    Double sumRevenueToday(@Param("start") LocalDateTime start);
}
