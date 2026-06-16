package com.restaurant.dto;
import com.restaurant.model.Order;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;

public class OrderDTO {
    @Data public static class CreateRequest {
        @NotNull @Min(0) private Integer tableNumber;
        @NotEmpty private List<OrderItemRequest> items;
        private String serverName;
    }
    @Data public static class OrderItemRequest {
        @NotNull private Long menuItemId;
        @Min(1) private Integer quantity;
        private String note;
    }
    @Data public static class StatusUpdate {
        @NotNull private Order.OrderStatus status;
    }
    // Nouvel objet pour encaissement
    @Data public static class PayRequest {
        @NotNull private String paymentMethod;  // especes, carte, cheque, mixte
    }
    @Data @Builder public static class Response {
        private Long id;
        private Integer tableNumber;
        private Order.OrderStatus status;
        private String serverName;
        private String paymentMethod;
        private String paidAt;
        private List<ItemResponse> items;
        private String createdAt;
        private String updatedAt;
        private Double total;
    }
    @Data @Builder public static class ItemResponse {
        private Long id;
        private String name;
        private String emoji;
        private Double price;
        private Integer quantity;
        private String note;
    }
}
