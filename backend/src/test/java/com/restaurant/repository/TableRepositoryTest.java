package com.restaurant.repository;

import com.restaurant.model.RestaurantTable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("TableRepository — Tests Repository")
class TableRepositoryTest {

    @Autowired TableRepository tableRepo;

    @BeforeEach
    void setUp() { tableRepo.deleteAll(); }

    @Test @DisplayName("findByNumber › retrouve une table par numéro")
    void findByNumber_existing() {
        tableRepo.save(table(1, RestaurantTable.TableStatus.FREE));

        Optional<RestaurantTable> result = tableRepo.findByNumber(1);

        assertThat(result).isPresent();
        assertThat(result.get().getNumber()).isEqualTo(1);
    }

    @Test @DisplayName("findByNumber › table inconnue → vide")
    void findByNumber_unknown_empty() {
        assertThat(tableRepo.findByNumber(99)).isEmpty();
    }

    @Test @DisplayName("findAllByOrderByNumberAsc › triées par numéro croissant")
    void findAllByOrderByNumberAsc_sorted() {
        tableRepo.save(table(5, RestaurantTable.TableStatus.FREE));
        tableRepo.save(table(2, RestaurantTable.TableStatus.OCCUPIED));
        tableRepo.save(table(8, RestaurantTable.TableStatus.FREE));

        List<RestaurantTable> tables = tableRepo.findAllByOrderByNumberAsc();

        assertThat(tables).extracting(RestaurantTable::getNumber)
            .containsExactly(2, 5, 8);
    }

    @Test @DisplayName("save › persiste les changements de statut")
    void save_persistsStatusChange() {
        RestaurantTable t = tableRepo.save(table(3, RestaurantTable.TableStatus.FREE));

        t.setStatus(RestaurantTable.TableStatus.OCCUPIED);
        t.setOccupiedSince(LocalDateTime.now());
        tableRepo.save(t);

        RestaurantTable found = tableRepo.findByNumber(3).orElseThrow();
        assertThat(found.getStatus()).isEqualTo(RestaurantTable.TableStatus.OCCUPIED);
        assertThat(found.getOccupiedSince()).isNotNull();
    }

    @Test @DisplayName("save › libération table → status FREE, occupiedSince null")
    void save_releaseTable() {
        RestaurantTable t = tableRepo.save(table(4, RestaurantTable.TableStatus.OCCUPIED));
        t.setOccupiedSince(LocalDateTime.now());
        tableRepo.save(t);

        t.setStatus(RestaurantTable.TableStatus.FREE);
        t.setOccupiedSince(null);
        t.setCurrentOrderId(null);
        tableRepo.save(t);

        RestaurantTable found = tableRepo.findByNumber(4).orElseThrow();
        assertThat(found.getStatus()).isEqualTo(RestaurantTable.TableStatus.FREE);
        assertThat(found.getOccupiedSince()).isNull();
    }

    private RestaurantTable table(int number, RestaurantTable.TableStatus status) {
        RestaurantTable t = new RestaurantTable();
        t.setNumber(number); t.setSeats(4); t.setStatus(status);
        return t;
    }
}
