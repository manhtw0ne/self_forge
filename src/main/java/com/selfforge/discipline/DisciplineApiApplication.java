package com.selfforge.discipline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DisciplineApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(DisciplineApiApplication.class, args);
    }
}
