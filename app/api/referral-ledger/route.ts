
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getToken } from 'next-auth/jwt';
import { dbConnect } from '@/lib/mongodb';
import ReferralLedger from '@/models/ReferralLedger';
import Referrer from '@/models/Referrer';
import Order from '@/models/Order';
import AuditLog from '@/models/AuditLog';

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const branchId = req.nextUrl.searchParams.get('branchId');
    const fromDate = req.nextUrl.searchParams.get('fromDate');
    const toDate = req.nextUrl.searchParams.get('toDate');
    const date = req.nextUrl.searchParams.get('date');
    const status = req.nextUrl.searchParams.get('status');
    const includeCancelled = req.nextUrl.searchParams.get('includeCancelled') === 'true';

    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    const filter: any = { branchId };
    if (!includeCancelled) {
      filter.isCancelled = { $ne: true };
    }
    if (status === 'pending' || status === 'paid' || status === 'cancelled') {
      filter.status = status;
    }

    // Support both date-range (fromDate/toDate) and single-date (date) filtering
    if (fromDate && toDate) {
      const start = new Date(`${fromDate}T00:00:00.000Z`);
      const end = new Date(`${toDate}T23:59:59.999Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }
      filter.createdAt = { $gte: start, $lte: end };
    } else if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
      }
      filter.createdAt = { $gte: start, $lte: end };
    }

    const rows = await ReferralLedger.find(filter)
      .populate({ path: 'referrer', select: 'name phone', model: Referrer })
      .populate({ path: 'testOrder', select: 'name transId', model: Order })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('Error fetching referral ledger:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    // Validate required fields. Zero values are valid for amount/bonus and must not be rejected.
    const required = ['order', 'referrer', 'amount', 'branchId', 'lab', 'user'];
    for (const field of required) {
      const value = body?.[field];
      if (value === undefined || value === null || value === '') {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const bonusValue = Number(body?.bonus ?? 0);
    const amountValue = Number(body?.amount ?? 0);

    // Create referral ledger entry
    const tests = Array.isArray(body.tests)
      ? body.tests
          .filter((t: any) => t && t.testId && t.testName)
          .map((t: any) => ({
            testId: String(t.testId),
            testName: String(t.testName),
            panelId: t.panelId ? String(t.panelId) : undefined,
            panelName: t.panelName ? String(t.panelName) : undefined,
            quantity: Number(t.quantity || 1),
            amount: Number(t.amount || 0),
            bonus: Number(t.bonus || 0),
          }))
      : [];

    const ledger = await ReferralLedger.create({
      testOrder: body.order, // maps to testOrder in schema
      referrer: body.referrer,
      tests,
      amount: amountValue,
      bonus: bonusValue,
      branchId: body.branchId,
      lab: body.lab,
      status: body.status || 'pending',
      user: body.user,
      businessDate: body.businessDate,
    });
    return NextResponse.json(ledger, { status: 201 });
  } catch (error) {
    console.error('Error creating referral ledger entry:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();

    if (body?.action === 'markReferrerPendingPaid') {
      const branchId = String(body.branchId || '').trim();
      const referrerId = String(body.referrerId || '').trim();
      const ledgerIds: string[] = Array.isArray(body.ledgerIds)
        ? Array.from(new Set<string>(body.ledgerIds.map((id: unknown) => String(id || '').trim())))
        : [];

      if (!mongoose.Types.ObjectId.isValid(branchId) || !mongoose.Types.ObjectId.isValid(referrerId)) {
        return NextResponse.json({ error: 'Valid branchId and referrerId are required' }, { status: 400 });
      }
      if (ledgerIds.length === 0 || ledgerIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return NextResponse.json({ error: 'Valid fetched ledgerIds are required' }, { status: 400 });
      }

      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      const actorId = mongoose.Types.ObjectId.isValid(String(token?.id || ''))
        ? new mongoose.Types.ObjectId(String(token?.id))
        : undefined;
      const forwardedFor = req.headers.get('x-forwarded-for');
      const session = await mongoose.startSession();
      let updatedLedgerIds: string[] = [];

      try {
        await session.withTransaction(async () => {
          const pendingLedgers = await ReferralLedger.find({
            _id: { $in: ledgerIds },
            branchId,
            referrer: referrerId,
            status: 'pending',
            isCancelled: { $ne: true },
          }).session(session);

          for (const ledger of pendingLedgers) {
            ledger.status = 'paid';
            await ledger.save({ session });
          }

          if (pendingLedgers.length > 0) {
            await AuditLog.create(
              pendingLedgers.map((ledger) => ({
                action: 'status_change',
                entityType: 'ReferralLedger',
                entityId: String(ledger._id),
                actorId,
                actorName: typeof token?.name === 'string' ? token.name : undefined,
                actorEmail: typeof token?.email === 'string' ? token.email : undefined,
                labId: ledger.lab,
                branchId: ledger.branchId,
                changes: { status: { from: 'pending', to: 'paid' } },
                metadata: {
                  referrerId: String(ledger.referrer),
                  amount: ledger.amount,
                  bonus: ledger.bonus,
                  testOrderId: String(ledger.testOrder),
                },
                requestMethod: req.method,
                requestPath: req.nextUrl.pathname,
                ipAddress: forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || undefined,
                userAgent: req.headers.get('user-agent') || undefined,
              })),
              { session, ordered: true }
            );
          }

          updatedLedgerIds = pendingLedgers.map((ledger) => String(ledger._id));
        });
      } finally {
        await session.endSession();
      }

      return NextResponse.json({
        success: true,
        updatedCount: updatedLedgerIds.length,
        updatedLedgerIds,
      });
    }

    if (body?.action === 'recalculatePending') {
      const branchId = String(body.branchId || '').trim();
      const referrerId = String(body.referrerId || '').trim();
      const percentage = Number(body.percentage);
      if (!mongoose.Types.ObjectId.isValid(branchId)) {
        return NextResponse.json({ error: 'A valid branchId is required' }, { status: 400 });
      }
      if (referrerId && !mongoose.Types.ObjectId.isValid(referrerId)) {
        return NextResponse.json({ error: 'A valid referrerId is required' }, { status: 400 });
      }
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 });
      }

      const pendingFilter: Record<string, unknown> = {
        branchId,
        status: 'pending',
        isCancelled: { $ne: true },
      };
      if (referrerId) pendingFilter.referrer = referrerId;
      const pendingLedgers = await ReferralLedger.find(pendingFilter);

      for (const ledger of pendingLedgers) {
        if (Array.isArray(ledger.tests) && ledger.tests.length > 0) {
          for (const test of ledger.tests) {
            const amount = Number(test.amount || 0);
            test.bonus = Math.round((amount * percentage / 100 + Number.EPSILON) * 100) / 100;
          }
          ledger.bonus = ledger.tests.reduce((sum: number, test: any) => sum + Number(test.bonus || 0), 0);
        } else {
          const amount = Number(ledger.amount || 0);
          ledger.bonus = Math.round((amount * percentage / 100 + Number.EPSILON) * 100) / 100;
        }
        await ledger.save();
      }

      return NextResponse.json({
        success: true,
        updatedCount: pendingLedgers.length,
        percentage,
        referrerId: referrerId || undefined,
      });
    }

    const ledgerId = body?.id || body?._id;
    const testIndex = Number(body?.testIndex ?? -1);
    const newBonus = Number(body?.bonus ?? 0);

    if (!ledgerId) {
      return NextResponse.json({ error: 'Ledger id is required' }, { status: 400 });
    }

    const ledger = await ReferralLedger.findById(ledgerId);
    if (!ledger) {
      return NextResponse.json({ error: 'Referral ledger not found' }, { status: 404 });
    }

    if (Array.isArray(ledger.tests) && Number.isInteger(testIndex) && testIndex >= 0 && testIndex < ledger.tests.length) {
      ledger.tests[testIndex].bonus = Number.isFinite(newBonus) ? Math.max(0, newBonus) : Number(ledger.tests[testIndex].bonus || 0);
    } else {
      return NextResponse.json({ error: 'Invalid test index' }, { status: 400 });
    }

    ledger.bonus = Number(ledger.tests.reduce((sum: number, item: any) => sum + Number(item.bonus || 0), 0));
    await ledger.save();

    return NextResponse.json({ success: true, ledger: ledger.toObject() }, { status: 200 });
  } catch (error) {
    console.error('Error updating referral ledger bonus:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
