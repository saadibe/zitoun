package com.restaurant.controller;

import com.restaurant.model.RestaurantTable;
import com.restaurant.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TableController {

    private final TableRepository tableRepo;

    @GetMapping
    public List<RestaurantTable> getAll() {
        return tableRepo.findAllByOrderByNumberAsc();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RestaurantTable create(@RequestBody RestaurantTable table) {
        table.setId(null);
        table.setStatus(RestaurantTable.TableStatus.FREE);
        if (tableRepo.findByNumber(table.getNumber()).isPresent())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La table " + table.getNumber() + " existe déjà");
        return tableRepo.save(table);
    }

    @PatchMapping("/{id}/status")
    public RestaurantTable updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        RestaurantTable t = tableRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        RestaurantTable.TableStatus s =
            RestaurantTable.TableStatus.valueOf(body.get("status").toUpperCase());
        t.setStatus(s);
        if (s == RestaurantTable.TableStatus.OCCUPIED) t.setOccupiedSince(LocalDateTime.now());
        else if (s == RestaurantTable.TableStatus.FREE) {
            t.setOccupiedSince(null); t.setCurrentOrderId(null); t.setReservedName(null);
        }
        return tableRepo.save(t);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!tableRepo.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        tableRepo.deleteById(id);
    }
}
