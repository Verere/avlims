import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Referrer from '@/models/Referrer';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id } = await context.params;
    const body = await req.json();

    const update: any = {};
    if (typeof body.name === 'string') update.name = body.name.trim();
    if (typeof body.address === 'string') update.address = body.address.trim();
    if (typeof body.phone === 'string') update.phone = body.phone.trim();
    if (typeof body.bank === 'string') update.bank = body.bank.trim();
    if (typeof body.account === 'string') update.account = body.account.trim();
    if (typeof body.email === 'string') update.email = body.email.trim();
    if (typeof body.refClinic === 'string') update.refClinic = body.refClinic;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const updated = await Referrer.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update referrer' }, { status: 400 });
  }
}
