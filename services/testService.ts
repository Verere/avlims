
import { dbConnect } from "@/lib/mongodb";
import Test from "@/models/Test";

export async function createTest(data: any) {
  try {
    await dbConnect();
    const test = await Test.create(data);
    return test;
  } catch (error) {
    console.error('Error creating test:', error);
    throw error;
  }
}

export async function getTests() {
  await dbConnect();
  // Only return non-cancelled tests
  return Test.find({ isCancelled: false }).lean();
}
