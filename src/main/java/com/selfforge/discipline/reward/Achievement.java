package com.selfforge.discipline.reward;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "achievement")
public class Achievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    private String description;

    private int xpReward;

    private String iconEmoji;

    protected Achievement() {
    }

    public Achievement(String code, String name, String description, int xpReward, String iconEmoji) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.xpReward = xpReward;
        this.iconEmoji = iconEmoji;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public int getXpReward() {
        return xpReward;
    }

    public String getIconEmoji() {
        return iconEmoji;
    }
}
