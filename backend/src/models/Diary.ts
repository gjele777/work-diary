import mongoose from 'mongoose';

export interface IDiary extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  content: string;
  date: Date;
  comments: {
    userId: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
  }[];
  reactions: {
    userId: mongoose.Types.ObjectId;
    type: 'like' | 'heart' | 'celebrate' | 'support';
  }[];
  todos: {
    content: string;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

const diarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['like', 'heart', 'celebrate', 'support'],
      required: true,
    },
  }],
  todos: [{
    content: {
      type: String,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Index for efficient querying by date and user
diarySchema.index({ userId: 1, date: -1 });

export const Diary = mongoose.model<IDiary>('Diary', diarySchema); 