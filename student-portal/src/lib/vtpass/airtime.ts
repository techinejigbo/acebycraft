// VTpass Airtime Integration

export interface AirtimeResult {
  success: boolean;
  status: 'success' | 'failed' | 'pending';
  transactionId?: string;
  amount: number;
  recipientPhone: string;
  network?: string;
  message: string;
  rawResponse?: unknown;
}

export const isVTpassConfigured = (): boolean => {
  return Boolean(
    process.env.VTPASS_API_KEY && 
    process.env.VTPASS_SECRET_KEY &&
    process.env.VTPASS_API_KEY !== 'your_vtpass_api_key'
  );
};

export const isVTpassLive = (): boolean => {
  return process.env.VTPASS_ENV === 'live';
};

const getBaseUrl = (): string => {
  return isVTpassLive()
    ? 'https://vtpass.com/api'
    : 'https://sandbox.vtpass.com/api';
};

/**
 * Generate a VTpass compliant Request ID (YYYYMMDDHHmm + unique random string)
 */
export function generateRequestId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${year}${month}${day}${hours}${minutes}${randomSuffix}`;
}

/**
 * Detect Nigerian Telecom Service ID from phone number prefix or network name
 */
export function resolveServiceID(phone: string, preferredNetwork?: string): 'mtn' | 'airtel' | 'glo' | 'etisalat' {
  if (preferredNetwork) {
    const net = preferredNetwork.toLowerCase();
    if (net.includes('mtn')) return 'mtn';
    if (net.includes('airtel')) return 'airtel';
    if (net.includes('glo')) return 'glo';
    if (net.includes('9mobile') || net.includes('etisalat')) return 'etisalat';
  }

  // Normalize phone to 11 digits: e.g. 08031234567
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length >= 13) {
    digits = `0${digits.slice(3)}`;
  }
  const prefix = digits.substring(0, 4);

  const mtnPrefixes = ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'];
  const airtelPrefixes = ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'];
  const gloPrefixes = ['0805', '0807', '0705', '0815', '0811', '0905', '0915'];
  const nineMobilePrefixes = ['0809', '0817', '0818', '0909', '0908'];

  if (mtnPrefixes.includes(prefix)) return 'mtn';
  if (airtelPrefixes.includes(prefix)) return 'airtel';
  if (gloPrefixes.includes(prefix)) return 'glo';
  if (nineMobilePrefixes.includes(prefix)) return 'etisalat';

  return 'mtn'; // default fallback
}

/**
 * Normalizes phone number to 11 digits local Nigerian format for VTpass
 */
export function formatPhoneForVTpass(rawPhone: string): string {
  let cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('234')) {
    cleaned = `0${cleaned.slice(3)}`;
  }
  if (!cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = `0${cleaned}`;
  }
  return cleaned;
}

/**
 * Dispatches live airtime to student's phone via VTpass
 */
export async function sendAirtimeReward({
  phone,
  amountNgn,
  network,
}: {
  phone: string;
  amountNgn: number;
  network?: string;
}): Promise<AirtimeResult> {
  const formattedPhone = formatPhoneForVTpass(phone);
  const serviceID = resolveServiceID(formattedPhone, network);
  const requestId = generateRequestId();

  if (!isVTpassConfigured()) {
    console.warn('[Airtime] VTpass API keys not configured in environment. Check VTPASS_API_KEY and VTPASS_SECRET_KEY.');
    return {
      success: false,
      status: 'failed',
      amount: amountNgn,
      recipientPhone: formattedPhone,
      message: 'Airtime service credentials pending configuration.',
    };
  }

  try {
    const baseUrl = getBaseUrl();
    const apiKey = process.env.VTPASS_API_KEY!;
    const secretKey = process.env.VTPASS_SECRET_KEY!;

    const payload = {
      request_id: requestId,
      serviceID,
      amount: amountNgn,
      phone: formattedPhone,
    };

    const response = await fetch(`${baseUrl}/pay`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'secret-key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // VTpass code '000' indicates transaction success
    if (data.code === '000') {
      const txId = data.content?.transactions?.transactionId || data.requestId || requestId;
      return {
        success: true,
        status: 'success',
        transactionId: String(txId),
        amount: amountNgn,
        recipientPhone: formattedPhone,
        network: serviceID.toUpperCase(),
        message: `₦${amountNgn} Airtime successfully dispatched to ${formattedPhone}`,
        rawResponse: data,
      };
    }

    // Code '099' indicates transaction pending / processing
    if (data.code === '099') {
      const txId = data.content?.transactions?.transactionId || data.requestId || requestId;
      return {
        success: true,
        status: 'pending',
        transactionId: String(txId),
        amount: amountNgn,
        recipientPhone: formattedPhone,
        network: serviceID.toUpperCase(),
        message: `₦${amountNgn} Airtime dispatched (Processing confirmation)`,
        rawResponse: data,
      };
    }

    // Other codes indicate failure (e.g. low balance, invalid phone, network downtime)
    const errorMsg = data.response_description || data.message || `VTpass Error: Code ${data.code}`;
    console.error('[Airtime] Dispatch failed:', errorMsg, data);
    return {
      success: false,
      status: 'failed',
      amount: amountNgn,
      recipientPhone: formattedPhone,
      network: serviceID.toUpperCase(),
      message: errorMsg,
      rawResponse: data,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error connecting to airtime gateway';
    console.error('[Airtime] Exception during dispatch:', err);
    return {
      success: false,
      status: 'failed',
      amount: amountNgn,
      recipientPhone: formattedPhone,
      network: serviceID.toUpperCase(),
      message: errorMsg,
    };
  }
}
