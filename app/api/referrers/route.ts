import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Referrer from '@/models/Referrer';
import { getReferrers } from '@/services/referralService';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const data = await req.json();
    const name = String(data?.name || '').trim();
    const phone = String(data?.phone || '').trim();
    const email = String(data?.email || '').trim();
    const branchId = String(data?.branchId || data?.branch || '').trim();

    if (!name || !phone || !branchId) {
      return NextResponse.json(
        { error: 'name, phone and branchId are required' },
        { status: 400 }
      );
    }

    const duplicateConditions: any[] = [
      { phone: { $regex: `^${escapeRegex(phone)}$`, $options: 'i' } },
      {
        name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
        phone: { $regex: `^${escapeRegex(phone)}$`, $options: 'i' },
      },
    ];
    if (email) {
      duplicateConditions.push({ email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } });
    }

    const duplicate = await Referrer.findOne({
      branchId,
      isCancelled: false,
      $or: duplicateConditions,
    }).lean();

    if (duplicate) {
      return NextResponse.json(
        { error: 'A referrer with the same information already exists for this branch' },
        { status: 409 }
      );
    }

    const referrer = await Referrer.create(data);
    return NextResponse.json(referrer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create referrer' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
     const refs = await getReferrers(branchId || undefined);
 
    // Attach refClinicName for UI
    const result = refs.map(r => ({
      ...r,
      refClinicName: (r as any).refClinic?.name || '',
    }));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch referrers' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing referrer id" }, { status: 400 });
    await Referrer.findByIdAndUpdate(id, { isCancelled: true });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to cancel referrer' }, { status: 500 });
  }
}
