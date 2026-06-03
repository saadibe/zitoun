package com.restaurant.controller;
import com.restaurant.repository.OrderRepository;
import com.restaurant.model.Order;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
@RestController @RequestMapping("/api/stats") @RequiredArgsConstructor @CrossOrigin(origins="*")
public class StatsController {
    private final OrderRepository orderRepo;
    @GetMapping("/today") public Map<String,Object> today() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        Map<String,Object> s = new HashMap<>();
        s.put("revenue", orderRepo.sumRevenueToday(start));
        s.put("activeOrders", orderRepo.findActiveOrders().size());
        return s;
    }
}
