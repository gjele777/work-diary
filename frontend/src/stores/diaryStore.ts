import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';
import { useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

interface Comment {
  userId: {
    _id: string;
    name: string;
  };
  content: string;
  createdAt: string;
  _id?: string;
}

interface Reaction {
  userId: string;
  type: 'like' | 'heart' | 'celebrate' | 'support';
}

interface Todo {
  content: string;
  completed: boolean;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface DiaryEntry {
  _id: string;
  content: string;
  date: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  comments: Comment[];
  reactions: Reaction[];
  todos: Todo[];
  createdAt: string;
  updatedAt: string;
}

interface DiaryState {
  entries: DiaryEntry[];
  currentEntry: DiaryEntry | null;
  loading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  selectedDate: string | null;
  isSaving: boolean;
  fetchEntries: (page?: number) => Promise<void>;
  createOrUpdateEntry: (content: string) => Promise<DiaryEntry>;
  addComment: (diaryId: string, content: string) => Promise<void>;
  addReaction: (diaryId: string, type: Reaction['type']) => Promise<void>;
  clearError: () => void;
  setSelectedDate: (date: string | null) => void;
  addTodo: (diaryId: string, content: string) => Promise<void>;
  toggleTodo: (diaryId: string, todoIndex: number) => Promise<void>;
  deleteTodo: (diaryId: string, todoIndex: number) => Promise<void>;
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  currentEntry: null,
  loading: false,
  error: null,
  totalPages: 1,
  currentPage: 1,
  selectedDate: null,
  isSaving: false,

  clearError: () => set({ error: null }),

  setSelectedDate: (date: string | null) => {
    set({ selectedDate: date });
  },

  fetchEntries: async (page = 1) => {
    try {
      set({ loading: true });
      const token = useAuthStore.getState().token;
      const user = useAuthStore.getState().user;
      const { selectedDate } = get();
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
      });

      const currentPath = window.location.pathname;
      
      if (currentPath === '/your-diary') {
        if (!user?.id) {
          throw new Error('User ID is required for personal diary view');
        }
        queryParams.append('userId', user.id);
      }

      if (selectedDate) {
        queryParams.append('date', selectedDate);
      }
      
      const response = await axios.get(`/api/diaries?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const entries: DiaryEntry[] = response.data.diaries;
      
      set({
        entries,
        totalPages: Math.ceil(entries.length / 10),
        currentPage: page,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching entries:', error);
      if (error instanceof Error) {
        set({ 
          error: error.message || 'Failed to fetch diary entries',
          loading: false,
          entries: []
        });
      } else {
        set({ 
          error: 'Failed to fetch diary entries',
          loading: false,
          entries: []
        });
      }
    }
  },

  createOrUpdateEntry: async (content: string) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) throw new Error('User not authenticated');

    try {
      set({ isSaving: true });
      const response = await axios.post('/api/diaries', {
        content,
        userId: user.id,
        date: new Date().toISOString()
      }, {
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` }
      });

      // Update the entries with the new one
      set(state => ({
        entries: [response.data, ...state.entries],
        isSaving: false
      }));

      return response.data;
    } catch (error) {
      console.error('Error creating/updating entry:', error);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  addComment: async (diaryId: string, content: string) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const token = useAuthStore.getState().token;
      
      // Create optimistic comment
      const newComment = {
        userId: {
          _id: user.id,
          name: user.name
        },
        content,
        createdAt: new Date().toISOString()
      };

      // Update state optimistically
      set(state => ({
        entries: state.entries.map(entry => 
          entry._id === diaryId 
            ? { ...entry, comments: [...entry.comments, newComment] }
            : entry
        )
      }));

      // Make API call
      const response = await axios.post(
        `/api/diaries/${diaryId}/comments`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update with server response
      set(state => ({
        entries: state.entries.map(entry =>
          entry._id === diaryId ? response.data : entry
        ),
        error: null
      }));
    } catch (error) {
      console.error('Error adding comment:', error);
      // Revert to previous state
      await get().fetchEntries(get().currentPage);
      set({ error: 'Failed to add comment' });
    }
  },

  addReaction: async (diaryId: string, type: Reaction['type']) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) throw new Error('User not authenticated');

    try {
      const token = useAuthStore.getState().token;
      
      // Update state optimistically
      set(state => ({
        entries: state.entries.map(entry => {
          if (entry._id === diaryId) {
            const existingReactionIndex = entry.reactions.findIndex(
              r => r.userId === user.id && r.type === type
            );

            let newReactions;
            if (existingReactionIndex !== -1) {
              // Remove existing reaction
              newReactions = entry.reactions.filter((_, index) => index !== existingReactionIndex);
            } else {
              // Add new reaction
              newReactions = [...entry.reactions, { userId: user.id, type }];
            }

            return { ...entry, reactions: newReactions };
          }
          return entry;
        })
      }));

      // Make API call
      const response = await axios.post(
        `/api/diaries/${diaryId}/reactions`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update with server response
      set(state => ({
        entries: state.entries.map(entry =>
          entry._id === diaryId ? response.data : entry
        ),
        error: null
      }));
    } catch (error) {
      console.error('Error adding reaction:', error);
      // Revert to previous state
      await get().fetchEntries(get().currentPage);
      set({ error: 'Failed to add reaction' });
    }
  },

  addTodo: async (diaryId: string, content: string) => {
    const token = useAuthStore.getState().token;
    const currentState = get();

    // Create optimistic todo
    const newTodo = {
      content,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update state optimistically
    set(state => ({
      entries: state.entries.map(entry => 
        entry._id === diaryId 
          ? { ...entry, todos: [...(entry.todos || []), newTodo] }
          : entry
      )
    }));

    try {
      // Make API call
      const response = await axios.post(
        `/api/diaries/${diaryId}/todos`,
        { content },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update with server response
      set(state => ({
        entries: state.entries.map(entry =>
          entry._id === diaryId ? response.data : entry
        ),
        error: null
      }));
    } catch (error) {
      console.error('Error adding todo:', error);
      // Revert to previous state
      await get().fetchEntries(get().currentPage);
      set({ error: 'Failed to add todo' });
    }
  },

  toggleTodo: async (diaryId: string, todoIndex: number) => {
    const token = useAuthStore.getState().token;
    const currentState = get();

    // Find the diary entry
    const diaryEntry = currentState.entries.find(entry => entry._id === diaryId);
    if (!diaryEntry || !diaryEntry.todos[todoIndex]) return;

    // Update state optimistically
    set(state => ({
      entries: state.entries.map(entry => {
        if (entry._id === diaryId) {
          const updatedTodos = [...entry.todos];
          updatedTodos[todoIndex] = {
            ...updatedTodos[todoIndex],
            completed: !updatedTodos[todoIndex].completed,
            updatedAt: new Date().toISOString()
          };
          return { ...entry, todos: updatedTodos };
        }
        return entry;
      })
    }));

    try {
      // Make API call
      const response = await axios.put(
        `/api/diaries/${diaryId}/todos/${todoIndex}`,
        { completed: !diaryEntry.todos[todoIndex].completed },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update with server response
      set(state => ({
        entries: state.entries.map(entry =>
          entry._id === diaryId ? response.data : entry
        ),
        error: null
      }));
    } catch (error) {
      console.error('Error toggling todo:', error);
      // Revert to previous state
      await get().fetchEntries(get().currentPage);
      set({ error: 'Failed to toggle todo' });
    }
  },

  deleteTodo: async (diaryId: string, todoIndex: number) => {
    const token = useAuthStore.getState().token;
    const currentState = get();

    // Update state optimistically
    set(state => ({
      entries: state.entries.map(entry => {
        if (entry._id === diaryId) {
          const updatedTodos = [...entry.todos];
          updatedTodos.splice(todoIndex, 1);
          return { ...entry, todos: updatedTodos };
        }
        return entry;
      })
    }));

    try {
      // Make API call
      const response = await axios.delete(
        `/api/diaries/${diaryId}/todos/${todoIndex}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update with server response
      set(state => ({
        entries: state.entries.map(entry =>
          entry._id === diaryId ? response.data : entry
        ),
        error: null
      }));
    } catch (error) {
      console.error('Error deleting todo:', error);
      // Revert to previous state
      await get().fetchEntries(get().currentPage);
      set({ error: 'Failed to delete todo' });
    }
  },
})); 