# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./
RUN npm run build

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

EXPOSE 8080

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
