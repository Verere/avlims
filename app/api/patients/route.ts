import { NextRequest } from "next/server";
import Patient from "@/models/patient";
import { createPatient, getPatients } from "@/services/patientService";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const patient = await createPatient(body);

    return Response.json({
      id: patient._id?.toString() || "",
      name: patient.name,
      number: patient.number || "",
      age: patient.age || "",
      email: patient.email || "",
      gender: patient.gender || "",
      address: patient.address || "",
    });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || "Failed to create patient" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const patients = await getPatients(branchId || undefined);
    
    // Map _id to id for frontend compatibility
    const mapped = patients.map((p: any) => ({
      id: p._id?.toString() || '',
      name: p.name,
      number: p.number || '',
      age: p.age || '',
      email: p.email || '',
      gender: p.gender || '',
      address: p.address || '',
      dob: p.dob || '',
    }));
    return Response.json(mapped);
  } catch (error) {
    return Response.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body || {};
    if (!id) return Response.json({ error: "Missing patient id" }, { status: 400 });

    const hasUpdatePayload = Object.keys(updates).some(
      (key) => key !== "isCancelled" && updates[key] !== undefined
    );

    if (!hasUpdatePayload) {
      await Patient.findByIdAndUpdate(id, { isCancelled: true });
      return Response.json({ success: true });
    }

    const updateDoc: Record<string, any> = {};
    const allowedFields = ["name", "number", "age", "gender", "email", "address", "regNumber"];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateDoc[field] = updates[field];
      }
    }

    const previous = await Patient.findById(id).lean();
    if (!previous) {
      return Response.json({ error: "Patient not found" }, { status: 404 });
    }

    const updated = await Patient.findByIdAndUpdate(id, updateDoc, { new: true });
    if (!updated) {
      return Response.json({ error: "Patient not found" }, { status: 404 });
    }

    const changedFields = Object.keys(updateDoc).reduce<Record<string, { before: unknown; after: unknown }>>(
      (changes, field) => {
        const before = (previous as unknown as Record<string, unknown>)[field];
        const after = (updated as unknown as Record<string, unknown>)[field];
        if (String(before ?? "") !== String(after ?? "")) {
          changes[field] = { before, after };
        }
        return changes;
      },
      {}
    );

    if (Object.keys(changedFields).length > 0) {
      await writeAuditLog(req, {
        action: "update",
        entityType: "Patient",
        entityId: updated._id,
        labId: updated.labId,
        branchId: updated.branch,
        changes: {
          patientName: { before: previous.name, after: updated.name },
          fields: changedFields,
        },
      });
    }

    return Response.json({ success: true, patient: updated });
  } catch (error) {
    return Response.json({ error: "Failed to update patient" }, { status: 500 });
  }
}
