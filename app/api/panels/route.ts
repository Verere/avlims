import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import Panel from '../../../models/Panel';

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();

    const required = ['name', 'code', 'category', 'price', 'tests', 'slug', 'branchId'];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (!Array.isArray(body.tests) || body.tests.length === 0) {
      return NextResponse.json({ error: 'tests must be a non-empty array of Test IDs' }, { status: 400 });
    }

    const panel = await Panel.create({
      ...body,
      isActive: body.isActive ?? true,
      isCancelled: false,
    });

    return NextResponse.json(panel, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const includeCancelled = req.nextUrl.searchParams.get('includeCancelled') === 'true';
    const isActive = req.nextUrl.searchParams.get('isActive');

    const query: any = {};
    if (branchId) query.branchId = branchId;
    if (!includeCancelled) query.isCancelled = false;
    if (isActive === 'true') query.isActive = true;
    if (isActive === 'false') query.isActive = false;

    const panels = await Panel.find(query)
      .populate('tests', 'name code price type resultType')
      .sort({ createdAt: -1 });

    return NextResponse.json(panels, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    const { id, cancel, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing panel id' }, { status: 400 });
    }

    if (cancel === true) {
      const cancelled = await Panel.findByIdAndUpdate(id, { isCancelled: true }, { new: true });
      if (!cancelled) {
        return NextResponse.json({ error: 'Panel not found' }, { status: 404 });
      }
      return NextResponse.json(cancelled, { status: 200 });
    }

    const allowed: Record<string, boolean> = {
      name: true,
      code: true,
      category: true,
      price: true,
      tests: true,
      isActive: true,
      description: true,
      slug: true,
      branchId: true,
    };

    const safeUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowed[key]) safeUpdates[key] = updates[key];
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const updated = await Panel.findByIdAndUpdate(id, safeUpdates, { new: true, runValidators: true });
    if (!updated) {
      return NextResponse.json({ error: 'Panel not found' }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
