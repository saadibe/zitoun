package com.restaurant.service;
import com.restaurant.dto.OrderDTO;
import com.restaurant.model.*;
import com.restaurant.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.format.DateTimeFormatter;
import java.util.List;
@Service @RequiredArgsConstructor
public class OrderService {
    private final OrderRepository orderRepo;
    private final MenuItemRepository menuRepo;
    private final SimpMessagingTemplate ws;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Transactional public Order createOrder(OrderDTO.CreateRequest req) {
        Order order = Order.builder().tableNumber(req.getTableNumber()).serverName(req.getServerName()).status(Order.OrderStatus.PENDING).build();
        List<OrderItem> items = req.getItems().stream().map(r -> {
            MenuItem m = menuRepo.findById(r.getMenuItemId()).orElseThrow(()->new RuntimeException("Article non trouvé: "+r.getMenuItemId()));
            return OrderItem.builder().order(order).menuItem(m).quantity(r.getQuantity()).note(r.getNote()).build();
        }).toList();
        order.setItems(items);
        Order saved = orderRepo.save(order);
        ws.convertAndSend("/topic/orders", toResponse(saved));
        return saved;
    }

    @Transactional public Order sendToKitchen(Long id) {
        Order o = findById(id); o.setStatus(Order.OrderStatus.SENT);
        Order saved = orderRepo.save(o);
        ws.convertAndSend("/topic/kitchen", toResponse(saved));
        ws.convertAndSend("/topic/orders", toResponse(saved));
        return saved;
    }

    @Transactional public Order updateStatus(Long id, Order.OrderStatus status) {
        Order o = findById(id); o.setStatus(status);
        Order saved = orderRepo.save(o);
        ws.convertAndSend("/topic/orders", toResponse(saved));
        ws.convertAndSend("/topic/kitchen", toResponse(saved));
        return saved;
    }

    public List<Order> getAll() { return orderRepo.findAll(); }
    public List<Order> getActive() { return orderRepo.findActiveOrders(); }
    public List<Order> getByStatus(Order.OrderStatus s) { return orderRepo.findByStatusOrderByCreatedAtAsc(s); }
    public Order findById(Long id) { return orderRepo.findById(id).orElseThrow(()->new RuntimeException("Commande non trouvée: "+id)); }

    public OrderDTO.Response toResponse(Order o) {
        double total = o.getItems()==null?0:o.getItems().stream().mapToDouble(i->i.getMenuItem().getPrice()*i.getQuantity()).sum();
        List<OrderDTO.ItemResponse> items = o.getItems()==null?List.of():o.getItems().stream().map(i->OrderDTO.ItemResponse.builder()
            .id(i.getId()).name(i.getMenuItem().getName()).emoji(i.getMenuItem().getEmoji())
            .price(i.getMenuItem().getPrice()).quantity(i.getQuantity()).note(i.getNote()).build()).toList();
        return OrderDTO.Response.builder().id(o.getId()).tableNumber(o.getTableNumber()).status(o.getStatus())
            .serverName(o.getServerName()).items(items)
            .createdAt(o.getCreatedAt()!=null?o.getCreatedAt().format(FMT):null)
            .updatedAt(o.getUpdatedAt()!=null?o.getUpdatedAt().format(FMT):null).total(total).build();
    }
}
