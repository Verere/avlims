import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Branch from '@/models/Branch';
import Lab from '@/models/Lab';
import LabMembership from '@/models/LabMembership';
import { dbConnect } from '@/lib/mongodb';
import { DEFAULT_TRANSACTION_ID_CONFIG, validateTransactionIdConfig } from '@/lib/transactionId';
import { writeAuditLog } from '@/lib/audit';

function exactInsensitive(value: string) {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

async function resolveContext(req: NextRequest) {
  const labSlug = String(req.nextUrl.searchParams.get('labSlug') || '').trim();
  const branchSlug = String(req.nextUrl.searchParams.get('branchSlug') || '').trim();
  if (!labSlug || !branchSlug) return { error: 'labSlug and branchSlug are required', status: 400 as const };

  const lab = await Lab.findOne({ slug: exactInsensitive(labSlug) });
  if (!lab) return { error: 'Lab not found', status: 404 as const };
  const branch = await Branch.findOne({
    _id: { $in: lab.branches || [] },
    $or: [{ slug: exactInsensitive(branchSlug) }, { branch: exactInsensitive(branchSlug) }],
  });
  if (!branch) return { error: 'Branch not found for this lab', status: 404 as const };

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { error: 'Unauthorized', status: 401 as const };

  const ownsLab = String(lab.owner) === userId;
  const membership = ownsLab ? null : await LabMembership.findOne({
    user: userId,
    labId: lab._id,
    branchId: branch._id,
    status: 'active',
  }).select('role permissions').lean();
  const role = String(membership?.role || '').trim().toLowerCase();
  const isAdmin = ownsLab || role === 'admin' || role === 'owner' ||
    (Array.isArray(membership?.permissions) && membership.permissions.includes('*'));
  if (!isAdmin) return { error: 'Admin access required', status: 403 as const };

  return { lab, branch };
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const context = await resolveContext(req);
    if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });

    const labConfig = validateTransactionIdConfig(context.lab.transactionIdConfig) || DEFAULT_TRANSACTION_ID_CONFIG;
    const branchConfig = validateTransactionIdConfig(context.branch.transactionIdConfig);
    return NextResponse.json({
      labConfig,
      branchConfig,
      usesBranchOverride: Boolean(branchConfig),
      effectiveConfig: branchConfig || labConfig,
    });
  } catch (error) {
    console.error('Failed to load transaction ID settings:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to load transaction ID settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  try {
    const context = await resolveContext(req);
    if ('error' in context) return NextResponse.json({ error: context.error }, { status: context.status });

    const body = await req.json();
    const scope = body?.scope;
    if (scope === 'clearBranch') {
      const previousConfig = validateTransactionIdConfig(context.branch.transactionIdConfig);
      context.branch.transactionIdConfig = undefined;
      await context.branch.save();
      if (previousConfig) {
        await writeAuditLog(req, {
          action: 'update',
          entityType: 'Settings',
          entityId: context.branch._id,
          labId: context.lab._id,
          branchId: context.branch._id,
          changes: { fields: { transactionIdConfig: { from: previousConfig, to: null } } },
          metadata: {
            setting: 'Transaction ID configuration',
            scope: 'branch',
            summary: 'Branch transaction ID override removed',
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    const config = validateTransactionIdConfig(body?.config);
    if (!config) {
      return NextResponse.json({
        error: 'Invalid pattern. Use {LAB}, {BRANCH}, {YYYY}, {MM}, {DD}, and exactly one {SEQ}; date tokens must match the reset period.',
      }, { status: 400 });
    }

    if (scope === 'lab') {
      const previousConfig = validateTransactionIdConfig(context.lab.transactionIdConfig);
      context.lab.transactionIdConfig = config;
      await context.lab.save();
      if (JSON.stringify(previousConfig) !== JSON.stringify(config)) {
        await writeAuditLog(req, {
          action: 'update',
          entityType: 'Settings',
          entityId: context.lab._id,
          labId: context.lab._id,
          branchId: context.branch._id,
          changes: { fields: { transactionIdConfig: { from: previousConfig, to: config } } },
          metadata: {
            setting: 'Transaction ID configuration',
            scope: 'lab',
            summary: 'Lab-wide transaction ID configuration updated',
          },
        });
      }
    } else if (scope === 'branch') {
      const previousConfig = validateTransactionIdConfig(context.branch.transactionIdConfig);
      context.branch.transactionIdConfig = config;
      await context.branch.save();
      if (JSON.stringify(previousConfig) !== JSON.stringify(config)) {
        await writeAuditLog(req, {
          action: 'update',
          entityType: 'Settings',
          entityId: context.branch._id,
          labId: context.lab._id,
          branchId: context.branch._id,
          changes: { fields: { transactionIdConfig: { from: previousConfig, to: config } } },
          metadata: {
            setting: 'Transaction ID configuration',
            scope: 'branch',
            summary: 'Branch transaction ID override updated',
          },
        });
      }
    } else {
      return NextResponse.json({ error: 'scope must be lab, branch, or clearBranch' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save transaction ID settings:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to save transaction ID settings' }, { status: 500 });
  }
}
