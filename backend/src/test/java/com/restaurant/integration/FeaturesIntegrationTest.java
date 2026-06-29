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
import java.util.List;
import static org.assertj.core.api.Assertions.*;

/**
 * Tests d'intégration pour les nouvelles fonctionnalités
 */
@SpringBootTest
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class FeaturesIntegrationTest {

    @Autowired OrderService    orderService;
    @Autowired OrderRepository orderRepo;
    @Autowired MenuItemRepository menuRepo;
    @Autowired LoyaltyRepository loyaltyRepo;

    private MenuItem item() {
        return menuRepo.findAll().stream().findFirst().orElseGet(() -> {
            MenuItem m = new MenuItem();
            m.setName("Test"); m.setEmoji("🍕"); m.setPrice(10.0);
            m.setCategory("PIZZA"); m.setAvailable(true);
            return menuRepo.save(m);
        });
    }

    private OrderDTO.CreateRequest req(int table) {
        OrderDTO.CreateRequest r = new OrderDTO.CreateRequest();
        r.setTableNumber(table);
        OrderDTO.OrderItemRequest oi = new OrderDTO.OrderItemRequest();
        oi.setMenuItemId(item().getId()); oi.setQuantity(1);
        oi.setNote(""); oi.setUnitPrice(10.0);
        r.setItems(List.of(oi));
        return r;
    }

    // ── Feature 4 : Numéro ticket journalier ──────────
    @Test @org.junit.jupiter.api.Order(1)
    @DisplayName("Numéro ticket journalier incrémental")
    void dailyTicketNumber() {
        Order o1 = orderService.createOrder(req(1));
        Order o2 = orderService.createOrder(req(2));
        assertThat(o1.getDailyTicketNumber()).isNotNull().isGreaterThan(0);
        assertThat(o2.getDailyTicketNumber()).isEqualTo(o1.getDailyTicketNumber() + 1);
    }

    // ── Feature 4 : Note globale ──────────────────────
    @Test @org.junit.jupiter.api.Order(2)
    @DisplayName("Note globale sauvegardée sur commande")
    void globalNote() {
        OrderDTO.CreateRequest r = req(3);
        r.setGlobalNote("Allergie arachides");
        Order o = orderService.createOrder(r);
        assertThat(o.getGlobalNote()).isEqualTo("Allergie arachides");
    }

    // ── Feature 7 : Annulation ────────────────────────
    @Test @org.junit.jupiter.api.Order(3)
    @DisplayName("Annulation commande avec motif")
    void cancelOrder() {
        Order o = orderService.createOrder(req(4));
        orderService.sendToKitchen(o.getId());
        Order cancelled = orderService.cancelOrder(o.getId(), "Erreur de saisie");
        assertThat(cancelled.getStatus()).isEqualTo(Order.OrderStatus.CANCELLED);
        assertThat(cancelled.getCancelledReason()).isEqualTo("Erreur de saisie");
    }

    @Test @org.junit.jupiter.api.Order(4)
    @DisplayName("Impossible d'annuler une commande SERVED")
    void cannotCancelServed() {
        Order o = orderService.createOrder(req(5));
        orderService.sendToKitchen(o.getId());
        orderService.updateStatus(o.getId(), Order.OrderStatus.SERVED);
        assertThatThrownBy(() -> orderService.cancelOrder(o.getId(), ""))
            .isInstanceOf(RuntimeException.class);
    }

    @Test @org.junit.jupiter.api.Order(5)
    @DisplayName("Commande annulée non visible dans getActive")
    void cancelledNotActive() {
        Order o = orderService.createOrder(req(6));
        orderService.sendToKitchen(o.getId());
        orderService.cancelOrder(o.getId(), "test");
        boolean found = orderService.getActive().stream()
            .anyMatch(x -> x.getId().equals(o.getId()));
        assertThat(found).isFalse();
    }

    // ── Feature 10 : Catégorie libre (PIZZA) ─────────
    @Test @org.junit.jupiter.api.Order(6)
    @DisplayName("MenuItem accepte n'importe quelle catégorie")
    void freeCategory() {
        MenuItem m = new MenuItem();
        m.setName("Pizza Margherita"); m.setEmoji("🍕");
        m.setPrice(12.0); m.setCategory("PIZZA"); m.setAvailable(true);
        MenuItem saved = menuRepo.save(m);
        assertThat(saved.getCategory()).isEqualTo("PIZZA");
        assertThat(saved.getId()).isNotNull();
    }

    // ── Feature 15 : Fidélité ─────────────────────────
    @Test @org.junit.jupiter.api.Order(7)
    @DisplayName("Créer client fidélité + compteur visites")
    void loyalty() {
        LoyaltyCustomer c = new LoyaltyCustomer();
        c.setName("Marie Dupont"); c.setPhone("0601020304");
        LoyaltyCustomer saved = loyaltyRepo.save(c);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getVisits()).isEqualTo(0);
        assertThat(saved.getVisitsToNextFree()).isEqualTo(10);

        // Ajouter 10 visites → ticket offert
        for (int i = 0; i < 10; i++) {
            saved.setVisits(saved.getVisits() + 1);
            saved = loyaltyRepo.save(saved);
        }
        assertThat(saved.hasFreeTicket()).isTrue();
        assertThat(saved.getVisitsToNextFree()).isEqualTo(10); // recommence
    }

    // ── Regression emporter ───────────────────────────
    @Test @org.junit.jupiter.api.Order(8)
    @DisplayName("REGRESSION: emporter visible en cuisine après sendToKitchen")
    void emporterRegression() {
        Order o = orderService.createOrder(req(0));
        orderService.sendToKitchen(o.getId());
        boolean found = orderService.getActive().stream()
            .anyMatch(x -> x.getId().equals(o.getId()) && x.getTableNumber() == 0);
        assertThat(found)
            .as("L'emporter DOIT être visible en cuisine")
            .isTrue();
    }
}
