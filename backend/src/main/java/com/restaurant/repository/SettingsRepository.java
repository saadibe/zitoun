package com.restaurant.repository;
import com.restaurant.model.RestaurantSettings;
import org.springframework.data.jpa.repository.JpaRepository;
public interface SettingsRepository extends JpaRepository<RestaurantSettings, Long> {}
