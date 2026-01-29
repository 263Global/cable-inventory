ALTER TABLE inventory ADD COLUMN base_om_rate DECIMAL(5, 2);
ALTER TABLE inventory_batches ADD COLUMN om_rate DECIMAL(5, 2);
