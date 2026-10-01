-- =============================================================================
-- UPCOM — 012 · Rôle « observateur » (viewer), étape 1/2
-- -----------------------------------------------------------------------------
-- Lecture seule pour la supervision (ex. dirigeante) : voit tous les contenus
-- (brouillons compris, comme tout membre actif) ainsi que les devis et
-- messages, sans rien pouvoir modifier.
--
-- Une nouvelle valeur d'enum ne peut pas être utilisée dans la transaction qui
-- la crée : les permissions sont attribuées dans la migration suivante.
-- =============================================================================

alter type public.app_role add value if not exists 'viewer';
