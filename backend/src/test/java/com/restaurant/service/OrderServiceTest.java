package com.restaurant.service;

import com.restaurant.dto.OrderDTO;
import com.restaurant.model.*;
import com.restaurant.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("OrderService — Tests Unitaires")
class OrderServiceTest {

    @Mock OrderRepository       orderRepo;
    @Mock MenuItemRepository    menuRepo;
    @Mock TableRepository       tableRepo;
    @Mock SimpMessagingTemplate ws;
    @InjectMocks OrderService   svc;

    private MenuItem sandwich;
    private MenuItem boisson;
    private RestaurantTable table5;

    @BeforeEach
    void setUp() {
        sandwich = new MenuItem();
        sandwich.setId(1L); sandwich.setName("Chapati Thon");
        sandwich.setPrice(6.0); sandwich.setEmoji("🥙");
        sandwich.setCategory(MenuItem.Category.SANDWICH); sandwich.setAvailable(true);

        boisson = new MenuItem();
        boisson.setId(2L); boisson.setName("Citronnade");
        boisson.setPrice(3.5); boisson.setEmoji("🍋");
        boisson.setCategory(MenuItem.Category.BOISSON); boisson.setAvailable(true);

        table5 = new RestaurantTable();
        table5.setId(5L); table5.setNumber(5);
        table5.setSeats(4); table5.setStatus(RestaurantTable.TableStatus.FREE);
    }

    // ════ createOrder ════════════════════════════════════════════

    @Test @DisplayName("createOrder › table mise en OCCUPIED")
    void createOrder_setsTableOccupied() {
        when(menuRepo.findById(1L)).thenReturn(Optional.of(sandwich));
        when(orderRepo.save(any())).thenReturn(buildOrder(1L, 5, Order.OrderStatus.PENDING));
        when(tableRepo.findByNumber(5)).thenReturn(Optional.of(table5));

        Order r = svc.createOrder(req(5, 1L, 2, null));

        assertThat(r.getId()).isEqualTo(1L);
        verify(tableRepo).save(argThat(t ->
            t.getStatus() == RestaurantTable.TableStatus.OCCUPIED &&
            t.getOccupiedSince() != null));
    }

    @Test @DisplayName("createOrder › article inconnu → RuntimeException")
    void createOrder_unknownItem_throws() {
        when(menuRepo.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> svc.createOrder(req(5, 99L, 1, null)))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("99");
    }

    @Test @DisplayName("createOrder › emporter (table=0) → pas de mise à jour table")
    void createOrder_emporter_noTableUpdate() {
        when(menuRepo.findById(1L)).thenReturn(Optional.of(sandwich));
        when(orderRepo.save(any())).thenReturn(buildOrder(1L, 0, Order.OrderStatus.PENDING));

        svc.createOrder(req(0, 1L, 1, null));

        verify(tableRepo, never()).findByNumber(any());
        verify(tableRepo, never()).save(any());
    }

    @Test @DisplayName("createOrder › plusieurs articles → commande sauvegardée")
    void createOrder_multipleItems_saved() {
        OrderDTO.CreateRequest r = new OrderDTO.CreateRequest();
        r.setTableNumber(3);
        OrderDTO.OrderItemRequest i1 = new OrderDTO.OrderItemRequest();
        i1.setMenuItemId(1L); i1.setQuantity(2);
        OrderDTO.OrderItemRequest i2 = new OrderDTO.OrderItemRequest();
        i2.setMenuItemId(2L); i2.setQuantity(1);
        r.setItems(List.of(i1, i2));

        when(menuRepo.findById(1L)).thenReturn(Optional.of(sandwich));
        when(menuRepo.findById(2L)).thenReturn(Optional.of(boisson));
        when(orderRepo.save(any())).thenReturn(buildOrder(1L, 3, Order.OrderStatus.PENDING));
        when(tableRepo.findByNumber(3)).thenReturn(Optional.of(table5));

        assertThatCode(() -> svc.createOrder(r)).doesNotThrowAnyException();
        verify(orderRepo).save(any());
    }

    @Test @DisplayName("createOrder › note article préservée")
    void createOrder_notePreserved() {
        when(menuRepo.findById(1L)).thenReturn(Optional.of(sandwich));
        when(orderRepo.save(any())).thenReturn(buildOrder(1L, 5, Order.OrderStatus.PENDING));
        when(tableRepo.findByNumber(5)).thenReturn(Optional.of(table5));

        svc.createOrder(req(5, 1L, 1, "sans piment"));

        verify(orderRepo).save(argThat(o ->
            o.getItems() != null &&
            o.getItems().stream().anyMatch(i -> "sans piment".equals(i.getNote()))));
    }

    // ════ sendToKitchen ══════════════════════════════════════════

