INSERT INTO menu_item (name, price, category, emoji, available)
SELECT * FROM (VALUES
  ('Salade César',12.0,'ENTREE','🥗',true),
  ('Soupe a l oignon',9.0,'ENTREE','🍲',true),
  ('Tartare de saumon',15.0,'ENTREE','🐟',true),
  ('Brik a l oeuf',7.0,'ENTREE','🥚',true),
  ('Chorba tunisienne',8.0,'ENTREE','🍵',true),
  ('Steak frites',24.0,'PLAT','🥩',true),
  ('Poulet roti',19.0,'PLAT','🍗',true),
  ('Pates carbonara',17.0,'PLAT','🍝',true),
  ('Couscous agneau',22.0,'PLAT','🫕',true),
  ('Saumon grille',25.0,'PLAT','🐠',true),
  ('Creme brulee',8.0,'DESSERT','🍮',true),
  ('Fondant chocolat',9.0,'DESSERT','🍫',true),
  ('Makroudh',6.0,'DESSERT','🍯',true),
  ('Eau minerale',2.5,'BOISSON','💧',true),
  ('Vin rouge verre',6.0,'BOISSON','🍷',true),
  ('Biere pression',5.0,'BOISSON','🍺',true),
  ('Cafe',2.5,'BOISSON','☕',true),
  ('The a la menthe',3.0,'BOISSON','🫖',true)
) AS v(name,price,category,emoji,available)
WHERE NOT EXISTS (SELECT 1 FROM menu_item LIMIT 1);

INSERT INTO restaurant_table(number,seats,status)
SELECT * FROM (VALUES
  (1,2,'FREE'),(2,4,'FREE'),(3,4,'FREE'),(4,6,'FREE'),(5,2,'FREE'),
  (6,4,'FREE'),(7,4,'FREE'),(8,8,'FREE'),(9,2,'FREE'),(10,4,'FREE')
) AS v(number,seats,status)
WHERE NOT EXISTS (SELECT 1 FROM restaurant_table LIMIT 1);
