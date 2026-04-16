import { NextRequest, NextResponse } from 'next/server';
import { createLab, getLabs } from '../../../services/labService';

export async function GET() {
  try {
    const labs = await getLabs();
    return NextResponse.json(labs);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const lab = await createLab(data);
    return NextResponse.json(lab, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
