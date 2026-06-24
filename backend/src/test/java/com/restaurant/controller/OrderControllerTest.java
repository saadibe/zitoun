package com.restaurant.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.restaurant.dto.OrderDTO;
import com.restaurant.model.Order;
import com.restaurant.security.JwtFilter;
import com.restaurant.service.OrderService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = OrderController.class,
    excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtFilter.class))
@DisplayName("OrderController — Tests Contrôleur")
class OrderControllerTest {

    @Autowired MockMvc      mockMvc;
    @Autowired ObjectMapper mapper;
    @MockBean  OrderService orderService;

    private OrderDTO.Response sample;

    @BeforeEach
    void setUp() {
        sample = OrderDTO.Response.builder()
            .id(1L).tableNumber(5)
            .status(Order.OrderStatus.SENT)
            .total(15.5).build();
    }

    @Test @WithMockUser(roles = "SERVEUR")
    @DisplayName("GET /api/orders/active → 200 liste JSON")
    void getActive_200() throws Exception {
        when(orderService.getActive()).thenReturn(List.of());
        mockMvc.perform(get("/api/orders/active"))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /api/orders/history → 200")
    void getHistory_200() throws Exception {
        when(orderService.getHistory()).thenReturn(List.of());
        mockMvc.perform(get("/api/orders/history")).andExpect(status().isOk());
    }

    @Test @WithMockUser(roles = "CAISSE")
    @DisplayName("GET /api/orders/pending-payment → 200")
    void getPending_200() throws Exception {
        when(orderService.getPendingPayment()).thenReturn(List.of());
        mockMvc.perform(get("/api/orders/pending-payment")).andExpect(status().isOk());
    }

    @Test @WithMockUser(roles = "SERVEUR")
    @DisplayName("POST /api/orders → 201 commande créée")
    void create_201() throws Exception {
        Map<String, Object> payload = Map.of(
            "tableNumber", 5,
            "items", List.of(Map.of("menuItemId", 1, "quantity", 2, "note", ""))
        );
        Order mockOrder = new Order(); mockOrder.setId(1L);
        when(orderService.createOrder(any())).thenReturn(mockOrder);
        when(orderService.toResponse(any())).thenReturn(sample);

        mockMvc.perform(post("/api/orders").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
            .andExpect(status().isCreated());
    }

    @Test @WithMockUser(roles = "SERVEUR")
    @DisplayName("POST /api/orders/{id}/send-kitchen → 200")
    void sendToKitchen_200() throws Exception {
        Order mockOrder = new Order(); mockOrder.setId(1L);
        when(orderService.sendToKitchen(1L)).thenReturn(mockOrder);
        when(orderService.toResponse(any())).thenReturn(sample);

        mockMvc.perform(post("/api/orders/1/send-kitchen").with(csrf()))
            .andExpect(status().isOk());
    }

    @Test @WithMockUser(roles = "CAISSE")
    @DisplayName("POST /api/orders/{id}/pay → 200 avec paymentMethod")
    void payOrder_200() throws Exception {
        Order mockOrder = new Order(); mockOrder.setId(1L);
        when(orderService.payOrder(eq(1L), eq("especes"))).thenReturn(mockOrder);
        when(orderService.toResponse(any())).thenReturn(sample);

        mockMvc.perform(post("/api/orders/1/pay").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentMethod\":\"especes\"}"))
            .andExpect(status().isOk());
    }

    @Test @WithMockUser(roles = "CAISSE")
    @DisplayName("POST /api/orders/pay-table/{num} → 200 table encaissée")
    void payTable_200() throws Exception {
        doNothing().when(orderService).payTable(5, "carte");

        mockMvc.perform(post("/api/orders/pay-table/5").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentMethod\":\"carte\"}"))
            .andExpect(status().isOk());

        verify(orderService).payTable(5, "carte");
    }

    @Test @WithMockUser(roles = "CUISINE")
    @DisplayName("PATCH /api/orders/{id}/status → 200 statut mis à jour")
    void updateStatus_200() throws Exception {
        Order mockOrder = new Order(); mockOrder.setId(1L);
        when(orderService.updateStatus(eq(1L), eq(Order.OrderStatus.PREPARING))).thenReturn(mockOrder);
        when(orderService.toResponse(any())).thenReturn(sample);

        mockMvc.perform(patch("/api/orders/1/status").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"PREPARING\"}"))
            .andExpect(status().isOk());
    }

    @Test @DisplayName("GET /api/orders/active sans auth → 401/403")
    void noAuth_401() throws Exception {
        mockMvc.perform(get("/api/orders/active"))
            .andExpect(status().is4xxClientError());
    }

    @Test @WithMockUser(roles = "SERVEUR")
    @DisplayName("POST /api/orders/pay-table sans rôle CAISSE → 403")
    void payTable_wrongRole_403() throws Exception {
        mockMvc.perform(post("/api/orders/pay-table/5").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"paymentMethod\":\"especes\"}"))
            .andExpect(status().isForbidden());
    }
}
