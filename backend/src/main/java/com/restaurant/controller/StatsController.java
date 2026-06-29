package com.restaurant.controller;
import com.restaurant.repository.OrderRepository;
import com.restaurant.model.Order;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.List;
@RestController @RequestMapping("/api/stats") @CrossOrigin(origins="*")
public class StatsController {
    private final OrderRepository orderRepo;

    public StatsController(OrderRepository orderRepo) {
        this.orderRepo = orderRepo;
    }
    @GetMapping("/today") public Map<String,Object> today() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        Map<String,Object> s = new HashMap<>();
        s.put("revenue", orderRepo.sumRevenueToday(start));
        s.put("activeOrders", orderRepo.findActiveOrders().size());
        return s;
    }

    // Stats par heure
    @GetMapping("/hourly")
    public List<Map<String,Object>> hourly() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        List<Order> orders = orderRepo.findServedToday(start);
        Map<Integer, Double> byHour = new java.util.TreeMap<>();
        for (Order o : orders) {
            int h = o.getPaidAt() != null ? o.getPaidAt().getHour() : o.getCreatedAt().getHour();
            byHour.merge(h, o.getTotalAmount() != null ? o.getTotalAmount() : 0.0, Double::sum);
        }
        List<Map<String,Object>> result = new java.util.ArrayList<>();
        byHour.forEach((h, total) -> {
            Map<String,Object> m = new java.util.HashMap<>();
            m.put("hour", String.format("%02d:00", h));
            m.put("total", Math.round(total * 100.0) / 100.0);
            result.add(m);
        });
        return result;
    }

    // Top articles
    @GetMapping("/top-items")
    public List<Map<String,Object>> topItems() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        List<Order> orders = orderRepo.findServedToday(start);
        Map<String, long[]> byItem = new java.util.LinkedHashMap<>();
        for (Order o : orders) {
            if (o.getItems() == null) continue;
            for (var item : o.getItems()) {
                String name = item.getMenuItem() != null ? item.getMenuItem().getName() : "?";
                byItem.computeIfAbsent(name, k -> new long[]{0, 0});
                byItem.get(name)[0] += item.getQuantity();
                byItem.get(name)[1] += Math.round(item.getEffectivePrice() * item.getQuantity() * 100);
            }
        }
        return byItem.entrySet().stream()
            .sorted((a, b) -> Long.compare(b.getValue()[0], a.getValue()[0]))
            .limit(10)
            .map(e -> {
                Map<String,Object> m = new java.util.HashMap<>();
                m.put("name", e.getKey());
                m.put("qty", e.getValue()[0]);
                m.put("total", e.getValue()[1] / 100.0);
                return m;
            }).toList();
    }

    // Fin de service : récapitulatif par méthode de paiement
    @GetMapping("/service") public Map<String,Object> service() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        List<Order> orders = orderRepo.findServedToday(start);

        double totalEspeces = 0, totalCarte = 0, totalCheque = 0, totalMixte = 0, totalAutre = 0;
        int nbEspeces = 0, nbCarte = 0, nbCheque = 0, nbMixte = 0, nbAutre = 0;

        for (Order o : orders) {
            double amt = o.getTotalAmount() != null ? o.getTotalAmount() : 0;
            String m = o.getPaymentMethod() != null ? o.getPaymentMethod().toLowerCase() : "autre";
            switch (m) {
                case "especes" -> { totalEspeces += amt; nbEspeces++; }
                case "carte"   -> { totalCarte   += amt; nbCarte++;   }
                case "cheque"  -> { totalCheque  += amt; nbCheque++;  }
                case "mixte"   -> { totalMixte   += amt; nbMixte++;   }
                default        -> { totalAutre   += amt; nbAutre++;   }
            }
        }

        double totalJour = totalEspeces + totalCarte + totalCheque + totalMixte + totalAutre;

        Map<String,Object> s = new HashMap<>();
        s.put("date",          LocalDate.now().toString());
        s.put("totalJour",     Math.round(totalJour   * 100.0) / 100.0);
        s.put("nbCommandes",   orders.size());
        s.put("especes",       Map.of("total", Math.round(totalEspeces*100.0)/100.0, "nb", nbEspeces));
        s.put("carte",         Map.of("total", Math.round(totalCarte  *100.0)/100.0, "nb", nbCarte));
        s.put("cheque",        Map.of("total", Math.round(totalCheque *100.0)/100.0, "nb", nbCheque));
        s.put("mixte",         Map.of("total", Math.round(totalMixte  *100.0)/100.0, "nb", nbMixte));
        if (nbAutre > 0)
            s.put("autre",     Map.of("total", Math.round(totalAutre  *100.0)/100.0, "nb", nbAutre));
        return s;
    }
}
