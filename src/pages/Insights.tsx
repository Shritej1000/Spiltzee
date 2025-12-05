import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Lightbulb, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface Insight {
  id: string;
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  icon: any;
}

interface SpendingAnalysis {
  currentMonth: number;
  previousMonth: number;
  percentageChange: number;
  topCategory: { name: string; amount: number };
  avgDailySpending: number;
}

export default function Insights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadInsights();
    }
  }, [user]);

  const loadInsights = async () => {
    setLoading(true);

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const { data: currentMonthExpenses } = await supabase
      .from('expenses')
      .select(`
        amount,
        expense_categories (name)
      `)
      .eq('user_id', user!.id)
      .gte('expense_date', currentMonthStart.toISOString());

    const { data: previousMonthExpenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user!.id)
      .gte('expense_date', previousMonthStart.toISOString())
      .lte('expense_date', previousMonthEnd.toISOString());

    const currentTotal = currentMonthExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const previousTotal = previousMonthExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    const percentageChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    const categoryMap = new Map<string, number>();
    currentMonthExpenses?.forEach((expense: any) => {
      const categoryName = expense.expense_categories.name;
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + Number(expense.amount));
    });

    const topCategory = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])[0] || ['None', 0];

    const daysInMonth = now.getDate();
    const avgDailySpending = currentTotal / daysInMonth;

    setAnalysis({
      currentMonth: currentTotal,
      previousMonth: previousTotal,
      percentageChange,
      topCategory: { name: topCategory[0], amount: topCategory[1] },
      avgDailySpending,
    });

    const generatedInsights: Insight[] = [];

    if (percentageChange > 20) {
      generatedInsights.push({
        id: '1',
        type: 'warning',
        title: 'Spending Increased Significantly',
        description: `You spent ${Math.abs(percentageChange).toFixed(1)}% more this month than last month. Consider reviewing your expenses to identify areas where you can cut back.`,
        icon: TrendingUp,
      });
    } else if (percentageChange < -20) {
      generatedInsights.push({
        id: '2',
        type: 'success',
        title: 'Great Job Saving!',
        description: `You spent ${Math.abs(percentageChange).toFixed(1)}% less this month than last month. Keep up the good work!`,
        icon: CheckCircle,
      });
    }

    if (topCategory[1] > currentTotal * 0.4) {
      const percentage = ((topCategory[1] / currentTotal) * 100).toFixed(0);
      generatedInsights.push({
        id: '3',
        type: 'warning',
        title: `High Spending on ${topCategory[0]}`,
        description: `Your biggest spending category is ${topCategory[0]} (${formatCurrency(topCategory[1])}, ${percentage}% of total). Consider ways to reduce expenses in this category.`,
        icon: AlertCircle,
      });
    }

    const projectedMonthlySpending = avgDailySpending * 30;
    if (projectedMonthlySpending > currentTotal * 1.3) {
      generatedInsights.push({
        id: '4',
        type: 'info',
        title: 'Spending Pace Alert',
        description: `At your current pace, you're projected to spend ${formatCurrency(projectedMonthlySpending)} this month. Consider slowing down to stay within budget.`,
        icon: TrendingUp,
      });
    }

    if (avgDailySpending > 1000) {
      const potentialSavings = (avgDailySpending - 1000) * 30;
      generatedInsights.push({
        id: '5',
        type: 'info',
        title: 'Potential Monthly Savings',
        description: `You're spending an average of ${formatCurrency(avgDailySpending)} per day. By reducing daily spending to ₹1,000, you could save ${formatCurrency(potentialSavings)} per month.`,
        icon: Lightbulb,
      });
    }

    if (generatedInsights.length === 0) {
      generatedInsights.push({
        id: '6',
        type: 'success',
        title: 'Looking Good!',
        description: 'Your spending patterns are stable. Keep tracking your expenses to maintain good financial habits.',
        icon: CheckCircle,
      });
    }

    setInsights(generatedInsights);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Expense Insights</h1>
        <p className="text-gray-600">AI-powered recommendations to optimize your spending</p>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Monthly Spending</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(analysis.currentMonth)}
            </p>
            <div className="flex items-center gap-2">
              {analysis.percentageChange > 0 ? (
                <TrendingUp className="w-4 h-4 text-red-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-500" />
              )}
              <span className={`text-sm font-medium ${analysis.percentageChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {Math.abs(analysis.percentageChange).toFixed(1)}% vs last month
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Top Category</p>
            <p className="text-xl font-bold text-gray-900 mb-2">{analysis.topCategory.name}</p>
            <p className="text-2xl font-bold text-teal-600">
              {formatCurrency(analysis.topCategory.amount)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-2">Avg Daily Spending</p>
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(analysis.avgDailySpending)}
            </p>
            <p className="text-sm text-gray-600">
              Projected: {formatCurrency(analysis.avgDailySpending * 30)}/mo
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {insights.map((insight) => {
          const Icon = insight.icon;
          const colors = {
            warning: 'bg-orange-50 border-orange-200 text-orange-800',
            success: 'bg-green-50 border-green-200 text-green-800',
            info: 'bg-blue-50 border-blue-200 text-blue-800',
          };

          const iconColors = {
            warning: 'text-orange-600',
            success: 'text-green-600',
            info: 'text-blue-600',
          };

          return (
            <div
              key={insight.id}
              className={`rounded-xl shadow-sm border p-6 ${colors[insight.type]}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 bg-white rounded-lg ${iconColors[insight.type]}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">{insight.title}</h3>
                  <p className="text-sm leading-relaxed">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl shadow-sm border border-teal-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-100 rounded-lg">
            <Lightbulb className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Tips</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-teal-600">•</span>
                <span>Review your expenses weekly to stay aware of your spending patterns</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600">•</span>
                <span>Set budget limits for high-spending categories</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600">•</span>
                <span>Use Splitzee Groups to share costs with friends and family</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600">•</span>
                <span>Track every expense, no matter how small, for accurate insights</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
