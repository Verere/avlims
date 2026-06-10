import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import ScanReportTemplate from '../../../models/ScanReportTemplate';

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();

    const required = ['title', 'modality', 'slug', 'branchId'];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const template = await ScanReportTemplate.create({
      title: body.title,
      modality: body.modality,
      findingsDefaultText: body.findingsDefaultText || '',
      impressionDefaultText: body.impressionDefaultText || '',
      conclusionDefaultText: body.conclusionDefaultText || '',
      sections: Array.isArray(body.sections) ? body.sections : [],
      description: body.description,
      slug: body.slug,
      branchId: body.branchId,
      testRefs: Array.isArray(body.testRefs) ? body.testRefs : [],
      isActive: body.isActive !== false,
      isCancelled: false,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const modality = req.nextUrl.searchParams.get('modality');
    const includeCancelled = req.nextUrl.searchParams.get('includeCancelled') === 'true';
    const isActive = req.nextUrl.searchParams.get('isActive');

    const query: any = {};
    if (branchId) query.branchId = branchId;
    if (modality) query.modality = modality;
    if (!includeCancelled) query.isCancelled = false;
    if (isActive === 'true') query.isActive = true;
    if (isActive === 'false') query.isActive = false;

    const templates = await ScanReportTemplate.find(query)
      .populate('testRefs', 'name code type')
      .sort({ createdAt: -1 });

    return NextResponse.json(templates, { status: 200 });
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
      return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
    }

    if (cancel === true) {
      const cancelled = await ScanReportTemplate.findByIdAndUpdate(id, { isCancelled: true }, { new: true });
      if (!cancelled) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json(cancelled, { status: 200 });
    }

    const allowed: Record<string, boolean> = {
      title: true,
      modality: true,
      findingsDefaultText: true,
      impressionDefaultText: true,
      conclusionDefaultText: true,
      sections: true,
      description: true,
      slug: true,
      branchId: true,
      testRefs: true,
      isActive: true,
    };

    const safeUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowed[key]) safeUpdates[key] = updates[key];
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const updated = await ScanReportTemplate.findByIdAndUpdate(id, safeUpdates, { new: true, runValidators: true });
    if (!updated) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
