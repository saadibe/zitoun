package com.restaurant.repository;

import com.restaurant.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findAllByActiveTrueOrderBySortOrderAsc();
    boolean existsByCode(String code);
}
