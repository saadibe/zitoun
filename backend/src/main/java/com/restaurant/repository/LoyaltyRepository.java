package com.restaurant.repository;
import com.restaurant.model.LoyaltyCustomer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface LoyaltyRepository extends JpaRepository<LoyaltyCustomer, Long> {
    Optional<LoyaltyCustomer> findByPhone(String phone);
    @Query("SELECT c FROM LoyaltyCustomer c ORDER BY c.visits DESC")
    List<LoyaltyCustomer> findAllByVisitsDesc();
    @Query("SELECT c FROM LoyaltyCustomer c WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :q, '%')) OR c.phone LIKE CONCAT('%', :q, '%')")
    List<LoyaltyCustomer> search(String q);
}
