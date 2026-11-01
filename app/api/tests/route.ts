
import { createTest, getTests } from "@/services/testService";
import { NextRequest, NextResponse } from "next/server";
import Test from "@/models/Test";
import ScanReportTemplate from "@/models/ScanReportTemplate";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { dbConnect } from "@/lib/mongodb";
import Lab from "@/models/Lab";
import LabMembership from "@/models/LabMembership";
import Branch from "@/models/Branch";

const specimenConfigurationFields = [
  "turnaroundHours",
  "preparationInstructions",
  "requires_specimen_collection",
  "specimen_type",
  "container_type",
  "collection_method",
  "collection_instructions",
  "collection_priority",
  "collection_config_status",
  "referenceRanges",
];

function collectionConfigError(values: Record<string, any>) {
  if (values.collection_config_status !== undefined && !["needs_review", "configured"].includes(values.collection_config_status)) {
    return "Invalid collection configuration status";
  }
  if (values.collection_priority !== undefined && !["routine", "urgent", "stat", "other"].includes(values.collection_priority)) {
    return "Invalid collection priority";
  }
  if (values.requires_specimen_collection !== undefined && typeof values.requires_specimen_collection !== "boolean") {
    return "requires_specimen_collection must be true or false";
  }
  if (values.collection_config_status === "configured" && values.requires_specimen_collection === true) {
    for (const field of ["specimen_type", "container_type", "collection_method"]) {
      if (!String(values[field] || "").trim()) return `${field} is required when specimen collection is configured`;
    }
  }
  return "";
}

async function isBranchAdmin(branchId: string) {
  if (!mongoose.Types.ObjectId.isValid(branchId)) return false;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return false;
  const lab = await Lab.findOne({ branches: branchId }).select("owner").lean();
  if (!lab) return false;
  if (String(lab.owner) === userId) return true;
  const membership = await LabMembership.findOne({ user: userId, labId: lab._id, branchId, status: "active" }).select("role permissions").lean();
  const role = String(membership?.role || "").toLowerCase();
  return role === "admin" || role === "owner" || Boolean(membership?.permissions?.includes("*"));
}

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
      type: String(t.type || 'lab').trim().toLowerCase(),
      resultType: t.resultType || 'numeric',
      category: t.category || '',
      subCategory: t.subCategory || '',
      price: t.price || 0,
      unit: t.unit || '',
      sampleType: t.sampleType || '',
      requires_specimen_collection: t.requires_specimen_collection === true,
      specimen_type: t.specimen_type || '',
      container_type: t.container_type || '',
      collection_method: t.collection_method || '',
      collection_instructions: t.collection_instructions || '',
      collection_priority: t.collection_priority || 'routine',
      collection_config_status: t.collection_config_status || 'needs_review',
      collectionConfigNeedsReview: (t.collection_config_status || 'needs_review') === 'needs_review',
      turnaroundHours: t.turnaroundHours,
      preparationInstructions: t.preparationInstructions || '',
      referenceRanges: Array.isArray(t.referenceRanges) ? t.referenceRanges : [],
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
    await dbConnect();
    const body = await req.json();
    const { id, ...updates } = body || {};
    if (!id) return NextResponse.json({ error: "Missing test id" }, { status: 400 });

    const existing = await Test.findById(id).select("branchId type requires_specimen_collection specimen_type container_type collection_method collection_config_status");
    if (!existing) return NextResponse.json({ error: "Test not found" }, { status: 404 });
    if (!(await isBranchAdmin(String(existing.branchId)))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const hasUpdatePayload = Object.keys(updates).some((key) => key !== 'isCancelled' && updates[key] !== undefined);

    if (!hasUpdatePayload) {
      await Test.findByIdAndUpdate(id, { isCancelled: true });
      return NextResponse.json({ success: true });
    }

    if (specimenConfigurationFields.some((field) => updates[field] !== undefined)) {
      const branch = await Branch.findById(existing.branchId).select("allowSpecimenConfiguration").lean();
      if (branch?.allowSpecimenConfiguration !== true) {
        return NextResponse.json({ error: "Specimen configuration is disabled in branch settings" }, { status: 403 });
      }
    }

    const collectionError = collectionConfigError({ ...existing.toObject(), ...updates });
    if (collectionError) return NextResponse.json({ error: collectionError }, { status: 400 });

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
      'requires_specimen_collection',
      'specimen_type',
      'container_type',
      'collection_method',
      'collection_instructions',
      'collection_priority',
      'collection_config_status',
      'referenceRanges',
      'isActive',
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateDoc[field] = updates[field];
      }
    }

    if (updates.reportTemplateRef !== undefined) {
      let normalizedTemplateRef: string | null = null;
      if ((updates.type || existing.type) === 'scan' && String(updates.reportTemplateRef).trim()) {
        const templateRef = String(updates.reportTemplateRef).trim();
        const query: any = { isCancelled: false, branchId: existing.branchId };
        if (mongoose.Types.ObjectId.isValid(templateRef)) query._id = templateRef;
        else query.slug = templateRef;
        const template = await ScanReportTemplate.findOne(query).select('_id');
        if (!template) return NextResponse.json({ error: 'Invalid report template reference for this branch' }, { status: 400 });
        normalizedTemplateRef = String(template._id);
      }
      updateDoc.reportTemplateRef = normalizedTemplateRef;
    }

    const updated = await Test.findByIdAndUpdate(id, updateDoc, { new: true, runValidators: true });
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
    await dbConnect();
    if (!(await isBranchAdmin(String(data.branchId || "")))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const branchSettings = await Branch.findById(data.branchId).select("allowSpecimenConfiguration").lean();
    if (branchSettings?.allowSpecimenConfiguration !== true && (data.requires_specimen_collection === true || data.collection_config_status === "configured")) {
      return NextResponse.json({ error: "Enable specimen configuration in branch settings before configuring collection fields" }, { status: 403 });
    }
    const collectionError = collectionConfigError(data);
    if (collectionError) return NextResponse.json({ error: collectionError }, { status: 400 });
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
      requires_specimen_collection: branchSettings?.allowSpecimenConfiguration === true && data.requires_specimen_collection === true,
      specimen_type: branchSettings?.allowSpecimenConfiguration === true ? data.specimen_type || undefined : undefined,
      container_type: branchSettings?.allowSpecimenConfiguration === true ? data.container_type || undefined : undefined,
      collection_method: branchSettings?.allowSpecimenConfiguration === true ? data.collection_method || undefined : undefined,
      collection_instructions: branchSettings?.allowSpecimenConfiguration === true ? data.collection_instructions || undefined : undefined,
      collection_priority: branchSettings?.allowSpecimenConfiguration === true ? data.collection_priority || 'routine' : 'routine',
      collection_config_status: branchSettings?.allowSpecimenConfiguration === true && data.collection_config_status === 'configured' ? 'configured' : 'needs_review',
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
