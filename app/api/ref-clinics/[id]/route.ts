import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import RefClinic from '@/models/RefClinic';

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
    if (typeof body.slug === 'string') update.slug = body.slug.trim();
    if (typeof body.isCancelled === 'boolean') update.isCancelled = body.isCancelled;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const updated = await RefClinic.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updated) {
      return NextResponse.json({ error: 'Ref clinic not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update ref clinic' }, { status: 400 });
  }
}
