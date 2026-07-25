/*
# Admin user management permissions

1. Changes
   - Adds a helper function `is_admin()` that safely checks whether the currently
     signed-in user has the 'admin' role and is active. It is SECURITY DEFINER so
     it can read the profiles table without triggering recursive RLS checks.
   - Replaces the `profiles_update` policy so that a user can update their own
     profile OR an active admin can update any profile (needed for the admin
     "Edit User" and "Activate/Deactivate" actions, which previously failed
     silently for other users).
   - Replaces the `profiles_delete` policy so that only an active admin can
     delete a profile, and never their own (prevents self-lockout).

2. Security
   - RLS remains enabled on profiles.
   - Non-admin users keep exactly the same access as before (read all, edit own).
   - Admin checks are based on the profiles.role column, evaluated server-side.

3. Notes
   - No tables, columns, or data are modified — policy changes only.
*/

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  TO authenticated
  USING (is_admin() AND id <> auth.uid());
