import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';
import { sendMail } from '@/lib/email';
import crypto from 'crypto';
import Lab from '@/models/Lab';
import Branch from '@/models/Branch';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildInviteEmailHtml(name: string, inviteUrl: string, inviteLabContext: any) {
  return `
    <p>Hello ${name},</p>
    <p>You have been invited to access the LIMS platform.</p>
    ${inviteLabContext ? `<p>Lab: <strong>${inviteLabContext.invitedLabName}</strong> | Branch: <strong>${inviteLabContext.invitedBranchName}</strong></p>` : ''}
    <p>Click the link below to accept the invite and verify your account:</p>
    <p><a href="${inviteUrl}">${inviteUrl}</a></p>
    <p>This link expires in 24 hours.</p>
  `;
}

export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const users = await User.find({}, {
      password: 0,
      emailVerificationToken: 0,
      emailVerificationExpires: 0,
      passwordResetToken: 0,
      passwordResetExpiry: 0,
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json(users, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const data = await req.json();
    const email = String(data.email || '').trim().toLowerCase();
    const name = String(data.name || '').trim();

    const requiredFields = ['name', 'email'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    let inviteLabContext: any = null;
    if (data.labSlug && data.branchSlug) {
      const branchSlug = String(data.branchSlug);
      const branchNameGuess = branchSlug.replace(/-/g, ' ');
      const branchSlugRegex = new RegExp(`^${escapeRegex(branchSlug)}$`, 'i');
      const branchNameRegex = new RegExp(`^${escapeRegex(branchNameGuess)}$`, 'i');

      const [labDoc, branchDoc] = await Promise.all([
        Lab.findOne({ slug: String(data.labSlug) }).lean(),
        Branch.findOne({
          $or: [
            { slug: branchSlugRegex },
            { branch: branchSlugRegex },
            { branch: branchNameRegex },
          ],
        }).lean(),
      ]);

      if (!labDoc || !branchDoc) {
        return NextResponse.json({ error: 'Invalid lab or branch for invitation' }, { status: 400 });
      }

      inviteLabContext = {
        invitedLabId: labDoc._id,
        invitedBranchId: branchDoc._id,
        invitedLabSlug: labDoc.slug,
        invitedBranchName: branchDoc.branch,
        invitedLabName: labDoc.name,
        invitedRole: String(data.role || 'staff'),
        invitedPermissions: Array.isArray(data.permissions) && data.permissions.length > 0 ? data.permissions : ['dashboard:access'],
        invitedBy: labDoc.owner,
      };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin;
    const inviteUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      existingUser.emailVerificationToken = verificationToken;
      existingUser.emailVerificationExpires = verificationTokenExpiry;
      if (inviteLabContext) {
        existingUser.invitedLabId = inviteLabContext.invitedLabId;
        existingUser.invitedBranchId = inviteLabContext.invitedBranchId;
        existingUser.invitedLabSlug = inviteLabContext.invitedLabSlug;
        existingUser.invitedBranchName = inviteLabContext.invitedBranchName;
        existingUser.invitedLabName = inviteLabContext.invitedLabName;
        existingUser.invitedRole = inviteLabContext.invitedRole;
        existingUser.invitedPermissions = inviteLabContext.invitedPermissions;
        existingUser.invitedBy = inviteLabContext.invitedBy;
      }
      await existingUser.save();

      try {
        await sendMail({
          to: email,
          subject: 'You are invited to LIMS',
          html: buildInviteEmailHtml(existingUser.name || name, inviteUrl, inviteLabContext),
        });
      } catch (mailError) {
        return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 });
      }

      return NextResponse.json(
        {
          _id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          status: existingUser.status,
          emailVerified: existingUser.emailVerified,
          message: 'User already exists. Verification invite email sent successfully.',
        },
        { status: 200 }
      );
    }

    const temporaryPassword = crypto.randomBytes(24).toString('hex');
    const hashedPassword = await hashPassword(temporaryPassword);
    const usernameBase = email.split('@')[0]?.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'user';
    const generatedUsername = `${usernameBase}_${crypto.randomBytes(3).toString('hex')}`;

    const user = await User.create({
      name,
      username: generatedUsername,
      email,
      password: hashedPassword,
      status: data.status || 'active',
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationTokenExpiry,
      ...inviteLabContext,
    });

    try {
      await sendMail({
        to: email,
        subject: 'You are invited to LIMS',
        html: buildInviteEmailHtml(name, inviteUrl, inviteLabContext),
      });
    } catch (mailError) {
      await User.findByIdAndDelete(user._id);
      return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 });
    }

    return NextResponse.json(
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        message: 'User created and verification invite email sent successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  await dbConnect();
  try {
    const { id, ...updateData } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  await dbConnect();
  try {
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete user' }, { status: 400 });
  }
}
