const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface NotificationParams {
  to: string;
  subject: string;
  message: string;
  type: 'group_created' | 'expense_added' | 'settlement' | 'monthly_report';
}

export async function sendNotification(params: NotificationParams): Promise<void> {
  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/send-notification`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error('Failed to send notification:', await response.text());
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
