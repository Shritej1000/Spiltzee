import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';

interface ExpenseSummary {
  today: number;
  week: number;
  month: number;
  year: number;
}

interface RecentExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  expense_date: string;
  category_color: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ExpenseSummary>({
    today: 0,
    week: 0,
    month: 0,
    year: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState<RecentExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const weekStart = new Date(now.setDate(now.getDate() - 7)).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('user_id', user!.id);

    if (expenses) {
      const today = expenses
        .filter((e) => e.expense_date >= todayStart)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const week = expenses
        .filter((e) => e.expense_date >= weekStart)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const month = expenses
        .filter((e) => e.expense_date >= monthStart)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      const year = expenses
        .filter((e) => e.expense_date >= yearStart)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      setSummary({ today, week, month, year });
    }

    const { data: recent } = await supabase
      .from('expenses')
      .select(`
        id,
        title,
        amount,
        expense_date,
        expense_categories (name, color)
      `)
      .eq('user_id', user!.id)
      .order('expense_date', { ascending: false })
      .limit(5);

    if (recent) {
      setRecentExpenses(
        recent.map((e: any) => ({
          id: e.id,
          title: e.title,
          amount: e.amount,
          category: e.expense_categories.name,
          category_color: e.expense_categories.color,
          expense_date: e.expense_date,
        }))
      );
    }

    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Track your spending at a glance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.today)}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span>Daily expenses</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">This Week</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.week)}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span>Weekly total</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">This Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.month)}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span>Monthly total</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-teal-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-sm text-gray-500">This Year</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.year)}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span>Yearly total</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Expenses</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentExpenses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No expenses yet. Start by adding your first expense!
            </div>
          ) : (
            recentExpenses.map((expense) => (
              <div key={expense.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${expense.category_color}20` }}
                  >
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: expense.category_color }}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{expense.title}</p>
                    <p className="text-sm text-gray-500">{expense.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                  <p className="text-sm text-gray-500">{formatDate(expense.expense_date)}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {recentExpenses.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <button className="w-full flex items-center justify-center gap-2 text-teal-600 hover:text-teal-700 font-semibold py-2">
              View All Expenses
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
