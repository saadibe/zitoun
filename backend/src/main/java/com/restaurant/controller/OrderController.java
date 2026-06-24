package com.restaurant.controller;
import com.restaurant.dto.OrderDTO;
import com.restaurant.model.Order;
import com.restaurant.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/orders")
@RequiredArgsConstructor @CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    public List<OrderDTO.Response> getAll(@RequestParam(required = false) String status) {
        if (status != null)
            return orderService.getByStatus(Order.OrderStatus.valueOf(status.toUpperCase()))
                .stream().map(orderService::toResponse).toList();
        return orderService.getAll().stream().map(orderService::toResponse).toList();
    }

    @GetMapping("/active")
    public List<OrderDTO.Response> getActive() {
        return orderService.getActive().stream().map(orderService::toResponse).toList();
    }

    // Historique des commandes servies (pour la page Historique)
    @GetMapping("/history")
    public List<OrderDTO.Response> getHistory() {
        return orderService.getHistory().stream().map(orderService::toResponse).toList();
    }

    // Commandes en attente de paiement (pour la page Tables / Encaissement)
    @GetMapping("/pending-payment")
    public List<OrderDTO.Response> getPendingPayment() {
        return orderService.getPendingPayment().stream().map(orderService::toResponse).toList();
    }

    @GetMapping("/{id}")
    public OrderDTO.Response getById(@PathVariable Long id) {
        return orderService.toResponse(orderService.findById(id));
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public OrderDTO.Response create(@Valid @RequestBody OrderDTO.CreateRequest req) {
        return orderService.toResponse(orderService.createOrder(req));
    }

    @PostMapping("/{id}/send-kitchen")
    public OrderDTO.Response sendToKitchen(@PathVariable Long id) {
        return orderService.toResponse(orderService.sendToKitchen(id));
    }

    @PatchMapping("/{id}/status")
    public OrderDTO.Response updateStatus(@PathVariable Long id,
                                          @RequestBody OrderDTO.StatusUpdate req) {
        return orderService.toResponse(orderService.updateStatus(id, req.getStatus()));
    }

    @PostMapping("/{id}/pay")
    public OrderDTO.Response payOrder(@PathVariable Long id, @RequestBody java.util.Map<String,String> req) {
        return orderService.toResponse(orderService.payOrder(id, req.get("paymentMethod")));
    }

    @PostMapping("/pay-table/{tableNumber}")
    public org.springframework.http.ResponseEntity<Void> payTable(
            @PathVariable Integer tableNumber, @RequestBody java.util.Map<String,String> req) {
        orderService.payTable(tableNumber, req.get("paymentMethod"));
        return org.springframework.http.ResponseEntity.ok().build();
    }
}
