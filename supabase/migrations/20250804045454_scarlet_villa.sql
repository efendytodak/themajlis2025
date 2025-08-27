/*
  # Create RLS policies for majlis table

  1. Security
    - Enable RLS on `majlis` table
    - Add policy for authenticated users to read all majlis
    - Add policy for authenticated users to insert their own majlis
    - Add policy for authenticated users to update their own majlis
    - Add policy for authenticated users to delete their own majlis
*/

-- Enable RLS on majlis table
ALTER TABLE majlis ENABLE ROW LEVEL SECURITY;

-- Policy for reading all majlis (public access)
CREATE POLICY "Anyone can read majlis"
  ON majlis
  FOR SELECT
  TO public
  USING (true);

-- Policy for authenticated users to insert majlis
CREATE POLICY "Authenticated users can insert majlis"
  ON majlis
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy for users to update their own majlis
CREATE POLICY "Users can update own majlis"
  ON majlis
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy for users to delete their own majlis
CREATE POLICY "Users can delete own majlis"
  ON majlis
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);