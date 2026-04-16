import { dbConnect } from '../lib/mongodb';
import User, { IUser } from '../models/User';

export async function createUser(data: Partial<IUser>) {
  await dbConnect();
  const user = new User(data);
  return user.save();
}

export async function getUsers(labId: string) {
  await dbConnect();
  return User.find({ lab: labId });
}

export async function updateUser(id: string, data: Partial<IUser>) {
  await dbConnect();
  return User.findByIdAndUpdate(id, data, { new: true });
}

export async function setUserStatus(id: string, status: 'active' | 'inactive') {
  await dbConnect();
  return User.findByIdAndUpdate(id, { status }, { new: true });
}
