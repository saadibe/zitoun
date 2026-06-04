package com.restaurant.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(c -> c.configurationSource(corsSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // OPTIONS preflight toujours permis
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Auth endpoints publics — AntPathRequestMatcher ignore les query params
                .requestMatchers(new AntPathRequestMatcher("/api/auth/login")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/auth/refresh")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/auth/logout")).permitAll()
                // H2 console
                .requestMatchers(new AntPathRequestMatcher("/h2-console/**")).permitAll()
                // Lecture publique
                .requestMatchers(new AntPathRequestMatcher("/api/menu", "GET")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/tables", "GET")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/settings", "GET")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/settings/categories", "GET")).permitAll()
                // Cuisine
                .requestMatchers("/api/orders/active").hasAnyRole("CUISINE","ADMIN","SERVEUR","CAISSE")
                .requestMatchers(new AntPathRequestMatcher("/api/orders/*/status","PATCH")).hasAnyRole("CUISINE","ADMIN")
                // Admin seulement
                .requestMatchers(new AntPathRequestMatcher("/api/menu/**","POST")).hasRole("ADMIN")
                .requestMatchers(new AntPathRequestMatcher("/api/menu/**","PUT")).hasRole("ADMIN")
                .requestMatchers(new AntPathRequestMatcher("/api/menu/**","DELETE")).hasRole("ADMIN")
                .requestMatchers(new AntPathRequestMatcher("/api/menu/**","PATCH")).hasRole("ADMIN")
                .requestMatchers(new AntPathRequestMatcher("/api/settings/**","PUT")).hasRole("ADMIN")
                .requestMatchers(new AntPathRequestMatcher("/api/settings/**","POST")).hasRole("ADMIN")
                .requestMatchers(new AntPathRequestMatcher("/api/settings/**","DELETE")).hasRole("ADMIN")
                .requestMatchers("/api/auth/users/**").hasRole("ADMIN")
                // Tout le reste : authentifié
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .headers(h -> h.frameOptions(f -> f.disable()));

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(Arrays.asList("GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(false);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
