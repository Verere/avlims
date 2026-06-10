
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
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing test id" }, { status: 400 });
    await Test.findByIdAndUpdate(id, { isCancelled: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to cancel test" }, { status: 500 });
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
