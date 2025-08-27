/*
  # Add venue column to majlis table

  1. Changes
    - Add `venue` column to `majlis` table
    - Column type: text (nullable)
    - Purpose: Store the specific name of the venue/place (e.g., mosque name, hall name)

  2. Notes
    - This column is optional (nullable) as indicated in the form validation
    - Allows admins to manually specify venue names separate from addresses
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'majlis' AND column_name = 'venue'
  ) THEN
    ALTER TABLE majlis ADD COLUMN venue text;
  END IF;
END $$;