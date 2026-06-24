package com.restaurant.controller;

import com.restaurant.model.AppUser;
import com.restaurant.model.RefreshToken;
import com.restaurant.repository.AppUserRepository;
import com.restaurant.security.JwtService;
import com.restaurant.service.RefreshTokenService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AppUserRepository   userRepo;
    private final JwtService          jwtService;
    private final RefreshTokenService refreshService;
    private final PasswordEncoder     encoder;

    public AuthController(RefreshTokenService refreshService) {
        this.refreshService = refreshService;
    }

    @SuppressWarnings("unused") static class LoginRequest { private String username; private String password; public String getUsername(){return username;} public void setUsername(String v){this.username=v;} public String getPassword(){return password;} public void setPassword(String v){this.password=v;} }
    static class RefreshRequest { private String refreshToken; public String getRefreshToken(){return refreshToken;} public void setRefreshToken(String v){this.refreshToken=v;} }
    static class RegisterRequest { private String username; private String password; private String role; public String getUsername(){return username;} public void setUsername(String v){this.username=v;} public String getPassword(){return password;} public void setPassword(String v){this.password=v;} public String getRole(){return role;} public void setRole(String v){this.role=v;} }

    // ════════════════════════════════════════════
    //  POST /api/auth/login
    //  Retourne : accessToken (8h) + refreshToken (7j)
    // ════════════════════════════════════════════
    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest req) {
        AppUser user = userRepo.findByUsernameAndActiveTrue(req.getUsername())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Identifiant ou mot de passe incorrect"));

        if (!encoder.matches(req.getPassword(), user.getPassword()))
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Identifiant ou mot de passe incorrect");

        String accessToken = jwtService.generateAccessToken(
            user.getUsername(), user.getRole().name());

        RefreshToken refreshToken = refreshService.createRefreshToken(user);

        return Map.of(
            "accessToken",            accessToken,
            "refreshToken",           refreshToken.getToken(),
            "username",               user.getUsername(),
            "role",                   user.getRole().name(),
            "accessTokenExpiresIn",   28800,     // secondes (8h)
            "refreshTokenExpiresIn",  604800     // secondes (7j)
        );
    }

    // ════════════════════════════════════════════
    //  POST /api/auth/refresh
    //  Renouveler l'access token avec le refresh token
    // ════════════════════════════════════════════
    @PostMapping("/refresh")
    public Map<String, Object> refresh(@RequestBody RefreshRequest req) {
        RefreshToken rt = refreshService.findValid(req.getRefreshToken())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED, "Refresh token invalide ou expiré"));

        AppUser user = rt.getUser();
        String newAccessToken = jwtService.generateAccessToken(
            user.getUsername(), user.getRole().name());

        // Rotation du refresh token (sécurité)
        RefreshToken newRt = refreshService.createRefreshToken(user);

        return Map.of(
            "accessToken",           newAccessToken,
            "refreshToken",          newRt.getToken(),
            "username",              user.getUsername(),
            "role",                  user.getRole().name(),
            "accessTokenExpiresIn",  28800
        );
    }

    // ════════════════════════════════════════════
    //  POST /api/auth/logout
    // ════════════════════════════════════════════
    @PostMapping("/logout")
    public Map<String, String> logout(@RequestBody(required = false) RefreshRequest req) {
        if (req != null && req.getRefreshToken() != null) {
            refreshService.revoke(req.getRefreshToken());
        }
        return Map.of("message", "Déconnecté avec succès");
    }

    // ════════════════════════════════════════════
    //  GET /api/auth/me
    // ════════════════════════════════════════════
    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader("Authorization") String header) {
        String token = header.replace("Bearer ", "");
        if (!jwtService.isValid(token))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalide");
        return Map.of(
            "username",  jwtService.extractUsername(token),
            "role",      jwtService.extractRole(token),
            "expiresAt", jwtService.extractExpiration(token).toString()
        );
    }

    // ════════════════════════════════════════════
    //  CRUD Utilisateurs (Admin)
    // ════════════════════════════════════════════
    @GetMapping("/users")
    public List<Map<String, Object>> getUsers() {
        return userRepo.findAll().stream()
            .map(u -> Map.<String,Object>of(
                "id",       u.getId(),
                "username", u.getUsername(),
                "role",     u.getRole().name(),
                "active",   u.isActive()
            )).toList();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createUser(@RequestBody RegisterRequest req) {
        if (userRepo.existsByUsername(req.getUsername()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cet identifiant existe déjà");
        AppUser.Role role;
        try { role = AppUser.Role.valueOf(req.getRole().toUpperCase()); }
        catch (Exception e) { role = AppUser.Role.SERVEUR; }
        AppUser saved = userRepo.save(AppUser.builder()
            .username(req.getUsername()).password(encoder.encode(req.getPassword()))
            .role(role).active(true).build());
        return Map.of("id", saved.getId(), "username", saved.getUsername(), "role", saved.getRole().name());
    }

    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        AppUser user = userRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        long admins = userRepo.findAll().stream()
            .filter(u -> u.getRole()==AppUser.Role.ADMIN && u.isActive()).count();
        if (user.getRole()==AppUser.Role.ADMIN && admins<=1)
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Impossible de supprimer le dernier admin");
        refreshService.revokeAll(user);
        userRepo.deleteById(id);
    }

    @PatchMapping("/users/{id}/role")
    public Map<String, Object> changeRole(@PathVariable Long id,
                                          @RequestBody Map<String,String> body) {
        AppUser user = userRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        user.setRole(AppUser.Role.valueOf(body.get("role").toUpperCase()));
        userRepo.save(user);
        return Map.of("id", user.getId(), "username", user.getUsername(), "role", user.getRole().name());
    }

    @PatchMapping("/users/{id}/password")
    public Map<String, String> changePassword(@PathVariable Long id,
                                              @RequestBody Map<String,String> body) {
        AppUser user = userRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        user.setPassword(encoder.encode(body.get("password")));
        userRepo.save(user);
        refreshService.revokeAll(user);
        return Map.of("message", "Mot de passe mis à jour");
    }
}
