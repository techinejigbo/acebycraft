import { NextRequest, NextResponse } from 'next/server';
import { fetchAllAssessments, saveAssessmentWithLockedKey, toggleAssessmentStatus } from '@/lib/firebase/admin';
import { AssessmentForm } from '@/types';

export async function GET() {
  try {
    const assessments = await fetchAllAssessments();
    return NextResponse.json({ assessments });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch assessments';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: AssessmentForm = await req.json();

    if (!body.title || !body.questions || body.questions.length === 0) {
      return NextResponse.json(
        { error: 'Assessment title and at least one question are required.' },
        { status: 400 }
      );
    }

    const result = await saveAssessmentWithLockedKey(body);
    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Assessment and secure answer key saved successfully.',
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to save assessment';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, isActive } = await req.json();
    if (!id || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Assessment ID and boolean isActive status are required.' },
        { status: 400 }
      );
    }

    const updated = await toggleAssessmentStatus(id, isActive);
    return NextResponse.json({
      success: updated,
      message: `Assessment ${isActive ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to toggle assessment status';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

