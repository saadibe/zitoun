package com.restaurant.controller;

import com.restaurant.model.RestaurantSettings;
import com.restaurant.repository.SettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SettingsController {

    private final SettingsRepository settingsRepo;

    @GetMapping
    public RestaurantSettings get() {
        return settingsRepo.findById(1L)
            .orElseGet(() -> settingsRepo.save(new RestaurantSettings()));
    }

    @PutMapping
    public RestaurantSettings update(@RequestBody RestaurantSettings updated) {
        updated.setId(1L);
        return settingsRepo.save(updated);
    }
}
