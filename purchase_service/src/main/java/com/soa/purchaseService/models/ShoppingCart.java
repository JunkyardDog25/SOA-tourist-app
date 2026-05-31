package com.soa.purchaseService.models;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.neo4j.core.schema.GeneratedValue;
import org.springframework.data.neo4j.core.schema.Id;
import org.springframework.data.neo4j.core.schema.Node;
import org.springframework.data.neo4j.core.schema.Relationship;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Node("ShoppingCart")
@NoArgsConstructor
public class ShoppingCart {

    @Id
    @GeneratedValue
    private String id;

    private String touristId;
    
    private double totalPrice;

    @Relationship(type = "CONTAINS", direction = Relationship.Direction.OUTGOING)
    private List<OrderItem> items = new ArrayList<>();
}
