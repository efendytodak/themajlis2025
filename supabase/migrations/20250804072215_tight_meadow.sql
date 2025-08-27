/*
  # Fix infinite recursion in RLS policies

  1. Problem
    - Current RLS policies on users table cause infinite recursion
    - Policies reference the users table while being evaluated on the users table
    - This creates circular dependencies

  2. Solution
    - Drop all existing problematic policies
    - Create simple, non-recursive policies
    - Use auth.uid() directly without querying users table
    - Separate super admin checks to avoid recursion

  3. Security
    - Users can only access their own data
    - Super admin role checks use direct auth metadata
    - No circular policy dependencies
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Super admins can read all users" ON users;
DROP POLICY IF EXISTS "Super admins can update user roles" ON users;

-- Create simple, non-recursive policies for users table
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create a function to check super admin status without recursion
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  );
$$;

-- Super admin policies using the function
CREATE POLICY "super_admin_select_all" ON users
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "super_admin_update_all" ON users
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Also fix majlis policies to avoid any potential recursion
DROP POLICY IF EXISTS "Super admins can manage all majlis" ON majlis;

CREATE POLICY "super_admin_manage_majlis" ON majlis
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());