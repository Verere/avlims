"use server";
import { dbConnect } from "@/lib/mongodb";
import Lab from "@/models/Lab";
import Branch from "@/models/Branch";

export async function removeAllBranchesAction(labId: string) {
  await dbConnect();
  const lab = await Lab.findById(labId);
  if (!lab) {
    return { error: "Lab not found" };
  }
  // Delete all branches in the Branch collection
  await Branch.deleteMany({ _id: { $in: lab.branches } });
  // Clear the branches array in the Lab document
  lab.branches = [];
  await lab.save();
  return { success: true };
}
