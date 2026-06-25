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
