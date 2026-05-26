# syntax=docker/dockerfile:1
# Render 등: Root Directory = backend, 환경변수는 대시보드에서 주입 (DB, JWT, PORT 등)

FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -B -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

RUN groupadd -r app && useradd -r -g app -u 10001 app
COPY --from=build /app/target/server-0.0.1-SNAPSHOT.jar app.jar
RUN chown app:app app.jar

USER app
ENV SPRING_PROFILES_ACTIVE=prod
# Render가 PORT를 주입하면 application.yaml의 server.port=${PORT:8080} 사용
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
