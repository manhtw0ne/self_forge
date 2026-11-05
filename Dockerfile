# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
# The frontend build verifies every React route is covered by the Spring SPA
# fallback. Copy only that contract into this isolated stage.
COPY src/main/java/com/selfforge/discipline/common/SpaController.java /app/src/main/java/com/selfforge/discipline/common/SpaController.java
RUN npm run lint && npm test && npm run test:account-sync && npm run test:habit-state-history && npm run test:spa-routes && npm run test:coach && npm run test:support && npm run test:native && npm run build

# ============================================
# Stage 2: Build Backend
# ============================================
FROM maven:3.9-eclipse-temurin-21 AS backend-build

WORKDIR /app

# Cache dependencies first
COPY pom.xml ./
RUN mvn dependency:go-offline -B

# Copy source code
COPY src/ ./src/

# Copy frontend build output into Spring Boot static resources
COPY --from=frontend-build /app/frontend/dist/ ./src/main/resources/static/

# Build the JAR
RUN mvn verify -B

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S selfforge && adduser -S selfforge -G selfforge

COPY --from=backend-build /app/target/*.jar app.jar

RUN chown -R selfforge:selfforge /app
USER selfforge

ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

# Reserve memory for metaspace, code cache, threads and native buffers in small containers.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=40.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
