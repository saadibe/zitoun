package com.restaurant.controller;

import com.restaurant.model.Category;
import com.restaurant.model.RestaurantSettings;
import com.restaurant.repository.CategoryRepository;
import com.restaurant.repository.SettingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*")
public class SettingsController {

    private final SettingsRepository   settingsRepo;
    private final CategoryRepository   categoryRepo;

    // ══ SETTINGS ═══════════════════════════════

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

    // ══ CATEGORIES ══════════════════════════════

    @GetMapping("/categories")
    public List<Category> getCategories() {
        return categoryRepo.findAllByActiveTrueOrderBySortOrderAsc();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public Category createCategory(@RequestBody Category cat) {
        cat.setId(null);
        cat.setCode(cat.getCode().toUpperCase().trim().replace(" ", "_"));
        if (categoryRepo.existsByCode(cat.getCode()))
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "La catégorie " + cat.getCode() + " existe déjà");
        if (cat.getSortOrder() == null) cat.setSortOrder(0);
        return categoryRepo.save(cat);
    }

    @PutMapping("/categories/{id}")
    public Category updateCategory(@PathVariable Long id, @RequestBody Category updated) {
        Category cat = categoryRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        cat.setLabel(updated.getLabel());
        cat.setEmoji(updated.getEmoji());
        cat.setSortOrder(updated.getSortOrder());
        cat.setActive(updated.isActive());
        return categoryRepo.save(cat);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) {
        if (!categoryRepo.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        categoryRepo.deleteById(id);
    }
}
