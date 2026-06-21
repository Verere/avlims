import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import RefClinic from '@/models/RefClinic';

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const data = await req.json();
    const refClinic = await RefClinic.create(data);
    return NextResponse.json(refClinic, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create ref clinic' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const filter = branchId ? { branchId } : {};
    const refClinics = await RefClinic.find(filter).sort({ createdAt: -1 }).lean();;
    return NextResponse.json(refClinics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch ref clinics' }, { status: 400 });
  }
}
