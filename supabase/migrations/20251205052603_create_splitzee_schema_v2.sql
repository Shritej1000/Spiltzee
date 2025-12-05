/*
  # Splitzee Database Schema

  ## Overview
  Complete database schema for Splitzee - Smart Expense Tracker & Bill Splitter

  ## New Tables

  1. **user_profiles** - Extended user information
  2. **expense_categories** - Predefined expense categories
  3. **expenses** - Personal expense tracking
  4. **groups** - Bill splitting groups
  5. **group_members** - Group membership tracking
  6. **group_expenses** - Shared expenses within groups
  7. **expense_splits** - Individual split amounts per user
  8. **settlements** - Payment settlement records

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Group members can view and manage group data
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  avatar_url text,
  currency text DEFAULT 'INR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expense_categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  is_default boolean DEFAULT true
);

-- Insert default categories
INSERT INTO expense_categories (name, icon, color, is_default) VALUES
  ('Groceries', 'ShoppingCart', '#10b981', true),
  ('Food & Dining', 'UtensilsCrossed', '#f59e0b', true),
  ('Travel', 'Car', '#3b82f6', true),
  ('Shopping', 'ShoppingBag', '#ec4899', true),
  ('Bills & Utilities', 'FileText', '#ef4444', true),
  ('Entertainment', 'Film', '#8b5cf6', true),
  ('Healthcare', 'Heart', '#14b8a6', true),
  ('Education', 'GraduationCap', '#6366f1', true),
  ('Miscellaneous', 'Package', '#6b7280', true)
ON CONFLICT DO NOTHING;

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  category_id uuid REFERENCES expense_categories(id) NOT NULL,
  payment_method text NOT NULL,
  expense_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('trip', 'event', 'home', 'office', 'other')),
  created_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  added_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_expenses table
CREATE TABLE IF NOT EXISTS group_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  paid_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  category_id uuid REFERENCES expense_categories(id) NOT NULL,
  expense_date timestamptz DEFAULT now(),
  notes text,
  split_type text NOT NULL CHECK (split_type IN ('equal', 'unequal', 'percentage', 'shares')),
  created_at timestamptz DEFAULT now()
);

-- Create expense_splits table
CREATE TABLE IF NOT EXISTS expense_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_expense_id uuid REFERENCES group_expenses(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount >= 0),
  percentage decimal(5, 2),
  shares integer,
  is_settled boolean DEFAULT false
);

-- Create settlements table
CREATE TABLE IF NOT EXISTS settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  payer_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  payee_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  payment_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for expense_categories
CREATE POLICY "Everyone can view categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for expenses
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for groups
CREATE POLICY "Group members can view groups"
  ON groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update groups"
  ON groups FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can delete groups"
  ON groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for group_members
CREATE POLICY "Group members can view members"
  ON group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can add members"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove themselves from groups"
  ON group_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = added_by);

-- RLS Policies for group_expenses
CREATE POLICY "Group members can view group expenses"
  ON group_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can add group expenses"
  ON group_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_expenses.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Expense payers can update their expenses"
  ON group_expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = paid_by)
  WITH CHECK (auth.uid() = paid_by);

CREATE POLICY "Expense payers can delete their expenses"
  ON group_expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = paid_by);

-- RLS Policies for expense_splits
CREATE POLICY "Users can view splits in their groups"
  ON expense_splits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE ge.id = expense_splits.group_expense_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create splits"
  ON expense_splits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE ge.id = expense_splits.group_expense_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update splits"
  ON expense_splits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE ge.id = expense_splits.group_expense_id
      AND gm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_expenses ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE ge.id = expense_splits.group_expense_id
      AND gm.user_id = auth.uid()
    )
  );

-- RLS Policies for settlements
CREATE POLICY "Users can view settlements they're involved in"
  ON settlements FOR SELECT
  TO authenticated
  USING (
    auth.uid() = payer_id OR 
    auth.uid() = payee_id OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = settlements.group_id
      AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create settlements"
  ON settlements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = payer_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_expenses_group_id ON group_expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_group_expense_id ON expense_splits(group_expense_id);
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();