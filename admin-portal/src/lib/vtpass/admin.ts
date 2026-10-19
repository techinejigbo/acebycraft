// VTpass Admin API Client for Airtime Gateway

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

export function resolveServiceID(phone: string, preferredNetwork?: string): 'mtn' | 'airtel' | 'glo' | 'etisalat' {
  if (preferredNetwork) {
    const net = preferredNetwork.toLowerCase();
    if (net.includes('mtn')) return 'mtn';
    if (net.includes('airtel')) return 'airtel';
    if (net.includes('glo')) return 'glo';
    if (net.includes('9mobile') || net.includes('etisalat')) return 'etisalat';
  }

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

  return 'mtn';
}

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

export async function getAccountBalance(): Promise<{
  balance: number;
  currencyCode: string;
  isLive: boolean;
  status: string;
}> {
  if (!isVTpassConfigured()) {
    return {
      balance: 0,
      currencyCode: 'NGN',
      isLive: false,
      status: 'unconfigured',
    };
  }

  try {
    const baseUrl = getBaseUrl();
    const apiKey = process.env.VTPASS_API_KEY!;
    const publicKey = process.env.VTPASS_PUBLIC_KEY || apiKey;

    const res = await fetch(`${baseUrl}/balance`, {
      headers: {
        'api-key': apiKey,
        'public-key': publicKey,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      balance: Number(data.contents?.balance || data.balance || 0),
      currencyCode: 'NGN',
      isLive: isVTpassLive(),
      status: 'connected',
    };
  } catch (error) {
    console.warn('[Airtime Gateway] Warning fetching balance:', error);
    return {
      balance: 0,
      currencyCode: 'NGN',
      isLive: isVTpassLive(),
      status: 'error',
    };
  }
}

export async function dispatchManualAirtime({
  phone,
  amountNgn,
  network,
}: {
  phone: string;
  amountNgn: number;
  network?: string;
}) {
  const formattedPhone = formatPhoneForVTpass(phone);
  const serviceID = resolveServiceID(formattedPhone, network);
  const requestId = generateRequestId();

  if (!isVTpassConfigured()) {
    return {
      success: false,
      message: 'Airtime service credentials not configured in environment variables.',
      transactionId: requestId,
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

    const res = await fetch(`${baseUrl}/pay`, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'secret-key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.code === '000' || data.code === '099') {
      const txId = data.content?.transactions?.transactionId || data.requestId || requestId;
      return {
        success: true,
        message: `₦${amountNgn} Airtime successfully dispatched to ${formattedPhone}`,
        transactionId: String(txId),
      };
    }

    const errorMsg = data.response_description || data.message || `Code ${data.code}`;
    return {
      success: false,
      message: `Dispatch failed: ${errorMsg}`,
      transactionId: requestId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Connection failed';
    return {
      success: false,
      message: errorMsg,
      transactionId: requestId,
    };
  }
}
