import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';

export interface ContributedQuestionPayload {
  id?: string;
  authorId: string;
  authorName: string;
  authorPhone?: string;
  authorAffiliation?: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  classLevel: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  status?: 'pending' | 'approved' | 'revision';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const authorId = searchParams.get('authorId');

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json({
        contributions: [],
        warning: 'Service temporarily unavailable',
      });
    }

    let query: FirebaseFirestore.Query = firestore.collection('teacherContributions');
    if (authorId) {
      query = query.where('authorId', '==', authorId);
    }

    const snap = await query.get();
    const contributions = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort descending by submittedAt / createdAt
    contributions.sort((a: any, b: any) => {
      const timeA = new Date(a.submittedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.submittedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({ contributions });
  } catch (error: any) {
    console.error('[Contributions API GET error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch contributions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const firestore = getAdminFirestore();

    if (!firestore) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable.' },
        { status: 503 }
      );
    }

    const nowIso = new Date().toISOString();

    // Handle array (bulk) or single object
    const items: ContributedQuestionPayload[] = Array.isArray(body) ? body : [body];

    const results = [];
    const batch = firestore.batch();

    for (const item of items) {
      if (!item.question || !item.options || !item.correctOption || !item.subjectId) {
        continue;
      }

      const docId = item.id || `q-tch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const docRef = firestore.collection('teacherContributions').doc(docId);

      const record = {
        id: docId,
        authorId: item.authorId || 'tch-independent',
        authorName: item.authorName || 'Volunteer Educator',
        authorPhone: item.authorPhone || '',
        authorAffiliation: item.authorAffiliation || 'Independent Educator',
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        topic: item.topic || 'General Topic',
        classLevel: item.classLevel || 'SS 3',
        question: item.question,
        options: item.options,
        correctOption: item.correctOption,
        explanation: item.explanation || '',
        status: item.status || 'pending',
        submittedAt: nowIso,
        createdAt: nowIso,
      };

      batch.set(docRef, record);
      results.push(record);
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'No valid questions provided for submission.' },
        { status: 400 }
      );
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      count: results.length,
      contributions: results,
    });
  } catch (error: any) {
    console.error('[Contributions API POST error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit question contribution' },
      { status: 500 }
    );
  }
}
