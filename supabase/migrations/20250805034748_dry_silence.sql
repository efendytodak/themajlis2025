/*
  # Add like count to majlis table

  1. Changes
    - Add `like_count` column to `majlis` table with default value of 0
    - Add `liked_by` column to track which users liked each majlis (JSONB array)

  2. Security
    - No RLS changes needed as existing policies will apply
*/

-- Add like_count column to majlis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'majlis' AND column_name = 'like_count'
  ) THEN
    ALTER TABLE majlis ADD COLUMN like_count integer DEFAULT 0;
  END IF;
END $$;

-- Add liked_by column to track which users liked each majlis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'majlis' AND column_name = 'liked_by'
  ) THEN
    ALTER TABLE majlis ADD COLUMN liked_by jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;