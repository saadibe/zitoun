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

        // Paramètres Zitoun par défaut
        if (settingsRepo.count() == 0) {
            settingsRepo.save(RestaurantSettings.builder()
                .id(1L).name("Zitoun").subtitle("Restaurant POS")
                .city("Tunisie").icon("🫒").taxNumber("MF: 123456/A/M/000")
                .build());
        }

        // Menu tunisien par défaut
        if (menuRepo.count() == 0) {
            menuRepo.saveAll(List.of(
                MenuItem.builder().name("Salade César").price(12.0).category(MenuItem.Category.ENTREE).emoji("🥗").available(true).build(),
                MenuItem.builder().name("Soupe à l'oignon").price(9.0).category(MenuItem.Category.ENTREE).emoji("🍲").available(true).build(),
                MenuItem.builder().name("Tartare de saumon").price(15.0).category(MenuItem.Category.ENTREE).emoji("🐟").available(true).build(),
                MenuItem.builder().name("Brik à l'oeuf").price(7.0).category(MenuItem.Category.ENTREE).emoji("🥚").available(true).build(),
                MenuItem.builder().name("Chorba tunisienne").price(8.0).category(MenuItem.Category.ENTREE).emoji("🍵").available(true).build(),
                MenuItem.builder().name("Steak frites").price(24.0).category(MenuItem.Category.PLAT).emoji("🥩").available(true).build(),
                MenuItem.builder().name("Poulet rôti").price(19.0).category(MenuItem.Category.PLAT).emoji("🍗").available(true).build(),
                MenuItem.builder().name("Pâtes carbonara").price(17.0).category(MenuItem.Category.PLAT).emoji("🍝").available(true).build(),
                MenuItem.builder().name("Couscous agneau").price(22.0).category(MenuItem.Category.PLAT).emoji("🫕").available(true).build(),
                MenuItem.builder().name("Saumon grillé").price(25.0).category(MenuItem.Category.PLAT).emoji("🐠").available(true).build(),
                MenuItem.builder().name("Crème brûlée").price(8.0).category(MenuItem.Category.DESSERT).emoji("🍮").available(true).build(),
                MenuItem.builder().name("Fondant chocolat").price(9.0).category(MenuItem.Category.DESSERT).emoji("🍫").available(true).build(),
                MenuItem.builder().name("Makroudh").price(6.0).category(MenuItem.Category.DESSERT).emoji("🍯").available(true).build(),
                MenuItem.builder().name("Eau minérale").price(2.5).category(MenuItem.Category.BOISSON).emoji("💧").available(true).build(),
                MenuItem.builder().name("Vin rouge").price(6.0).category(MenuItem.Category.BOISSON).emoji("🍷").available(true).build(),
                MenuItem.builder().name("Bière pression").price(5.0).category(MenuItem.Category.BOISSON).emoji("🍺").available(true).build(),
                MenuItem.builder().name("Café").price(2.5).category(MenuItem.Category.BOISSON).emoji("☕").available(true).build(),
                MenuItem.builder().name("Thé à la menthe").price(3.0).category(MenuItem.Category.BOISSON).emoji("🫖").available(true).build()
            ));
        }

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
