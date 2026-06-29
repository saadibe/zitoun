package com.restaurant.dto;
import com.restaurant.model.Order;
import jakarta.validation.constraints.*;
import java.util.List;

public class OrderDTO {

    public static class CreateRequest {
        @NotNull @Min(0) private Integer tableNumber;
        @NotEmpty private List<OrderItemRequest> items;
        private String serverName;
        public Integer getTableNumber() { return tableNumber; }
        public void setTableNumber(Integer v) { this.tableNumber = v; }
        public List<OrderItemRequest> getItems() { return items; }
        public void setItems(List<OrderItemRequest> v) { this.items = v; }
        public String getServerName() { return serverName; }
        public void setServerName(String v) { this.serverName = v; }
    }

    public static class OrderItemRequest {
        @NotNull private Long menuItemId;
        @Min(1) private Integer quantity;
        private String note;
        private Double unitPrice;
        public Long getMenuItemId() { return menuItemId; }
        public void setMenuItemId(Long v) { this.menuItemId = v; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer v) { this.quantity = v; }
        public String getNote() { return note; }
        public void setNote(String v) { this.note = v; }
        public Double getUnitPrice() { return unitPrice; }
        public void setUnitPrice(Double v) { this.unitPrice = v; }
    }

    public static class StatusUpdate {
        @NotNull private Order.OrderStatus status;
        public Order.OrderStatus getStatus() { return status; }
        public void setStatus(Order.OrderStatus v) { this.status = v; }
    }

    public static class PayRequest {
        private String paymentMethod;
        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String v) { this.paymentMethod = v; }
    }

    public static class Response {
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
        private Integer dailyTicketNumber;
        private String globalNote;
        private String cancelledReason;

        public Integer getDailyTicketNumber() { return dailyTicketNumber; }
        public String getGlobalNote() { return globalNote; }
        public String getCancelledReason() { return cancelledReason; }
        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private Response r = new Response();
            public Builder id(Long v)                    { r.id = v; return this; }
            public Builder tableNumber(Integer v)        { r.tableNumber = v; return this; }
            public Builder status(Order.OrderStatus v)   { r.status = v; return this; }
            public Builder serverName(String v)          { r.serverName = v; return this; }
            public Builder paymentMethod(String v)       { r.paymentMethod = v; return this; }
            public Builder paidAt(String v)              { r.paidAt = v; return this; }
            public Builder items(List<ItemResponse> v)   { r.items = v; return this; }
            public Builder createdAt(String v)           { r.createdAt = v; return this; }
            public Builder updatedAt(String v)           { r.updatedAt = v; return this; }
            public Builder total(Double v)               { r.total = v; return this; }
            public Response build()                      { return r; }
        }
        public Long getId() { return id; }
        public Integer getTableNumber() { return tableNumber; }
        public Order.OrderStatus getStatus() { return status; }
        public String getServerName() { return serverName; }
        public String getPaymentMethod() { return paymentMethod; }
        public String getPaidAt() { return paidAt; }
        public List<ItemResponse> getItems() { return items; }
        public String getCreatedAt() { return createdAt; }
        public String getUpdatedAt() { return updatedAt; }
        public Double getTotal() { return total; }
    }

    public static class ItemResponse {
        private Long id;
        private String name;
        private String emoji;
        private Double price;
        private Integer quantity;
        private String note;

        public Integer getDailyTicketNumber() { return dailyTicketNumber; }
        public String getGlobalNote() { return globalNote; }
        public String getCancelledReason() { return cancelledReason; }
        public static Builder builder() { return new Builder(); }
        public static class Builder {
            private ItemResponse r = new ItemResponse();
            public Builder id(Long v)       { r.id = v; return this; }
            public Builder name(String v)   { r.name = v; return this; }
            public Builder emoji(String v)  { r.emoji = v; return this; }
            public Builder price(Double v)  { r.price = v; return this; }
            public Builder quantity(Integer v) { r.quantity = v; return this; }
            public Builder note(String v)   { r.note = v; return this; }
            public ItemResponse build()     { return r; }
        }
        public Long getId() { return id; }
        public String getName() { return name; }
        public String getEmoji() { return emoji; }
        public Double getPrice() { return price; }
        public Integer getQuantity() { return quantity; }
        public String getNote() { return note; }
    }
}
