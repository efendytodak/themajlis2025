/*
  # Add Super Admin Role Support

  1. Changes
    - Add super_admin role option to users table
    - Update RLS policies to allow super admins to manage all content
    - Add policy for super admins to view all users

  2. Security
    - Super admins can read/write all majlis
    - Super admins can view all user profiles
    - Regular admins can only manage their own content
*/

-- Add super_admin as a valid role option
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'super_admin'));

-- Update majlis policies for super admin access
DROP POLICY IF EXISTS "Super admins can manage all majlis" ON majlis;
CREATE POLICY "Super admins can manage all majlis"
  ON majlis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Add policy for super admins to view all users
DROP POLICY IF EXISTS "Super admins can read all users" ON users;
CREATE POLICY "Super admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  );

-- Add policy for super admins to update user roles
DROP POLICY IF EXISTS "Super admins can update user roles" ON users;
CREATE POLICY "Super admins can update user roles"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'super_admin'
    )
  );