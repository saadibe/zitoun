package com.restaurant.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter             jwtFilter;
    private final OAuth2SuccessHandler  oauth2SuccessHandler;
    private final OAuth2FailureHandler  oauth2FailureHandler;

    @Value("${frontend.url:https://zitoun-pos-frontend.onrender.com}")
    private String frontendUrl;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(c -> c.configurationSource(corsSource()))

            // Stateless pour les appels API — OAuth2 a besoin d'une session temporaire
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))

            .authorizeHttpRequests(auth -> auth
                // ── Public ──────────────────────────────
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/auth/oauth2/**").permitAll()
                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/menu").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/tables").permitAll()
                // ── Cuisine ─────────────────────────────
                .requestMatchers("/api/orders/active").hasAnyRole("CUISINE","ADMIN","SERVEUR","CAISSE")
                .requestMatchers(org.springframework.http.HttpMethod.PATCH, "/api/orders/*/status")
                    .hasAnyRole("CUISINE","ADMIN")
                // ── Admin uniquement ────────────────────
                .requestMatchers("/api/menu/**").hasAnyRole("ADMIN")
                .requestMatchers("/api/settings/**").hasAnyRole("ADMIN")
                .requestMatchers("/api/auth/users/**").hasAnyRole("ADMIN")
                // ── Tout le reste : authentifié ──────────
                .anyRequest().authenticated()
            )

            // ── OAuth2 Login ────────────────────────────
            .oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(a ->
                    a.baseUri("/api/auth/oauth2/authorize"))
                .redirectionEndpoint(r ->
                    r.baseUri("/api/auth/oauth2/callback/*"))
                .successHandler(oauth2SuccessHandler)
                .failureHandler(oauth2FailureHandler)
            )

            // ── JWT filter pour les appels API ──────────
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)

            .headers(h -> h.frameOptions(f -> f.disable()));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
