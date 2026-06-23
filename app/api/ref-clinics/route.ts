import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import RefClinic from '@/models/RefClinic';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const data = await req.json();
    const name = String(data?.name || '').trim();
    const address = String(data?.address || '').trim();
    const slug = String(data?.slug || '').trim();
    const branchId = String(data?.branchId || data?.branch || '').trim();

    if (!name || !address || !slug || !branchId) {
      return NextResponse.json(
        { error: 'name, address, slug and branchId are required' },
        { status: 400 }
      );
    }

    const duplicate = await RefClinic.findOne({
      branchId,
      isCancelled: false,
      $or: [
        {
          name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
          address: { $regex: `^${escapeRegex(address)}$`, $options: 'i' },
        },
        { slug: { $regex: `^${escapeRegex(slug)}$`, $options: 'i' } },
      ],
    }).lean();

    if (duplicate) {
      return NextResponse.json(
        { error: 'A ref clinic with the same information already exists for this branch' },
        { status: 409 }
      );
    }

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
    const filter: any = { isCancelled: false };
    if (branchId) filter.branchId = branchId;
    const refClinics = await RefClinic.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json(refClinics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch ref clinics' }, { status: 400 });
  }
}
