package com.restaurant.service;

import com.restaurant.model.*;
import com.restaurant.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.List;

@Component @RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final MenuItemRepository menuRepo;
    private final TableRepository tableRepo;
    private final SettingsRepository settingsRepo;

    @Override
    public void run(String... args) {

        // Paramètres La Perla par défaut
        if (settingsRepo.count() == 0) {
            settingsRepo.save(RestaurantSettings.builder()
                .id(1L).name("La Perla")
                .subtitle("Saveurs Authentiques de Tunisie")
                .city("Tunisie").icon("🌶️")
                .taxNumber("MF: 123456/A/M/000")
                .build());
        }

        // Supprimer l'ancien menu et recharger le menu La Perla
        menuRepo.deleteAll();
        menuRepo.saveAll(List.of(
            // ── ENTRÉES ──
            MenuItem.builder().name("Brick thon à l'oeuf").price(4.0).category(MenuItem.Category.ENTREE).emoji("🥚").available(true).build(),
            MenuItem.builder().name("Fricassée").price(3.0).category(MenuItem.Category.ENTREE).emoji("🥪").available(true).build(),
            MenuItem.builder().name("Salade au choix").price(7.0).category(MenuItem.Category.ENTREE).emoji("🥗").available(true).build(),
            // ── SANDWICHS ──
            MenuItem.builder().name("Tunisien").price(8.0).category(MenuItem.Category.SANDWICH).emoji("🥖").available(true).build(),
            MenuItem.builder().name("Kaftaji").price(8.0).category(MenuItem.Category.SANDWICH).emoji("🫔").available(true).build(),
            MenuItem.builder().name("Kaftaji merguez").price(11.0).category(MenuItem.Category.SANDWICH).emoji("🌭").available(true).build(),
            MenuItem.builder().name("Chapati Thon").price(6.0).category(MenuItem.Category.SANDWICH).emoji("🫓").available(true).build(),
            MenuItem.builder().name("Chapati Escalope").price(7.0).category(MenuItem.Category.SANDWICH).emoji("🍗").available(true).build(),
            MenuItem.builder().name("Chapati Viande Hachée").price(8.0).category(MenuItem.Category.SANDWICH).emoji("🥩").available(true).build(),
            MenuItem.builder().name("Tabouna Thon").price(8.0).category(MenuItem.Category.SANDWICH).emoji("🫓").available(true).build(),
            MenuItem.builder().name("Tabouna Escalope").price(9.0).category(MenuItem.Category.SANDWICH).emoji("🍗").available(true).build(),
            MenuItem.builder().name("Tabouna Viande Hachée").price(10.0).category(MenuItem.Category.SANDWICH).emoji("🥩").available(true).build(),
            MenuItem.builder().name("Mléwi Thon").price(7.0).category(MenuItem.Category.SANDWICH).emoji("🫓").available(true).build(),
            MenuItem.builder().name("Mléwi Escalope").price(8.0).category(MenuItem.Category.SANDWICH).emoji("🍗").available(true).build(),
            MenuItem.builder().name("Mléwi Viande Hachée").price(9.0).category(MenuItem.Category.SANDWICH).emoji("🥩").available(true).build(),
            // ── PAIN & PIZZAS ──
            MenuItem.builder().name("Panuozzo La Perla").price(12.0).category(MenuItem.Category.PLAT).emoji("🥪").available(true).build(),
            MenuItem.builder().name("Panuozzo Mexicain").price(13.0).category(MenuItem.Category.PLAT).emoji("🌶️").available(true).build(),
            MenuItem.builder().name("Libanais Escalope").price(9.0).category(MenuItem.Category.PLAT).emoji("🥙").available(true).build(),
            MenuItem.builder().name("Baguette Thon").price(9.0).category(MenuItem.Category.PLAT).emoji("🥖").available(true).build(),
            MenuItem.builder().name("Baguette Escalope").price(10.0).category(MenuItem.Category.PLAT).emoji("🥖").available(true).build(),
            MenuItem.builder().name("Baguette Viande Hachée").price(11.0).category(MenuItem.Category.PLAT).emoji("🥖").available(true).build(),
            MenuItem.builder().name("Makloub Thon").price(9.0).category(MenuItem.Category.PLAT).emoji("🫔").available(true).build(),
            MenuItem.builder().name("Makloub Escalope").price(10.0).category(MenuItem.Category.PLAT).emoji("🍗").available(true).build(),
            MenuItem.builder().name("Makloub Viande Hachée").price(11.0).category(MenuItem.Category.PLAT).emoji("🥩").available(true).build(),
            MenuItem.builder().name("Cornet Thon").price(10.0).category(MenuItem.Category.PLAT).emoji("🌮").available(true).build(),
            MenuItem.builder().name("Cornet Escalope").price(11.0).category(MenuItem.Category.PLAT).emoji("🍗").available(true).build(),
            MenuItem.builder().name("Cornet Viande Hachée").price(11.0).category(MenuItem.Category.PLAT).emoji("🥩").available(true).build(),
            MenuItem.builder().name("Pizza Margarita").price(7.0).category(MenuItem.Category.PLAT).emoji("🍕").available(true).build(),
            MenuItem.builder().name("Pizza au Thon").price(8.0).category(MenuItem.Category.PLAT).emoji("🍕").available(true).build(),
            MenuItem.builder().name("Pizza Escalope").price(9.0).category(MenuItem.Category.PLAT).emoji("🍕").available(true).build(),
            MenuItem.builder().name("Pizza Viande Hachée").price(10.0).category(MenuItem.Category.PLAT).emoji("🍕").available(true).build(),
            // ── BOISSONS ──
            MenuItem.builder().name("Eau minérale & Sodas").price(1.80).category(MenuItem.Category.BOISSON).emoji("🥤").available(true).build(),
            MenuItem.builder().name("Citronnade maison").price(4.0).category(MenuItem.Category.BOISSON).emoji("🍋").available(true).build()
        ));

        // Tables par défaut
        if (tableRepo.count() == 0) {
            int[] seats = {2, 4, 4, 6, 2, 4, 4, 8, 2, 4};
            for (int i = 0; i < 10; i++) {
                tableRepo.save(RestaurantTable.builder()
                    .number(i + 1).seats(seats[i])
                    .status(RestaurantTable.TableStatus.FREE).build());
            }
        }
    }
}
