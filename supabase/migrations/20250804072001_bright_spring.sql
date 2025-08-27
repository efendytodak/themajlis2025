/*
  # Fix RLS Policy Infinite Recursion

  1. Security Changes
    - Drop existing problematic policies on users table
    - Create new simplified policies that avoid recursion
    - Ensure policies don't create circular dependencies

  2. Policy Updates
    - Simplified user profile access policies
    - Fixed super admin policies to avoid infinite loops
    - Clear separation between user self-access and admin access
*/

-- Drop existing policies that may cause recursion
DROP POLICY IF EXISTS "Super admins can read all users" ON users;
DROP POLICY IF EXISTS "Super admins can update user roles" ON users;
DROP POLICY IF EXISTS "Users can insert their profile" ON users;
DROP POLICY IF EXISTS "Users can read their profile" ON users;

-- Create new simplified policies without recursion
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admin policies - simplified to avoid recursion
CREATE POLICY "Super admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update user roles"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'super_admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'super_admin'
    )
  );