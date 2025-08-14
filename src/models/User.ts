import { Schema, model } from 'mongoose';

/**
 * User document interface
 */
export interface IUser {
  _id: string;
  email: string;
  password: string;
  name?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User input interface (for registration)
 */
export interface IUserInput {
  email: string;
  password: string;
  name?: string | undefined;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters long']
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Index for reset token lookups
userSchema.index({ resetPasswordToken: 1 });

export const UserModel = model<IUser>('User', userSchema);
