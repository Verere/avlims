"use server";
import { dbConnect } from "@/lib/mongodb";
import Branch from "@/models/Branch";
import Lab from "@/models/Lab";
import LabMembership from "@/models/LabMembership";

export type BranchState = {
  success: boolean;
  error: string;
};

export async function createBranchAction(prevState: any, formData: FormData) {
  const mongoose = require('mongoose');
  let session;
  try {
    const labId = String(formData.get("labId") ?? "").trim();
    const branch = String(formData.get("branch") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    if (!labId || !branch || !address || !phone) {
      return {
  success: false,
  error: "All fields are required.",
};
    }
    await dbConnect();
    session = await mongoose.startSession();
    session.startTransaction();

    // Find the lab and get its slug
    let lab;
    try {
      lab = await Lab.findById(labId).session(session);
    } catch (e) {
      throw e;
    }
    if (!lab) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, error: "Lab not found." };
    }
    const labSlug = lab.slug;

    // Generate unique slug for branch, namespaced by lab slug
    let slugBase, slug, counter;
    try {
      slugBase = `${labSlug}-${branch.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "").substring(0, 50)}`;
      slug = slugBase;
      counter = 1;
      while (await Branch.findOne({ slug }).session(session)) {
        slug = `${slugBase}-${counter}`;
        counter++;
      }
    } catch (e) {
      console.error('Error generating unique branch slug:', e);
      throw e;
    }

    let newBranch;
    try {
      newBranch = await Branch.create([{ slug, branch, address, phone }], { session });
    } catch (e) {
      console.error('Error creating branch:', e);
      throw e;
    }

    try {
      await Lab.findByIdAndUpdate(labId, { $push: { branches: newBranch[0]._id } }, { session });
    } catch (e) {
      console.error('Error updating lab with new branch:', e);
      throw e;
    }

    try {
      await LabMembership.create([{
        labId: lab._id,
        branchId: newBranch[0]._id,
        lab: lab.slug,
        branch: newBranch[0].branch,
        name: lab.name,
        permissions: ["*"],
        status: "active",
        role: "owner",
        user: lab.owner,
        owner: lab.owner,
      }], { session });
    } catch (e) {
      console.error('Error creating lab membership:', e);
      throw e;
    }

    try {
      await session.commitTransaction();
      session.endSession();
    } catch (e) {
      console.error('Error committing transaction:', e);
      throw e;
    }
    return { success: true };
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error(err);
    return { error: "Failed to create branch." };
  }
}
