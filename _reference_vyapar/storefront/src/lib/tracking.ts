import crypto from 'crypto';

export function hashData(data: string | null | undefined, type: 'phone' | 'default' = 'default'): string | undefined {
  if (!data) return undefined;
  let clean = data.trim().toLowerCase();
  if (!clean) return undefined;

  if (type === 'phone') {
    // E.164 requires only digits and a leading '+'
    clean = clean.replace(/[^\d+]/g, '');
    if (!clean.startsWith('+')) {
      // Default to India (+91) if 10 digits
      if (clean.length === 10) clean = `+91${clean}`;
      else if (clean.startsWith('91') && clean.length === 12) clean = `+${clean}`;
    }
  }

  return crypto.createHash('sha256').update(clean).digest('hex');
}

export interface CapiEventData {
  eventName: string;
  eventTime: number;
  eventId?: string;
  eventSourceUrl?: string;
  userData: {
    em?: string[]; // Hashed emails
    ph?: string[]; // Hashed phone numbers
    fn?: string;   // Hashed first name
    ln?: string;   // Hashed last name
    client_ip_address?: string;
    client_user_agent?: string;
    fbp?: string;
    fbc?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
    content_ids?: string[];
    content_type?: string;
    num_items?: number;
  };
}

export async function sendMetaCapiEvent(
  pixelId: string,
  token: string,
  event: CapiEventData
) {
  if (!pixelId || !token) return;

  try {
    const payload = {
      data: [
        {
          event_name: event.eventName,
          event_time: Math.floor(event.eventTime / 1000),
          event_id: event.eventId,
          action_source: 'website',
          event_source_url: event.eventSourceUrl,
          user_data: event.userData,
          custom_data: event.customData,
        }
      ]
    };

    const response = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.error) {
      console.error('Meta CAPI Error:', result.error);
    }
  } catch (error) {
    console.error('Meta CAPI Request Failed:', error);
  }
}
