package com.selfforge.discipline.category;

import com.selfforge.discipline.auth.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "category")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String color; // hex like #4CAF50

    private String icon; // emoji

    @ManyToOne(fetch = FetchType.LAZY)
    private AppUser user; // null = system default

    private Instant createdAt;

    protected Category() {
    }

    public Category(String name, String color, String icon, AppUser user) {
        this.name = name;
        this.color = color;
        this.icon = icon;
        this.user = user;
        this.createdAt = Instant.now();
    }

    public void update(String name, String color, String icon) {
        if (name != null && !name.isBlank()) this.name = name;
        if (color != null) this.color = color;
        if (icon != null) this.icon = icon;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getColor() { return color; }
    public String getIcon() { return icon; }
    public AppUser getUser() { return user; }
    public Instant getCreatedAt() { return createdAt; }

    public boolean isSystemDefault() { return user == null; }
}
