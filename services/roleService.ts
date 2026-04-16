import { dbConnect } from '../lib/mongodb';
import Role, { IRole } from '../models/Role';

export async function createRole(data: Partial<IRole>) {
  await dbConnect();
  const role = new Role(data);
  return role.save();
}

export async function getRoles(labId: string) {
  await dbConnect();
  return Role.find({ lab: labId });
}

export async function updateRole(id: string, data: Partial<IRole>) {
  await dbConnect();
  return Role.findByIdAndUpdate(id, data, { new: true });
}

export async function setRoleStatus(id: string, status: 'active' | 'inactive') {
  await dbConnect();
  return Role.findByIdAndUpdate(id, { status }, { new: true });
}
