
import { createTest, getTests } from "@/services/testService";
import { NextRequest, NextResponse } from "next/server";
import Test from "@/models/Test";
import ScanReportTemplate from "@/models/ScanReportTemplate";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }
    let tests = await getTests();
    if (branchId) {
      tests = tests.filter((t: any) => String(t.branchId) === String(branchId));
    }
    // Map _id to id for frontend compatibility
    const mapped = tests.map((t: any) => ({
      id: t._id?.toString() || '',
      name: t.name,
      code: t.code || '',
      type: t.type || 'lab',
      resultType: t.resultType || 'numeric',
      category: t.category || '',
      subCategory: t.subCategory || '',
      price: t.price || 0,
      unit: t.unit || '',
      sampleType: t.sampleType || '',
      turnaroundHours: t.turnaroundHours,
      preparationInstructions: t.preparationInstructions || '',
      isActive: t.isActive !== false,
      reportTemplateRef: t.reportTemplateRef ? String(t.reportTemplateRef) : '',
    }));
    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error fetching tests:", error);
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body || {};
    if (!id) return NextResponse.json({ error: "Missing test id" }, { status: 400 });

    const hasUpdatePayload = Object.keys(updates).some((key) => key !== 'isCancelled' && updates[key] !== undefined);

    if (!hasUpdatePayload) {
      await Test.findByIdAndUpdate(id, { isCancelled: true });
      return NextResponse.json({ success: true });
    }

    const updateDoc: Record<string, any> = {};
    const allowedFields = [
      'name',
      'code',
      'category',
      'subCategory',
      'price',
      'type',
      'resultType',
      'unit',
      'turnaroundHours',
      'sampleType',
      'preparationInstructions',
      'isActive',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateDoc[field] = updates[field];
      }
    }

    const updated = await Test.findByIdAndUpdate(id, updateDoc, { new: true });
    if (!updated) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, test: updated });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    let normalizedTemplateRef: string | undefined = undefined;

    if (data.type === "scan") {
      if (data.reportTemplateRef) {
        const query: any = { isCancelled: false, branchId: data.branchId };
        if (mongoose.Types.ObjectId.isValid(String(data.reportTemplateRef))) {
          query._id = String(data.reportTemplateRef);
        } else {
          query.slug = String(data.reportTemplateRef);
        }

        const template = await ScanReportTemplate.findOne(query).select("_id");
        if (!template) {
          return NextResponse.json({ error: "Invalid report template reference for this branch" }, { status: 400 });
        }
        normalizedTemplateRef = String(template._id);
      }
    }

    const test = await createTest({
      name: data.name,
      code: data.code,
      slug: data.slug,
      category: data.category,
      subCategory: data.subCategory,
      price: data.price,
      branchId: data.branchId,

      type: data.type,
      resultType: data.resultType,
      unit: data.unit,
      turnaroundHours: data.turnaroundHours,
      sampleType: data.sampleType,
      preparationInstructions: data.preparationInstructions,
      reportTemplateRef: normalizedTemplateRef,
      referenceRanges: Array.isArray(data.referenceRanges) ? data.referenceRanges : [],
      isActive: data.isActive !== false,
      isCancelled: false,
    });
    return Response.json(test, { status: 201 });
  } catch (error) {
    return Response.json({ error: "Failed to create test" }, { status: 500 });
  }
}
