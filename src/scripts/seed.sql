INSERT INTO hotels (id, ostrovok_hid, ostrovok_id, name, normalized_name, slug, country, city, address, stars, description, amenities, status, source, last_synced_at, last_seen_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), 8526976, 'test_hotel', 'Гранд-Отель Метрополь', 'гранд-отель метрополь', 'grand-hotel-metropol', 'Россия', 'Москва', 'Театральный проезд, 2', 5, 'Легендарный отель в центре Москвы.', '["Бассейн","Спа","Wi-Fi"]'::jsonb, 'ACTIVE', 'seed', now(), now(), now(), now());
