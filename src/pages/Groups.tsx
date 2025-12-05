import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Calendar, DollarSign, User as UserIcon, X, CheckCircle, CreditCard } from 'lucide-react';
import AddGroupExpenseModal from '../components/AddGroupExpenseModal';
import { openGooglePay } from '../utils/googlePay';

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: string;
  created_at: string;
  member_count: number;
  total_expenses: number;
}

interface GroupMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
}

interface GroupExpense {
  id: string;
  title: string;
  amount: number;
  paid_by: string;
  paid_by_name: string;
  expense_date: string;
  split_type: string;
}

interface Balance {
  user_id: string;
  user_name: string;
  user_email: string;
  balance: number;
}

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupExpenses, setGroupExpenses] = useState<GroupExpense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupType, setNewGroupType] = useState<'trip' | 'event' | 'home' | 'office' | 'other'>('other');

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupDetails();
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    setLoading(true);

    const { data: memberGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user!.id);

    if (memberGroups && memberGroups.length > 0) {
      const groupIds = memberGroups.map((m) => m.group_id);

      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .in('id', groupIds);

      if (groupsData) {
        const enrichedGroups = await Promise.all(
          groupsData.map(async (group) => {
            const { count: memberCount } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('group_id', group.id);

            const { data: expenses } = await supabase
              .from('group_expenses')
              .select('amount')
              .eq('group_id', group.id);

            const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

            return {
              ...group,
              member_count: memberCount || 0,
              total_expenses: totalExpenses,
            };
          })
        );

        setGroups(enrichedGroups);
      }
    } else {
      setGroups([]);
    }

    setLoading(false);
  };

  const loadGroupDetails = async () => {
    const { data: members } = await supabase
      .from('group_members')
      .select(`
        id,
        user_id,
        user_profiles (email, full_name)
      `)
      .eq('group_id', selectedGroup);

    if (members) {
      setGroupMembers(
        members.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          email: m.user_profiles.email,
          full_name: m.user_profiles.full_name,
        }))
      );
    }

    const { data: expenses } = await supabase
      .from('group_expenses')
      .select(`
        id,
        title,
        amount,
        paid_by,
        expense_date,
        split_type,
        user_profiles (full_name)
      `)
      .eq('group_id', selectedGroup)
      .order('expense_date', { ascending: false });

    if (expenses) {
      setGroupExpenses(
        expenses.map((e: any) => ({
          id: e.id,
          title: e.title,
          amount: e.amount,
          paid_by: e.paid_by,
          paid_by_name: e.user_profiles.full_name || 'Unknown',
          expense_date: e.expense_date,
          split_type: e.split_type,
        }))
      );
    }

    await calculateBalances();
  };

  const calculateBalances = async () => {
    const { data: expenses } = await supabase
      .from('group_expenses')
      .select(`
        id,
        amount,
        paid_by,
        expense_splits (user_id, amount)
      `)
      .eq('group_id', selectedGroup);

    if (expenses) {
      const balanceMap = new Map<string, number>();

      expenses.forEach((expense: any) => {
        const paidBy = expense.paid_by;
        const totalAmount = Number(expense.amount);

        balanceMap.set(paidBy, (balanceMap.get(paidBy) || 0) + totalAmount);

        expense.expense_splits.forEach((split: any) => {
          const userId = split.user_id;
          const splitAmount = Number(split.amount);
          balanceMap.set(userId, (balanceMap.get(userId) || 0) - splitAmount);
        });
      });

      const { data: members } = await supabase
        .from('group_members')
        .select(`
          user_id,
          user_profiles (email, full_name)
        `)
        .eq('group_id', selectedGroup);

      if (members) {
        const balanceList = members.map((m: any) => ({
          user_id: m.user_id,
          user_name: m.user_profiles.full_name || 'Unknown',
          user_email: m.user_profiles.email,
          balance: balanceMap.get(m.user_id) || 0,
        }));

        setBalances(balanceList);
      }
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: newGroupName,
        description: newGroupDescription || null,
        type: newGroupType,
        created_by: user!.id,
      })
      .select()
      .single();

    if (!error && group) {
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user!.id,
        added_by: user!.id,
      });

      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupType('other');
      loadGroups();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!selectedGroup) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Splitzee Groups</h1>
            <p className="text-gray-600">Manage shared expenses with friends and family</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No groups yet</h2>
            <p className="text-gray-600 mb-6">Create your first group to start splitting expenses</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group.id)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-teal-100 rounded-lg">
                    <Users className="w-6 h-6 text-teal-600" />
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                    {group.type}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <UserIcon className="w-4 h-4" />
                    <span>{group.member_count} members</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>{formatCurrency(group.total_expenses)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create New Group</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="e.g., Trip to Goa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    value={newGroupType}
                    onChange={(e) => setNewGroupType(e.target.value as any)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="trip">Trip</option>
                    <option value="event">Event</option>
                    <option value="home">Home</option>
                    <option value="office">Office</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <button
                  onClick={createGroup}
                  disabled={!newGroupName.trim()}
                  className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentGroup = groups.find((g) => g.id === selectedGroup);
  const userBalance = balances.find((b) => b.user_id === user!.id);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => setSelectedGroup(null)}
          className="text-teal-600 hover:text-teal-700 font-medium mb-4"
        >
          ← Back to Groups
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentGroup?.name}</h1>
        {currentGroup?.description && (
          <p className="text-gray-600">{currentGroup.description}</p>
        )}
      </div>

      {userBalance && (
        <div className={`mb-6 p-6 rounded-xl ${userBalance.balance > 0 ? 'bg-green-50 border border-green-200' : userBalance.balance < 0 ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Your Balance</p>
              <p className={`text-3xl font-bold ${userBalance.balance > 0 ? 'text-green-600' : userBalance.balance < 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                {formatCurrency(userBalance.balance)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {userBalance.balance > 0 ? 'You are owed' : userBalance.balance < 0 ? 'You owe' : 'All settled up'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
            </div>
            <div className="divide-y divide-gray-200">
              {groupExpenses.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No expenses yet. Add your first expense to get started!
                </div>
              ) : (
                groupExpenses.map((expense) => (
                  <div key={expense.id} className="p-6 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{expense.title}</p>
                      <p className="text-sm text-gray-500">
                        Paid by {expense.paid_by_name} • {formatDate(expense.expense_date)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Split: {expense.split_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Members</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {groupMembers.map((member) => (
                <div key={member.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-teal-700 font-semibold">
                      {member.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {member.full_name || member.email}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Balances</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {balances.map((balance) => (
                <div key={balance.user_id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{balance.user_name}</p>
                      <p className="text-xs text-gray-500">{balance.user_email}</p>
                    </div>
                    <p className={`font-bold ${balance.balance > 0 ? 'text-green-600' : balance.balance < 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {balance.balance > 0 ? '+' : ''}{formatCurrency(balance.balance)}
                    </p>
                  </div>
                  {balance.balance < 0 && balance.user_id === user!.id && (
                    <button
                      onClick={() => {
                        const creditor = balances.find(b => b.balance > 0);
                        if (creditor) {
                          openGooglePay({
                            upiId: 'merchant@upi',
                            amount: Math.abs(balance.balance),
                            name: creditor.user_name,
                            note: `Splitzee settlement for ${currentGroup?.name}`,
                          });
                        }
                      }}
                      className="w-full mt-2 flex items-center justify-center gap-2 bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Settle via Google Pay
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showAddExpenseModal && (
        <AddGroupExpenseModal
          groupId={selectedGroup}
          members={groupMembers}
          onClose={() => setShowAddExpenseModal(false)}
          onSuccess={() => loadGroupDetails()}
        />
      )}
    </div>
  );
}
