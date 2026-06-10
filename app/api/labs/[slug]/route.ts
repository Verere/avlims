import { NextRequest, NextResponse } from 'next/server';
import { getLabBySlug } from '../../../../services/labService';

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const lab = await getLabBySlug(slug);
    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 });
    }
    return NextResponse.json(lab);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