    @Test @DisplayName("sendToKitchen › PENDING → SENT")
    void sendToKitchen_pendingToSent() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.PENDING);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(o));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        assertThat(svc.sendToKitchen(1L).getStatus()).isEqualTo(Order.OrderStatus.SENT);
    }

    @Test @DisplayName("sendToKitchen › commande inconnue → exception")
    void sendToKitchen_notFound_throws() {
        when(orderRepo.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> svc.sendToKitchen(99L)).isInstanceOf(RuntimeException.class);
    }

    @Test @DisplayName("sendToKitchen › envoie notification WebSocket")
    void sendToKitchen_sendsWebSocketNotification() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.PENDING);
        o.setCreatedAt(LocalDateTime.now());
        when(orderRepo.findById(1L)).thenReturn(Optional.of(o));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        svc.sendToKitchen(1L);

        verify(ws, atLeastOnce()).convertAndSend(anyString(), any(OrderDTO.Response.class));
    }

    // ════ updateStatus ═══════════════════════════════════════════

    @Test @DisplayName("updateStatus › SENT → PREPARING")
    void updateStatus_sentToPreparing() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.SENT);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(o));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        assertThat(svc.updateStatus(1L, Order.OrderStatus.PREPARING).getStatus())
            .isEqualTo(Order.OrderStatus.PREPARING);
    }

    @Test @DisplayName("updateStatus › PREPARING → READY")
    void updateStatus_preparingToReady() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.PREPARING);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(o));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        assertThat(svc.updateStatus(1L, Order.OrderStatus.READY).getStatus())
            .isEqualTo(Order.OrderStatus.READY);
    }

    @Test @DisplayName("updateStatus › READY → SERVED : NE libère PAS la table (séparation cuisine/caisse)")
    void updateStatus_served_neverReleasesTable() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.READY);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(o));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        svc.updateStatus(1L, Order.OrderStatus.SERVED);

        verify(tableRepo, never()).save(any());
        verify(tableRepo, never()).findByNumber(any());
    }

    @Test @DisplayName("updateStatus › CANCELLED : NE libère PAS la table")
    void updateStatus_cancelled_neverReleasesTable() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.SENT);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(o));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        svc.updateStatus(1L, Order.OrderStatus.CANCELLED);

        verify(tableRepo, never()).save(any());
    }

    @Test @DisplayName("updateStatus › commande inconnue → exception")
    void updateStatus_notFound_throws() {
        when(orderRepo.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> svc.updateStatus(99L, Order.OrderStatus.PREPARING))
            .isInstanceOf(RuntimeException.class);
    }

    // ════ payOrder ═══════════════════════════════════════════════

    @Test @DisplayName("payOrder › status=SERVED, paymentMethod et paidAt renseignés")
    void payOrder_setsPaymentInfo() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.READY);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(o));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        Order r = svc.payOrder(1L, "carte");

        assertThat(r.getStatus()).isEqualTo(Order.OrderStatus.SERVED);
        assertThat(r.getPaymentMethod()).isEqualTo("carte");
        assertThat(r.getPaidAt()).isNotNull().isBefore(LocalDateTime.now().plusSeconds(1));
    }

    @Test @DisplayName("payOrder › NE libère PAS la table")
    void payOrder_doesNotReleaseTable() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.READY);
        when(orderRepo.findById(1L)).thenReturn(Optional.of(o));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        svc.payOrder(1L, "especes");

        verify(tableRepo, never()).save(any());
    }

    @Test @DisplayName("payOrder › tous modes de paiement acceptés")
    void payOrder_allMethods() {
        for (String m : List.of("especes", "carte", "cheque", "mixte")) {
            Order o = buildOrder(1L, 5, Order.OrderStatus.READY);
            when(orderRepo.findById(1L)).thenReturn(Optional.of(o));
            when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));
            assertThat(svc.payOrder(1L, m).getPaymentMethod()).isEqualTo(m);
        }
    }

    // ════ payTable ═══════════════════════════════════════════════

    @Test @DisplayName("payTable › toutes commandes actives SERVED + table FREE")
    void payTable_encaissesAllAndReleasesTable() {
        Order o1 = buildOrder(1L, 5, Order.OrderStatus.READY);
        Order o2 = buildOrder(2L, 5, Order.OrderStatus.SENT);
        when(orderRepo.findActiveByTable(5)).thenReturn(List.of(o1, o2));
        when(tableRepo.findByNumber(5)).thenReturn(Optional.of(table5));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        svc.payTable(5, "especes");

        verify(orderRepo, times(2)).save(argThat(o ->
            o.getStatus() == Order.OrderStatus.SERVED &&
            "especes".equals(o.getPaymentMethod()) &&
            o.getPaidAt() != null));
        verify(tableRepo).save(argThat(t ->
            t.getStatus() == RestaurantTable.TableStatus.FREE &&
            t.getOccupiedSince() == null));
    }

    @Test @DisplayName("payTable › aucune commande active → table libérée quand même")
    void payTable_noOrders_stillReleasesTable() {
        when(orderRepo.findActiveByTable(5)).thenReturn(Collections.emptyList());
        when(tableRepo.findByNumber(5)).thenReturn(Optional.of(table5));

        svc.payTable(5, "carte");

        verify(tableRepo).save(argThat(t -> t.getStatus() == RestaurantTable.TableStatus.FREE));
    }

    @Test @DisplayName("payTable › table introuvable → pas d'exception")
    void payTable_tableNotFound_noException() {
        when(orderRepo.findActiveByTable(99)).thenReturn(Collections.emptyList());
        when(tableRepo.findByNumber(99)).thenReturn(Optional.empty());

        assertThatCode(() -> svc.payTable(99, "carte")).doesNotThrowAnyException();
    }

    @Test @DisplayName("payTable › une seule commande → encaissée correctement")
    void payTable_singleOrder_encaissed() {
        Order o = buildOrder(1L, 3, Order.OrderStatus.SERVED);
        when(orderRepo.findActiveByTable(3)).thenReturn(List.of(o));
        when(tableRepo.findByNumber(3)).thenReturn(Optional.of(table5));
        when(orderRepo.save(any())).thenAnswer(i -> i.getArgument(0));

        svc.payTable(3, "mixte");

        verify(orderRepo, times(1)).save(argThat(ord ->
            "mixte".equals(ord.getPaymentMethod())));
    }

    // ════ toResponse ═════════════════════════════════════════════

    @Test @DisplayName("toResponse › calcule total 2 articles")
    void toResponse_correctTotal() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.SENT);
        o.setCreatedAt(LocalDateTime.now());
        o.setItems(List.of(item(1L, sandwich, 2), item(2L, boisson, 1)));

        OrderDTO.Response r = svc.toResponse(o);

        assertThat(r.getTotal()).isEqualTo(15.5); // 2×6 + 1×3.5
        assertThat(r.getItems()).hasSize(2);
        assertThat(r.getTableNumber()).isEqualTo(5);
    }

    @Test @DisplayName("toResponse › items null → total 0 + liste vide")
    void toResponse_nullItems_zero() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.PENDING);
        o.setItems(null);

        OrderDTO.Response r = svc.toResponse(o);

        assertThat(r.getTotal()).isEqualTo(0.0);
        assertThat(r.getItems()).isEmpty();
    }

    @Test @DisplayName("toResponse › statut SERVED préservé")
    void toResponse_statusPreserved() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.SERVED);
        o.setItems(Collections.emptyList());
        o.setCreatedAt(LocalDateTime.now());

        OrderDTO.Response r = svc.toResponse(o);

        assertThat(r.getStatus()).isEqualTo(Order.OrderStatus.SERVED);
        assertThat(r.getTableNumber()).isEqualTo(5);
    }

    @Test @DisplayName("toResponse › quantité ×3 calcul correct")
    void toResponse_quantityMultiplication() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.SENT);
        o.setCreatedAt(LocalDateTime.now());
        o.setItems(List.of(item(1L, sandwich, 3))); // 3 × 6 = 18

        OrderDTO.Response r = svc.toResponse(o);

        assertThat(r.getTotal()).isEqualTo(18.0);
    }

    // ════ getters / listes ═══════════════════════════════════════

    @Test @DisplayName("getActive › retourne les commandes actives")
    void getActive_returnsList() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.SENT);
        o.setItems(new ArrayList<>()); o.setCreatedAt(LocalDateTime.now());
        when(orderRepo.findActiveOrders()).thenReturn(List.of(o));

        assertThat(svc.getActive()).hasSize(1);
        verify(orderRepo).findActiveOrders();
    }

    @Test @DisplayName("getHistory › retourne les commandes SERVED")
    void getHistory_returnsList() {
        Order o = buildOrder(1L, 5, Order.OrderStatus.SERVED);
        o.setItems(new ArrayList<>()); o.setCreatedAt(LocalDateTime.now());
        when(orderRepo.findHistory()).thenReturn(List.of(o));

        assertThat(svc.getHistory()).hasSize(1);
        verify(orderRepo).findHistory();
    }

    @Test @DisplayName("getPendingPayment › retourne les commandes à encaisser")
    void getPendingPayment_returnsList() {
        when(orderRepo.findPendingPayment()).thenReturn(Collections.emptyList());
        assertThat(svc.getPendingPayment()).isEmpty();
    }

    // ════ Helpers ════════════════════════════════════════════════

    private OrderDTO.CreateRequest req(int table, long itemId, int qty, String note) {
        OrderDTO.CreateRequest r = new OrderDTO.CreateRequest();
        r.setTableNumber(table);
        OrderDTO.OrderItemRequest i = new OrderDTO.OrderItemRequest();
        i.setMenuItemId(itemId); i.setQuantity(qty); i.setNote(note);
        r.setItems(List.of(i));
        return r;
    }

    private Order buildOrder(Long id, int table, Order.OrderStatus status) {
        Order o = new Order();
        o.setId(id); o.setTableNumber(table);
        o.setStatus(status); o.setItems(new ArrayList<>());
        return o;
    }

    private OrderItem item(Long id, MenuItem menu, int qty) {
        OrderItem oi = new OrderItem();
        oi.setId(id); oi.setMenuItem(menu); oi.setQuantity(qty);
        return oi;
    }
}
