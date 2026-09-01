import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import Order from '../../../models/Order';

function toAbbreviation(value: unknown) {
  const words = String(value || "")
    .trim()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
  return words.map((word) => word[0]).join("").toUpperCase() || "NA";
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    const labSlug = String(body?.slug || "").trim();
    const branchSlug = String(body?.branch || "").trim();
    if (!labSlug || !branchSlug) {
      return NextResponse.json({ error: "slug and branch are required" }, { status: 400 });
    }

    const orderCount = await Order.countDocuments({ slug: labSlug, branch: branchSlug });
    const payload = {
      ...body,
      bonus: Number(body?.bonus ?? 0),
      transId: `${toAbbreviation(labSlug)}-${toAbbreviation(branchSlug)}-${String(orderCount + 1).padStart(4, "0")}`,
    };
    const order = await Order.create(payload);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating test order:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const url = new URL(req.url);
    const branch = url.searchParams.get('branch');
    const branchId = url.searchParams.get('branchId');
    const includeCancelled = url.searchParams.get('includeCancelled') === 'true';
    let query: any = {};
    if (branchId) {
      query.branchId = branchId;
    } else if (branch) {
      query.branch = branch;
    }
    if (!includeCancelled) {
      query.isCancelled = { $ne: true };
    }
    const orders = await Order.find(query).sort({ createdAt: -1 });
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

