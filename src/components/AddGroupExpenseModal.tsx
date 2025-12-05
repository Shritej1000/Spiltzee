import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus } from 'lucide-react';

interface AddGroupExpenseModalProps {
  groupId: string;
  members: Array<{ user_id: string; email: string; full_name: string | null }>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddGroupExpenseModal({
  groupId,
  members,
  onClose,
  onSuccess,
}: AddGroupExpenseModalProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'unequal' | 'percentage' | 'shares'>('equal');
  const [splits, setSplits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (splitType === 'equal' && amount) {
      const equalAmount = parseFloat(amount) / members.length;
      const newSplits: Record<string, number> = {};
      members.forEach((member) => {
        newSplits[member.user_id] = equalAmount;
      });
      setSplits(newSplits);
    }
  }, [splitType, amount, members]);

  const loadCategories = async () => {
    const { data } = await supabase.from('expense_categories').select('id, name').order('name');
    if (data) {
      setCategories(data);
      if (data.length > 0) {
        setCategoryId(data[0].id);
      }
    }
  };

  const handleSplitChange = (userId: string, value: string) => {
    setSplits({ ...splits, [userId]: parseFloat(value) || 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const totalSplit = Object.values(splits).reduce((sum, val) => sum + val, 0);
    const expenseAmount = parseFloat(amount);

    if (Math.abs(totalSplit - expenseAmount) > 0.01) {
      setError(`Split total (${totalSplit}) must equal expense amount (${expenseAmount})`);
      setLoading(false);
      return;
    }

    const { data: expense, error: expenseError } = await supabase
      .from('group_expenses')
      .insert({
        group_id: groupId,
        paid_by: user!.id,
        title,
        amount: expenseAmount,
        category_id: categoryId,
        expense_date: new Date(expenseDate).toISOString(),
        notes: notes || null,
        split_type: splitType,
      })
      .select()
      .single();

    if (expenseError) {
      setError(expenseError.message);
      setLoading(false);
      return;
    }

    const splitInserts = Object.entries(splits).map(([userId, splitAmount]) => ({
      group_expense_id: expense.id,
      user_id: userId,
      amount: splitAmount,
    }));

    const { error: splitsError } = await supabase.from('expense_splits').insert(splitInserts);

    if (splitsError) {
      setError(splitsError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Add Group Expense</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="e.g., Dinner at restaurant"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Split Type *</label>
            <select
              value={splitType}
              onChange={(e) => setSplitType(e.target.value as any)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="equal">Split Equally</option>
              <option value="unequal">Unequal Amounts</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Split Details (₹)
            </label>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {member.full_name || member.email}
                    </p>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={splits[member.user_id] || 0}
                    onChange={(e) => handleSplitChange(member.user_id, e.target.value)}
                    disabled={splitType === 'equal'}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              ))}
              <div className="pt-3 border-t border-gray-300 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Total:</span>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{Object.values(splits).reduce((sum, val) => sum + val, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              placeholder="Optional notes..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
