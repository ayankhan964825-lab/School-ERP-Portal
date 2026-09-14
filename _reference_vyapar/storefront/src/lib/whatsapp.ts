import { getSettings } from './database';
import { fetchWithRetry } from './fetch-retry';

export async function sendWhatsAppNotification(toPhone: string, templateName: string, languageCode: string = 'en') {
  const settings = await getSettings();
  const token = settings.whatsapp_api_token;
  const phoneNumberId = settings.whatsapp_phone_number_id;

  if (!token || !phoneNumberId) {
    return; // WhatsApp Cloud API not configured
  }

  // Format phone number: remove any non-numeric characters, add country code if missing
  let formattedPhone = toPhone.replace(/\D/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`; // Default to India if 10 digits
  }

  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      }
    }
  };

  try {
    const response = await fetchWithRetry(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[WhatsApp API Error]', errorData);
    }
  } catch (error) {
    console.error('[WhatsApp API Exception]', error);
  }
}
