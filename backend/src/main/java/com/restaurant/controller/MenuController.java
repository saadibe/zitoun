package com.restaurant.controller;

import com.restaurant.model.MenuItem;
import com.restaurant.repository.MenuItemRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/menu")
@CrossOrigin(origins = "*")
public class MenuController {

    private final MenuItemRepository menuRepo;

    public MenuController(MenuItemRepository menuRepo) {
        this.menuRepo = menuRepo;
    }

    @GetMapping
    public List<MenuItem> getAll() {
        return menuRepo.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MenuItem create(@RequestBody MenuItem item) {
        item.setId(null);
        return menuRepo.save(item);
    }

    @PutMapping("/{id}")
    public MenuItem update(@PathVariable Long id, @RequestBody MenuItem updated) {
        MenuItem item = menuRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        item.setName(updated.getName());
        item.setPrice(updated.getPrice());
        item.setCategory(updated.getCategory());
        item.setEmoji(updated.getEmoji());
        item.setAvailable(updated.isAvailable());
        return menuRepo.save(item);
    }

    @PatchMapping("/{id}/availability")
    public MenuItem toggleAvailability(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        MenuItem item = menuRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        item.setAvailable(body.getOrDefault("available", true));
        return menuRepo.save(item);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!menuRepo.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        menuRepo.deleteById(id);
    }
}
