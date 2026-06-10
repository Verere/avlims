import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import Finding from '../../../models/Findings';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();

    const required = ['title', 'content', 'section', 'slug', 'branchId'];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const hasTemplateRef = !!body.reportTemplateRef;
    const hasTestRef = !!body.testRef;
    if (!hasTemplateRef && !hasTestRef) {
      return NextResponse.json({ error: 'A finding must be linked to either reportTemplateRef or testRef' }, { status: 400 });
    }

    const payload: any = {
      title: body.title,
      content: body.content,
      section: body.section,
      modality: body.modality,
      slug: body.slug,
      branchId: body.branchId,
      isActive: body.isActive !== false,
      isCancelled: false,
    };

    if (hasTemplateRef) {
      if (!mongoose.Types.ObjectId.isValid(String(body.reportTemplateRef))) {
        return NextResponse.json({ error: 'Invalid reportTemplateRef' }, { status: 400 });
      }
      payload.reportTemplateRef = body.reportTemplateRef;
    }

    if (hasTestRef) {
      if (!mongoose.Types.ObjectId.isValid(String(body.testRef))) {
        return NextResponse.json({ error: 'Invalid testRef' }, { status: 400 });
      }
      payload.testRef = body.testRef;
    }

    const finding = await Finding.create(payload);
    return NextResponse.json(finding, { status: 201 });
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

    const findings = await Finding.find(query)
      .populate('reportTemplateRef', 'title modality slug')
      .populate('testRef', 'name code type')
      .sort({ createdAt: -1 });

    return NextResponse.json(findings, { status: 200 });
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
      return NextResponse.json({ error: 'Missing finding id' }, { status: 400 });
    }

    if (cancel === true) {
      const cancelled = await Finding.findByIdAndUpdate(id, { isCancelled: true }, { new: true });
      if (!cancelled) {
        return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
      }
      return NextResponse.json(cancelled, { status: 200 });
    }

    const allowed: Record<string, boolean> = {
      title: true,
      content: true,
      section: true,
      modality: true,
      reportTemplateRef: true,
      testRef: true,
      slug: true,
      branchId: true,
      isActive: true,
    };

    const safeUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (allowed[key]) safeUpdates[key] = updates[key];
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const updated = await Finding.findByIdAndUpdate(id, safeUpdates, { new: true, runValidators: true });
    if (!updated) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
