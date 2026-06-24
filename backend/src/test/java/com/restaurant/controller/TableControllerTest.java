package com.restaurant.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.restaurant.dto.OrderDTO;
import com.restaurant.model.*;
import com.restaurant.model.Order;
import com.restaurant.repository.*;
import com.restaurant.security.JwtFilter;
import com.restaurant.service.OrderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = TableController.class,
    excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = JwtFilter.class))
@DisplayName("TableController — Tests Contrôleur")
class TableControllerTest {

    @Autowired MockMvc      mockMvc;
    @Autowired ObjectMapper mapper;
    @MockBean  TableRepository  tableRepo;
    @MockBean  OrderRepository  orderRepo;
    @MockBean  OrderService     orderService;

    private RestaurantTable freeTable;
    private RestaurantTable occupiedTable;

    @BeforeEach
    void setUp() {
        freeTable = new RestaurantTable();
        freeTable.setId(1L); freeTable.setNumber(1);
        freeTable.setSeats(4); freeTable.setStatus(RestaurantTable.TableStatus.FREE);

        occupiedTable = new RestaurantTable();
        occupiedTable.setId(5L); occupiedTable.setNumber(5);
        occupiedTable.setSeats(4); occupiedTable.setStatus(RestaurantTable.TableStatus.OCCUPIED);
        occupiedTable.setOccupiedSince(LocalDateTime.now().minusMinutes(30));
    }

    @Test @DisplayName("GET /api/tables → 200 liste de toutes les tables (public)")
    void getAll_public_returns200() throws Exception {
        when(tableRepo.findAllByOrderByNumberAsc()).thenReturn(List.of(freeTable, occupiedTable));

        mockMvc.perform(get("/api/tables"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test @DisplayName("GET /api/tables/{number}/orders → 200 commandes actives")
    @WithMockUser(roles = "SERVEUR")
    void getTableOrders_returns200() throws Exception {
        OrderDTO.Response resp = OrderDTO.Response.builder()
            .id(1L).tableNumber(5).status(Order.OrderStatus.SENT).total(15.5).build();

        when(orderRepo.findActiveByTable(5)).thenReturn(List.of());
        when(orderService.toResponse(any())).thenReturn(resp);

        mockMvc.perform(get("/api/tables/5/orders"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test @DisplayName("POST /api/tables → 201 table créée")
    @WithMockUser(roles = "ADMIN")
    void create_returns201() throws Exception {
        RestaurantTable newTable = new RestaurantTable();
        newTable.setNumber(11); newTable.setSeats(4);

        when(tableRepo.findByNumber(11)).thenReturn(Optional.empty());
        when(tableRepo.save(any())).thenReturn(freeTable);

        mockMvc.perform(post("/api/tables").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(newTable)))
            .andExpect(status().isCreated());
    }

    @Test @DisplayName("POST /api/tables → 409 si numéro déjà existant")
    @WithMockUser(roles = "ADMIN")
    void create_duplicateNumber_returns409() throws Exception {
        RestaurantTable newTable = new RestaurantTable();
        newTable.setNumber(1); newTable.setSeats(4);

        when(tableRepo.findByNumber(1)).thenReturn(Optional.of(freeTable));

        mockMvc.perform(post("/api/tables").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(newTable)))
            .andExpect(status().isConflict());
    }

    @Test @DisplayName("PATCH /api/tables/{id}/status FREE→OCCUPIED")
    @WithMockUser(roles = "SERVEUR")
    void updateStatus_toOccupied() throws Exception {
        when(tableRepo.findById(1L)).thenReturn(Optional.of(freeTable));
        when(tableRepo.save(any())).thenReturn(occupiedTable);

        mockMvc.perform(patch("/api/tables/1/status").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"OCCUPIED\"}"))
            .andExpect(status().isOk());
    }

    @Test @DisplayName("PATCH /api/tables/{id}/status → 404 table inconnue")
    @WithMockUser(roles = "ADMIN")
    void updateStatus_notFound_returns404() throws Exception {
        when(tableRepo.findById(99L)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/api/tables/99/status").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"FREE\"}"))
            .andExpect(status().isNotFound());
    }

    @Test @DisplayName("DELETE /api/tables/{id} → 204 supprimé")
    @WithMockUser(roles = "ADMIN")
    void delete_returns204() throws Exception {
        when(tableRepo.existsById(1L)).thenReturn(true);
        doNothing().when(tableRepo).deleteById(1L);

        mockMvc.perform(delete("/api/tables/1").with(csrf()))
            .andExpect(status().isNoContent());
    }

    @Test @DisplayName("DELETE /api/tables/{id} → 404 inexistant")
    @WithMockUser(roles = "ADMIN")
    void delete_notFound_returns404() throws Exception {
        when(tableRepo.existsById(99L)).thenReturn(false);

        mockMvc.perform(delete("/api/tables/99").with(csrf()))
            .andExpect(status().isNotFound());
    }
}
