import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/mongodb';
import Bill from '../../../models/Bill';
import Order from '../../../models/Order';
import { writeAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const date = req.nextUrl.searchParams.get('date');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');

    if (!branchId) {
      return NextResponse.json({ error: 'Missing required query: branchId' }, { status: 400 });
    }

    const filter: any = { branchId };

    if (from || to) {
      const start = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
      const end = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
      if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }
      if (start && end && start > end) {
        return NextResponse.json({ error: 'from date must be before or equal to to date' }, { status: 400 });
      }
      filter.businessDate = {
        ...(start ? { $gte: start } : {}),
        ...(end ? { $lte: end } : {}),
      };
    } else if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }
      filter.businessDate = { $gte: start, $lte: end };
    }

    const bills = await Bill.find(filter).sort({ businessDate: -1, createdAt: -1 }).lean();
    const orderIds = [...new Set(bills.map((bill) => String(bill.orderId)).filter(Boolean))];
    const orders = orderIds.length ? await Order.find({ _id: { $in: orderIds } }).select('tests').lean() : [];
    const testsByOrder = new Map(orders.map((order) => [String(order._id), (order.tests || []).map((test: unknown) => {
      if (typeof test === 'string') return test;
      if (!test || typeof test !== 'object') return '';
      const value = test as Record<string, unknown>;
      return String(value.name || value.testName || value.label || '').trim();
    }).filter(Boolean)]));
    return NextResponse.json(bills.map((bill) => ({ ...bill, tests: testsByOrder.get(String(bill.orderId)) || [] })));
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    // Validate required fields
    const required = [
      'labId',
      'branchId',
      'patient',
      'referrer',
      'amount',
      'paid',
      'balance',
      'orderId',
      'transId',
      'businessDate',
      'billTo',
      'billToName',
      'billToRef'
    ];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    const bill = await Bill.create(body);
    await writeAuditLog(req, {
      action: 'create',
      entityType: 'Bill',
      entityId: bill._id,
      labId: body.labId,
      branchId: body.branchId,
      changes: { orderId: body.orderId, amount: body.amount, paid: body.paid, balance: body.balance },
    });
    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
