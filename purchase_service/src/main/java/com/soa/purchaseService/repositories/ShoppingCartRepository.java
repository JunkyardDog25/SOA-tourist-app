package com.soa.purchaseService.repositories;

import java.util.Optional;

import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;

import com.soa.purchaseService.models.ShoppingCart;

public interface ShoppingCartRepository extends Neo4jRepository<ShoppingCart, String> {

    @Query("MATCH (c:ShoppingCart {touristId: $touristId}) " +
           "OPTIONAL MATCH (c)-[r:CONTAINS]->(i:OrderItem) " +
           "RETURN c, collect(r), collect(i)")
    Optional<ShoppingCart> findByTouristId(String touristId);

    boolean existsByTouristId(String touristId);

    @Query("MATCH (c:ShoppingCart {touristId: $touristId}) " +
           "CREATE (c)-[:CONTAINS]->(i:OrderItem {id: randomUUID(), tourId: $tourId, tourName: $tourName, price: $price}) " +
           "SET c.totalPrice = c.totalPrice + $price")
    void addItemToCart(String touristId, String tourId, String tourName, double price);

    @Query("MATCH (c:ShoppingCart {touristId: $touristId})-[r:CONTAINS]->(i:OrderItem {tourId: $tourId}) " +
           "SET c.totalPrice = c.totalPrice - i.price " +
           "DELETE r, i")
    void removeItemFromCart(String touristId, String tourId);

    @Query("MATCH (c:ShoppingCart {touristId: $touristId})-[r:CONTAINS]->(i:OrderItem) " +
           "SET c.totalPrice = 0.0 " +
           "DELETE r, i")
    void clearCart(String touristId);
}
