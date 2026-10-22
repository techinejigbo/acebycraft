import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { isAuthenticatedAdmin } from '@/lib/auth-check';

interface PlatformRewardSettings {
  quota: number;
  amount: number;
  cutoff: number;
  updatedAt?: string;
}

const DEFAULT_SETTINGS: PlatformRewardSettings = {
  quota: 10,
  amount: 1000,
  cutoff: 80,
};

// In-memory store fallback if firestore is not available
let mockSettingsStore: PlatformRewardSettings = { ...DEFAULT_SETTINGS };

export async function GET() {
  try {
    const firestore = getAdminFirestore();
    if (firestore) {
      const doc = await firestore.collection('platformSettings').doc('rewards').get();
      if (doc.exists) {
        const data = doc.data() as Partial<PlatformRewardSettings>;
        return NextResponse.json({
          settings: {
            quota: typeof data.quota === 'number' ? data.quota : DEFAULT_SETTINGS.quota,
            amount: typeof data.amount === 'number' ? data.amount : DEFAULT_SETTINGS.amount,
            cutoff: typeof data.cutoff === 'number' ? data.cutoff : DEFAULT_SETTINGS.cutoff,
            updatedAt: data.updatedAt,
          },
        });
      }
    }

    return NextResponse.json({ settings: mockSettingsStore });
  } catch (error: any) {
    console.error('Error fetching platform reward settings:', error);
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuthed = await isAuthenticatedAdmin();
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    const body = await req.json();
    const quota = Math.max(1, Math.min(500, Number(body.quota) || DEFAULT_SETTINGS.quota));
    const amount = Math.max(50, Math.min(100000, Number(body.amount) || DEFAULT_SETTINGS.amount));
    const cutoff = Math.max(1, Math.min(100, Number(body.cutoff) || DEFAULT_SETTINGS.cutoff));

    const updatedSettings: PlatformRewardSettings = {
      quota,
      amount,
      cutoff,
      updatedAt: new Date().toISOString(),
    };

    const firestore = getAdminFirestore();
    if (firestore) {
      await firestore.collection('platformSettings').doc('rewards').set(updatedSettings, { merge: true });
    } else {
      mockSettingsStore = updatedSettings;
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Platform reward settings saved successfully.',
    });
  } catch (error: any) {
    console.error('Error saving platform reward settings:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save settings' },
      { status: 500 }
    );
  }
}
