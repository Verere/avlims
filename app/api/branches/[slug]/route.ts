import { NextRequest, NextResponse } from 'next/server';
import Branch from '@/models/Branch';
import Lab from '@/models/Lab';
import { dbConnect } from '@/lib/mongodb';
import { getBranchBySlug } from '../../../../services/branchService';
import { writeAuditLog } from '@/lib/audit';

function normalizeBranchSlug(slug: string) {
  return String(slug || '').trim();
}

export async function GET(_req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const branch = await getBranchBySlug(normalizeBranchSlug(slug));
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }
    return NextResponse.json(branch);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    await dbConnect();
    const body = await req.json();
    const normalizedSlug = normalizeBranchSlug(slug);

    if (!normalizedSlug) {
      return NextResponse.json({ error: 'Branch slug is required' }, { status: 400 });
    }

    const branch = await Branch.findOne({
      $or: [{ slug: new RegExp(`^${normalizedSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, { branch: new RegExp(`^${normalizedSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }],
    });

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const policy = body?.referralBonusPolicy;
    if (policy && typeof policy === 'object') {
      const previousPolicy = branch.referralBonusPolicy?.toObject?.() || branch.referralBonusPolicy || {
        defaultPercentage: 0,
        exceptions: [],
      };
      const nextExceptions = Array.isArray(policy.exceptions)
        ? policy.exceptions
            .filter((entry: any) => entry && (entry.testName || entry.testId || entry.panelName || entry.panelId))
            .map((entry: any) => ({
              type: entry.type === "panel" ? "panel" : "test",
              testId: entry.testId ? String(entry.testId) : undefined,
              testName: entry.testName ? String(entry.testName).trim() : undefined,
              panelId: entry.panelId ? String(entry.panelId) : undefined,
              panelName: entry.panelName ? String(entry.panelName).trim() : undefined,
              percentage: Number(entry.percentage ?? 0),
            }))
        : [];

      branch.referralBonusPolicy = branch.referralBonusPolicy || {
        defaultPercentage: 0,
        exceptions: [],
      };

      branch.referralBonusPolicy.defaultPercentage = Number(policy.defaultPercentage ?? 0);
      branch.referralBonusPolicy.exceptions = nextExceptions;
      await branch.save();

      const nextPolicy = {
        defaultPercentage: branch.referralBonusPolicy.defaultPercentage,
        exceptions: branch.referralBonusPolicy.exceptions,
      };
      if (JSON.stringify(previousPolicy) !== JSON.stringify(nextPolicy)) {
        const lab = await Lab.findOne({ branches: branch._id }).select('_id').lean();
        await writeAuditLog(req, {
          action: 'update',
          entityType: 'Settings',
          entityId: branch._id,
          labId: lab?._id,
          branchId: branch._id,
          changes: { fields: { referralBonusPolicy: { from: previousPolicy, to: nextPolicy } } },
          metadata: {
            setting: 'Referral bonus policy',
            scope: 'branch',
            summary: 'Referral bonus policy updated',
          },
        });
      }
    }

    const saved = await Branch.findById(branch._id).lean();
    return NextResponse.json({ success: true, branch: saved || branch.toObject() });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
