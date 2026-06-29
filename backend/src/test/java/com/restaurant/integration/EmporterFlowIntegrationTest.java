package com.restaurant.integration;

import com.restaurant.model.*;
import com.restaurant.model.Order;
import com.restaurant.repository.*;
import com.restaurant.service.OrderService;
import com.restaurant.dto.OrderDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Tests d'intégration : flux commande À EMPORTER
 * Régression : l'emporter DOIT être visible en cuisine après sendToKitchen
 */
@SpringBootTest
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class EmporterFlowIntegrationTest {

    @Autowired OrderService      orderService;
    @Autowired OrderRepository   orderRepo;
    @Autowired MenuItemRepository menuRepo;

    private static Long orderId;

    // ── Helper ───────────────────────────────────────
    private MenuItem ensureMenuItem() {
        return menuRepo.findAll().stream().findFirst()
            .orElseGet(() -> {
                MenuItem m = new MenuItem();
                m.setName("Test Chapati"); m.setEmoji("🥙");
                m.setPrice(8.0); m.setCategory("SANDWICH"); m.setAvailable(true);
                return menuRepo.save(m);
            });
    }

    // ── Test 1 : créer commande emporter (tableNumber=0) ──
    @Test @org.junit.jupiter.api.Order(1)
    @DisplayName("Emporter: créer commande avec tableNumber=0")
    void createEmporterOrder() {
        MenuItem item = ensureMenuItem();

        OrderDTO.CreateRequest req = new OrderDTO.CreateRequest();
        req.setTableNumber(0);

        OrderDTO.OrderItemRequest oi = new OrderDTO.OrderItemRequest();
        oi.setMenuItemId(item.getId());
        oi.setQuantity(2);
        oi.setNote("");
        oi.setUnitPrice(item.getPrice());
        req.setItems(List.of(oi));

        Order created = orderService.createOrder(req);
        orderId = created.getId();

        assertThat(created).isNotNull();
        assertThat(created.getTableNumber()).isEqualTo(0);
        assertThat(created.getStatus()).isEqualTo(Order.OrderStatus.PENDING);
    }

    // ── Test 2 : sendToKitchen → status SENT ─────────
    @Test @org.junit.jupiter.api.Order(2)
    @DisplayName("Emporter: sendToKitchen passe en SENT")
    void emporterSentToKitchen() {
        assertThat(orderId).isNotNull();
        Order sent = orderService.sendToKitchen(orderId);
        assertThat(sent.getStatus()).isEqualTo(Order.OrderStatus.SENT);
    }

    // ── Test 3 : VISIBLE dans getActive (cuisine) ────
    @Test @org.junit.jupiter.api.Order(3)
    @DisplayName("Emporter: visible dans getActive après sendToKitchen — REGRESSION GUARD")
    void emporterVisibleInKitchen() {
        assertThat(orderId).isNotNull();
        List<Order> active = orderService.getActive();

        boolean found = active.stream()
            .anyMatch(o -> o.getId().equals(orderId)
                       && o.getTableNumber() == 0
                       && o.getStatus() == Order.OrderStatus.SENT);

        assertThat(found)
            .as("La commande à emporter DOIT être visible en cuisine après sendToKitchen")
            .isTrue();
    }

    // ── Test 4 : NE PAS disparaître si pas payée ─────
    @Test @org.junit.jupiter.api.Order(4)
    @DisplayName("Emporter: reste dans getActive tant que pas SERVED")
    void emporterStaysActiveUntilServed() {
        assertThat(orderId).isNotNull();
        List<Order> active = orderService.getActive();
        boolean found = active.stream().anyMatch(o -> o.getId().equals(orderId));
        assertThat(found)
            .as("L'emporter ne doit pas disparaître de la cuisine avant d'être SERVED")
            .isTrue();
    }

    // ── Test 5 : updateStatus SERVED → disparaît ─────
    @Test @org.junit.jupiter.api.Order(5)
    @DisplayName("Emporter: disparaît de getActive après SERVED")
    void emporterDisappearsAfterServed() {
        assertThat(orderId).isNotNull();
        orderService.updateStatus(orderId, Order.OrderStatus.SERVED);

        List<Order> active = orderService.getActive();
        boolean found = active.stream().anyMatch(o -> o.getId().equals(orderId));
        assertThat(found)
            .as("L'emporter DOIT disparaître de la cuisine après SERVED")
            .isFalse();
    }

    // ── Test 6 : tableNumber=0 ne bloque pas de table ─
    @Test @org.junit.jupiter.api.Order(6)
    @DisplayName("Emporter: tableNumber=0 ne change pas le statut des tables")
    void emporterDoesNotOccupyTable() {
        MenuItem item = ensureMenuItem();
        OrderDTO.CreateRequest req = new OrderDTO.CreateRequest();
        req.setTableNumber(0);
        OrderDTO.OrderItemRequest oi = new OrderDTO.OrderItemRequest();
        oi.setMenuItemId(item.getId()); oi.setQuantity(1); oi.setNote(""); oi.setUnitPrice(8.0);
        req.setItems(List.of(oi));

        // Créer l'ordre ne doit pas lever d'exception
        Order created = orderService.createOrder(req);
        assertThat(created.getTableNumber()).isEqualTo(0);
    }
}
