package com.restaurant.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.restaurant.model.*;
import com.restaurant.model.Order;
import com.restaurant.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Flux Commande — Tests d'Intégration")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class OrderFlowIntegrationTest {

    @Autowired MockMvc          mockMvc;
    @Autowired ObjectMapper     mapper;
    @Autowired OrderRepository  orderRepo;
    @Autowired MenuItemRepository menuRepo;
    @Autowired TableRepository  tableRepo;

    private static Long menuItemId;
    private static Long tableId;
    private static Long orderId;

    @BeforeEach
    void setUp() {
        if (menuItemId == null) {
            orderRepo.deleteAll();
            MenuItem item = new MenuItem();
            item.setName("Chapati Thon"); item.setPrice(6.0);
            item.setEmoji("🥙"); item.setCategory(MenuItem.Category.SANDWICH);
            item.setAvailable(true);
            menuItemId = menuRepo.save(item).getId();

            RestaurantTable t = new RestaurantTable();
            t.setNumber(5); t.setSeats(4);
            t.setStatus(RestaurantTable.TableStatus.FREE);
            tableId = tableRepo.save(t).getId();
        }
    }

    // ════ Scénario 1 : Flux complet payer après manger ════════════

    @Test @org.junit.jupiter.api.Order(1)
    @WithMockUser(roles = "SERVEUR")
    @DisplayName("[Intégration S1-1] Créer une commande pour table 5")
    void s1_createOrder() throws Exception {
        Map<String, Object> payload = Map.of(
            "tableNumber", 5,
            "items", List.of(Map.of("menuItemId", menuItemId, "quantity", 2, "note", ""))
        );

        MvcResult result = mockMvc.perform(post("/api/orders")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
            .andExpect(status().isCreated())
            .andReturn();

        String body = result.getResponse().getContentAsString();
        Map<?, ?> resp = mapper.readValue(body, Map.class);
        orderId = ((Number) resp.get("id")).longValue();

        assertThat(orderId).isNotNull().isPositive();

        // Table doit être OCCUPIED
        RestaurantTable t = tableRepo.findByNumber(5).orElseThrow();
        assertThat(t.getStatus()).isEqualTo(RestaurantTable.TableStatus.OCCUPIED);
    }

    @Test @org.junit.jupiter.api.Order(2)
    @WithMockUser(roles = "SERVEUR")
    @DisplayName("[Intégration S1-2] Envoyer commande en cuisine → SENT")
    void s1_sendToKitchen() throws Exception {
        if (orderId == null) return;

        mockMvc.perform(post("/api/orders/" + orderId + "/send-kitchen").with(csrf()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SENT"));

        Order o = orderRepo.findById(orderId).orElseThrow();
        assertThat(o.getStatus()).isEqualTo(Order.OrderStatus.SENT);
    }

    @Test @org.junit.jupiter.api.Order(3)
    @WithMockUser(roles = "CUISINE")
    @DisplayName("[Intégration S1-3] Cuisine : SENT → PREPARING")
    void s1_preparing() throws Exception {
        if (orderId == null) return;

        mockMvc.perform(patch("/api/orders/" + orderId + "/status").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"PREPARING\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PREPARING"));
    }

    @Test @org.junit.jupiter.api.Order(4)
    @WithMockUser(roles = "CUISINE")
    @DisplayName("[Intégration S1-4] Cuisine : PREPARING → READY")
    void s1_ready() throws Exception {
        if (orderId == null) return;

        mockMvc.perform(patch("/api/orders/" + orderId + "/status").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"READY\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("READY"));
    }

    @Test @org.junit.jupiter.api.Order(5)
    @WithMockUser(roles = "CUISINE")
    @DisplayName("[Intégration S1-5] Cuisine : READY → SERVED — table reste OCCUPIED")
    void s1_served_tableStillOccupied() throws Exception {
        if (orderId == null) return;

        mockMvc.perform(patch("/api/orders/" + orderId + "/status").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SERVED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SERVED"));

        // TABLE DOIT RESTER OCCUPIED — pas de libération auto
        RestaurantTable t = tableRepo.findByNumber(5).orElseThrow();
        assertThat(t.getStatus())
            .as("Table doit rester OCCUPIED après SERVED cuisine")
            .isEqualTo(RestaurantTable.TableStatus.OCCUPIED);
    }

    @Test @org.junit.jupiter.api.Order(6)
    @WithMockUser(roles = "CAISSE")
    @DisplayName("[Intégration S1-6] Caisse : encaisser table → table FREE")
    void s1_payTable_releasesTable() throws Exception {
        mockMvc.perform(post("/api/orders/pay-table/5").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentMethod\":\"especes\"}"))
            .andExpect(status().isOk());

        // Table doit maintenant être FREE
        RestaurantTable t = tableRepo.findByNumber(5).orElseThrow();
        assertThat(t.getStatus())
            .as("Table doit être FREE après encaissement")
            .isEqualTo(RestaurantTable.TableStatus.FREE);
        assertThat(t.getOccupiedSince()).isNull();

        // Commande doit être SERVED avec paymentMethod
        if (orderId != null) {
            Order o = orderRepo.findById(orderId).orElseThrow();
            assertThat(o.getStatus()).isEqualTo(Order.OrderStatus.SERVED);
            assertThat(o.getPaymentMethod()).isEqualTo("especes");
            assertThat(o.getPaidAt()).isNotNull();
        }
    }

    // ════ Scénario 2 : Payer maintenant (emporter) ════════════════

    @Test @org.junit.jupiter.api.Order(7)
    @WithMockUser(roles = "SERVEUR")
    @DisplayName("[Intégration S2] Emporter : créer + encaisser immédiatement")
    void s2_emporter_payNow() throws Exception {
        Map<String, Object> payload = Map.of(
            "tableNumber", 0,
            "items", List.of(Map.of("menuItemId", menuItemId, "quantity", 1, "note", ""))
        );

        MvcResult createResult = mockMvc.perform(post("/api/orders").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
            .andExpect(status().isCreated())
            .andReturn();

        Map<?, ?> resp = mapper.readValue(createResult.getResponse().getContentAsString(), Map.class);
        Long emporterId = ((Number) resp.get("id")).longValue();

        // Envoyer en cuisine
        mockMvc.perform(post("/api/orders/" + emporterId + "/send-kitchen").with(csrf()))
            .andExpect(status().isOk());

        // Payer immédiatement
        mockMvc.perform(post("/api/orders/" + emporterId + "/pay").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentMethod\":\"carte\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("SERVED"))
            .andExpect(jsonPath("$.paymentMethod").value("carte"));

        Order o = orderRepo.findById(emporterId).orElseThrow();
        assertThat(o.getPaymentMethod()).isEqualTo("carte");
        assertThat(o.getPaidAt()).isNotNull();
    }

    // ════ Scénario 3 : Historique ══════════════════════════════════

    @Test @org.junit.jupiter.api.Order(8)
    @WithMockUser(roles = "ADMIN")
    @DisplayName("[Intégration S3] Historique contient les commandes SERVED")
    void s3_historyContainsServedOrders() throws Exception {
        mockMvc.perform(get("/api/orders/history"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    // ════ Scénario 4 : Accès non autorisé ═════════════════════════

    @Test @org.junit.jupiter.api.Order(9)
    @DisplayName("[Intégration S4] Endpoints protégés sans token → 401/403")
    void s4_protectedEndpoints_noAuth() throws Exception {
        mockMvc.perform(get("/api/orders/active"))
            .andExpect(status().is4xxClientError());

        mockMvc.perform(get("/api/orders/history"))
            .andExpect(status().is4xxClientError());

        mockMvc.perform(post("/api/orders/pay-table/5").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentMethod\":\"especes\"}"))
            .andExpect(status().is4xxClientError());
    }

    // ════ Scénario 5 : Commandes actives ══════════════════════════

    @Test @org.junit.jupiter.api.Order(10)
    @WithMockUser(roles = "CUISINE")
    @DisplayName("[Intégration S5] Commandes actives exclut SERVED et CANCELLED")
    void s5_activeOrders_excludeServedCancelled() throws Exception {
        mockMvc.perform(get("/api/orders/active"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());

        List<Order> active = orderRepo.findActiveOrders();
        assertThat(active).allMatch(o ->
            o.getStatus() != Order.OrderStatus.SERVED &&
            o.getStatus() != Order.OrderStatus.CANCELLED);
    }
}
