import { getCategories } from '../../../services/categoryService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }
    // Fetch all categories and filter by branchId
    const allCategories = await getCategories();
    const categories = allCategories.filter((cat: any) => String(cat.branchId) === String(branchId));
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createTestCategory } from '../../../services/categoryService';
import { getLabBySlug } from '../../../services/labService';
import { getBranchBySlug } from '../../../services/branchService';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log('Received data for new test category:', data);
    
    // Fetch lab and branch by slug/branch
    const lab = await getLabBySlug(data.slug);
    if (!lab) {
      return NextResponse.json({ error: 'Lab not found' }, { status: 404 });
    }
    const branch = await getBranchBySlug(data.branch);
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }
    // Attach labId and branchId to data
    const category = await createTestCategory({
      ...data,
      labId: lab._id,
      branchId: branch._id,
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
