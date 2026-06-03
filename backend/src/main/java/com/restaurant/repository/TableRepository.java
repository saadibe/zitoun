package com.restaurant.repository;
import com.restaurant.model.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface TableRepository extends JpaRepository<RestaurantTable,Long> {
    List<RestaurantTable> findAllByOrderByNumberAsc();
    Optional<RestaurantTable> findByNumber(Integer number);
}
