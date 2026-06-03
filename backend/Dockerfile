# ═══════════════════════════════════════
#  Dockerfile — Café Sidi Bou Backend
#  Multi-stage : build Maven → JRE Alpine
# ═══════════════════════════════════════

# Étape 1 : Build Maven
FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Copier pom.xml et télécharger les dépendances (cache Docker)
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copier les sources et builder
COPY src ./src
RUN mvn clean package -DskipTests -q

# Étape 2 : Image finale légère
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copier le JAR
COPY --from=builder /app/target/*.jar app.jar

# Port Render
EXPOSE 8080

# Démarrage
ENTRYPOINT ["java", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
