package com.restaurant.security;

import com.restaurant.model.AppUser;
import com.restaurant.repository.AppUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtService jwtService;
    private final AppUserRepository userRepo;
    private final PasswordEncoder encoder;

    @Value("${frontend.url:https://zitoun-pos-frontend.onrender.com}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();

        // Extraire email depuis Google ou GitHub
        String email = oauthUser.getAttribute("email");
        String name  = oauthUser.getAttribute("name");
        if (email == null) {
            // GitHub peut retourner null pour email public
            email = oauthUser.getAttribute("login") + "@github.local";
        }
        if (name == null) name = email.split("@")[0];

        final String finalEmail = email.toLowerCase();
        final String finalName  = name;

        // Chercher ou créer l'utilisateur
        AppUser user = userRepo.findByUsernameAndActiveTrue(finalEmail)
            .orElseGet(() -> {
                // Premier login OAuth2 → créer compte SERVEUR par défaut
                // L'admin peut ensuite changer le rôle
                log.info("Nouvel utilisateur OAuth2 : {}", finalEmail);
                return userRepo.save(AppUser.builder()
                    .username(finalEmail)
                    .password(encoder.encode(UUID.randomUUID().toString())) // mot de passe inutilisé
                    .role(AppUser.Role.SERVEUR)
                    .active(true)
                    .build());
            });

        if (!user.isActive()) {
            response.sendRedirect(frontendUrl + "?error=account_disabled");
            return;
        }

        // Générer le JWT
        String token = jwtService.generateToken(user.getUsername(), user.getRole().name());
        log.info("OAuth2 login OK: {} ({})", user.getUsername(), user.getRole());

        // Rediriger vers le frontend avec le token
        response.sendRedirect(frontendUrl + "?token=" + token
            + "&username=" + encode(user.getUsername())
            + "&role=" + user.getRole().name());
    }

    private String encode(String s) {
        try { return java.net.URLEncoder.encode(s, "UTF-8"); }
        catch (Exception e) { return s; }
    }
}
