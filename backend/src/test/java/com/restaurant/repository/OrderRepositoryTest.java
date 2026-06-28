package com.restaurant.repository;

import com.restaurant.model.*;
import com.restaurant.model.Order;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("OrderRepository — Tests Repository")
class OrderRepositoryTest {

    @Autowired OrderRepository    orderRepo;
    @Autowired MenuItemRepository menuRepo;

    private MenuItem chapati;

    @BeforeEach
    void setUp() {
        orderRepo.deleteAll();
        menuRepo.deleteAll();

        chapati = new MenuItem();
        chapati.setName("Chapati Thon"); chapati.setPrice(6.0);
        chapati.setEmoji("🥙"); chapati.setCategory("SANDWICH");
        chapati.setAvailable(true);
        chapati = menuRepo.save(chapati);
    }

    @Test @DisplayName("findActiveOrders › exclut SERVED et CANCELLED")
    void findActiveOrders_excludesServedAndCancelled() {
        save(1, Order.OrderStatus.SENT);
        save(2, Order.OrderStatus.PREPARING);
        save(3, Order.OrderStatus.SERVED);
        save(4, Order.OrderStatus.CANCELLED);

        List<Order> active = orderRepo.findActiveOrders();

        assertThat(active).hasSize(2);
        assertThat(active).extracting(Order::getStatus)
            .containsExactlyInAnyOrder(Order.OrderStatus.SENT, Order.OrderStatus.PREPARING);
    }

    @Test @DisplayName("findActiveOrders › vide si toutes SERVED")
    void findActiveOrders_allServed_empty() {
        save(1, Order.OrderStatus.SERVED);
        save(2, Order.OrderStatus.SERVED);

        assertThat(orderRepo.findActiveOrders()).isEmpty();
    }

    @Test @DisplayName("findActiveByTable › filtre par numéro de table")
    void findActiveByTable_filtersByTable() {
        save(5, Order.OrderStatus.SENT);
        save(5, Order.OrderStatus.PREPARING);
        save(3, Order.OrderStatus.SENT);
        save(5, Order.OrderStatus.SERVED);   // ne doit pas apparaître

        List<Order> table5 = orderRepo.findActiveByTable(5);

        assertThat(table5).hasSize(2);
        assertThat(table5).allMatch(o -> o.getTableNumber() == 5);
    }

    @Test @DisplayName("findActiveByTable › table inexistante → liste vide")
    void findActiveByTable_unknownTable_empty() {
        assertThat(orderRepo.findActiveByTable(99)).isEmpty();
    }

    @Test @DisplayName("findHistory › retourne uniquement SERVED, ordre desc updatedAt")
    void findHistory_onlyServed() {
        save(1, Order.OrderStatus.SERVED);
        save(2, Order.OrderStatus.SERVED);
        save(3, Order.OrderStatus.SENT);

        List<Order> history = orderRepo.findHistory();

        assertThat(history).hasSize(2);
        assertThat(history).allMatch(o -> o.getStatus() == Order.OrderStatus.SERVED);
    }

    @Test @DisplayName("findPendingPayment › retourne SENT, PREPARING, READY")
    void findPendingPayment_returnsCorrectStatuses() {
        save(1, Order.OrderStatus.SENT);
        save(2, Order.OrderStatus.PREPARING);
        save(3, Order.OrderStatus.READY);
        save(4, Order.OrderStatus.SERVED);
        save(5, Order.OrderStatus.CANCELLED);

        List<Order> pending = orderRepo.findPendingPayment();

        assertThat(pending).hasSize(3);
        assertThat(pending).extracting(Order::getStatus).containsExactlyInAnyOrder(
            Order.OrderStatus.SENT, Order.OrderStatus.PREPARING, Order.OrderStatus.READY);
    }

    @Test @DisplayName("findByStatusOrderByCreatedAtAsc › filtre par statut")
    void findByStatus_returnsCorrectOrders() {
        save(1, Order.OrderStatus.PENDING);
        save(2, Order.OrderStatus.SENT);
        save(3, Order.OrderStatus.PENDING);

        List<Order> pending = orderRepo.findByStatusOrderByCreatedAtAsc(Order.OrderStatus.PENDING);

        assertThat(pending).hasSize(2);
        assertThat(pending).allMatch(o -> o.getStatus() == Order.OrderStatus.PENDING);
    }

    @Test @DisplayName("sumRevenueToday › somme le chiffre d'affaires du jour")
    void sumRevenueToday_sumsCorrectly() {
        Order o1 = save(1, Order.OrderStatus.SERVED);
        Order o2 = save(2, Order.OrderStatus.SERVED);

        Double sum = orderRepo.sumRevenueToday(
            java.time.LocalDateTime.now().minusDays(1));

        assertThat(sum).isNotNull().isGreaterThan(0);
    }

    // ── Helper ──────────────────────────────────────────────────
    private Order save(int tableNum, Order.OrderStatus status) {
        OrderItem oi = new OrderItem();
        oi.setMenuItem(chapati); oi.setQuantity(1); oi.setNote("");

        Order o = new Order();
        o.setTableNumber(tableNum); o.setStatus(status);
        o.setItems(new java.util.ArrayList<>(List.of(oi)));
        oi.setOrder(o);
        return orderRepo.save(o);
    }
}
