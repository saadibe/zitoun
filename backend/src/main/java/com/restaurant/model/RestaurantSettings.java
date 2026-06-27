package com.restaurant.model;
import jakarta.persistence.*;

@Entity
@Table(name="restaurant_settings")
public class RestaurantSettings {
    @Id private Long id = 1L;

    @Column(nullable=false, length=100) private String name     = "La Perla";
    @Column(length=150) private String subtitle  = "Saveurs Authentiques de Tunisie";
    @Column(length=100) private String city      = "Tunisie";
    @Column(length=10)  private String icon      = "🌶️";
    @Column(length=10)  private String currency  = "DT";
    @Column(name="tva_rate") private Double tvaRate  = 10.0;
    @Column(name="theme", length=20) private String theme = "vert";
    @Column(name="menu_price") private Double menuPrice = 2.0;

    // Nouvelles infos ticket
    @Column(length=200) private String address   = "";   // ex: 4 rue Simone Veil
    @Column(length=20)  private String phone     = "";   // ex: 0960411470
    @Column(length=100) private String email     = "";   // ex: contact@laperla.fr
    @Column(name="tax_number", length=50)  private String taxNumber  = ""; // SIRET ou Matricule fiscal
    @Column(name="tva_number", length=50)  private String tvaNumber  = ""; // numéro TVA intracommunautaire
    @Column(length=20)  private String nafCode   = "";   // code NAF/APE
    @Column(name="legal_name", length=150) private String legalName  = ""; // raison sociale
    @Column(name="ticket_footer", length=300) private String ticketFooter = "Merci de votre visite"; // pied de ticket personnalisable

    public RestaurantSettings() {}

    public Long getId()           { return id; }
    public void setId(Long v)     { this.id = v; }
    public String getName()       { return name; }
    public void setName(String v) { this.name = v; }
    public String getSubtitle()   { return subtitle; }
    public void setSubtitle(String v) { this.subtitle = v; }
    public String getCity()       { return city; }
    public void setCity(String v) { this.city = v; }
    public String getIcon()       { return icon; }
    public void setIcon(String v) { this.icon = v; }
    public String getCurrency()   { return currency; }
    public void setCurrency(String v) { this.currency = v; }
    public Double getTvaRate()    { return tvaRate; }
    public void setTvaRate(Double v) { this.tvaRate = v; }
    public String getTheme()      { return theme; }
    public void setTheme(String v) { this.theme = v; }
    public Double getMenuPrice()  { return menuPrice; }
    public void setMenuPrice(Double v) { this.menuPrice = v; }
    // Nouvelles infos
    public String getAddress()    { return address; }
    public void setAddress(String v) { this.address = v; }
    public String getPhone()      { return phone; }
    public void setPhone(String v) { this.phone = v; }
    public String getEmail()      { return email; }
    public void setEmail(String v) { this.email = v; }
    public String getTaxNumber()  { return taxNumber; }
    public void setTaxNumber(String v) { this.taxNumber = v; }
    public String getTvaNumber()  { return tvaNumber; }
    public void setTvaNumber(String v) { this.tvaNumber = v; }
    public String getNafCode()    { return nafCode; }
    public void setNafCode(String v) { this.nafCode = v; }
    public String getLegalName()  { return legalName; }
    public void setLegalName(String v) { this.legalName = v; }
    public String getTicketFooter() { return ticketFooter; }
    public void setTicketFooter(String v) { this.ticketFooter = v; }
}
