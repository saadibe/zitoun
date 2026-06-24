package com.restaurant.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.restaurant.model.MenuItem;
import com.restaurant.repository.MenuItemRepository;
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
@DisplayName("Menu — Tests d'Intégration")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class MenuIntegrationTest {

    @Autowired MockMvc           mockMvc;
    @Autowired ObjectMapper      mapper;
    @Autowired MenuItemRepository menuRepo;

    private static Long savedItemId;

    @BeforeEach
    void setUp() { if (savedItemId == null) menuRepo.deleteAll(); }

    @Test @org.junit.jupiter.api.Order(1)
    @DisplayName("[Menu S1] GET /api/menu public → 200")
    void getMenu_public_200() throws Exception {
        mockMvc.perform(get("/api/menu"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test @org.junit.jupiter.api.Order(2)
    @WithMockUser(roles = "ADMIN")
    @DisplayName("[Menu S2] POST /api/menu → 200 article créé")
    void createMenuItem() throws Exception {
        Map<String, Object> body = Map.of(
            "name", "Test Sandwich",
            "price", 8.5,
            "emoji", "🥙",
            "category", "SANDWICH",
            "available", true
        );

        var result = mockMvc.perform(post("/api/menu").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andReturn();

        Map<?, ?> resp = mapper.readValue(result.getResponse().getContentAsString(), Map.class);
        savedItemId = ((Number) resp.get("id")).longValue();

        assertThat(savedItemId).isPositive();
        assertThat(menuRepo.findById(savedItemId)).isPresent();
    }

    @Test @org.junit.jupiter.api.Order(3)
    @WithMockUser(roles = "ADMIN")
    @DisplayName("[Menu S3] PUT /api/menu/{id} → prix mis à jour")
    void updateMenuItem() throws Exception {
        if (savedItemId == null) return;

        Map<String, Object> body = Map.of(
            "name", "Test Sandwich MAJ",
            "price", 9.0,
            "emoji", "🥙",
            "category", "SANDWICH",
            "available", true
        );

        mockMvc.perform(put("/api/menu/" + savedItemId).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.price").value(9.0));
    }

    @Test @org.junit.jupiter.api.Order(4)
    @WithMockUser(roles = "ADMIN")
    @DisplayName("[Menu S4] PATCH disponibilité → toggle available")
    void toggleAvailability() throws Exception {
        if (savedItemId == null) return;

        mockMvc.perform(patch("/api/menu/" + savedItemId + "/availability").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"available\":false}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.available").value(false));

        MenuItem item = menuRepo.findById(savedItemId).orElseThrow();
        assertThat(item.isAvailable()).isFalse();
    }

    @Test @org.junit.jupiter.api.Order(5)
    @WithMockUser(roles = "ADMIN")
    @DisplayName("[Menu S5] DELETE /api/menu/{id} → supprimé")
    void deleteMenuItem() throws Exception {
        if (savedItemId == null) return;

        mockMvc.perform(delete("/api/menu/" + savedItemId).with(csrf()))
            .andExpect(status().isOk());

        assertThat(menuRepo.findById(savedItemId)).isEmpty();
    }

    @Test @org.junit.jupiter.api.Order(6)
    @DisplayName("[Menu S6] POST /api/menu sans auth → 401/403")
    void createMenuItem_noAuth_401() throws Exception {
        mockMvc.perform(post("/api/menu").with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"test\",\"price\":5.0}"))
            .andExpect(status().is4xxClientError());
    }
}
