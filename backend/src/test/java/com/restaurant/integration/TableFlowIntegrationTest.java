package com.restaurant.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.restaurant.model.*;
import com.restaurant.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Gestion Tables — Tests d'Intégration")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class TableFlowIntegrationTest {

    @Autowired MockMvc         mockMvc;
    @Autowired ObjectMapper    mapper;
    @Autowired TableRepository tableRepo;

    @BeforeEach
    void setUp() { tableRepo.deleteAll(); }

    @Test @org.junit.jupiter.api.Order(1)
    @DisplayName("[Tables S1] GET /api/tables public → 200")
    void getAll_public() throws Exception {
        tableRepo.save(tbl(1)); tableRepo.save(tbl(2));

        mockMvc.perform(get("/api/tables"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2));
    }

    @Test @org.junit.jupiter.api.Order(2)
    @WithMockUser(roles = "ADMIN")
    @DisplayName("[Tables S2] Créer table → 201 + retrouvable")
    void create_table() throws Exception {
        Map<String, Object> body = Map.of("number", 7, "seats", 4);

        mockMvc.perform(post("/api/tables").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.number").value(7));

        assertThat(tableRepo.findByNumber(7)).isPresent();
    }

    @Test @org.junit.jupiter.api.Order(3)
    @WithMockUser(roles = "ADMIN")
    @DisplayName("[Tables S3] Créer table doublon → 409")
    void create_duplicate_409() throws Exception {
        tableRepo.save(tbl(3));
        Map<String, Object> body = Map.of("number", 3, "seats", 4);

        mockMvc.perform(post("/api/tables").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
            .andExpect(status().isConflict());
    }

    @Test @org.junit.jupiter.api.Order(4)
    @WithMockUser(roles = "SERVEUR")
    @DisplayName("[Tables S4] PATCH status FREE → OCCUPIED + occupiedSince renseigné")
    void patchStatus_toOccupied() throws Exception {
        RestaurantTable t = tableRepo.save(tbl(4));

        mockMvc.perform(patch("/api/tables/" + t.getId() + "/status").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"OCCUPIED\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("OCCUPIED"));

        RestaurantTable updated = tableRepo.findByNumber(4).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(RestaurantTable.TableStatus.OCCUPIED);
        assertThat(updated.getOccupiedSince()).isNotNull();
    }

    @Test @org.junit.jupiter.api.Order(5)
    @WithMockUser(roles = "SERVEUR")
    @DisplayName("[Tables S5] PATCH status OCCUPIED → FREE efface occupiedSince")
    void patchStatus_toFree_clearsOccupiedSince() throws Exception {
        RestaurantTable t = tableRepo.save(tbl(6));
        t.setStatus(RestaurantTable.TableStatus.OCCUPIED);
        t.setOccupiedSince(java.time.LocalDateTime.now().minusMinutes(30));
        tableRepo.save(t);

        mockMvc.perform(patch("/api/tables/" + t.getId() + "/status").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"FREE\"}"))
            .andExpect(status().isOk());

        RestaurantTable updated = tableRepo.findByNumber(6).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(RestaurantTable.TableStatus.FREE);
        assertThat(updated.getOccupiedSince()).isNull();
    }

    @Test @org.junit.jupiter.api.Order(6)
    @WithMockUser(roles = "ADMIN")
    @DisplayName("[Tables S6] DELETE table → 204 + plus en base")
    void delete_table() throws Exception {
        RestaurantTable t = tableRepo.save(tbl(9));

        mockMvc.perform(delete("/api/tables/" + t.getId()).with(csrf()))
            .andExpect(status().isNoContent());

        assertThat(tableRepo.findByNumber(9)).isEmpty();
    }

    @Test @org.junit.jupiter.api.Order(7)
    @WithMockUser(roles = "ADMIN")
    @DisplayName("[Tables S7] DELETE table inconnue → 404")
    void delete_notFound_404() throws Exception {
        mockMvc.perform(delete("/api/tables/9999").with(csrf()))
            .andExpect(status().isNotFound());
    }

    @Test @org.junit.jupiter.api.Order(8)
    @WithMockUser(roles = "SERVEUR")
    @DisplayName("[Tables S8] PATCH table inconnue → 404")
    void patchStatus_notFound_404() throws Exception {
        mockMvc.perform(patch("/api/tables/9999/status").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"FREE\"}"))
            .andExpect(status().isNotFound());
    }

    private RestaurantTable tbl(int num) {
        RestaurantTable t = new RestaurantTable();
        t.setNumber(num); t.setSeats(4);
        t.setStatus(RestaurantTable.TableStatus.FREE);
        return t;
    }
}
