import { NextRequest } from "next/server";
import Patient from "@/models/patient";
import { createPatient, getPatients } from "@/services/patientService";

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
      dob: p.dob || '',
    }));
    return Response.json(mapped);
  } catch (error) {
    return Response.json({ error: "Failed to fetch patients" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return Response.json({ error: "Missing patient id" }, { status: 400 });
    await Patient.findByIdAndUpdate(id, { isCancelled: true });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to cancel patient" }, { status: 500 });
  }
}
