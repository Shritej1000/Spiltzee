import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface MonthlyData {
  month: string;
  amount: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'month' | 'year'>('month');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);

    const now = new Date();
    const startDate =
      timeRange === 'month'
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), 0, 1);

    const { data: expenses } = await supabase
      .from('expenses')
      .select(`
        amount,
        expense_date,
        expense_categories (name, color)
      `)
      .eq('user_id', user!.id)
      .gte('expense_date', startDate.toISOString());

    if (expenses) {
      const categoryMap = new Map<string, { value: number; color: string }>();
      expenses.forEach((expense: any) => {
        const categoryName = expense.expense_categories.name;
        const current = categoryMap.get(categoryName) || {
          value: 0,
          color: expense.expense_categories.color,
        };
        categoryMap.set(categoryName, {
          value: current.value + Number(expense.amount),
          color: current.color,
        });
      });

      const catData = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        value: data.value,
        color: data.color,
      }));
      setCategoryData(catData);

      const monthMap = new Map<string, number>();
      expenses.forEach((expense: any) => {
        const date = new Date(expense.expense_date);
        const monthKey =
          timeRange === 'month'
            ? date.toLocaleDateString('en-US', { day: 'numeric' })
            : date.toLocaleDateString('en-US', { month: 'short' });

        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + Number(expense.amount));
      });

      const monthly = Array.from(monthMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => {
          if (timeRange === 'month') {
            return parseInt(a.month) - parseInt(b.month);
          }
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return months.indexOf(a.month) - months.indexOf(b.month);
        });
      setMonthlyData(monthly);
    }

    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const totalExpense = categoryData.reduce((sum, cat) => sum + cat.value, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
          <p className="text-gray-600">Visualize your spending patterns</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === 'year'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Spending by Category</h2>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No expense data available
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                {categoryData.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{cat.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(cat.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Expense Trend</h2>
          {monthlyData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No expense data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ fill: '#0d9488' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Monthly Breakdown</h2>
        {monthlyData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No expense data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#0d9488" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {totalExpense > 0 && (
        <div className="mt-6 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl shadow-sm border border-teal-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-teal-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Total {timeRange === 'month' ? 'Monthly' : 'Yearly'} Spending
              </h3>
              <p className="text-3xl font-bold text-teal-600 mb-2">{formatCurrency(totalExpense)}</p>
              <p className="text-sm text-gray-600">
                Across {categoryData.length} categories and {monthlyData.length} time periods
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
