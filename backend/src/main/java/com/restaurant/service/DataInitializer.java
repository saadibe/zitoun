package com.restaurant.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Les données initiales sont gérées par Liquibase.
 * Voir : src/main/resources/db/changelog/
 *
 * v1 — Schéma des tables
 * v2 — Menu La Perla (33 articles)
 * v3 — Paramètres du restaurant
 * v4 — Tables de la salle
 *
 * Chaque changeset s'exécute UNE SEULE FOIS et ne touche
 * jamais aux données existantes lors des redémarrages.
 */
@Component
public class DataInitializer implements CommandLineRunner {
    @Override
    public void run(String... args) {
        // Rien à faire — Liquibase s'en charge au démarrage
    }
}
