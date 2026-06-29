package com.restaurant.controller;
import com.restaurant.model.LoyaltyCustomer;
import com.restaurant.repository.LoyaltyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequestMapping("/api/loyalty") @RequiredArgsConstructor
@CrossOrigin(origins="*")
public class LoyaltyController {

    private final LoyaltyRepository repo;

    @GetMapping            public List<LoyaltyCustomer> all()  { return repo.findAllByVisitsDesc(); }
    @GetMapping("/search") public List<LoyaltyCustomer> search(@RequestParam String q) { return repo.search(q); }

    @PostMapping
    public LoyaltyCustomer create(@RequestBody Map<String, String> body) {
        LoyaltyCustomer c = new LoyaltyCustomer();
        c.setName(body.getOrDefault("name", "Client"));
        c.setPhone(body.getOrDefault("phone", ""));
        return repo.save(c);
    }

    @PostMapping("/{id}/visit")
    public LoyaltyCustomer addVisit(@PathVariable Long id,
                                    @RequestBody(required=false) Map<String,Object> body) {
        LoyaltyCustomer c = repo.findById(id).orElseThrow();
        c.setVisits(c.getVisits() + 1);
        double spent = body != null && body.containsKey("amount")
            ? ((Number) body.get("amount")).doubleValue() : 0;
        c.setTotalSpent(c.getTotalSpent() + spent);
        c.setLastVisit(LocalDateTime.now());
        return repo.save(c);
    }

    @PostMapping("/{id}/use-free")
    public LoyaltyCustomer useFree(@PathVariable Long id) {
        LoyaltyCustomer c = repo.findById(id).orElseThrow();
        c.setFreeTicketsUsed(c.getFreeTicketsUsed() + 1);
        return repo.save(c);
    }

    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { repo.deleteById(id); }
}
