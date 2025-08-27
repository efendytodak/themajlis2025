/*
  # Add location coordinates to majlis table

  1. New Columns
    - `latitude` (double precision) - Latitude coordinate of the majlis location
    - `longitude` (double precision) - Longitude coordinate of the majlis location

  2. Changes
    - Add latitude and longitude columns to store precise geographical coordinates
    - These will enable proximity-based filtering for location-aware majlis discovery

  3. Notes
    - Coordinates will be populated when users select locations via Google Places API
    - Existing majlis without coordinates will have NULL values (handled gracefully in the app)
*/

-- Add latitude and longitude columns to majlis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'majlis' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE majlis ADD COLUMN latitude double precision;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'majlis' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE majlis ADD COLUMN longitude double precision;
  END IF;
END $$;