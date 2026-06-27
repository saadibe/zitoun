package com.restaurant.service;
import lombok.RequiredArgsConstructor;
import com.restaurant.dto.OrderDTO;
import com.restaurant.model.*;
import com.restaurant.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RequiredArgsConstructor
@Service public class OrderService {
    private final OrderRepository       orderRepo;
    private final MenuItemRepository    menuRepo;
    private final TableRepository       tableRepo;
    private final SimpMessagingTemplate ws;
    private static final DateTimeFormatter FMT =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Transactional
    public Order createOrder(OrderDTO.CreateRequest req) {
        Order order = Order.builder()
            .tableNumber(req.getTableNumber())
            .serverName(req.getServerName())
            .status(Order.OrderStatus.PENDING)
            .build();
        List<OrderItem> items = req.getItems().stream().map(r -> {
            MenuItem m = menuRepo.findById(r.getMenuItemId())
                .orElseThrow(() -> new RuntimeException("Article non trouvé: " + r.getMenuItemId()));
            double price = (r.getUnitPrice() != null && r.getUnitPrice() > 0)
                ? r.getUnitPrice() : m.getPrice();
            return OrderItem.builder().order(order).menuItem(m)
                .quantity(r.getQuantity()).note(r.getNote())
                .unitPrice(price).build();
        }).toList();
        order.setItems(items);
        Order saved = orderRepo.save(order);
        // Mettre la table en OCCUPIED
        if (req.getTableNumber() != null && req.getTableNumber() > 0) {
            tableRepo.findByNumber(req.getTableNumber()).ifPresent(t -> {
                t.setStatus(RestaurantTable.TableStatus.OCCUPIED);
                t.setOccupiedSince(LocalDateTime.now());
                tableRepo.save(t);
            });
        }
        try { ws.convertAndSend("/topic/orders", toResponse(saved)); } catch (Exception ignored) {}
        return saved;
    }

    @Transactional
    public Order sendToKitchen(Long id) {
        Order o = findById(id);
        o.setStatus(Order.OrderStatus.SENT);
        Order saved = orderRepo.save(o);
        try {
            ws.convertAndSend("/topic/kitchen", toResponse(saved));
            ws.convertAndSend("/topic/orders",  toResponse(saved));
        } catch (Exception ignored) {}
        return saved;
    }

    @Transactional
    public Order updateStatus(Long id, Order.OrderStatus status) {
        Order o = findById(id);
        o.setStatus(status);
        Order saved = orderRepo.save(o);
        // NOTE: table libérée UNIQUEMENT par payTable() ou payOrder()
        // Le statut SERVED signifie "plat servi" (cuisine), pas "encaissé" (caisse)
        try {
            ws.convertAndSend("/topic/orders",  toResponse(saved));
            ws.convertAndSend("/topic/kitchen", toResponse(saved));
        } catch (Exception ignored) {}
        return saved;
    }

    public List<Order> getAll()            { return orderRepo.findAll(); }
    public List<Order> getActive()         { return orderRepo.findActiveOrders(); }
    public List<Order> getHistory()        { return orderRepo.findHistory(); }
    public List<Order> getPendingPayment() { return orderRepo.findPendingPayment(); }
    public List<Order> getAllRecent()       { return orderRepo.findAllRecent(); }

    public List<Order> getByStatus(Order.OrderStatus s) {
        return orderRepo.findByStatusOrderByCreatedAtAsc(s);
    }

    public Order findById(Long id) {
        return orderRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Commande non trouvée: " + id));
    }

    public OrderDTO.Response toResponse(Order o) {
        double total = o.getItems() == null ? 0 :
            o.getItems().stream()
                .mapToDouble(i -> i.getEffectivePrice() * i.getQuantity())
                .sum();
        List<OrderDTO.ItemResponse> items = o.getItems() == null ? List.of() :
            o.getItems().stream().map(i -> OrderDTO.ItemResponse.builder()
                .id(i.getId())
                .name(i.getMenuItem() != null ? i.getMenuItem().getName() : "?")
                .emoji(i.getMenuItem() != null ? i.getMenuItem().getEmoji() : "")
                .price(i.getEffectivePrice())   // prix réel avec options
                .quantity(i.getQuantity())
                .note(i.getNote())
                .build()).toList();
        return OrderDTO.Response.builder()
            .id(o.getId())
            .tableNumber(o.getTableNumber())
            .status(o.getStatus())
            .serverName(o.getServerName())
            .items(items)
            .createdAt(o.getCreatedAt() != null ? o.getCreatedAt().format(FMT) : null)
            .updatedAt(o.getUpdatedAt() != null ? o.getUpdatedAt().format(FMT) : null)
            .total(total)
            .build();
    }

    @Transactional
    public Order payOrder(Long id, String paymentMethod) {
        Order o = findById(id);
        o.setStatus(Order.OrderStatus.SERVED);
        o.setPaymentMethod(paymentMethod);
        o.setPaidAt(java.time.LocalDateTime.now());
        Order saved = orderRepo.save(o);
        // payOrder encaisse une commande mais NE libère PAS la table
        // Utiliser payTable() pour libérer la table
        try { ws.convertAndSend("/topic/orders", toResponse(saved)); } catch (Exception ignored) {}
        return saved;
    }

    @Transactional
    public void payTable(Integer tableNumber, String paymentMethod) {
        orderRepo.findActiveByTable(tableNumber).forEach(o -> {
            o.setStatus(Order.OrderStatus.SERVED);
            o.setPaymentMethod(paymentMethod);
            o.setPaidAt(java.time.LocalDateTime.now());
            orderRepo.save(o);
        });
        tableRepo.findByNumber(tableNumber).ifPresent(t -> {
            t.setStatus(RestaurantTable.TableStatus.FREE);
            t.setOccupiedSince(null);
            tableRepo.save(t);
        });
    }

}
