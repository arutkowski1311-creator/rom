-- Add route_image column to mileage_trips for storing exported map screenshots
ALTER TABLE mileage_trips ADD COLUMN IF NOT EXISTS route_image TEXT;
