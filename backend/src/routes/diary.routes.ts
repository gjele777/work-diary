import express from 'express';
import { auth } from '../middleware/auth';
import { Diary } from '../models/Diary';

const router = express.Router();

// Create or update today's diary entry
router.post('/', auth, async (req: any, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let diary = await Diary.findOne({
      userId: req.user.userId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    if (diary) {
      diary.content = req.body.content;
      await diary.save();
    } else {
      diary = new Diary({
        userId: req.user.userId,
        content: req.body.content,
        date: today,
      });
      await diary.save();
    }

    // Populate the user data before sending response
    await diary.populate('userId', 'name email');
    
    res.json(diary);
  } catch (error) {
    console.error('Error saving diary entry:', error);
    res.status(500).json({ message: 'Error saving diary entry' });
  }
});

// Get diary entries with pagination
router.get('/', auth, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const selectedDate = req.query.date as string;
    const userId = req.query.userId;
    const skip = (page - 1) * limit;

    let query: any = {};

    // Add userId filter if provided
    if (userId) {
      query.userId = userId;
    }

    // Add date filter if provided
    if (selectedDate) {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);
      
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const diaries = await Diary.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate({
        path: 'comments.userId',
        select: 'name email'
      });

    const total = await Diary.countDocuments(query);

    res.json({
      diaries,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching diary entries:', error);
    res.status(500).json({ message: 'Error fetching diary entries' });
  }
});

// Get a specific diary entry
router.get('/:id', auth, async (req: any, res) => {
  try {
    const diary = await Diary.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('comments.userId', 'name');

    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found' });
    }

    res.json(diary);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching diary entry' });
  }
});

// Add a comment
router.post('/:id/comments', auth, async (req: any, res) => {
  try {
    const diary = await Diary.findById(req.params.id);
    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found' });
    }

    diary.comments.push({
      userId: req.user.userId,
      content: req.body.content,
      createdAt: new Date(),
    });

    await diary.save();
    await diary.populate('userId', 'name email');
    await diary.populate('comments.userId', 'name email');
    res.json(diary);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

// Add or update reaction
router.post('/:id/reactions', auth, async (req: any, res) => {
  try {
    const diary = await Diary.findById(req.params.id);
    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found' });
    }

    const reactionIndex = diary.reactions.findIndex(
      (r) => r.userId.toString() === req.user.userId
    );

    if (reactionIndex > -1) {
      diary.reactions[reactionIndex].type = req.body.type;
    } else {
      diary.reactions.push({
        userId: req.user.userId,
        type: req.body.type,
      });
    }

    await diary.save();
    res.json(diary);
  } catch (error) {
    res.status(500).json({ message: 'Error updating reaction' });
  }
});

// Add todo
router.post('/:id/todos', auth, async (req: any, res) => {
  try {
    const diary = await Diary.findById(req.params.id);
    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found' });
    }

    diary.todos.push({
      content: req.body.content,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await diary.save();
    await diary.populate('userId', 'name email');
    await diary.populate('comments.userId', 'name');
    res.json(diary);
  } catch (error) {
    console.error('Error adding todo:', error);
    res.status(500).json({ message: 'Error adding todo' });
  }
});

// Toggle todo completion
router.put('/:id/todos/:todoIndex', auth, async (req: any, res) => {
  try {
    const diary = await Diary.findById(req.params.id);
    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found' });
    }

    const todoIndex = parseInt(req.params.todoIndex);
    if (todoIndex < 0 || todoIndex >= diary.todos.length) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    diary.todos[todoIndex].completed = req.body.completed;
    diary.todos[todoIndex].updatedAt = new Date();

    await diary.save();
    await diary.populate('userId', 'name email');
    await diary.populate('comments.userId', 'name');
    res.json(diary);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ message: 'Error updating todo' });
  }
});

// Delete todo
router.delete('/:id/todos/:todoIndex', auth, async (req: any, res) => {
  try {
    const diary = await Diary.findById(req.params.id);
    if (!diary) {
      return res.status(404).json({ message: 'Diary entry not found' });
    }

    const todoIndex = parseInt(req.params.todoIndex);
    if (todoIndex < 0 || todoIndex >= diary.todos.length) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    diary.todos.splice(todoIndex, 1);

    await diary.save();
    await diary.populate('userId', 'name email');
    await diary.populate('comments.userId', 'name');
    res.json(diary);
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ message: 'Error deleting todo' });
  }
});

export const diaryRouter = router; 