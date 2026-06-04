package com.restaurant.controller;

import com.restaurant.model.AppUser;
import com.restaurant.repository.AppUserRepository;
import com.restaurant.security.JwtService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AppUserRepository userRepo;
    private final JwtService jwtService;
    private final PasswordEncoder encoder;

    // ── DTO ──────────────────────────────────────
    @Data
    static class LoginRequest {
        String username;
        String password;
    }

    @Data
    static class RegisterRequest {
        String username;
        String password;
        String role;
    }

    // ── POST /api/auth/login ─────────────────────
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest req) {
        AppUser user = userRepo.findByUsernameAndActiveTrue(req.getUsername())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Identifiant ou mot de passe incorrect"));

        if (!encoder.matches(req.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Identifiant ou mot de passe incorrect");
        }

        String token = jwtService.generateToken(user.getUsername(), user.getRole().name());

        return Map.of(
            "token",    token,
            "username", user.getUsername(),
            "role",     user.getRole().name(),
            "expiresIn", 28800   // 8 heures en secondes
        );
    }

    // ── GET /api/auth/me ─────────────────────────
    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return Map.of(
            "username", jwtService.extractUsername(token),
            "role",     jwtService.extractRole(token),
            "valid",    jwtService.isValid(token)
        );
    }

    // ── GET /api/auth/users (Admin) ──────────────
    @GetMapping("/users")
    public List<Map<String, Object>> getUsers() {
        return userRepo.findAll().stream()
            .map(u -> Map.<String, Object>of(
                "id",       u.getId(),
                "username", u.getUsername(),
                "role",     u.getRole().name(),
                "active",   u.isActive()
            )).toList();
    }

    // ── POST /api/auth/users (Admin) ─────────────
    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createUser(@RequestBody RegisterRequest req) {
        if (userRepo.existsByUsername(req.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Cet identifiant existe déjà");
        }
        AppUser.Role role;
        try { role = AppUser.Role.valueOf(req.getRole().toUpperCase()); }
        catch (Exception e) { role = AppUser.Role.SERVEUR; }

        AppUser user = userRepo.save(AppUser.builder()
            .username(req.getUsername())
            .password(encoder.encode(req.getPassword()))
            .role(role).active(true).build());

        return Map.of("id", user.getId(), "username", user.getUsername(), "role", user.getRole().name());
    }

    // ── DELETE /api/auth/users/{id} (Admin) ──────
    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        AppUser user = userRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        // Ne pas supprimer le dernier admin
        long adminCount = userRepo.findAll().stream()
            .filter(u -> u.getRole() == AppUser.Role.ADMIN && u.isActive()).count();
        if (user.getRole() == AppUser.Role.ADMIN && adminCount <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Impossible de supprimer le dernier compte admin");
        }
        userRepo.deleteById(id);
    }

    // ── PATCH /api/auth/users/{id}/password ──────
    @PatchMapping("/users/{id}/password")
    public Map<String, String> changePassword(@PathVariable Long id,
                                              @RequestBody Map<String, String> body) {
        AppUser user = userRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        user.setPassword(encoder.encode(body.get("password")));
        userRepo.save(user);
        return Map.of("message", "Mot de passe mis à jour");
    }
}
