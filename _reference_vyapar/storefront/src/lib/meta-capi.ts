import { getSettings } from './database';
import { fetchWithRetry } from './fetch-retry';

export async function sendMetaEvent(eventName: string, eventData: any, userData: any) {
  const settings = await getSettings();
  const pixelId = settings.meta_pixel_id;
  const token = settings.meta_capi_token;

  if (!pixelId || !token) {
    return; // Meta CAPI not configured
  }

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: userData,
        custom_data: eventData
      }
    ]
  };

  try {
    const response = await fetchWithRetry(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Meta CAPI Error]', errorData);
    }
  } catch (error) {
    console.error('[Meta CAPI Exception]', error);
  }
}
